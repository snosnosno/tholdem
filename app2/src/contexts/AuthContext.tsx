import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, signInWithEmailAndPassword, UserCredential, signOut } from 'firebase/auth'; // Import signOut
import { auth } from '../firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<UserCredential>;
  signOut: () => Promise<void>; // Add signOut to the type
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
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          // Force refresh the token to get the latest custom claims.
          const idTokenResult = await user.getIdTokenResult(true); 
          const userRole = idTokenResult.claims.role;
          setIsAdmin(userRole === 'admin');
        } catch (error) {
          console.error("Error fetching user role:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleSignIn = (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const handleSignOut = () => {
    return signOut(auth);
  };

  const value = {
    currentUser,
    loading,
    isAdmin,
    signIn: handleSignIn,
    signOut: handleSignOut, // Provide the signOut function
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
