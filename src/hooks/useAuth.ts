import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    let retryTimeout: ReturnType<typeof setTimeout>;

    async function initAuth() {
      try {
        setError(null);
        
        // Get existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (!mounted) return;

        if (session) {
          setSession(session);
          setLoading(false);
          return;
        }

        // No session exists, create anonymous user
        console.log('Creating anonymous session...');
        const { data, error: signInError } = await supabase.auth.signInAnonymously();

        if (signInError) {
          throw signInError;
        }

        if (!mounted) return;

        setSession(data.session);
        setRetryCount(0);
        setLoading(false);
        
        console.log('Anonymous session created successfully');
      } catch (err) {
        console.error('Auth initialization error:', err);
        
        if (!mounted) return;

        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize authentication';
        setError(errorMessage);
        setLoading(false);

        // Retry logic for transient errors
        if (retryCount < 3) {
          console.log(`Retrying authentication... (${retryCount + 1}/3)`);
          retryTimeout = setTimeout(() => {
            setRetryCount(prev => prev + 1);
            setLoading(true);
            initAuth();
          }, 2000 * (retryCount + 1)); // Exponential backoff
        }
      }
    }

    initAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        console.log('Auth state changed:', _event);
        setSession(session);
        if (session) {
          setError(null);
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(retryTimeout);
      subscription.unsubscribe();
    };
  }, [retryCount]);

  const retry = () => {
    setRetryCount(0);
    setLoading(true);
    setError(null);
  };

  return { session, loading, error, retry };
}