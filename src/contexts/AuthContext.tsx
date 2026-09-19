import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { getAdminPassword, setAdminSecret, updateAdminPassword } from '../lib/db';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface AuthContextType {
  user: { uid: string } | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedAdmin = localStorage.getItem('isAdminSession') === 'true';
      if (savedAdmin) {
        setIsAdmin(true);
      }
      
      // Seed initial admin password if not exists
      try {
        const adminDoc = await getDoc(doc(db, 'settings', 'admin'));
        if (!adminDoc.exists()) {
          await setDoc(doc(db, 'settings', 'admin'), {
            adminPassword: 'admin123'
          });
        }
      } catch (e) {
        console.log('Seeding skipped or already exists');
      }

      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const currentPassword = await getAdminPassword();
    if (username === 'admin' && password === currentPassword) {
      setIsAdmin(true);
      setAdminSecret(password);
      localStorage.setItem('isAdminSession', 'true');
      return true;
    }
    return false;
  };

  const logout = async () => {
    setIsAdmin(false);
    localStorage.removeItem('isAdminSession');
    localStorage.removeItem('adminSecret');
  };

  const changePassword = async (newPassword: string) => {
    try {
      await updateAdminPassword(newPassword);
      return true;
    } catch (e) {
      return false;
    }
  };

  const profile: UserProfile | null = isAdmin ? {
    id: 'admin',
    email: 'admin@local',
    role: 'admin'
  } : null;

  return (
    <AuthContext.Provider value={{ 
      user: isAdmin ? { uid: 'admin' } : null, 
      profile, 
      loading, 
      isAdmin, 
      login, 
      logout,
      changePassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
