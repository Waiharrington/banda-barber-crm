import React, { createContext, useContext, useState, useEffect } from 'react';
import { dataService } from '../services/dataService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('astro_auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const syncUser = async () => {
      if (user) {
        try {
          const staff = await dataService.getStaff();
          const found = staff.find(s => s.id === user.id);
          if (found) {
            const userData = {
              id: found.id,
              name: found.name,
              role: found.role,
              username: found.username
            };
            setUser(userData);
            localStorage.setItem('astro_auth_user', JSON.stringify(userData));
          }
        } catch (e) {
          console.error('Sync error:', e);
        }
      }
    };
    syncUser();
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const staff = await dataService.getStaff();
      const found = staff.find(s => s.username === username && s.password === password);
      
      if (found) {
        const userData = {
          id: found.id,
          name: found.name,
          role: found.role, // e.g., 'Admin', 'Barbero', 'Recepcionista', 'Caja'
          username: found.username
        };
        setUser(userData);
        localStorage.setItem('astro_auth_user', JSON.stringify(userData));
        return { success: true };
      } else {
        return { success: false, message: 'Usuario o contraseña incorrectos' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Error de conexión' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('astro_auth_user');
    localStorage.removeItem('astro_active_tab');
  };

  const refreshUser = async () => {
    if (!user) return;
    try {
      const staff = await dataService.getStaff();
      const found = staff.find(s => s.id === user.id);
      if (found) {
        const userData = {
          id: found.id,
          name: found.name,
          role: found.role,
          username: found.username
        };
        setUser(userData);
        localStorage.setItem('astro_auth_user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
