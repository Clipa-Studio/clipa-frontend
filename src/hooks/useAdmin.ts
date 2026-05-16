import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export function useAdmin(): { isAdmin: boolean; loading: boolean } {
  const { user, loading: authLoading } = useAuth();
  const [adminState, setAdminState] = useState<{
    userId: string | null;
    isAdmin: boolean;
    checking: boolean;
  }>({
    userId: null,
    isAdmin: false,
    checking: false,
  });

  useEffect(() => {
    if (authLoading || !user) return;

    let cancelled = false;
    const userId = user.id;

    async function checkAdmin() {
      await Promise.resolve();
      if (cancelled) return;

      setAdminState({
        userId,
        isAdmin: false,
        checking: true,
      });

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();

        if (error) throw error;
        if (!cancelled) {
          setAdminState({
            userId,
            isAdmin: data?.role === 'admin',
            checking: false,
          });
        }
      } catch {
        if (!cancelled) {
          setAdminState({
            userId,
            isAdmin: false,
            checking: false,
          });
        }
      }
    }

    checkAdmin();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const isCurrentUser = !!user && adminState.userId === user.id;
  const isAdmin = isCurrentUser ? adminState.isAdmin : false;
  const loading = authLoading || (!!user && (!isCurrentUser || adminState.checking));

  return { isAdmin, loading };
}
