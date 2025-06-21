// API configuration
// Default to relative URLs which will work with any port via the Next.js proxy
export const API_BASE_URL = ''; 

// Get full API URL for a specific endpoint
export const getApiUrl = (endpoint: string): string => {
  // Remove any leading slash from the endpoint
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  
  // Make sure api is in the path
  if (!cleanEndpoint.startsWith('api/') && !cleanEndpoint.startsWith('api')) {
    return `${API_BASE_URL}/api/${cleanEndpoint}`;
  }
  
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Function to handle API requests with proper error handling
export async function fetchApi<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = getApiUrl(endpoint);
  
  try {
    console.log(`API request to ${url}`);
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Try to parse JSON response
    let data;
    try {
      data = await response.json();
    } catch (error) {
      console.error(`Error parsing JSON response from ${url}:`, error);
      throw new Error(`Failed to parse API response as JSON: ${error.message}`);
    }
    
    // Check if response is not OK
    if (!response.ok) {
      const errorMessage = data.error || data.message || `API request failed with status ${response.status}`;
      console.error(`API error from ${url}:`, errorMessage);
      throw new Error(errorMessage);
    }
    
    return data as T;
  } catch (error) {
    console.error(`API request to ${url} failed:`, error);
    throw error;
  }
} 