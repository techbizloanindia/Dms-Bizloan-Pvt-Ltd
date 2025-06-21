'use client';

import { useState, useEffect } from 'react';
import { 
  signInAnonymously,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '@/firebase/auth';

export default function DebugAuth() {
  const [authError, setAuthError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      console.log('Auth object:', auth);
      console.log('Auth config:', auth.config);
      console.log('Auth app:', auth.app);
    } catch (err) {
      console.error('Error logging auth:', err);
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    }, (error) => {
      console.error('Auth state change error:', error);
      setAuthError(error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const testAnonymousAuth = async () => {
    try {
      setAuthError(null);
      await signInAnonymously(auth);
      console.log('Anonymous auth successful');
    } catch (error: any) {
      console.error('Anonymous auth error:', error);
      setAuthError(error.message);
    }
  };

  const testCreateUser = async () => {
    try {
      setAuthError(null);
      // Use a random email to avoid conflicts
      const randomEmail = `test${Math.random().toString(36).substring(2)}@example.com`;
      await createUserWithEmailAndPassword(auth, randomEmail, 'Password123!');
      console.log('User creation successful');
    } catch (error: any) {
      console.error('User creation error:', error);
      setAuthError(error.message);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Firebase Auth Debug</h2>
      
      {loading ? (
        <p>Loading auth state...</p>
      ) : (
        <div className="mb-4">
          <p><strong>Auth State:</strong> {user ? 'Logged In' : 'Logged Out'}</p>
          {user && (
            <div className="bg-gray-100 p-2 rounded">
              <p><strong>User ID:</strong> {user.uid}</p>
              <p><strong>Email:</strong> {user.email || 'No email'}</p>
              <p><strong>Anonymous:</strong> {user.isAnonymous ? 'Yes' : 'No'}</p>
            </div>
          )}
        </div>
      )}

      {authError && (
        <div className="bg-red-100 p-2 mb-4 rounded">
          <p className="text-red-700">{authError}</p>
        </div>
      )}

      <div className="flex space-x-4">
        <button 
          onClick={testAnonymousAuth}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Test Anonymous Auth
        </button>
        
        <button 
          onClick={testCreateUser}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Test Create User
        </button>
      </div>
    </div>
  );
} 