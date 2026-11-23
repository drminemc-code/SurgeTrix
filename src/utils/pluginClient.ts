import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { OperationType, auth, db, getFirebaseAuthHeaders, handleFirestoreError } from '../firebase';
import {
  PluginCategory,
  PluginListing,
  PluginReviewRecord,
  PluginVersionRecord,
  computeRatingBreakdown,
  isOwnerUser,
  sanitizeDownloadFilename,
  slugifyPluginId,
  validatePluginFileMeta,
  validatePluginIconUrl,
  validatePluginPayload,
  validateReviewPayload,
} from './pluginMarketplace';
import { OwnerDomainEntry } from './ownerModeration';
import { sanitizeUsername } from './userValidation';

const FIRESTORE_CHUNK_RAW_BYTES = 450 * 1024; // ~600 KB base64, well below 1 MB doc limit
const MAX_FIRESTORE_PLUGIN_BYTES = 15 * 1024 * 1024; // 15 MB (~34 chunks)

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    const slice = bytes.subarray(i, i + step);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function computeSha256Hex(buffer: ArrayBuffer): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return '';
}

type ApiAttemptResult<T> =
  | { kind: 'ok'; data: T }
  | { kind: 'api_error'; error: string }
  | { kind: 'unavailable' };

async function attemptJsonApi<T>(
  url: string,
  init?: RequestInit
): Promise<ApiAttemptResult<T>> {
  try {
    const res = await fetch(url, init);
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('application/json')) {
      // Static hosts (e.g. Netlify) return 404/200 HTML when Express backend is absent
      return { kind: 'unavailable' };
    }
    const data = (await res.json().catch(() => null)) as (T & { ok?: boolean; error?: string }) | null;
    if (!data) {
      return { kind: 'unavailable' };
    }
    if (!res.ok || data.ok === false) {
      return {
        kind: 'api_error',
        error: data.error || `Server returned HTTP ${res.status}.`,
      };
    }
    return { kind: 'ok', data };
  } catch {
    return { kind: 'unavailable' };
  }
}

function parseVersionsJson(raw: unknown): PluginVersionRecord[] {
  if (typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as PluginVersionRecord[]) : [];
  } catch {
    return [];
  }
}

async function hydrateFirestorePluginDoc(
  pluginId: string,
  d: Record<string, unknown>
): Promise<PluginListing> {
  let reviews: PluginReviewRecord[] = [];
  try {
    const revSnap = await getDocs(collection(db, 'plugins', pluginId, 'reviews'));
    reviews = revSnap.docs
      .map((rDoc) => {
        const rd = rDoc.data() as Record<string, unknown>;
        return {
          id: String(rd.id || rDoc.id),
          pluginId: String(rd.pluginId || pluginId),
          authorUid: String(rd.authorUid || ''),
          authorName: String(rd.authorName || 'Player'),
          rating: Number(rd.rating || 5),
          title: String(rd.title || ''),
          comment: String(rd.comment || ''),
          testedVersion: String(rd.testedVersion || '1.21.4'),
          ownerReply: typeof rd.ownerReply === 'string' ? rd.ownerReply : undefined,
          ownerRepliedAt: typeof rd.ownerRepliedAt === 'string' ? rd.ownerRepliedAt : undefined,
          createdAt: String(rd.createdAtIso || new Date().toISOString()),
          updatedAt: String(rd.updatedAtIso || rd.createdAtIso || new Date().toISOString()),
        } satisfies PluginReviewRecord;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    reviews = [];
  }

  const stats = computeRatingBreakdown(reviews);
  const versions = parseVersionsJson(d.versionsJson);

  return {
    id: String(d.id || pluginId),
    slug: String(d.slug || pluginId),
    name: String(d.name || 'Plugin'),
    tagline: String(d.tagline || ''),
    description: String(d.description || ''),
    category: String(d.category || 'Administration') as PluginCategory,
    platforms: Array.isArray(d.platforms) ? d.platforms.map((p) => String(p)) : ['Paper'],
    mcVersions: Array.isArray(d.mcVersions) ? d.mcVersions.map((v) => String(v)) : ['1.21.4'],
    priceLabel: String(d.priceLabel || 'Free'),
    featured: Boolean(d.featured),
    status: d.status === 'pending' ? 'pending' : d.status === 'hidden' ? 'hidden' : 'published',
    authorName: String(d.authorName || 'drminemc'),
    authorEmail: '',
    currentVersion: String(d.currentVersion || '1.0.0'),
    fileName: String(d.fileName || ''),
    storedFileName: String(d.fileName || ''),
    fileSize: Number(d.fileSize || 0),
    sha256: String(d.sha256 || ''),
    supportUrl: String(d.supportUrl || ''),
    iconUrl: typeof d.iconUrl === 'string' ? d.iconUrl : '',
    downloads: Number(d.downloads || 0),
    ratingAverage: stats.average,
    reviewsCount: stats.count,
    versions,
    reviews,
    createdAt: String(d.createdAtIso || new Date().toISOString()),
    updatedAt: String(d.updatedAtIso || d.createdAtIso || new Date().toISOString()),
  };
}

export async function listPluginsClient(): Promise<PluginListing[]> {
  const ownerMode = isOwnerUser(auth.currentUser);
  const headers = ownerMode ? await getFirebaseAuthHeaders() : {};
  const apiRes = await attemptJsonApi<{ ok: boolean; plugins: PluginListing[] }>(
    ownerMode ? '/api/plugins?includeHidden=1' : '/api/plugins',
    { headers }
  );

  if (apiRes.kind === 'ok' && Array.isArray(apiRes.data.plugins)) {
    return apiRes.data.plugins;
  }

  // Fallback to Cloud Firestore when backend Express is unavailable (e.g. Netlify static host)
  const pluginsQuery = ownerMode
    ? collection(db, 'plugins')
    : query(collection(db, 'plugins'), where('status', '==', 'published'));

  const snap = await getDocs(pluginsQuery);
  const hydrated = await Promise.all(
    snap.docs.map((docSnap) =>
      hydrateFirestorePluginDoc(docSnap.id, docSnap.data() as Record<string, unknown>)
    )
  );
  return hydrated.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export interface CreatePluginInput {
  name: string;
  version: string;
  category: PluginCategory;
  priceLabel: string;
  tagline: string;
  description: string;
  mcVersions: string;
  platforms: string[];
  supportUrl: string;
  iconUrl?: string;
  releaseTitle: string;
  changelog: string;
  featured: boolean;
  file: File;
}

export async function createAndPublishPluginClient(
  input: CreatePluginInput
): Promise<{ ok: true; plugin: PluginListing } | { ok: false; error: string }> {
  const validated = validatePluginPayload({
    name: input.name,
    tagline: input.tagline,
    description: input.description,
    category: input.category,
    version: input.version,
    platforms: input.platforms,
    mcVersions: input.mcVersions,
    priceLabel: input.priceLabel || 'Free',
    supportUrl: input.supportUrl,
    iconUrl: input.iconUrl,
  });
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const buffer = await input.file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const fileCheck = validatePluginFileMeta(input.file.name, bytes.length, bytes);
  if (!fileCheck.ok) {
    return { ok: false, error: fileCheck.error };
  }

  const authHeaders = await getFirebaseAuthHeaders(true);

  // Try Express backend first
  const createAttempt = await attemptJsonApi<{
    ok: boolean;
    plugin: PluginListing;
    versionId: string;
  }>('/api/plugins', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({
      name: validated.data.name,
      version: validated.data.version,
      category: validated.data.category,
      priceLabel: validated.data.priceLabel,
      tagline: validated.data.tagline,
      description: validated.data.description,
      mcVersions: validated.data.mcVersions,
      platforms: validated.data.platforms,
      supportUrl: validated.data.supportUrl,
      iconUrl: validated.data.iconUrl,
      releaseTitle: input.releaseTitle.trim() || `Initial Release v${validated.data.version}`,
      changelog: input.changelog.trim() || 'Initial verified release.',
      featured: input.featured,
    }),
  });

  if (createAttempt.kind === 'api_error') {
    return { ok: false, error: createAttempt.error };
  }

  if (createAttempt.kind === 'ok') {
    const createdPluginId = createAttempt.data.plugin.id;
    const fileAttempt = await attemptJsonApi<{ ok: boolean; plugin: PluginListing }>(
      `/api/plugins/${encodeURIComponent(createdPluginId)}/versions/${encodeURIComponent(
        createAttempt.data.versionId
      )}/file`,
      {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/octet-stream',
          'X-File-Name': input.file.name,
        },
        body: buffer,
      }
    );

    if (fileAttempt.kind === 'ok') {
      return { ok: true, plugin: fileAttempt.data.plugin };
    }

    await fetch(`/api/plugins/${encodeURIComponent(createdPluginId)}`, {
      method: 'DELETE',
      headers: authHeaders,
    }).catch(() => {});

    return {
      ok: false,
      error:
        fileAttempt.kind === 'api_error'
          ? fileAttempt.error
          : 'Plugin file upload failed on server.',
    };
  }

  // Fallback to Cloud Firestore + chunked archive storage (works on Netlify static host!)
  const currentUser = auth.currentUser;
  if (!currentUser || !isOwnerUser(currentUser)) {
    return {
      ok: false,
      error: 'Only the verified Owner account (drminemc@gmail.com) can publish plugins.',
    };
  }

  if (bytes.length > MAX_FIRESTORE_PLUGIN_BYTES) {
    return {
      ok: false,
      error: 'On static hosting, plugin files are limited to 15 MB. Please upload a smaller archive.',
    };
  }

  const baseSlug = slugifyPluginId(validated.data.name);
  let pluginId = baseSlug;
  let suffix = 2;
  while (true) {
    const snap = await getDoc(doc(db, 'plugins', pluginId));
    if (!snap.exists()) break;
    pluginId = `${baseSlug}-${suffix++}`;
  }

  const nowIso = new Date().toISOString();
  const versionId = `ver-${Date.now()}`;
  const sha256 = await computeSha256Hex(buffer);

  const initialVersion: PluginVersionRecord = {
    id: versionId,
    version: validated.data.version,
    title: input.releaseTitle.trim().slice(0, 80) || `Initial Release v${validated.data.version}`,
    changelog: input.changelog.trim().slice(0, 4000) || 'Initial plugin release uploaded by Owner.',
    fileName: fileCheck.safeName,
    storedFileName: fileCheck.safeName,
    fileSize: bytes.length,
    sha256,
    downloads: 0,
    createdAt: nowIso,
  };

  const pluginRef = doc(db, 'plugins', pluginId);
  const baseAuthor = sanitizeUsername(currentUser.displayName || 'drminemc');

  try {
    await setDoc(pluginRef, {
      id: pluginId,
      slug: pluginId,
      name: validated.data.name,
      tagline: validated.data.tagline,
      description: validated.data.description,
      category: validated.data.category,
      platforms: validated.data.platforms,
      mcVersions: validated.data.mcVersions,
      priceLabel: validated.data.priceLabel,
      featured: Boolean(input.featured),
      authorName: baseAuthor,
      currentVersion: validated.data.version,
      fileName: fileCheck.safeName,
      fileSize: bytes.length,
      sha256,
      supportUrl: validated.data.supportUrl,
      iconUrl: validated.data.iconUrl,
      versionsJson: JSON.stringify([initialVersion]),
      ownerUid: currentUser.uid,
      status: 'hidden',
      downloads: 0,
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const totalChunks = Math.ceil(bytes.length / FIRESTORE_CHUNK_RAW_BYTES);
    for (let idx = 0; idx < totalChunks; idx += 1) {
      const start = idx * FIRESTORE_CHUNK_RAW_BYTES;
      const slice = bytes.subarray(start, Math.min(bytes.length, start + FIRESTORE_CHUNK_RAW_BYTES));
      const chunkId = `${versionId}_${idx}`;
      await setDoc(doc(db, 'plugins', pluginId, 'chunks', chunkId), {
        id: chunkId,
        pluginId,
        versionId,
        index: idx,
        dataBase64: bytesToBase64(slice),
        createdAt: serverTimestamp(),
      });
    }

    await updateDoc(pluginRef, {
      status: 'published',
      updatedAtIso: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    });

    const createdSnap = await getDoc(pluginRef);
    const hydrated = await hydrateFirestorePluginDoc(
      pluginId,
      (createdSnap.data() || {}) as Record<string, unknown>
    );
    return { ok: true, plugin: hydrated };
  } catch (err) {
    await deleteDoc(pluginRef).catch(() => {});
    const message =
      err instanceof Error ? err.message : 'Unable to save plugin in Cloud Firestore.';
    return { ok: false, error: message };
  }
}

export async function submitPluginForReviewClient(
  input: Omit<CreatePluginInput, 'featured'>
): Promise<{ ok: true; plugin: PluginListing } | { ok: false; error: string }> {
  const validated = validatePluginPayload({
    name: input.name,
    tagline: input.tagline,
    description: input.description,
    category: input.category,
    version: input.version,
    platforms: input.platforms,
    mcVersions: input.mcVersions,
    priceLabel: input.priceLabel || 'Free',
    supportUrl: input.supportUrl,
    iconUrl: input.iconUrl,
  });
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const buffer = await input.file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const fileCheck = validatePluginFileMeta(input.file.name, bytes.length, bytes);
  if (!fileCheck.ok) {
    return { ok: false, error: fileCheck.error };
  }

  const authHeaders = await getFirebaseAuthHeaders(true);
  const submitAttempt = await attemptJsonApi<{
    ok: boolean;
    plugin: PluginListing;
    versionId: string;
  }>('/api/plugins/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({
      name: validated.data.name,
      version: validated.data.version,
      category: validated.data.category,
      priceLabel: validated.data.priceLabel,
      tagline: validated.data.tagline,
      description: validated.data.description,
      mcVersions: validated.data.mcVersions,
      platforms: validated.data.platforms,
      supportUrl: validated.data.supportUrl,
      iconUrl: validated.data.iconUrl,
      releaseTitle: input.releaseTitle.trim() || `Submission v${validated.data.version}`,
      changelog: input.changelog.trim() || 'Community plugin submission awaiting Owner approval.',
    }),
  });

  if (submitAttempt.kind === 'api_error') {
    return { ok: false, error: submitAttempt.error };
  }

  if (submitAttempt.kind === 'ok') {
    const createdPluginId = submitAttempt.data.plugin.id;
    const fileAttempt = await attemptJsonApi<{ ok: boolean; plugin: PluginListing }>(
      `/api/plugins/${encodeURIComponent(createdPluginId)}/versions/${encodeURIComponent(
        submitAttempt.data.versionId
      )}/file?publish=0`,
      {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/octet-stream',
          'X-File-Name': input.file.name,
        },
        body: buffer,
      }
    );

    if (fileAttempt.kind === 'ok') {
      return { ok: true, plugin: fileAttempt.data.plugin };
    }
    return {
      ok: false,
      error:
        fileAttempt.kind === 'api_error'
          ? fileAttempt.error
          : 'Plugin archive upload failed.',
    };
  }

  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    return {
      ok: false,
      error: 'Please sign in with a verified email account to submit a plugin for Owner review.',
    };
  }

  if (bytes.length > MAX_FIRESTORE_PLUGIN_BYTES) {
    return {
      ok: false,
      error: 'On static hosting, plugin files are limited to 15 MB. Please upload a smaller archive.',
    };
  }

  const baseSlug = slugifyPluginId(validated.data.name);
  let pluginId = baseSlug;
  let suffix = 2;
  while (true) {
    const snap = await getDoc(doc(db, 'plugins', pluginId));
    if (!snap.exists()) break;
    pluginId = `${baseSlug}-${suffix++}`;
  }

  const nowIso = new Date().toISOString();
  const versionId = `ver-${Date.now()}`;
  const sha256 = await computeSha256Hex(buffer);

  const initialVersion: PluginVersionRecord = {
    id: versionId,
    version: validated.data.version,
    title: input.releaseTitle.trim().slice(0, 80) || `Submission v${validated.data.version}`,
    changelog:
      input.changelog.trim().slice(0, 4000) ||
      'Community plugin submission awaiting Owner approval.',
    fileName: fileCheck.safeName,
    storedFileName: fileCheck.safeName,
    fileSize: bytes.length,
    sha256,
    downloads: 0,
    createdAt: nowIso,
  };

  const pluginRef = doc(db, 'plugins', pluginId);
  const authorName = sanitizeUsername(
    currentUser.displayName || currentUser.email?.split('@')[0] || 'Developer'
  );

  try {
    await setDoc(pluginRef, {
      id: pluginId,
      slug: pluginId,
      name: validated.data.name,
      tagline: validated.data.tagline,
      description: validated.data.description,
      category: validated.data.category,
      platforms: validated.data.platforms,
      mcVersions: validated.data.mcVersions,
      priceLabel: validated.data.priceLabel,
      featured: false,
      authorName,
      currentVersion: validated.data.version,
      fileName: fileCheck.safeName,
      fileSize: bytes.length,
      sha256,
      supportUrl: validated.data.supportUrl,
      iconUrl: validated.data.iconUrl,
      versionsJson: JSON.stringify([initialVersion]),
      ownerUid: currentUser.uid,
      status: 'pending',
      downloads: 0,
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const totalChunks = Math.ceil(bytes.length / FIRESTORE_CHUNK_RAW_BYTES);
    for (let idx = 0; idx < totalChunks; idx += 1) {
      const start = idx * FIRESTORE_CHUNK_RAW_BYTES;
      const slice = bytes.subarray(
        start,
        Math.min(bytes.length, start + FIRESTORE_CHUNK_RAW_BYTES)
      );
      const chunkId = `${versionId}_${idx}`;
      await setDoc(doc(db, 'plugins', pluginId, 'chunks', chunkId), {
        id: chunkId,
        pluginId,
        versionId,
        index: idx,
        dataBase64: bytesToBase64(slice),
        createdAt: serverTimestamp(),
      });
    }

    const createdSnap = await getDoc(pluginRef);
    const hydrated = await hydrateFirestorePluginDoc(
      pluginId,
      (createdSnap.data() || {}) as Record<string, unknown>
    );
    return { ok: true, plugin: hydrated };
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.WRITE, `plugins/${pluginId}`);
    } catch (wrapped) {
      return {
        ok: false,
        error:
          wrapped instanceof Error ? wrapped.message : 'Unable to submit plugin to Firestore.',
      };
    }
  }
}

export async function updatePluginMetadataClient(
  plugin: PluginListing,
  patch: {
    name?: string;
    tagline?: string;
    description?: string;
    category?: PluginCategory;
    priceLabel?: string;
    mcVersions?: string | string[];
    supportUrl?: string;
    iconUrl?: string;
    featured?: boolean;
    status?: 'published' | 'pending' | 'hidden';
  }
): Promise<{ ok: true; plugin: PluginListing } | { ok: false; error: string }> {
  let normalizedPatch = patch;
  if (patch.iconUrl !== undefined) {
    const iconCheck = validatePluginIconUrl(patch.iconUrl);
    if (!iconCheck.ok) {
      return { ok: false, error: iconCheck.error };
    }
    normalizedPatch = { ...patch, iconUrl: iconCheck.iconUrl };
  }

  const headers = await getFirebaseAuthHeaders(true);
  const apiAttempt = await attemptJsonApi<{ ok: boolean; plugin: PluginListing }>(
    `/api/plugins/${encodeURIComponent(plugin.id)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(normalizedPatch),
    }
  );
  if (apiAttempt.kind === 'ok') {
    return { ok: true, plugin: apiAttempt.data.plugin };
  }
  if (apiAttempt.kind === 'api_error') {
    return { ok: false, error: apiAttempt.error };
  }

  try {
    const nowIso = new Date().toISOString();
    const updateFields: Record<string, unknown> = {
      updatedAtIso: nowIso,
      updatedAt: serverTimestamp(),
    };
    if (normalizedPatch.name !== undefined) updateFields.name = normalizedPatch.name.trim().slice(0, 64);
    if (normalizedPatch.tagline !== undefined) updateFields.tagline = normalizedPatch.tagline.trim().slice(0, 160);
    if (normalizedPatch.description !== undefined) updateFields.description = normalizedPatch.description.trim().slice(0, 10000);
    if (normalizedPatch.category !== undefined) updateFields.category = normalizedPatch.category;
    if (normalizedPatch.priceLabel !== undefined) updateFields.priceLabel = normalizedPatch.priceLabel.trim().slice(0, 24) || 'Free';
    if (normalizedPatch.mcVersions !== undefined) {
      const list = Array.isArray(normalizedPatch.mcVersions)
        ? normalizedPatch.mcVersions
        : normalizedPatch.mcVersions
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean);
      updateFields.mcVersions = list.length > 0 ? list.slice(0, 12) : plugin.mcVersions;
    }
    if (normalizedPatch.supportUrl !== undefined) updateFields.supportUrl = normalizedPatch.supportUrl.trim().slice(0, 256);
    if (normalizedPatch.iconUrl !== undefined) updateFields.iconUrl = normalizedPatch.iconUrl;
    if (normalizedPatch.featured !== undefined) updateFields.featured = Boolean(normalizedPatch.featured);
    if (normalizedPatch.status !== undefined) updateFields.status = normalizedPatch.status;

    const ref = doc(db, 'plugins', plugin.id);
    await updateDoc(ref, updateFields);
    const snap = await getDoc(ref);
    const hydrated = await hydrateFirestorePluginDoc(
      plugin.id,
      (snap.data() || {}) as Record<string, unknown>
    );
    return { ok: true, plugin: hydrated };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not update plugin.' };
  }
}

export async function pushPluginVersionClient(
  plugin: PluginListing,
  input: { version: string; title: string; changelog: string; file: File }
): Promise<{ ok: true; plugin: PluginListing } | { ok: false; error: string }> {
  const version = input.version.trim();
  if (!/^[a-zA-Z0-9._-]{1,24}$/.test(version)) {
    return { ok: false, error: 'Version must be 1–24 characters (e.g. 1.1.0).' };
  }

  const buffer = await input.file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const fileCheck = validatePluginFileMeta(input.file.name, bytes.length, bytes);
  if (!fileCheck.ok) {
    return { ok: false, error: fileCheck.error };
  }

  const headers = await getFirebaseAuthHeaders(true);
  const verAttempt = await attemptJsonApi<{ ok: boolean; versionId: string }>(
    `/api/plugins/${encodeURIComponent(plugin.id)}/versions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({
        version,
        title: input.title.trim() || `Update v${version}`,
        changelog: input.changelog.trim() || `Released version ${version}.`,
      }),
    }
  );
  if (verAttempt.kind === 'api_error') {
    return { ok: false, error: verAttempt.error };
  }

  if (verAttempt.kind === 'ok') {
    const fileAttempt = await attemptJsonApi<{ ok: boolean; plugin: PluginListing }>(
      `/api/plugins/${encodeURIComponent(plugin.id)}/versions/${encodeURIComponent(
        verAttempt.data.versionId
      )}/file`,
      {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/octet-stream',
          'X-File-Name': input.file.name,
        },
        body: buffer,
      }
    );
    if (fileAttempt.kind === 'ok') {
      return { ok: true, plugin: fileAttempt.data.plugin };
    }
    return {
      ok: false,
      error: fileAttempt.kind === 'api_error' ? fileAttempt.error : 'Failed uploading version file.',
    };
  }

  // Firestore fallback
  if (bytes.length > MAX_FIRESTORE_PLUGIN_BYTES) {
    return { ok: false, error: 'Plugin version archive exceeds 15 MB static-host limit.' };
  }

  try {
    const versionId = `ver-${Date.now()}`;
    const sha256 = await computeSha256Hex(buffer);
    const nowIso = new Date().toISOString();

    const totalChunks = Math.ceil(bytes.length / FIRESTORE_CHUNK_RAW_BYTES);
    for (let idx = 0; idx < totalChunks; idx += 1) {
      const start = idx * FIRESTORE_CHUNK_RAW_BYTES;
      const slice = bytes.subarray(start, Math.min(bytes.length, start + FIRESTORE_CHUNK_RAW_BYTES));
      const chunkId = `${versionId}_${idx}`;
      await setDoc(doc(db, 'plugins', plugin.id, 'chunks', chunkId), {
        id: chunkId,
        pluginId: plugin.id,
        versionId,
        index: idx,
        dataBase64: bytesToBase64(slice),
        createdAt: serverTimestamp(),
      });
    }

    const newVer: PluginVersionRecord = {
      id: versionId,
      version,
      title: input.title.trim().slice(0, 80) || `Update v${version}`,
      changelog: input.changelog.trim().slice(0, 4000) || `Released version ${version}.`,
      fileName: fileCheck.safeName,
      storedFileName: fileCheck.safeName,
      fileSize: bytes.length,
      sha256,
      downloads: 0,
      createdAt: nowIso,
    };

    const nextVersions = [newVer, ...plugin.versions];
    const ref = doc(db, 'plugins', plugin.id);
    await updateDoc(ref, {
      currentVersion: version,
      fileName: fileCheck.safeName,
      fileSize: bytes.length,
      sha256,
      status: 'published',
      versionsJson: JSON.stringify(nextVersions),
      updatedAtIso: nowIso,
      updatedAt: serverTimestamp(),
    });

    const snap = await getDoc(ref);
    const hydrated = await hydrateFirestorePluginDoc(
      plugin.id,
      (snap.data() || {}) as Record<string, unknown>
    );
    return { ok: true, plugin: hydrated };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed pushing plugin update.' };
  }
}

export async function deletePluginClient(
  pluginId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const headers = await getFirebaseAuthHeaders(true);
  const apiAttempt = await attemptJsonApi<{ ok: boolean }>(
    `/api/plugins/${encodeURIComponent(pluginId)}`,
    { method: 'DELETE', headers }
  );
  if (apiAttempt.kind === 'ok') return { ok: true };
  if (apiAttempt.kind === 'api_error') return { ok: false, error: apiAttempt.error };

  try {
    const [chunkSnap, revSnap] = await Promise.all([
      getDocs(collection(db, 'plugins', pluginId, 'chunks')),
      getDocs(collection(db, 'plugins', pluginId, 'reviews')),
    ]);
    await Promise.all([
      ...chunkSnap.docs.map((d) => deleteDoc(d.ref)),
      ...revSnap.docs.map((d) => deleteDoc(d.ref)),
    ]);
    await deleteDoc(doc(db, 'plugins', pluginId));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not delete plugin.' };
  }
}

export async function downloadPluginArchiveClient(
  plugin: PluginListing,
  versionId?: string,
  fileNameOverride?: string
): Promise<{ ok: true; fileName: string } | { ok: false; error: string }> {
  const targetName = sanitizeDownloadFilename(
    fileNameOverride || plugin.fileName || `${plugin.slug}.jar`
  );
  try {
    const headers = await getFirebaseAuthHeaders();
    const q = versionId ? `?versionId=${encodeURIComponent(versionId)}` : '';
    const res = await fetch(`/api/plugins/${encodeURIComponent(plugin.id)}/download${q}`, {
      headers,
    });
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (res.ok && !ct.includes('text/html') && !ct.includes('application/json')) {
      const blob = await res.blob();
      triggerBrowserDownload(blob, targetName);
      return { ok: true, fileName: targetName };
    }
    if (ct.includes('application/json') && !res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: err.error || 'Unable to download this plugin archive.' };
    }
  } catch {
    // Fall through to Firestore chunk download
  }

  try {
    const targetVer = versionId || plugin.versions[0]?.id;
    const chunkQuery = targetVer
      ? query(collection(db, 'plugins', plugin.id, 'chunks'), where('versionId', '==', targetVer))
      : collection(db, 'plugins', plugin.id, 'chunks');
    const snap = await getDocs(chunkQuery);
    if (snap.empty) {
      return { ok: false, error: 'Plugin archive file is not available yet.' };
    }
    const sorted = snap.docs
      .map((d) => d.data() as { index?: number; dataBase64?: string })
      .sort((a, b) => Number(a.index || 0) - Number(b.index || 0));

    const byteArrays = sorted.map((c) => base64ToBytes(String(c.dataBase64 || '')));
    const totalLen = byteArrays.reduce((acc, arr) => acc + arr.length, 0);
    const merged = new Uint8Array(totalLen);
    let offset = 0;
    for (const arr of byteArrays) {
      merged.set(arr, offset);
      offset += arr.length;
    }

    const mime = targetName.toLowerCase().endsWith('.zip')
      ? 'application/zip'
      : 'application/java-archive';
    triggerBrowserDownload(new Blob([merged], { type: mime }), targetName);
    return { ok: true, fileName: targetName };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unable to download plugin archive.',
    };
  }
}

function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function submitPluginReviewClient(
  plugin: PluginListing,
  payload: { rating: number; title: string; comment: string; testedVersion: string; authorName?: string }
): Promise<{ ok: true; plugin: PluginListing } | { ok: false; error: string }> {
  const validated = validateReviewPayload(payload);
  if (!validated.ok) return { ok: false, error: validated.error };

  const headers = await getFirebaseAuthHeaders(true);
  const apiAttempt = await attemptJsonApi<{ ok: boolean; plugin: PluginListing }>(
    `/api/plugins/${encodeURIComponent(plugin.id)}/reviews`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({
        rating: validated.data.rating,
        title: validated.data.title,
        comment: validated.data.comment,
        testedVersion: validated.data.testedVersion,
        authorName: payload.authorName,
      }),
    }
  );
  if (apiAttempt.kind === 'ok') return { ok: true, plugin: apiAttempt.data.plugin };
  if (apiAttempt.kind === 'api_error') return { ok: false, error: apiAttempt.error };

  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    return { ok: false, error: 'Sign in with a verified account before posting a review.' };
  }

  try {
    const reviewId = `rev_${currentUser.uid}`;
    const nowIso = new Date().toISOString();
    const authorName = sanitizeUsername(
      payload.authorName || currentUser.displayName || currentUser.email?.split('@')[0] || 'Player'
    );

    const revRef = doc(db, 'plugins', plugin.id, 'reviews', reviewId);
    const existing = await getDoc(revRef);
    if (existing.exists()) {
      await updateDoc(revRef, {
        rating: validated.data.rating,
        title: validated.data.title,
        comment: validated.data.comment,
        testedVersion: validated.data.testedVersion,
        updatedAtIso: nowIso,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(revRef, {
        id: reviewId,
        pluginId: plugin.id,
        authorUid: currentUser.uid,
        authorName,
        rating: validated.data.rating,
        title: validated.data.title,
        comment: validated.data.comment,
        testedVersion: validated.data.testedVersion,
        createdAtIso: nowIso,
        updatedAtIso: nowIso,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const pluginSnap = await getDoc(doc(db, 'plugins', plugin.id));
    const hydrated = await hydrateFirestorePluginDoc(
      plugin.id,
      (pluginSnap.data() || {}) as Record<string, unknown>
    );
    return { ok: true, plugin: hydrated };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not submit review.' };
  }
}

export async function replyPluginReviewClient(
  plugin: PluginListing,
  reviewId: string,
  reply: string
): Promise<{ ok: true; plugin: PluginListing } | { ok: false; error: string }> {
  const cleanReply = reply.trim().slice(0, 1000);
  if (!cleanReply) return { ok: false, error: 'Reply text cannot be empty.' };

  const headers = await getFirebaseAuthHeaders(true);
  const apiAttempt = await attemptJsonApi<{ ok: boolean; plugin: PluginListing }>(
    `/api/plugins/${encodeURIComponent(plugin.id)}/reviews/${encodeURIComponent(reviewId)}/reply`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ reply: cleanReply }),
    }
  );
  if (apiAttempt.kind === 'ok') return { ok: true, plugin: apiAttempt.data.plugin };
  if (apiAttempt.kind === 'api_error') return { ok: false, error: apiAttempt.error };

  try {
    const nowIso = new Date().toISOString();
    await updateDoc(doc(db, 'plugins', plugin.id, 'reviews', reviewId), {
      ownerReply: cleanReply,
      ownerRepliedAt: nowIso,
      updatedAtIso: nowIso,
      updatedAt: serverTimestamp(),
    });
    const pluginSnap = await getDoc(doc(db, 'plugins', plugin.id));
    const hydrated = await hydrateFirestorePluginDoc(
      plugin.id,
      (pluginSnap.data() || {}) as Record<string, unknown>
    );
    return { ok: true, plugin: hydrated };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not save reply.' };
  }
}

export async function deletePluginReviewClient(
  pluginId: string,
  reviewId: string
): Promise<{ ok: true; plugin?: PluginListing } | { ok: false; error: string }> {
  const headers = await getFirebaseAuthHeaders(true);
  const apiAttempt = await attemptJsonApi<{ ok: boolean; plugin: PluginListing }>(
    `/api/plugins/${encodeURIComponent(pluginId)}/reviews/${encodeURIComponent(reviewId)}`,
    { method: 'DELETE', headers }
  );
  if (apiAttempt.kind === 'ok') return { ok: true, plugin: apiAttempt.data.plugin };
  if (apiAttempt.kind === 'api_error') return { ok: false, error: apiAttempt.error };

  try {
    await deleteDoc(doc(db, 'plugins', pluginId, 'reviews', reviewId));
    const pluginSnap = await getDoc(doc(db, 'plugins', pluginId));
    const hydrated = await hydrateFirestorePluginDoc(
      pluginId,
      (pluginSnap.data() || {}) as Record<string, unknown>
    );
    return { ok: true, plugin: hydrated };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not delete review.' };
  }
}

export async function listOwnerDomainsClient(): Promise<OwnerDomainEntry[]> {
  if (!isOwnerUser(auth.currentUser)) return [];
  const headers = await getFirebaseAuthHeaders();
  const apiAttempt = await attemptJsonApi<{ ok: boolean; domains: OwnerDomainEntry[] }>(
    '/api/owner/domains',
    { headers }
  );
  if (apiAttempt.kind === 'ok' && Array.isArray(apiAttempt.data.domains)) {
    return apiAttempt.data.domains;
  }

  try {
    const snap = await getDocs(collection(db, 'domains'));
    return snap.docs.map((docSnap) => {
      const d = docSnap.data() as Record<string, unknown>;
      const handle = String(d.handle || docSnap.id);
      const edition =
        d.edition === 'Bedrock' || d.edition === 'Crossplay' ? d.edition : 'Java';
      return {
        handle,
        workingDomain: `${handle}.duckdns.org`,
        connectAddress: `${handle}.duckdns.org:${Number(d.targetPort || 25565)}`,
        serverName: String(d.serverName || handle),
        targetHost: String(d.targetHost || ''),
        targetPort: Number(d.targetPort || 25565),
        edition,
        dnsStatus: 'Firestore synced',
      } satisfies OwnerDomainEntry;
    });
  } catch {
    return [];
  }
}

export async function deleteOwnerDomainClient(
  handle: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const headers = await getFirebaseAuthHeaders(true);
  const apiAttempt = await attemptJsonApi<{ ok: boolean }>(
    `/api/owner/domains/${encodeURIComponent(handle)}`,
    { method: 'DELETE', headers }
  );
  if (apiAttempt.kind === 'ok') return { ok: true };
  if (apiAttempt.kind === 'api_error') return { ok: false, error: apiAttempt.error };

  try {
    await deleteDoc(doc(db, 'domains', handle));
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not delete domain.',
    };
  }
}
