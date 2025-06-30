import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signOut as firebaseSignOut, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  isAdmin: boolean;
  role: string | null;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<any>;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const idTokenResult = await user.getIdTokenResult(true);
          const userRole = idTokenResult.claims.role as string || null;
          setRole(userRole);
        } catch (error) {
          console.error("Error fetching user role:", error);
          setRole(null);
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const sendPasswordReset = (email: string) => {
    return sendPasswordResetEmail(auth, email);
  };

  const signOut = () => {
    return firebaseSignOut(auth);
  };
  
  const isAdmin = role === 'admin' || role === 'manager';

  const value: AuthContextType = {
    currentUser,
    loading,
    isAdmin,
    role,
    signOut,
    signIn,
    sendPasswordReset,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
