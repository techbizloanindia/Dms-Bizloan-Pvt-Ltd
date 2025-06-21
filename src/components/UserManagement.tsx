'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

type User = {
  id: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  createdAt: string;
  password?: string; // Adding optional password field for display
};

export default function UserManagement() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('user');
  const [loanAccess, setLoanAccess] = useState<string[]>([]);
  const [loanInput, setLoanInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [lastCreatedUser, setLastCreatedUser] = useState<User | null>(null);

  // Password strength calculation
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 6) strength += 1;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  };

  const getPasswordStrengthText = (strength: number) => {
    if (strength <= 2) return { text: 'Weak', color: 'text-red-500', bg: 'bg-red-100' };
    if (strength <= 4) return { text: 'Medium', color: 'text-yellow-500', bg: 'bg-yellow-100' };
    return { text: 'Strong', color: 'text-green-500', bg: 'bg-green-100' };
  };

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        console.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };
  
  // Function to handle user deletion
  const handleDeleteUser = async (userId: string, username: string) => {
    if (username === 'adminbizln') {
      setError('Cannot delete default admin user');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete the user "${username}"?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setSuccess('User deleted successfully');
        fetchUsers(); // Refresh the user list
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('An error occurred while deleting the user');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset states
    setError('');
    setSuccess('');
    setIsLoading(true);
    setLastCreatedUser(null);

    try {
      // Validate required fields
      const requiredFields = [
        { value: username.trim(), name: 'Username' },
        { value: password.trim(), name: 'Password' },
        { value: confirmPassword.trim(), name: 'Confirm Password' },
        { value: name.trim(), name: 'Full Name' }
      ];
      
      // Add email to required fields only if it's provided
      if (email.trim()) {
        requiredFields.push({ value: email.trim(), name: 'Email Address' });
      }

      const missingField = requiredFields.find(field => !field.value);
      if (missingField) {
        setError(`${missingField.name} is required`);
        setIsLoading(false);
        return;
      }

      // Validate password match
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }

      // Validate password strength
      if (password.length < 6) {
        setError('Password must be at least 6 characters long');
        setIsLoading(false);
        return;
      }

      // Validate email format if provided
      if (email.trim() && !email.includes('@')) {
        setError('Please enter a valid email address');
        setIsLoading(false);
        return;
      }

      // Validate phone number format if provided
      if (phone.trim() && !/^\d{10}$/.test(phone.trim())) {
        setError('Please enter a valid 10-digit phone number');
        setIsLoading(false);
        return;
      }

      // Prepare user data - ensure field names match API expectations
      const userData = {
        username: username.trim(),
        password: password.trim(),
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined, // 'phone' not 'phoneNumber'
        role,
        loanAccess: loanAccess.map(loan => loan.trim().toUpperCase())
      };
      
      console.log('User data prepared with fields:', Object.keys(userData));

      console.log('Creating user with data:', { ...userData, password: '******' });

      // Send request - try the NextJS API endpoint first
      console.log('Sending request to /api/users');
      console.log('Request payload:', JSON.stringify(userData, null, 2));
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      // Signal to the browser not to cache this request
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify(userData),
        signal: controller.signal
      };
      
      let response;
      try {
        response = await fetch('/api/users', options);
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        throw new Error(`Network error: ${fetchError.message}`);
      }
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      // Handle response
      let data;
      try {
        // Clone the response before reading to avoid "body already read" errors
        const responseClone = response.clone();
        const responseText = await response.text();
        console.log('Raw response text:', responseText);
        
        if (!responseText) {
          throw new Error('Empty response from server');
        }
        
        if (!responseText.trim().startsWith('{') && !responseText.trim().startsWith('[')) {
          console.error('Response is not JSON:', responseText);
          throw new Error(`Expected JSON response but got: ${responseText.substring(0, 100)}`);
        }
        
        data = JSON.parse(responseText);
        console.log('Parsed response data:', data);
      } catch (parseError: any) {
        console.error('Error parsing response:', parseError);
        setError(`Invalid response from server: ${parseError.message}`);
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        const errorMessage = data.details 
          ? (Array.isArray(data.details) ? data.details.join(', ') : data.details)
          : (data.message || data.error || `Server error: ${response.status}`);
        throw new Error(errorMessage);
      }

      // Always show success message when response is OK
      console.log('User creation successful!', data);
      
      // Show prominent success message
      const successMessage = data.message || 'User created successfully!';
      setSuccess(successMessage);
      
      // Show toast notification with more visibility
      toast.success(successMessage, {
        duration: 5000, // Show for 5 seconds
        style: {
          background: '#10B981',
          color: '#FFFFFF',
          fontWeight: 'bold',
          padding: '16px',
          borderRadius: '8px',
        },
        iconTheme: {
          primary: '#FFFFFF',
          secondary: '#10B981',
        },
      });
      
      // Also log success to console for debugging
      console.log('Success message displayed:', successMessage);
      
      // If successful, store the last created user for display
      if (data.user) {
        // Add the plaintext password for display purposes
        setLastCreatedUser({
          ...data.user,
          id: data.user._id || data.user.id,
          password: userData.password,
          createdAt: data.user.createdAt || new Date().toISOString()
        });
      }

      // Clear form
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setName('');
      setEmail('');
      setPhone('');
      setRole('user');
      setLoanAccess([]);
      
      // Refresh the users list
      await fetchUsers();

    } catch (error: any) {
      console.error('User creation error:', error);
      const errorMessage = error.message || 'An error occurred while creating the user';
      setError(errorMessage);
      
      // Show alert for debugging
      alert(`User creation failed: ${errorMessage}`);
      console.log('Full error object:', error);
      
      // If the Next.js API fails, try the express server directly as fallback
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        try {
          console.log('Trying fallback to direct server API...');
          
          const userData = {
            username: username.trim(),
            password: password.trim(),
            name: name.trim(),
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
            role,
            loanAccess: loanAccess.map(loan => loan.trim().toUpperCase())
          };
          
          const response = await fetch('/api/create-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            },
            body: JSON.stringify(userData)
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.message || data.error || 'Failed to create user');
          }
          
          setSuccess('User created successfully through fallback API!');
          setError('');
          
          if (data.user) {
            setLastCreatedUser({
              ...data.user,
              id: data.user._id || data.user.id,
              password: userData.password,
              createdAt: data.user.createdAt || new Date().toISOString()
            });
          }
          
          // Clear form
          setUsername('');
          setPassword('');
          setConfirmPassword('');
          setName('');
          setEmail('');
          setPhone('');
          setRole('user');
          setLoanAccess([]);
          
          // Refresh the users list
          await fetchUsers();
        } catch (fallbackError: any) {
          console.error('Fallback API also failed:', fallbackError);
          setError(`Failed to create user through all available methods: ${fallbackError.message}`);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Add loan ID to access list
  const addLoanAccess = () => {
    if (loanInput.trim() === '') return;
    
    // Format the loan ID if needed (e.g., add prefix if missing)
    let formattedLoanId = loanInput.trim().toUpperCase();
    if (!formattedLoanId.startsWith('BIZLN-') && /^\d+$/.test(formattedLoanId)) {
      formattedLoanId = `BIZLN-${formattedLoanId}`;
    }
    
    // Check if loan ID already exists in the list
    if (!loanAccess.includes(formattedLoanId)) {
      setLoanAccess([...loanAccess, formattedLoanId]);
    }
    
    setLoanInput('');
  };

  // Remove loan ID from access list
  const removeLoanAccess = (loanId: string) => {
    setLoanAccess(loanAccess.filter(id => id !== loanId));
  };

  return (
    <div>
      {/* Last Created User - Display prominently at the top */}
      {lastCreatedUser && (
        <div className="mb-8 p-6 border-2 border-green-400 rounded-lg bg-green-50">
          <h3 className="text-xl font-bold text-green-800 mb-4">New User Created Successfully!</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Username:</p>
              <p className="text-lg font-mono bg-white px-3 py-2 rounded border font-bold">{lastCreatedUser.username}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Password:</p>
              <p className="text-lg font-mono bg-white px-3 py-2 rounded border font-bold">{lastCreatedUser.password}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Name:</p>
              <p className="font-medium">{lastCreatedUser.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Role:</p>
              <p className="font-medium">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  lastCreatedUser.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                }`}>
                  {lastCreatedUser.role}
                </span>
              </p>
            </div>
            {lastCreatedUser.email && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Email:</p>
                <p className="font-medium">{lastCreatedUser.email}</p>
              </div>
            )}
            {lastCreatedUser.phone && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Phone:</p>
                <p className="font-medium">{lastCreatedUser.phone}</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Create User Form */}
      <div className="mb-10 bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header Section with Gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-6">
          <h3 className="text-2xl font-bold text-white">Create New User</h3>
          <p className="text-blue-100 mt-2">Add a new user to the system with appropriate roles and permissions</p>
        </div>
        
        <form onSubmit={handleCreateUser} className="p-8 space-y-6">
          {/* Personal Information Section */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input 
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  disabled={isLoading}
                  required
                  placeholder="Enter first name"
                />
              </div>
              
              <div>
                <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input 
                  id="lastName"
                  type="text"
                  value={name.split(' ')[1] || ''}
                  onChange={(e) => {
                    const firstName = name.split(' ')[0] || '';
                    setName(`${firstName} ${e.target.value}`.trim());
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  disabled={isLoading}
                  placeholder="Enter last name"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <input 
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                disabled={isLoading}
                placeholder="Enter email address (optional)"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2">
                  Username <span className="text-red-500">*</span>
                </label>
                <input 
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  disabled={isLoading}
                  required
                  placeholder="Enter username"
                />
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number
                </label>
                <input 
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  disabled={isLoading}
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <input 
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  disabled={isLoading}
                  required
                  placeholder="Enter password"
                />
                {password && (
                  <div className="mt-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            getPasswordStrength(password) <= 2 ? 'bg-red-500 w-1/3' :
                            getPasswordStrength(password) <= 4 ? 'bg-yellow-500 w-2/3' :
                            'bg-green-500 w-full'
                          }`}
                        ></div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        getPasswordStrengthText(getPasswordStrength(password)).bg
                      } ${getPasswordStrengthText(getPasswordStrength(password)).color}`}>
                        {getPasswordStrengthText(getPasswordStrength(password)).text}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input 
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  disabled={isLoading}
                  required
                  placeholder="Confirm password"
                />
                {confirmPassword && (
                  <div className="mt-2">
                    <div className={`flex items-center space-x-2 text-xs ${
                      password === confirmPassword ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {password === confirmPassword ? (
                        <>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>Passwords match</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          <span>Passwords do not match</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* User Roles & Permissions Section */}
          <div className="border-t pt-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">User Roles & Permissions</h4>
            <div className="space-y-3">
              <label className="flex items-center">
                <div className="relative">
                  <input
                    type="radio"
                    name="role"
                    value="user"
                    checked={role === 'user'}
                    onChange={(e) => setRole(e.target.value)}
                    className="sr-only"
                    disabled={isLoading}
                  />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    role === 'user' 
                      ? 'bg-blue-600 border-blue-600' 
                      : 'border-gray-300 hover:border-blue-400'
                  }`}>
                    {role === 'user' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                  </div>
                </div>
                <span className={`ml-3 px-3 py-1 rounded-full text-sm font-medium ${
                  role === 'user' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  ✓ User
                </span>
              </label>
              
              <label className="flex items-center">
                <div className="relative">
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={role === 'admin'}
                    onChange={(e) => setRole(e.target.value)}
                    className="sr-only"
                    disabled={isLoading}
                  />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    role === 'admin' 
                      ? 'bg-blue-600 border-blue-600' 
                      : 'border-gray-300 hover:border-blue-400'
                  }`}>
                    {role === 'admin' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                  </div>
                </div>
                <span className={`ml-3 px-3 py-1 rounded-full text-sm font-medium ${
                  role === 'admin' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  ✓ Admin
                </span>
              </label>
            </div>
          </div>
          
          {/* Error/Success Messages */}
          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-r-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {success && (
            <div className="p-4 bg-green-50 border-l-4 border-green-400 text-green-700 rounded-r-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{success}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => {
                setUsername('');
                setPassword('');
                setConfirmPassword('');
                setName('');
                setEmail('');
                setPhone('');
                setRole('user');
                setError('');
                setSuccess('');
              }}
              className="flex-1 sm:flex-none px-8 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
              disabled={isLoading}
            >
              Reset Form
            </button>
            
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 sm:flex-none px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating User...
                </div>
              ) : (
                "Create User"
              )}
            </button>
          </div>
        </form>
      </div>
      
      {/* Users List */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-8 py-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white">User Management</h3>
              <p className="text-gray-300 mt-1">Manage all system users and their permissions</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-white">{users.length}</div>
              <div className="text-gray-300 text-sm">Total Users</div>
            </div>
          </div>
        </div>

        {/* User Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-gray-50 border-b">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {users.filter(user => user.role === 'user').length}
                </div>
                <div className="text-sm text-gray-600">Regular Users</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {users.filter(user => user.role === 'admin').length}
                </div>
                <div className="text-sm text-gray-600">Administrators</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {users.filter(user => user.isActive !== false).length}
                </div>
                <div className="text-sm text-gray-600">Active Users</div>
              </div>
            </div>
          </div>
        </div>

        {/* Users Content */}
        <div className="p-6">
          {isLoadingUsers ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No users found</h3>
              <p className="mt-2 text-gray-500">Get started by creating your first user above.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Table Container */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                          </svg>
                          <span>User</span>
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                          </svg>
                          <span>Contact</span>
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                          </svg>
                          <span>Role</span>
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          <span>Created</span>
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          <span>Status</span>
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        <div className="flex items-center justify-end space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                          </svg>
                          <span>Actions</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user, index) => (
                      <tr key={user.id} className={`hover:bg-gray-50 transition-colors duration-150 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                      }`}>
                        {/* User Info */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                                <span className="text-white font-bold text-sm">
                                  {user.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {user.name}
                              </p>
                              <p className="text-sm text-gray-500 truncate">
                                @{user.username}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Contact Info */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-2">
                            {/* Email */}
                            {user.email ? (
                              <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                </svg>
                                <span className="text-sm text-gray-900 truncate max-w-xs" title={user.email}>
                                  {user.email}
                                </span>
                              </div>
                            ) : null}
                            
                            {/* Phone */}
                            {user.phone ? (
                              <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                                </svg>
                                <span className="text-sm text-gray-900">
                                  {user.phone}
                                </span>
                              </div>
                            ) : null}
                            
                            {/* Show placeholder when no contact info */}
                            {!user.email && !user.phone && (
                              <div className="flex items-center space-x-2 py-1">
                                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                                </svg>
                                <span className="text-xs text-gray-400 italic">No contact info</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            {user.role === 'admin' ? (
                              <>
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                                </svg>
                                Administrator
                              </>
                            ) : (
                              <>
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                </svg>
                                User
                              </>
                            )}
                          </span>
                        </td>

                        {/* Created Date */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {new Date(user.createdAt).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(user.createdAt).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${
                              user.isActive !== false ? 'bg-green-400' : 'bg-red-400'
                            }`}></div>
                            <span className={`text-xs font-medium ${
                              user.isActive !== false ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {user.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                              title="View user details"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                              </svg>
                              View
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id, user.username)}
                              className={`inline-flex items-center px-3 py-1 border shadow-sm text-xs font-medium rounded-md transition-colors duration-150 ${
                                user.username === 'adminbizln' 
                                  ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed' 
                                  : 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                              }`}
                              disabled={user.username === 'adminbizln'}
                              title={user.username === 'adminbizln' ? 'Cannot delete default admin user' : 'Delete user'}
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                              </svg>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 


