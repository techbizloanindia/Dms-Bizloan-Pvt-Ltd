import { NextRequest } from 'next/server';

/**
 * Safely parses a request body as JSON
 * Prevents "body disturbed or locked" errors by cloning the request
 */
export async function safeParseJson<T = any>(request: NextRequest): Promise<T> {
  try {
    // Always clone the request before reading the body
    const clonedRequest = request.clone();
    return await clonedRequest.json();
  } catch (error) {
    console.error('Error parsing request JSON:', error);
    throw new Error('Invalid JSON in request body');
  }
}



/**
 * Safely gets form data from a request
 * Prevents "body disturbed or locked" errors by cloning the request
 */
export async function safeParseFormData(request: NextRequest): Promise<FormData> {
  try {
    // Always clone the request before reading the body
    const clonedRequest = request.clone();
    return await clonedRequest.formData();
  } catch (error) {
    console.error('Error parsing form data:', error);
    throw new Error('Invalid form data in request');
  }
} 