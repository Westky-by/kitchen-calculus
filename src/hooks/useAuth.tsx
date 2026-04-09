import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/hooks/useActivityLog';
import type { User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  position: string;
  avatar_url: string;
  is_active: boolean;
}

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: 'super_admin' | 'admin' | 'user' | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: string | null }>;
  signUp: (username: string, password: string, fullName: string, position: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<'super_admin' | 'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const [profRes, roleRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('user_roles').select('role').eq('user_id', userId).single(),
    ]);
    if (profRes.data) setProfile(profRes.data as Profile);
    if (roleRes.data) setRole((roleRes.data as any).role as 'super_admin' | 'admin' | 'user');
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    // Get initial session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchProfile(u.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes - never await inside this callback
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchProfile(u.id);
      } else {
        setProfile(null);
        setRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = useCallback(async (username: string, password: string) => {
    const email = `${username.toLowerCase().trim()}@prorecipe.local`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login')) {
        return { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
      }
      return { error: error.message };
    }
    // Log after successful sign in
    setTimeout(() => logActivity('เข้าสู่ระบบ', 'auth', '', { username }), 500);
    return { error: null };
  }, []);

  const signUp = useCallback(async (username: string, password: string, fullName: string, position: string) => {
    const email = `${username.toLowerCase().trim()}@prorecipe.local`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: username.trim(), full_name: fullName, position },
      },
    });
    if (error) {
      if (error.message.includes('already registered')) {
        return { error: 'ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว' };
      }
      return { error: error.message };
    }
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await logActivity('ออกจากระบบ', 'auth', '', {});
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRole(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, role, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
