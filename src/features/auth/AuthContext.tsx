import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import { auth } from '../../services/firebase/auth';
import { mapClaims, type Role } from './claims';


interface AuthUser {
  uid: string;
  email: string | null;
  role: Role;
  siteId?: string; // For site_admin
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, isLoading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Usa o token em cache; só busca novamente se expirado
          const tokenResult = await getIdTokenResult(firebaseUser, false);
          const { role, siteId } = mapClaims(tokenResult.claims);

          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role,
            siteId,
          });
        } catch (error) {
          console.error('Erro ao obter as claims do usuário', error);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: null,
          });
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ user, isLoading }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
