import { collection, doc, getDocs, addDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db } from './supabaseClient';


export type Material = {
  id: string;
  name: string;
  url: string;
  type?: 'pdf'|'image'|'link'|'doc'|string;
  size?: number;
  contentType?: string;
  updated_at?: any;
};

export async function loadMaterials(orgId: string): Promise<Material[]> {
  const col = collection(db, 'orgs', orgId, 'materials');
  const q = query(col, orderBy('name', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Material[];
}

export async function deleteMaterial(orgId: string, materialId: string) {
  await deleteDoc(doc(db, 'orgs', orgId, 'materials', materialId));
}

/** Sube a Storage y crea doc en Firestore. */
export function uploadMaterial(orgId: string, file: File, opts?: { onProgress?: (pct:number)=>void }) {
  const storage = getStorage();
  // Using a random UUID for the document ID folder to ensure uniqueness
  const autoId = crypto.randomUUID();
  const path = `orgs/${orgId}/materials/${autoId}/${file.name}`;
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, file, { contentType: file.type || undefined });

  return new Promise<Material>((resolve, reject) => {
    task.on('state_changed',
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        opts?.onProgress?.(pct);
      },
      (err) => reject(err),
      async () => {
        try {
            const url = await getDownloadURL(task.snapshot.ref);
            const col = collection(db, 'orgs', orgId, 'materials');
            
            const materialData: Omit<Material, 'id'> = {
              name: file.name,
              url,
              type: inferType(file),
              size: file.size,
              contentType: file.type || undefined,
              updated_at: serverTimestamp(),
            };

            const docRef = await addDoc(col, materialData);
            
            resolve({
              id: docRef.id,
              ...materialData
            } as Material);

        } catch (error) {
            reject(error);
        }
      }
    );
  });
}

function inferType(file: File): string {
  const ct = file.type || '';
  if (ct.startsWith('image/')) return 'image';
  if (ct === 'application/pdf') return 'pdf';
  if (ct.includes('msword') || ct.includes('officedocument.wordprocessingml')) return 'doc';
  if (ct.includes('ms-excel') || ct.includes('spreadsheetml')) return 'sheet';
  if (ct.includes('ms-powerpoint') || ct.includes('presentationml')) return 'presentation';
  return 'file';
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