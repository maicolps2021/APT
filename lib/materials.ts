import { collection, doc, getDocs, addDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from './supabaseClient';

export type Material = {
  id: string;
  name: string;
  url: string;
  type?: 'pdf'|'image'|'link'|'doc'|string;
  updated_at?: any;
};

export async function loadMaterials(orgId: string): Promise<Material[]> {
  const col = collection(db, 'orgs', orgId, 'materials');
  const q = query(col, orderBy('name', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Material[];
}

export async function addMaterial(orgId: string, data: Omit<Material,'id'|'updated_at'>) {
  const col = collection(db, 'orgs', orgId, 'materials');
  await addDoc(col, { ...data, updated_at: serverTimestamp() });
}

export async function deleteMaterial(orgId: string, materialId: string) {
  await deleteDoc(doc(db, 'orgs', orgId, 'materials', materialId));
}

/** Log de actividad por lead al compartir un material */
export async function logShare(orgId: string, leadId: string, materialId: string, channel: 'wa'|'email') {
  // Note: Firestore does not allow creating documents in a subcollection of a non-existent document.
  // The lead document must exist.
  const col = collection(db, 'leads', leadId, 'activity');
  await addDoc(col, {
    org_id: orgId,
    type: 'share',
    materialId,
    channel,
    at: serverTimestamp(),
  });
}
