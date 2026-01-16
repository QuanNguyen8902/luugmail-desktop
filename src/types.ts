export type CategoryId = 'gmail' | 'facebook' | 'youtube' | 'telegram' | 'other';

export interface Account {
  id: number;
  category: CategoryId;
  username: string;
  password: string;
  note?: string;
  isFavorite: boolean;
  twoFactorSecret?: string;
  createdAt: number;
}

export interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

export type NoteCategoryId = 'quick' | 'work' | 'personal' | 'idea';

export interface Note {
  id: number;
  title: string;
  content: string;
  category: NoteCategoryId;
  isFavorite: boolean;
  todos: TodoItem[];
  createdAt: number;
}

export interface LoginHistoryItem {
  id: number;
  action: string;
  timestamp: string;
}

export interface WindowsTool {
  id: string | number;
  name: string;
  description: string;
  target: string;
}
