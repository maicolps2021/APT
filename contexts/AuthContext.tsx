import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '../lib/supabaseClient';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';

type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthContextType {
  status: AuthStatus;
  user: User | null;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('initializing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Attempt to sign in anonymously when the provider mounts
    signInAnonymously(auth)
      .then(() => {
        // onAuthStateChanged will handle setting the user and status
      })
      .catch((err) => {
        console.error("Anonymous sign-in failed:", err);
        setError(err.message);
        setStatus('error');
      });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setStatus('authenticated');
      } else {
        setUser(null);
        setStatus('unauthenticated');
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ status, user, error }}>
      {children}
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
