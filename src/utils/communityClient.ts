import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { CommunityRequest } from '../data/catalog';
import { OperationType, auth, db, handleFirestoreError } from '../firebase';
import { sanitizeUsername } from './userValidation';
import { validateCommunityRequestPayload } from './ownerModeration';

const COLLECTION = 'community_requests';

function mapDocToRequest(id: string, d: Record<string, unknown>): CommunityRequest {
  const status =
    d.status === 'Planned' ||
    d.status === 'In Progress' ||
    d.status === 'Shipped' ||
    d.status === 'Under Review'
      ? d.status
      : 'Under Review';

  const iso = typeof d.createdAtIso === 'string' ? d.createdAtIso : '';
  const displayDate = iso ? new Date(iso).toLocaleDateString() : 'Recently';

  return {
    id: String(d.id || id),
    title: String(d.title || 'Community Request'),
    description: String(d.description || ''),
    category: String(d.category || 'Server Owner Tools'),
    author: String(d.authorName || 'Community Member'),
    votes: Number(d.votes || 0),
    status,
    createdAt: displayDate,
  };
}

export async function listCommunityRequestsFromFirestore(): Promise<CommunityRequest[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION));
    return snap.docs
      .map((docSnap) => mapDocToRequest(docSnap.id, docSnap.data() as Record<string, unknown>))
      .sort((a, b) => b.votes - a.votes);
  } catch {
    return [];
  }
}

export async function createCommunityRequestInFirestore(input: {
  id: string;
  title: string;
  description: string;
  category: string;
}): Promise<{ ok: true; request: CommunityRequest } | { ok: false; error: string }> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    return { ok: false, error: 'Sign in with a verified account to sync requests to cloud.' };
  }

  const validated = validateCommunityRequestPayload(input);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const authorName = sanitizeUsername(
    currentUser.displayName || currentUser.email?.split('@')[0] || 'CommunityMember'
  );
  const nowIso = new Date().toISOString();
  const path = `${COLLECTION}/${input.id}`;

  try {
    await setDoc(doc(db, COLLECTION, input.id), {
      id: input.id,
      title: validated.data.title,
      description: validated.data.description,
      category: validated.data.category,
      authorUid: currentUser.uid,
      authorName,
      votes: 1,
      status: 'Under Review',
      createdAtIso: nowIso,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return {
      ok: true,
      request: {
        id: input.id,
        title: validated.data.title,
        description: validated.data.description,
        category: validated.data.category,
        author: authorName,
        votes: 1,
        status: 'Under Review',
        createdAt: 'Just now',
      },
    };
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.CREATE, path);
    } catch (wrapped) {
      return {
        ok: false,
        error: wrapped instanceof Error ? wrapped.message : 'Unable to save community request.',
      };
    }
  }
}

export async function updateCommunityRequestStatusInFirestore(
  requestId: string,
  status: CommunityRequest['status']
): Promise<void> {
  if (!auth.currentUser?.emailVerified) return;
  const path = `${COLLECTION}/${requestId}`;
  try {
    await updateDoc(doc(db, COLLECTION, requestId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    // Only log if doc exists in Firestore; seeded local items aren't in Firestore
    if (error instanceof Error && error.message.toLowerCase().includes('no document')) {
      return;
    }
    try {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } catch {
      // Ignore if seeded local-only item
    }
  }
}

export async function updateCommunityRequestVotesInFirestore(
  requestId: string,
  nextVotes: number
): Promise<void> {
  if (!auth.currentUser?.emailVerified) return;
  try {
    await updateDoc(doc(db, COLLECTION, requestId), {
      votes: Math.max(0, Math.round(nextVotes)),
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Seeded local items aren't in Firestore; ignore gracefully
  }
}

export async function deleteCommunityRequestInFirestore(requestId: string): Promise<void> {
  if (!auth.currentUser?.emailVerified) return;
  const path = `${COLLECTION}/${requestId}`;
  try {
    await deleteDoc(doc(db, COLLECTION, requestId));
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.DELETE, path);
    } catch {
      // Ignore if local-only seeded request
    }
  }
}
