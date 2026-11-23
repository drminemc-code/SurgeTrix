import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, User as FirebaseUser, getAuth } from 'firebase/auth';
import {
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { ThemeStyleId } from './utils/themePresets';
import { isValidThemeId, sanitizeUsername } from './utils/userValidation';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});


export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

export interface UserProfileRecord {
  uid: string;
  username: string;
  plan: 'Free' | 'Plus' | 'Pro' | 'Business';
  preferredTheme: ThemeStyleId;
}

const inFlightProfiles = new Map<string, Promise<UserProfileRecord | null>>();

export async function ensureUserProfile(
  firebaseUser: FirebaseUser,
  activeThemeId: ThemeStyleId,
  preferredUsername?: string
): Promise<UserProfileRecord | null> {
  if (!firebaseUser.emailVerified) {
    return null;
  }

  const existingPromise = inFlightProfiles.get(firebaseUser.uid);
  if (existingPromise) {
    return existingPromise;
  }

  const work = (async (): Promise<UserProfileRecord | null> => {
    const userPath = `users/${firebaseUser.uid}`;
    const privatePath = `users/${firebaseUser.uid}/private/info`;
    const userRef = doc(db, 'users', firebaseUser.uid);

    let existingSnap;
    try {
      existingSnap = await getDoc(userRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, userPath);
    }

    if (existingSnap.exists()) {
      const data = existingSnap.data();
      return {
        uid: firebaseUser.uid,
        username: typeof data.username === 'string' ? data.username : 'SurgePlayer',
        plan:
          data.plan === 'Plus' || data.plan === 'Pro' || data.plan === 'Business'
            ? data.plan
            : 'Free',
        preferredTheme: isValidThemeId(String(data.preferredTheme))
          ? (data.preferredTheme as ThemeStyleId)
          : activeThemeId,
      };
    }

    const cleanUsername = sanitizeUsername(
      preferredUsername ||
        firebaseUser.displayName ||
        firebaseUser.email?.split('@')[0] ||
        'SurgePlayer'
    );
    const safeTheme: ThemeStyleId = isValidThemeId(activeThemeId) ? activeThemeId : 'obsidian';
    const cleanEmail = (firebaseUser.email || 'user@surgetrix.net').trim().slice(0, 160);

    const batch = writeBatch(db);
    batch.set(userRef, {
      uid: firebaseUser.uid,
      username: cleanUsername,
      plan: 'Free',
      preferredTheme: safeTheme,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'users', firebaseUser.uid, 'private', 'info'), {
      uid: firebaseUser.uid,
      email: cleanEmail,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (error) {
      // If another tab or concurrent call created it just before us, read it back cleanly
      try {
        const retrySnap = await getDoc(userRef);
        if (retrySnap.exists()) {
          const data = retrySnap.data();
          return {
            uid: firebaseUser.uid,
            username: typeof data.username === 'string' ? data.username : cleanUsername,
            plan:
              data.plan === 'Plus' || data.plan === 'Pro' || data.plan === 'Business'
                ? data.plan
                : 'Free',
            preferredTheme: isValidThemeId(String(data.preferredTheme))
              ? (data.preferredTheme as ThemeStyleId)
              : safeTheme,
          };
        }
      } catch {
        // fall through to structured error handler
      }
      handleFirestoreError(error, OperationType.WRITE, `${userPath} & ${privatePath}`);
    }

    return {
      uid: firebaseUser.uid,
      username: cleanUsername,
      plan: 'Free',
      preferredTheme: safeTheme,
    };
  })();

  inFlightProfiles.set(firebaseUser.uid, work);
  try {
    return await work;
  } finally {
    inFlightProfiles.delete(firebaseUser.uid);
  }
}

export async function updateUserProfileFields(
  uid: string,
  patch: { username?: string; preferredTheme?: ThemeStyleId }
): Promise<void> {
  const userPath = `users/${uid}`;
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (patch.username !== undefined) {
    payload.username = sanitizeUsername(patch.username);
  }
  if (patch.preferredTheme !== undefined && isValidThemeId(patch.preferredTheme)) {
    payload.preferredTheme = patch.preferredTheme;
  }

  try {
    await updateDoc(doc(db, 'users', uid), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export interface CustomDomainRecord {
  handle: string;
  ownerUid: string;
  serverName: string;
  targetHost: string;
  targetPort: number;
  edition: 'Java' | 'Bedrock' | 'Crossplay';
}

export async function getCustomDomainByHandle(handle: string): Promise<CustomDomainRecord | null> {
  const domainPath = `domains/${handle}`;
  try {
    const snap = await getDoc(doc(db, 'domains', handle));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      handle: String(d.handle),
      ownerUid: String(d.ownerUid),
      serverName: String(d.serverName),
      targetHost: String(d.targetHost),
      targetPort: Number(d.targetPort),
      edition: d.edition === 'Bedrock' || d.edition === 'Crossplay' ? d.edition : 'Java',
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, domainPath);
  }
}

export async function saveCustomDomainToFirestore(record: CustomDomainRecord): Promise<void> {
  const domainPath = `domains/${record.handle}`;
  const ref = doc(db, 'domains', record.handle);
  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await updateDoc(ref, {
        serverName: record.serverName.slice(0, 64),
        targetHost: record.targetHost.slice(0, 253),
        targetPort: record.targetPort,
        edition: record.edition,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        handle: record.handle,
        ownerUid: record.ownerUid,
        serverName: record.serverName.slice(0, 64),
        targetHost: record.targetHost.slice(0, 253),
        targetPort: record.targetPort,
        edition: record.edition,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, domainPath);
  }
}

export async function deleteCustomDomainFromFirestore(handle: string): Promise<void> {
  const domainPath = `domains/${handle}`;
  try {
    await deleteDoc(doc(db, 'domains', handle));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, domainPath);
  }
}

export async function getFirebaseAuthHeaders(
  forceRefresh = false
): Promise<Record<string, string>> {
  const current = auth.currentUser;
  if (!current) return {};
  try {
    const token = await current.getIdToken(forceRefresh);
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}
