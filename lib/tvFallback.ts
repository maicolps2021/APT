import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, Timestamp, where } from 'firebase/firestore';
import { db } from './supabaseClient';
import type { TVWelcomeMessage } from './tvTypes';

const COL = 'tv_events';

/**
 * Sends a welcome event to Firestore. Used as a fallback when BroadcastChannel is not available.
 * @param {TVWelcomeMessage} evt The event payload.
 */
export async function sendTvEvent(evt: TVWelcomeMessage) {
  await addDoc(collection(db, COL), { ...evt, createdAt: serverTimestamp() });
}

/**
 * Listens for recent welcome events from Firestore.
 * @param {(evt: TVWelcomeMessage) => void} cb The callback to invoke with new events.
 * @returns A function to unsubscribe from the listener.
 */
export function listenTvEvents(cb: (evt: TVWelcomeMessage) => void) {
  // Listen for events from the last 2 minutes to avoid fetching old data on initial load.
  const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);
  const q = query(
    collection(db, COL),
    where('createdAt', '>=', Timestamp.fromDate(twoMinAgo)),
    orderBy('createdAt', 'desc'),
  );

  return onSnapshot(q, (snap) => {
    snap.docChanges().forEach((chg) => {
      // Only process newly added documents to avoid duplicates.
      if (chg.type === 'added') {
        const d = chg.doc.data();
        if (d.lead && d.welcomeMessage) {
            // FIX: The data from Firestore has a 'lead' object and a 'welcomeMessage' string.
            // This was creating an object that didn't match the TVWelcomeMessage type.
            // The object is now correctly constructed to match the expected type.
            cb({
              kind: 'welcome',
              leadId: d.lead.id,
              firstName: (d.lead.name || '').split(' ')[0],
              company: d.lead.company,
              text: d.welcomeMessage,
            });
        }
      }
    });
  });
}
