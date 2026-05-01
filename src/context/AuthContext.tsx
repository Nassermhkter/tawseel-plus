import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, isAdmin: false });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Use onSnapshot for real-time profile updates
        unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (doc) => {
          if (doc.exists()) {
            const userData = doc.data() as User;
            if (firebaseUser.email === 'admin@tawseel.com' || firebaseUser.email === 'hadirynasser@gmail.com') {
              userData.role = 'admin';
            }
            setUser(userData);
          } else {
            setUser(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Profile sync error:", error);
          setLoading(false);
        });
      } else {
        if (unsubscribeProfile) unsubscribeProfile();
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
