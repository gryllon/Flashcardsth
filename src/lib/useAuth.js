import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from './supabase';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUserProfile = async (authUser) => {
      if (!authUser) {
        router.push('/login');
        setLoading(false);
        return;
      }

      // Fetch public profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error.message);
        setUser(authUser); // Set auth user even if profile fails
      } else {
        // Merge auth user with profile data
        setUser({ ...authUser, ...profile });
      }
      setLoading(false);
    };

    const initializeUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      fetchUserProfile(user);
    };

    initializeUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchUserProfile(session?.user);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Erro ao fazer logout:', error.message);
    }
    setLoading(false);
    router.push('/login');
  };

  return { user, loading, handleLogout };
};