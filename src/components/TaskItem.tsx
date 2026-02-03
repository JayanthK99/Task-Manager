import { useState } from 'react';
import { format } from 'date-fns';

type Task = {
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

type CreateTaskInput = {
  title: string;
  description?: string;
  priority?: 'low' | 'normal' | 'high';
  due_date?: string;
};

interface TaskItemProps {
  task: Task;
  onToggle: (id: string, isComplete: boolean) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<CreateTaskInput>) => void;
}

export function TaskItem({ task, onToggle, onDelete, onUpdate }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || '');

  const priorityConfig = {
    low: { color: '#10b981', icon: '🟢', label: 'Low' },
    normal: { color: '#3b82f6', icon: '🟡', label: 'Normal' },
    high: { color: '#ef4444', icon: '🔴', label: 'High' },
  } as const;

  const config = priorityConfig[task.priority];

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.confirm(`Delete "${task.title}"?`)) {
      onDelete(task.id);
    }
  };

  const handleSave = () => {
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      alert('Title cannot be empty');
      return;
    }

    onUpdate(task.id, {
      title: trimmedTitle,
      description: editDescription.trim() || undefined,
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="task-item editing">
        <div className="task-edit-form">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            maxLength={500}
            autoFocus
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            maxLength={2000}
            placeholder="Description..."
          />
          <div className="edit-actions">
            <button onClick={handleSave} className="save-btn">✓ Save</button>
            <button onClick={() => setIsEditing(false)} className="cancel-btn">✗ Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`task-item ${task.is_complete ? 'completed' : ''}`}>
      <div className="task-checkbox">
        <input
          type="checkbox"
          checked={task.is_complete}
          onChange={() => onToggle(task.id, task.is_complete)}
        />
      </div>

      <div className="task-content">
        <h3>{task.title}</h3>
        {task.description && <p>{task.description}</p>}
        
        <div className="task-meta">
          <span className="priority-badge" style={{ backgroundColor: config.color }}>
            {config.icon} {config.label}
          </span>
          
          {task.due_date && (
            <span className="due-date">
              📅 {format(new Date(task.due_date), 'MMM dd, yyyy')}
            </span>
          )}
        </div>
      </div>

      <div className="task-actions">
        <button className="edit-btn" onClick={() => setIsEditing(true)} title="Edit">
          ✏️
        </button>
        <button className="delete-btn" onClick={handleDelete} title="Delete">
          🗑️
        </button>
      </div>
    </div>
  );
}