// lib/tvTypes.ts

export type TVWelcomeMessage = {
  kind: 'welcome';
  leadId: string;
  firstName: string;
  company?: string;
  text: string;
};

export type TVRaffleMessage = {
  kind: 'raffle';
  raffleId: string;
  raffleName: string;
  prize?: string;
  winnerName: string;
  winnerCompany?: string;
};

export type TVEventMessage = TVWelcomeMessage | TVRaffleMessage;
