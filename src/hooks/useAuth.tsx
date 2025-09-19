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
      async (event, session) => {
        if (!isMounted) return;
        
        console.log('Auth state change:', event, session?.user?.id);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Always set loading to false first to unblock UI
        setLoading(false);
        
        if (session?.user) {
          // Log security event for authentication (simplified)
          if (event === 'SIGNED_IN') {
            console.log('User signed in:', session.user.id);
          }
          
          // Fetch role in background (non-blocking)
          fetchUserRole(session.user.id).then(role => {
            if (isMounted) {
              setUserRole(role);
            }
          }).catch(error => {
            console.warn('Failed to fetch user role:', error);
            if (isMounted) {
              setUserRole('client'); // Default fallback
            }
          });
        } else {
          setUserRole(null);
          
          // Log security event for sign out (simplified)
          if (event === 'SIGNED_OUT') {
            console.log('User signed out');
          }
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
      // Log security event before signing out
      await supabase.rpc('log_security_event', {
        event_type: 'USER_INITIATED_SIGNOUT',
        event_data: {
          timestamp: new Date().toISOString(),
          user_id: user?.id
        }
      });
    } catch (error) {
      console.warn('Failed to log security event:', error);
    }
    
    try {
      await supabase.auth.signOut();
      // Clear sensitive data from localStorage
      localStorage.removeItem('rememberedEmail');
      // Clear secure storage items
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('secure_')) {
          localStorage.removeItem(key);
        }
      });
      
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