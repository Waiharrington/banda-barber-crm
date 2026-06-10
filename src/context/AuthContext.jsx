import React, { createContext, useContext, useEffect, useState } from 'react';
import { dataService } from '../services/dataService';

const AuthContext = createContext();

const toSessionUser = (staffProfile, authUser) => ({
  id: staffProfile.id,
  auth_user_id: authUser.id,
  name: staffProfile.name,
  email: staffProfile.email || authUser.email,
  role: staffProfile.role,
  username: staffProfile.username || ''
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStaffProfile = async (authUser) => {
    if (!authUser?.id) {
      setUser(null);
      return null;
    }

    const staffProfile = await dataService.getStaffByAuthUserId(authUser.id);
    if (!staffProfile) {
      await dataService.supabase.auth.signOut();
      setUser(null);
      return null;
    }

    const sessionUser = toSessionUser(staffProfile, authUser);
    setUser(sessionUser);
    return sessionUser;
  };

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const { data: { session }, error } = await dataService.supabase.auth.getSession();
        if (error) throw error;
        if (mounted && session?.user) {
          await loadStaffProfile(session.user);
        }
      } catch (error) {
        console.error('Auth session error:', error);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = dataService.supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      if (!session?.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      setTimeout(async () => {
        if (!mounted) return;
        try {
          await loadStaffProfile(session.user);
        } catch (error) {
          console.error('Auth state error:', error);
          setUser(null);
        } finally {
          if (mounted) setLoading(false);
        }
      }, 0);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await dataService.supabase.auth.signInWithPassword({
        email: String(email || '').trim().toLowerCase(),
        password
      });

      if (error) {
        return { success: false, message: 'Correo o contrasena incorrectos' };
      }

      const profile = await loadStaffProfile(data.user);
      if (!profile) {
        return { success: false, message: 'Este usuario no esta vinculado al equipo activo' };
      }

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Error de conexion' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await dataService.supabase.auth.signOut();
    } finally {
      setUser(null);
      localStorage.removeItem('astro_active_tab');
      localStorage.removeItem('astro_auth_user');
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    const { data: { user: authUser } } = await dataService.supabase.auth.getUser();
    if (!authUser) {
      setUser(null);
      return null;
    }
    return loadStaffProfile(authUser);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
