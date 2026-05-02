import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  toggleFavorite: (restaurantId: string) => Promise<void>;
  isFavorite: (restaurantId: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  isAdmin: false,
  toggleFavorite: async () => {},
  isFavorite: () => false
});

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
            if (firebaseUser.email === 'admin@tawseel.com' || firebaseUser.email === 'hadirynasser@gmail.com' || firebaseUser.email === 'moalhedry@gmail.com') {
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

  const toggleFavorite = async (restaurantId: string) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const isFav = user.favorites?.includes(restaurantId);

    try {
      await updateDoc(userRef, {
        favorites: isFav ? arrayRemove(restaurantId) : arrayUnion(restaurantId)
      });
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const isFavorite = (restaurantId: string) => {
    return user?.favorites?.includes(restaurantId) || false;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAdmin: user?.role === 'admin',
      toggleFavorite,
      isFavorite
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
