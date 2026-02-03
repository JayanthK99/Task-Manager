import { useEffect, useState, useCallback } from 'react';
import { supabase, type Task, type CreateTaskInput, TaskError } from '../lib/supabase';

export function useTasks(userId: string | undefined) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0,
  });

  const fetchTasks = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw new TaskError('Failed to fetch tasks', error.code, error);

      setTasks(data || []);
      
      // Calculate stats
      const total = data?.length || 0;
      const completed = data?.filter(t => t.is_complete).length || 0;
      const pending = total - completed;
      const overdue = data?.filter(
        t => !t.is_complete && t.due_date && new Date(t.due_date) < new Date()
      ).length || 0;
      
      setStats({ total, completed, pending, overdue });
      
    } catch (err) {
      console.error('Fetch tasks error:', err);
      setError(err instanceof TaskError ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = useCallback(
    async (input: CreateTaskInput) => {
      if (!userId) {
        throw new TaskError('User not authenticated');
      }

      const title = input.title?.trim();
      if (!title) {
        throw new TaskError('Task title is required');
      }

      try {
        setError(null);

        const newTask = {
          user_id: userId,
          title,
          description: input.description?.trim() || null,
          priority: input.priority || 'normal',
          due_date: input.due_date || null,
        };

        const { error } = await supabase
          .from('tasks')
          .insert(newTask);

        if (error) throw new TaskError('Failed to create task', error.code, error);

        await fetchTasks();
        console.log('Task created');
      } catch (err) {
        console.error('Create task error:', err);
        const errorMessage = err instanceof TaskError ? err.message : 'Failed to create task';
        setError(errorMessage);
        throw err;
      }
    },
    [userId, fetchTasks]
  );

  const updateTask = useCallback(
    async (taskId: string, updates: Partial<CreateTaskInput>) => {
      if (!userId) {
        throw new TaskError('User not authenticated');
      }

      try {
        setError(null);

        const { error } = await supabase
          .from('tasks')
          .update(updates)
          .eq('id', taskId)
          .eq('user_id', userId);

        if (error) throw new TaskError('Failed to update task', error.code, error);

        await fetchTasks();
        console.log('Task updated');
      } catch (err) {
        console.error('Update task error:', err);
        const errorMessage = err instanceof TaskError ? err.message : 'Failed to update task';
        setError(errorMessage);
        throw err;
      }
    },
    [userId, fetchTasks]
  );

  const toggleTask = useCallback(
    async (taskId: string, currentStatus: boolean) => {
      if (!userId) return;

      try {
        setError(null);

        const { error } = await supabase
          .from('tasks')
          .update({ is_complete: !currentStatus })
          .eq('id', taskId)
          .eq('user_id', userId);

        if (error) throw new TaskError('Failed to toggle task', error.code, error);

        await fetchTasks();
        console.log('Task toggled');
      } catch (err) {
        console.error('Toggle task error:', err);
        const errorMessage = err instanceof TaskError ? err.message : 'Failed to toggle task';
        setError(errorMessage);
      }
    },
    [userId, fetchTasks]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      if (!userId) {
        throw new TaskError('User not authenticated');
      }

      try {
        setError(null);

        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', taskId)
          .eq('user_id', userId);

        if (error) throw new TaskError('Failed to delete task', error.code, error);

        await fetchTasks();
        console.log('Task deleted');
      } catch (err) {
        console.error('Delete task error:', err);
        const errorMessage = err instanceof TaskError ? err.message : 'Failed to delete task';
        setError(errorMessage);
        throw err;
      }
    },
    [userId, fetchTasks]
  );

  return {
    tasks,
    loading,
    error,
    stats,
    createTask,
    updateTask,
    toggleTask,
    deleteTask,
    refreshTasks: fetchTasks,
  };
}