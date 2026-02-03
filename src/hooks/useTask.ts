import { useEffect, useState, useCallback, useRef } from 'react';
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
  
  const isMountedRef = useRef(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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

      if (isMountedRef.current) {
        setTasks(data || []);
        
        // Calculate stats
        const total = data?.length || 0;
        const completed = data?.filter(t => t.is_complete).length || 0;
        const pending = total - completed;
        const overdue = data?.filter(
          t => !t.is_complete && t.due_date && new Date(t.due_date) < new Date()
        ).length || 0;
        
        setStats({ total, completed, pending, overdue });
      }
    } catch (err) {
      console.error('Fetch tasks error:', err);
      if (isMountedRef.current) {
        setError(err instanceof TaskError ? err.message : 'Failed to fetch tasks');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!userId) {
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchTasks();

    // Set up real-time subscription
    const channel = supabase
      .channel(`tasks_${userId}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (!isMountedRef.current) return;

          console.log('Real-time event:', payload.eventType);

          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as Task;
            setTasks(prev => {
              // Prevent duplicates
              if (prev.some(t => t.id === newTask.id)) {
                return prev;
              }
              return [newTask, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev =>
              prev.map(task =>
                task.id === payload.new.id ? (payload.new as Task) : task
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(task => task.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      isMountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, fetchTasks]);

const createTask = useCallback(
  async (input: CreateTaskInput) => {
    if (!userId) {
      throw new TaskError('User not authenticated');
    }

    const title = input.title?.trim();
    if (!title || title.length === 0) {
      throw new TaskError('Task title is required');
    }
    if (title.length > 500) {
      throw new TaskError('Task title must be 500 characters or less');
    }
    if (input.description && input.description.length > 2000) {
      throw new TaskError('Task description must be 2000 characters or less');
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
        .insert(newTask)
        .select()
        .single();

      if (error) {
        throw new TaskError('Failed to create task', error.code, error);
      }

      // ✅ Force refresh after creating
      await fetchTasks();
      
      console.log('Task created successfully');
    } catch (err) {
      console.error('Create task error:', err);
      const errorMessage = err instanceof TaskError 
        ? err.message 
        : 'Failed to create task';
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

      // Validate updates
      if (updates.title !== undefined) {
        const title = updates.title.trim();
        if (!title || title.length === 0) {
          throw new TaskError('Task title cannot be empty');
        }
        if (title.length > 500) {
          throw new TaskError('Task title must be 500 characters or less');
        }
      }

      try {
        setError(null);

        // Optimistic update
        setTasks(prev =>
          prev.map(task =>
            task.id === taskId ? { ...task, ...updates } : task
          )
        );

        const { error } = await supabase
          .from('tasks')
          .update(updates)
          .eq('id', taskId)
          .eq('user_id', userId);

        if (error) {
          // Revert optimistic update
          await fetchTasks();
          throw new TaskError('Failed to update task', error.code, error);
        }

        console.log('Task updated successfully');
      } catch (err) {
        console.error('Update task error:', err);
        const errorMessage = err instanceof TaskError 
          ? err.message 
          : 'Failed to update task';
        setError(errorMessage);
        throw err;
      }
    },
    [userId, fetchTasks]
  );

  const toggleTask = useCallback(
    async (taskId: string, currentStatus: boolean) => {
      try {
        // Optimistic update
        setTasks(prev =>
          prev.map(task =>
            task.id === taskId ? { ...task, is_complete: !currentStatus } : task
          )
        );

        const { error } = await supabase
          .from('tasks')
          .update({ is_complete: !currentStatus })
          .eq('id', taskId)
          .eq('user_id', userId);

        if (error) {
          // Revert on error
          setTasks(prev =>
            prev.map(task =>
              task.id === taskId ? { ...task, is_complete: currentStatus } : task
            )
          );
          throw new TaskError('Failed to toggle task', error.code, error);
        }

        console.log('Task toggled successfully');
      } catch (err) {
        console.error('Toggle task error:', err);
        const errorMessage = err instanceof TaskError 
          ? err.message 
          : 'Failed to toggle task';
        setError(errorMessage);
      }
    },
    [userId]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      if (!userId) {
        throw new TaskError('User not authenticated');
      }

      const originalTasks = [...tasks];

      try {
        setError(null);

        // Optimistic delete
        setTasks(prev => prev.filter(task => task.id !== taskId));

        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', taskId)
          .eq('user_id', userId);

        if (error) {
          // Revert on error
          setTasks(originalTasks);
          throw new TaskError('Failed to delete task', error.code, error);
        }

        console.log('Task deleted successfully');
      } catch (err) {
        console.error('Delete task error:', err);
        const errorMessage = err instanceof TaskError 
          ? err.message 
          : 'Failed to delete task';
        setError(errorMessage);
        throw err;
      }
    },
    [userId, tasks]
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