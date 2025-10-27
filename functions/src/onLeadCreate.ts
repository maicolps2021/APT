// functions/src/onLeadCreate.ts
import * as functions from 'firebase-functions';
import { Timestamp } from 'firebase-admin/firestore';

const TZ = 'America/Costa_Rica';

function formatCRDay(d: Date): string {
  // "YYYY-MM-DD" en CR
  const y = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year:'numeric' }).format(d);
  const m = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, month:'2-digit' }).format(d);
  const dd = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, day:'2-digit' }).format(d);
  return `${y}-${m}-${dd}`;
}

function slotCR(d: Date): 'AM'|'PM' {
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour:'2-digit', hour12:false }).format(d));
  return h < 12 ? 'AM' : 'PM';
}

export const onLeadCreate = functions.firestore
  .document('leads/{leadId}') // Assuming a top-level 'leads' collection
  .onCreate(async (snap, ctx) => {
    const data = snap.data() || {};
    // The created_at field is a server-side timestamp
    const created = (data.created_at as Timestamp | undefined)?.toDate() || new Date();
    
    const updates: any = {};

    // Calculate the correct day and slot based on the server timestamp
    const correctDay = formatCRDay(created);
    const correctSlot = slotCR(created);

    // Update if the client-provided values are missing or different
    if (data.day !== correctDay) {
        updates.day = correctDay;
    }
    if (data.slot !== correctSlot) {
        updates.slot = correctSlot;
    }

    if (Object.keys(updates).length > 0) {
      console.log(`Normalizing time for lead ${snap.id}:`, updates);
      await snap.ref.update(updates);
    }
  });
