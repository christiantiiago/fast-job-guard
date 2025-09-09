import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, userData: any) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  userRole: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Fetch user role separately to avoid async issues in auth state change
  const fetchUserRole = async (userId: string) => {
    try {
      console.log('🔍 Fetching role for user:', userId);
      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) {
        console.log('❌ Error fetching user role:', error);
        return 'client';
      }
      
      console.log('📋 User role data:', roleData);
      const role = roleData?.role || 'client';
      console.log('✅ Final user role:', role);
      return role;
    } catch (error) {
      console.log('💥 Exception fetching user role:', error);
      return 'client';
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        console.log('Auth state change:', event, session?.user?.id);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch role in a separate async operation to avoid blocking
          setTimeout(async () => {
            if (!isMounted) return;
            const role = await fetchUserRole(session.user.id);
            if (isMounted) {
              setUserRole(role);
              setLoading(false);
            }
          }, 0);
        } else {
          setUserRole(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session only once
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.log('Error getting session:', error);
          setLoading(false);
          return;
        }

        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const role = await fetchUserRole(session.user.id);
          if (isMounted) {
            setUserRole(role);
          }
        }
        
        if (isMounted) {
          setLoading(false);
        }
      } catch (error) {
        console.log('Exception getting initial session:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, userData: any) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    try {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: userData
        }
      });

      if (error) {
        console.log('Signup error:', error);
        return { error };
      }

      // The trigger will automatically create user_roles and profiles
      console.log('User signed up successfully:', data.user?.id);
      
      return { error: null };
    } catch (err) {
      console.log('Signup exception:', err);
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      // Limpar localStorage
      localStorage.clear();
      sessionStorage.clear();
      // Reset estados
      setUser(null);
      setSession(null);
      setUserRole(null);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    userRole
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};