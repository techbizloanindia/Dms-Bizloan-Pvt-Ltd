'use client';

import { useState, useEffect, createContext, useContext } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  username: string;
  name: string;
  role: string;
  loanAccess?: string[];
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated on initial load
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/user');
        
        // If unauthorized (401) or any other error, just consider user not authenticated
        if (!res.ok) {
          setUser(null);
          setIsLoading(false);
          return;
        }
        
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          console.log('User authenticated:', data.user.username);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Authentication check error:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setIsLoading(false);
        return { 
          success: false, 
          error: data.error || 'Login failed' 
        };
      }
      
      setUser(data.user);
      
      // Redirect based on user role
      if (data.user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/user-dashboard');
      }
      
      setIsLoading(false);
      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      setIsLoading(false);
      return { 
        success: false, 
        error: 'An error occurred during login' 
      };
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await fetch('/api/logout');
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
} 