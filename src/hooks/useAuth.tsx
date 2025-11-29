import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cleanupAuthState } from "@/lib/authCleanup";
export type UserRole = "admin" | "lecturer";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  userFullName: string | null;
  loading: boolean;
  roleLoading: boolean;
  isOtpVerified: boolean;
  setOtpVerified: (verified: boolean) => void;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    role: UserRole
  ) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userFullName, setUserFullName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const { toast } = useToast();

  const setOtpVerified = (verified: boolean) => {
    setIsOtpVerified(verified);
  };

  const loadUserRole = async (uid: string | null) => {
    if (!uid) {
      setUserRole(null);
      setUserFullName(null);
      setRoleLoading(false);
      return;
    }
    setRoleLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", uid)
        .maybeSingle();
      if (!error && data?.role) {
        setUserRole(data.role as UserRole);
        setUserFullName(data.full_name || null);
        setRoleLoading(false);
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      const metaRole = sess.session?.user?.user_metadata?.user_role as
        | UserRole
        | undefined;
      const metaName = sess.session?.user?.user_metadata?.full_name as string | undefined;
      setUserRole(metaRole || "lecturer");
      setUserFullName(metaName || null);
    } catch {
      setUserRole("lecturer");
      setUserFullName(null);
    } finally {
      setRoleLoading(false);
    }
  };

  useEffect(() => {
    let currentUserId: string | null = null;
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        currentUserId = session.user.id;
        setUser(session.user);
        loadUserRole(session.user.id);
      }
      setLoading(false);
    });

    // Set up auth state listener - only once on mount
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      
      // Ignore SIGNED_IN events if we already have the same user
      // This prevents unnecessary re-renders when visibility changes
      if (event === 'SIGNED_IN' && session?.user?.id === currentUserId) {
        console.log('Ignoring redundant SIGNED_IN event for same user');
        return;
      }
      
      setSession(session);
      
      if (session?.user) {
        currentUserId = session.user.id;
        setUser(session.user);
        loadUserRole(session.user.id);
      } else {
        currentUserId = null;
        setUser(null);
        setUserRole(null);
        setUserFullName(null);
        setIsOtpVerified(false);
      }
      
      // Only set loading to false after initial auth check
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array - only run once on mount
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Clean existing state and attempt global sign out to avoid limbo
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: "global" });
      } catch {}

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // Let React Router handle navigation naturally - no manual refresh
      return { error: null };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: error.message,
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };
  const signUp = async (email: string, password: string, role: UserRole) => {
    setLoading(true);
    try {
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: "global" });
      } catch {}

      const redirectUrl = `${window.location.origin}/`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { user_role: role },
        },
      });
      if (error) throw error;
      toast({
        title: "Account Created",
        description: "Please check your email to verify your account.",
      });
      return { error: null };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: error.message,
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };
  const signOut = async () => {
    setLoading(true);
    try {
      toast({
        title: "Signing out...",
        description: "Please wait while we sign you out.",
      });
      cleanupAuthState();
      setIsOtpVerified(false);
      await supabase.auth.signOut({ scope: "global" });
      toast({ title: "Signed out successfully" });
    } catch {
      // Continue even if sign out fails
      setIsOtpVerified(false);
      toast({ title: "Signed out successfully" });
    } finally {
      setLoading(false);
    }
  };
  const value = {
    user,
    session,
    userRole,
    userFullName,
    loading,
    roleLoading,
    isOtpVerified,
    setOtpVerified,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
