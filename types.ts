export interface WordCard {
  id: string;
  french: string;
  translation: string; // Chinese translation
  definition: string;
  exampleSentence: string;
  exampleTranslation: string;
  phonetic?: string;
  gender?: string; // 'masculine' | 'feminine' | 'plural' | 'neutral'
  nuance?: string; // Cultural context or "The Vibe Check"
  createdAt: number;
}

export enum AppView {
  HOME = 'HOME',
  REVIEW = 'REVIEW',
  ADD = 'ADD'
}

export interface GeminiWordResponse {
  translation: string;
  definition: string;
  exampleSentence: string;
  exampleTranslation: string;
  phonetic: string;
  gender: string;
  nuance: string;
}