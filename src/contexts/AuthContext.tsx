import React, {
  createContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { api } from '../services/api';
import { biometricService } from '../services/biometric';

export type UserRole = 'admin' | 'member' | 'viewer' | null;

interface AuthContextType {
  token: string | null;
  role: UserRole;
  userName: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  canEdit: boolean;
  loginAdmin: (username: string, password: string) => Promise<void>;
  loginPin: (username: string, pin: string) => Promise<void>;
  loginBiometric: () => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication on mount
  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      // Wait for AsyncStorage to finish loading token (avoids race condition)
      const storedToken = await api.getTokenAsync();
      if (storedToken) {
        setToken(storedToken);
        try {
          const authResponse = await api.verifyAuth();
          if (authResponse.valid) {
            setRole(authResponse.role as UserRole);
            if ((authResponse as any).name) setUserName((authResponse as any).name);
          } else {
            // Token invalid or expired
            await api.logout();
            setToken(null);
            setRole(null);
            setUserName(null);
          }
        } catch {
          // Network error — keep token so user stays logged in
          // (offline mode graceful degradation)
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await api.logout();
      setToken(null);
      setRole(null);
      setUserName(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Run auth check on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const loginAdmin = useCallback(
    async (username: string, password: string) => {
      setIsLoading(true);
      try {
        const response = await api.loginAdmin(username, password);
        setToken(response.token);

        // Verify the token and get role
        const authResponse = await api.verifyAuth();
        setRole(authResponse.role as UserRole);
        setUserName(username);
      } catch (error) {
        console.error('Admin login failed:', error);
        await api.logout();
        setToken(null);
        setRole(null);
        setUserName(null);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const loginPin = useCallback(async (username: string, pin: string) => {
    setIsLoading(true);
    try {
      const response = await api.loginPin(username, pin);
      setToken(response.token);
      // Backend returns: { success, token, role, name }
      setRole((response as any).role as UserRole);
      setUserName((response as any).name || username);
    } catch (error) {
      console.error('PIN login failed:', error);
      await api.logout();
      setToken(null);
      setRole(null);
      setUserName(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginBiometric = useCallback(async (): Promise<boolean> => {
    // Check if biometric is available and enabled
    const isAvailable = await biometricService.isAvailable();
    if (!isAvailable) return false;

    // Prompt biometric scan
    const authenticated = await biometricService.authenticate();
    if (!authenticated) return false;

    // Get stored credentials and login
    const credentials = await biometricService.getStoredCredentials();
    if (!credentials) return false;

    setIsLoading(true);
    try {
      const response = await api.loginPin(credentials.username, credentials.pin);
      setToken(response.token);
      setRole((response as any).role as UserRole);
      setUserName((response as any).name || credentials.username);
      return true;
    } catch (error) {
      console.error('Biometric login failed:', error);
      // Credentials may be stale — disable biometric so user re-authenticates
      await biometricService.disable();
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await api.logout();
      setToken(null);
      setRole(null);
      setUserName(null);
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const isAdmin = role === 'admin';
  const canEdit = role === 'admin' || role === 'member';

  const value: AuthContextType = {
    token,
    role,
    userName,
    isLoading,
    isAdmin,
    canEdit,
    loginAdmin,
    loginPin,
    loginBiometric,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
