import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Database types
export type Task = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_complete: boolean;
  priority: 'low' | 'normal' | 'high';
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskStats = {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  priority?: 'low' | 'normal' | 'high';
  due_date?: string;
};

export type UpdateTaskInput = Partial<Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

// Custom error class
export class TaskError extends Error {
  public code?: string;
  public details?: unknown;

  constructor(message: string, code?: string, details?: unknown) {
    super(message);
    this.name = 'TaskError';
    this.code = code;
    this.details = details;
  }
}