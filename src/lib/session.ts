import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

type User = {
  id: string;
  username: string;
  name: string;
  role: string;
};

type Session = {
  user: User | null;
};

// Get the server session from the API
export async function getServerSession(): Promise<Session | null> {
  try {
    // Get cookies for authentication
    const cookieStore = cookies();
    const cookieString = cookieStore.toString();
    
    if (!cookieString) {
      console.log('No cookies found for session');
      return { user: null };
    }
    
    // Make request to the server API
    const response = await fetch('http://localhost:3000/api/user', {
      headers: {
        Cookie: cookieString,
      },
      // Ensure we get fresh data
      cache: 'no-store',
      next: { revalidate: 0 }
    });
    
    if (!response.ok) {
      console.log('Session API returned error:', response.status);
      return { user: null };
    }
    
    const data = await response.json();
    
    if (!data.user) {
      console.log('No user found in session data');
      return { user: null };
    }
    
    return data;
  } catch (error) {
    console.error('Error getting server session:', error);
    return { user: null };
  }
} 