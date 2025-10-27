// lib/leads.ts
import { db } from './supabaseClient';
import { runTransaction, doc, collection, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import type { Lead } from '../types';

// The input can be a partial Lead object, as built by the form
export type CreateLeadInput = Omit<Lead, 'id' | 'created_at'>;

export async function createLeadUnique(input: CreateLeadInput): Promise<string> {
  const { org_id, phone_e164 } = input;

  // A phone number is optional, so we only check for uniqueness if it's provided.
  if (!phone_e164) {
      const leadsCol = collection(db, 'leads');
      const leadRef = doc(leadsCol);
      await setDoc(leadRef, {
        ...input,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      return leadRef.id;
  }
  
  // Use a flat structure that's easy to query and secure
  const uniquePhoneId = `${org_id}_${phone_e164.replace('+', '')}`;
  const idxRef = doc(db, 'unique_phones', uniquePhoneId);
  const leadsCol = collection(db, 'leads');

  return await runTransaction(db, async (tx) => {
    const idxSnap = await tx.get(idxRef);
    if (idxSnap.exists()) {
      throw new Error('DUPLICATE_PHONE');
    }

    const leadRef = doc(leadsCol); // auto-id
    
    const leadToSave = {
        ...input,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
    };

    tx.set(leadRef, leadToSave);

    tx.set(idxRef, {
      lead_id: leadRef.id,
      org_id: org_id,
      created_at: serverTimestamp(),
    });

    return leadRef.id;
  });
}
