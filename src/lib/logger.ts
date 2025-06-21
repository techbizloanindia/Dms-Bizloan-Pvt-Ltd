/**
 * Custom logger utility to prevent console logs from being saved to the database
 * This provides a safe way to log information without affecting database operations
 */

// Store the original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug
};

// Environment check
const isDevelopment = process.env.NODE_ENV === 'development';

// Create a safe logger that won't affect database operations
export const logger = {
  log: (message?: any, ...optionalParams: any[]) => {
    if (isDevelopment) {
      originalConsole.log(message, ...optionalParams);
    }
    // In production, we could send logs to a proper logging service instead
    return message; // Return the message to allow chaining
  },
  
  error: (message?: any, ...optionalParams: any[]) => {
    if (isDevelopment) {
      originalConsole.error(message, ...optionalParams);
    }
    // In production, we could send errors to a monitoring service
    return message;
  },
  
  warn: (message?: any, ...optionalParams: any[]) => {
    if (isDevelopment) {
      originalConsole.warn(message, ...optionalParams);
    }
    return message;
  },
  
  info: (message?: any, ...optionalParams: any[]) => {
    if (isDevelopment) {
      originalConsole.info(message, ...optionalParams);
    }
    return message;
  },
  
  debug: (message?: any, ...optionalParams: any[]) => {
    if (isDevelopment) {
      originalConsole.debug(message, ...optionalParams);
    }
    return message;
  }
};

// Function to safely stringify objects for logging
// This prevents circular references and sensitive data from being logged
export function safeStringify(obj: any, replacer?: (key: string, value: any) => any): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, replacer || ((_key, value) => {
    // Handle circular references
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    // Remove sensitive fields
    if (_key === 'password' || _key === 'token' || _key === 'secret') {
      return '[REDACTED]';
    }
    return value;
  }), 2);
}

// Export default logger
export default logger;
