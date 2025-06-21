// Auth utility for client-side authentication
export type User = {
  id: string;
  name: string;
  email: string;
  role: string; // 'admin' or 'user'
  username?: string;
  loanAccess?: string[];
}

export type AuthResponse = {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
}

// Get token from localStorage
export const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

// Get admin token from localStorage
export const getAdminToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('adminToken');
  }
  return null;
};

// Get current user from localStorage
export const getCurrentUser = (): User | null => {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
  }
  return null;
};

// Get current admin user from localStorage
export const getCurrentAdminUser = (): { username: string } | null => {
  if (typeof window !== 'undefined') {
    const adminUser = localStorage.getItem('adminUser');
    if (adminUser) {
      return { username: adminUser };
    }
  }
  return null;
};
// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!getToken();
};

// Check if admin is authenticated
export const isAdminAuthenticated = (): boolean => {
  return !!getAdminToken();
};

// Check if user has admin role
export const isAdmin = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'admin' || !!getAdminToken();
};

// Login user
export const login = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.success && data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }

    return data;
  } catch (error) {
    return {
      success: false,
      message: 'An error occurred during login',
    };
  }
};

// Register user
export const register = async (
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> => {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password }),
    });

    return await response.json();
  } catch (error) {
    return {
      success: false,
      message: 'An error occurred during registration',
    };
  }
};

// Logout user
export const logout = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

// Create authenticated fetch function
export const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = getToken();
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  const authOptions: RequestInit = {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  };
  
  return fetch(url, authOptions);
};

import { connectToDatabase, getCollections } from '@/lib/db';
import { compare } from 'bcryptjs';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          // Connect to database
          const { db } = await connectToDatabase();
          const { users } = getCollections(db);
          
          // Find user by username
          const user = await users.findOne({ 
            username: credentials.username.toLowerCase() 
          });
          
          if (!user || !user.password) {
            return null;
          }
          
          // Verify password
          const isValid = await compare(credentials.password, user.password);
          
          if (!isValid) {
            return null;
          }
          
          // Return user without sensitive data
          return {
            id: user._id.toString(),
            username: user.username,
            name: user.name,
            email: user.email || '',
            role: user.role,
            loanAccess: user.loanAccess || []
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      // Add custom user data to token
      if (user) {
        token.username = user.username;
        token.role = user.role;
        token.loanAccess = user.loanAccess;
      }
      return token;
    },
    async session({ session, token }) {
      // Add custom user data to session
      if (token && session.user) {
        session.user.id = token.sub as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
        session.user.loanAccess = token.loanAccess as string[];
      }
      return session;
    }
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-fallback-secret-please-change-in-production',
  debug: process.env.NODE_ENV === 'development',
}; 