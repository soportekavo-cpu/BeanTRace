import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// FIX: Changed import from 'firebase/auth' to '@firebase/auth' to resolve module export errors.
import { onAuthStateChanged, User as FirebaseUser } from '@firebase/auth';
import { auth, db } from '../services/firebase';
import { User } from '../types';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          setUser({ uid: firebaseUser.uid, ...userDocSnap.data() } as User);
        } else {
          // User doesn't exist in Firestore, create a new document
          const newUser: Omit<User, 'uid'> = {
            email: firebaseUser.email,
            role: firebaseUser.email === 'yroquel@gmail.com' ? 'Admin' : 'User'
          };
          await setDoc(userDocRef, newUser);
          setUser({ uid: firebaseUser.uid, ...newUser } as User);
        }

      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};