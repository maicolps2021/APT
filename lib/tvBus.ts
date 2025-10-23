// lib/tvBus.ts
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, Timestamp, where } from 'firebase/firestore';
import { db } from './supabaseClient';
import type { Lead } from '../types';

export type TvEvent = {
  lead: {
    id: string;
    name: string;
    company?: string;
    notes?: string;
  };
  welcomeMessage: string;
  createdAt?: any; // serverTimestamp
};

const COL = 'tv_events';

export async function emitTvEvent(evt: Omit<TvEvent, 'createdAt'>): Promise<void> {
  await addDoc(collection(db, COL), {
    ...evt,
    createdAt: serverTimestamp(),
  });
}

// Escucha eventos recientes (últimos 5 minutos) y futuros en tiempo real
export function listenTvEvents(cb: (evt: TvEvent) => void) {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const q = query(
    collection(db, COL),
    where('createdAt', '>=', Timestamp.fromDate(fiveMinAgo)),
    orderBy('createdAt', 'desc'),
  );
  const unsub = onSnapshot(q, (snap) => {
    snap.docChanges().forEach((chg) => {
      if (chg.type === 'added') {
        const d = chg.doc.data() as any;
        cb({
          lead: { id: d.lead?.id ?? '', name: d.lead?.name ?? 'Guest', company: d.lead?.company, notes: d.lead?.notes },
          welcomeMessage: d.welcomeMessage ?? '',
          createdAt: d.createdAt,
        });
      }
    });
  });
  return unsub;
}
