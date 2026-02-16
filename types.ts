export type BetResult = 'Pendiente' | 'Ganada' | 'Perdida' | 'Nula' | 'Cash Out';

export interface Selection {
  match: string;
  competition: string;
  type: string;
  customType?: string;
  odds: number;
  time: string;
  date: string;
}

export interface Bet {
  id?: string;
  date: string;
  createdAt?: string;
  modality: 'Simple' | 'Combinada' | 'Sistema';
  selections: Selection[];
  totalOdds: number;
  amount: number | string;
  stake: number;
  bookmaker: string;
  result: BetResult;
  notes: string;
  cashOutValue: number | string;
}

export interface Deposit {
  id?: string;
  amount: number | string;
  date: string;
  createdAt?: string;
  note: string;
}

export interface Notification {
  id: string;
  type: 'win' | 'loss' | 'info';
  title: string;
  message: string;
  amount?: number;
  timestamp: number;
}

export interface ImageGenConfig {
  prompt: string;
  aspectRatio: string;
  imageSize: string;
}