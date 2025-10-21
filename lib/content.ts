
export interface Mention {
  id: string;
  type: 'mention' | 'micro';
  text: string;
}

export interface DayMentions {
  AM: Mention[];
  PM: Mention[];
  MICRO: Mention[];
}

// Using day numbers from event config: 27, 28, 29
export const mentions: Record<number, DayMentions> = {
  27: {
    AM: [
      { id: 'd27-am-1', type: 'mention', text: '¡Buenos días a todos! Bienvenidos al primer día de Arenal Conagui. Recuerden visitar el stand de Arenal para conocer nuestras nuevas tarifas de colaborador.' },
      { id: 'd27-am-2', type: 'mention', text: 'No se pierdan la charla sobre "Turismo Sostenible en La Fortuna" a las 10:30 AM en el salón principal.' },
    ],
    PM: [
      { id: 'd27-pm-1', type: 'mention', text: 'Esperamos que estén disfrutando del almuerzo. A las 2 PM tendremos una demostración de nuestros nuevos sistemas de reserva en el stand de Arenal.' },
      { id: 'd27-pm-2', type: 'mention', text: '¡El primer sorteo del día será a las 4 PM! Asegúrense de haber registrado sus datos para participar.' },
    ],
    MICRO: [
      { id: 'd27-micro-1', type: 'micro', text: 'Arenal: tu socio estratégico en La Fortuna.' },
      { id: 'd27-micro-2', type: 'micro', text: '¿Ya conoces nuestros paquetes de aventura? ¡Pregúntanos!' },
      { id: 'd27-micro-3', type: 'micro', text: 'Síguenos en redes sociales como @ArenalTours.' },
    ],
  },
  28: {
    AM: [
      { id: 'd28-am-1', type: 'mention', text: '¡Excelente segundo día! Hoy tendremos reuniones 1-a-1. Si aún no tienes la tuya, pasa por nuestro stand para agendarla.' },
      { id: 'd28-am-2', type: 'mention', text: 'A las 11 AM, tendremos un panel con expertos sobre el futuro de los traslados turísticos en Costa Rica.' },
    ],
    PM: [
      { id: 'd28-pm-1', type: 'mention', text: '¡No olviden el coffee break a las 3 PM! Una cortesía de Arenal para recargar energías.' },
      { id: 'd28-pm-2', type: 'mention', text: 'El gran sorteo de un fin de semana en La Fortuna será a las 5 PM. ¡Mucha suerte a todos!' },
    ],
    MICRO: [
      { id: 'd28-micro-1', type: 'micro', text: 'Traslados seguros y puntuales con Arenal.' },
      { id: 'd28-micro-2', type: 'micro', text: 'Descubre la magia del volcán con nuestros tours.' },
    ],
  },
  29: {
    AM: [
        { id: 'd29-am-1', type: 'mention', text: 'Último día, ¡aprovechémoslo al máximo! Pasa por nuestro stand para recibir condiciones especiales de cierre de feria.' },
        { id: 'd29-am-2', type: 'mention', text: 'A las 10 AM, charla de clausura y agradecimientos. ¡No falten!' },
    ],
    PM: [
        { id: 'd29-pm-1', type: 'mention', text: 'Gracias a todos por acompañarnos. Ha sido un evento increíble. ¡Nos vemos en la próxima edición!' },
    ],
    MICRO: [
        { id: 'd29-micro-1', type: 'micro', text: 'Arenal les desea un excelente viaje de regreso.' },
        { id: 'd29-micro-2', type: 'micro', text: '¡Hasta la próxima aventura juntos!' },
    ],
  },
};
