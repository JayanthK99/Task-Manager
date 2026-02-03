import { useState, useRef } from 'react';
import type { CreateTaskInput } from '../lib/supabase';

interface TaskFormProps {
  onSubmit: (input: CreateTaskInput) => Promise<void>;
}

export function TaskForm({ onSubmit }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const titleInputRef = useRef<HTMLInputElement>(null);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      newErrors.title = 'Task title is required';
    } else if (trimmedTitle.length > 500) {
      newErrors.title = 'Title must be 500 characters or less';
    }

    if (description.length > 2000) {
      newErrors.description = 'Description must be 2000 characters or less';
    }

    if (dueDate) {
      const selectedDate = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.dueDate = 'Due date cannot be in the past';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      titleInputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        due_date: dueDate || undefined,
      });

      // Reset form on success
      setTitle('');
      setDescription('');
      setPriority('normal');
      setDueDate('');
      titleInputRef.current?.focus();
    } catch (error) {
      console.error('Failed to create task:', error);
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to create task',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <form onSubmit={handleSubmit} className="task-form" noValidate>
      <div className="form-field">
        <input
          ref={titleInputRef}
          type="text"
          placeholder="Task title *"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (errors.title) {
              setErrors(prev => ({ ...prev, title: '' }));
            }
          }}
          disabled={submitting}
          maxLength={500}
          className={errors.title ? 'error' : ''}
          aria-label="Task title"
          aria-required="true"
          aria-invalid={!!errors.title}
        />
        {errors.title && <span className="error-text">{errors.title}</span>}
        <span className="char-count">{title.length}/500</span>
      </div>

      <div className="form-field">
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            if (errors.description) {
              setErrors(prev => ({ ...prev, description: '' }));
            }
          }}
          disabled={submitting}
          maxLength={2000}
          className={errors.description ? 'error' : ''}
          aria-label="Task description"
          aria-invalid={!!errors.description}
        />
        {errors.description && <span className="error-text">{errors.description}</span>}
        <span className="char-count">{description.length}/2000</span>
      </div>

      <div className="form-row">
        <div className="form-field">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as any)}
            disabled={submitting}
            aria-label="Task priority"
          >
            <option value="low">🟢 Low Priority</option>
            <option value="normal">🟡 Normal Priority</option>
            <option value="high">🔴 High Priority</option>
          </select>
        </div>

        <div className="form-field">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => {
              setDueDate(e.target.value);
              if (errors.dueDate) {
                setErrors(prev => ({ ...prev, dueDate: '' }));
              }
            }}
            disabled={submitting}
            min={getTodayDate()}
            className={errors.dueDate ? 'error' : ''}
            aria-label="Due date"
            aria-invalid={!!errors.dueDate}
          />
          {errors.dueDate && <span className="error-text">{errors.dueDate}</span>}
        </div>
      </div>

      {errors.submit && (
        <div className="error-message" role="alert">
          {errors.submit}
        </div>
      )}

      <button 
        type="submit" 
        disabled={submitting || !title.trim()}
        aria-busy={submitting}
      >
        {submitting ? (
          <>
            <span className="spinner-small"></span>
            Adding...
          </>
        ) : (
          '➕ Add Task'
        )}
      </button>
    </form>
  );
}