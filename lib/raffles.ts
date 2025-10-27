import { collection, deleteDoc, doc, getDocs, query, where, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from './supabaseClient';
import { EVENT_CODE, ORG_UUID, EVENT_DATES } from './config';
import type { Lead, Raffle } from '../types';
import { formatCRDay, startEndOfCRDay } from './time';

/**
 * Elimina un documento de sorteo de la base de datos.
 * Nota: El esquema actual no tiene una subcolección de 'tickets', 
 * por lo que la eliminación no es en cascada, solo se elimina el sorteo principal.
 * @param raffleId El ID del sorteo a eliminar.
 */
export async function deleteRaffle(raffleId: string) {
  await deleteDoc(doc(db, 'raffles', raffleId));
}

type FindLeadsOptions = {
  orgId: string;
  eventCode: string;
  date: Date;
};

/**
 * Busca leads elegibles para un sorteo en una fecha específica, utilizando múltiples estrategias para compatibilidad.
 * @param opts Opciones de búsqueda incluyendo orgId, eventCode y la fecha del sorteo.
 * @returns Una promesa que resuelve a un array de objetos Lead.
 */
export async function fetchEligibleLeadsForRaffle(opts: FindLeadsOptions): Promise<Lead[]> {
  const { date, orgId, eventCode } = opts;
  const dayStr = formatCRDay(date);
  const { start, end } = startEndOfCRDay(date);
  const dayNum = date.getUTCDate(); // Asumiendo que la fecha construida es UTC

  const leadsCol = collection(db, 'leads');

  // Estrategia A: Búsqueda por campo 'day' con formato "YYYY-MM-DD"
  const q1 = query(leadsCol, where('org_id', '==', orgId), where('event_code', '==', eventCode), where('day', '==', dayStr));
  const s1 = await getDocs(q1);
  if (!s1.empty) return s1.docs.map(d => ({ id: d.id, ...d.data() } as Lead));

  // Estrategia B (Fallback): Búsqueda por rango de timestamp 'created_at' para el día en CR
  const q2 = query(leadsCol, where('org_id', '==', orgId), where('event_code', '==', eventCode), where('created_at', '>=', Timestamp.fromDate(start)), where('created_at', '<=', Timestamp.fromDate(end)));
  const s2 = await getDocs(q2);
  if (!s2.empty) return s2.docs.map(d => ({ id: d.id, ...d.data() } as Lead));

  // Estrategia C (Fallback): Búsqueda por campo 'day' numérico (legado)
  const q3 = query(leadsCol, where('org_id', '==', orgId), where('event_code', '==', eventCode), where('day', '==', dayNum));
  const s3 = await getDocs(q3);
  if (!s3.empty) return s3.docs.map(d => ({ id: d.id, ...d.data() } as Lead));

  return [];
}


/**
 * Realiza el sorteo para un raffle existente que aún no tiene ganador.
 * @param raffle El objeto del sorteo para el cual se elegirá un ganador.
 * @returns El objeto Lead del ganador, o null si no se encontraron participantes.
 */
export async function drawWinner(raffle: Raffle): Promise<Lead | null> {
    // Encuentra la fecha completa correspondiente al día del sorteo
    const dateStr = EVENT_DATES.split(',').find(d => d.trim().endsWith(String(raffle.day).padStart(2, '0')));
    if (!dateStr) {
      throw new Error(`No se encontró una fecha configurada para el día ${raffle.day}.`);
    }
    // Usar una hora neutral para evitar problemas de zona horaria con la fecha
    const raffleDate = new Date(`${dateStr.trim()}T12:00:00Z`);

    const leads = await fetchEligibleLeadsForRaffle({
        orgId: ORG_UUID,
        eventCode: EVENT_CODE,
        date: raffleDate,
    });

    if (leads.length === 0) {
      throw new Error(`No se encontraron leads para el día ${raffle.day} para realizar el sorteo.`);
    }

    const randomWinner = leads[Math.floor(Math.random() * leads.length)];
    
    // Actualizar el documento del sorteo con el ganador y las estadísticas
    const raffleRef = doc(db, 'raffles', raffle.id);
    await updateDoc(raffleRef, {
        winner_lead_id: randomWinner.id,
        status: 'Drawn',
        drawn_at: serverTimestamp(),
        tickets_count: leads.length,
        participants_count: leads.length,
    });

    return randomWinner;
}

/**
 * Calcula y guarda las estadísticas (conteos) para un sorteo.
 * Usado como fallback si los contadores no existen en el documento.
 * @param raffle El objeto del sorteo.
 * @returns Un objeto con los conteos actualizados.
 */
export async function getAndSaveRaffleStats(raffle: Raffle): Promise<{ participants_count: number; tickets_count: number; }> {
    const dateStr = EVENT_DATES.split(',').find(d => d.trim().endsWith(String(raffle.day).padStart(2, '0')));
    if (!dateStr) {
      console.warn(`Could not find date for raffle day ${raffle.day}, cannot calculate stats.`);
      return { participants_count: 0, tickets_count: 0 };
    }
    const raffleDate = new Date(`${dateStr.trim()}T12:00:00Z`);

    const leads = await fetchEligibleLeadsForRaffle({
        orgId: raffle.org_id || ORG_UUID,
        eventCode: raffle.event_code || EVENT_CODE,
        date: raffleDate,
    });

    const stats = {
        participants_count: leads.length,
        tickets_count: leads.length,
    };

    const raffleRef = doc(db, 'raffles', raffle.id);
    await updateDoc(raffleRef, stats);

    return stats;
}
