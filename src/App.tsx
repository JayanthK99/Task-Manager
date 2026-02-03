import { useState, useMemo } from 'react';
import { useAuth } from './hooks/useAuth';
import { useTasks } from './hooks/useTask';
import { TaskForm } from './components/TaskForm';
import { TaskItem } from './components/TaskItem';
import { TaskStats } from './components/TaskStats';
import type { Task, CreateTaskInput } from './lib/supabase';
import './App.css';

type FilterType = 'all' | 'active' | 'completed' | 'overdue';
type SortType = 'created_desc' | 'created_asc' | 'due_date' | 'priority';

function App() {
  const { session, loading: authLoading, error: authError, retry } = useAuth();

  const {
    tasks,
    loading,
    error,
    stats,
    createTask,
    updateTask,
    toggleTask,
    deleteTask,
  } = useTasks(session?.user?.id);

  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('created_desc');
  const [searchQuery, setSearchQuery] = useState('');

  // ✅ CREATE
  const handleCreateTask = async (input: CreateTaskInput) => {
    await createTask(input);
  };

  // ✅ UPDATE → Partial<Task>
  const handleUpdateTask = async (
    id: string,
    updates: Partial<CreateTaskInput>
  ) => {
    await updateTask(id, updates);
  };

  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        t =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [tasks, searchQuery]);

  if (authLoading) return <p>Initializing secure session...</p>;

  if (authError) {
    return (
      <div>
        <p>{authError}</p>
        <button onClick={retry}>Retry</button>
      </div>
    );
  }

  return (
    <div className="app">
      <TaskStats stats={stats} />
      <TaskForm onSubmit={handleCreateTask} />

      {loading ? (
        <p>Loading...</p>
      ) : (
        filteredAndSortedTasks.map(task => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={toggleTask}
            onDelete={deleteTask}
            onUpdate={handleUpdateTask}
          />
        ))
      )}

      {error && <p>{error}</p>}
    </div>
  );
}

export default App;
