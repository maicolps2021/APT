import { collection, deleteDoc, doc, getDocs, query, where, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './supabaseClient';
import { EVENT_CODE, ORG_UUID } from './config';
import type { Lead, Raffle } from '../types';

/**
 * Elimina un documento de sorteo de la base de datos.
 * Nota: El esquema actual no tiene una subcolección de 'tickets', 
 * por lo que la eliminación no es en cascada, solo se elimina el sorteo principal.
 * @param raffleId El ID del sorteo a eliminar.
 */
export async function deleteRaffle(raffleId: string) {
  await deleteDoc(doc(db, 'raffles', raffleId));
}

/**
 * Realiza el sorteo para un raffle existente que aún no tiene ganador.
 * @param raffle El objeto del sorteo para el cual se elegirá un ganador.
 * @returns El objeto Lead del ganador, o null si no se encontraron participantes.
 */
export async function drawWinner(raffle: Raffle): Promise<Lead | null> {
    const leadsRef = collection(db, 'leads');
    const q = query(leadsRef,
        where('event_code', '==', EVENT_CODE),
        where('org_id', '==', ORG_UUID),
        where('day', '==', raffle.day)
    );
    const querySnapshot = await getDocs(q);
    
    const leads = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));

    if (leads.length === 0) {
      throw new Error(`No leads found for day ${raffle.day} to draw a winner.`);
    }

    const randomWinner = leads[Math.floor(Math.random() * leads.length)];
    
    // Actualizar el documento del sorteo con el ganador
    const raffleRef = doc(db, 'raffles', raffle.id);
    await updateDoc(raffleRef, {
        winner_lead_id: randomWinner.id,
        status: 'Drawn',
        drawn_at: serverTimestamp(),
    });

    return randomWinner;
}
