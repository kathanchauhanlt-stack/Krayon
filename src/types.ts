export enum Rank {
  NOVICE   = "Novice Chronicler",
  ADEPT    = "Adept Weaver",
  MASTER   = "Master Illusionist",
  ARCHMAGE = "Grand Architect"
}

export interface Comic {
  id:         string;
  title:      string;
  author:     string;
  coverUrl:   string;
  manaCount:  number;
  remixCount: number;
  status:     'draft' | 'final';
  rank:       Rank;
  badge:      string;
}

export type Pillar = 'stream' | 'studio' | 'vault' | 'profile';
