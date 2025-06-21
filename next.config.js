/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This setting makes static builds work with Firebase
  images: {
    unoptimized: true,
  },
  // Skip type checking and linting to speed up builds
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Add experimental features for better API handling
  experimental: {
    serverComponentsExternalPackages: ['mongodb']
  },
  // Add back the rewrite rules with dynamic port handling
  async rewrites() {
    const apiPort = process.env.PORT || 3001; // Use 3001 to match the server
    const apiHost = process.env.API_HOST || 'localhost';
    
    return [
      {
        source: '/documets/:path*',
        destination: '/api/documents/:path*',
      },
      // Forward API requests to the backend server only for express routes
      {
        source: '/api/upload-document',
        destination: `http://${apiHost}:${apiPort}/api/upload-document`,
      },
      {
        source: '/api/admin/fetch-users',
        destination: `http://${apiHost}:${apiPort}/api/admin/fetch-users`,
      },
      {
        source: '/api/admin/fetch-documents',
        destination: `http://${apiHost}:${apiPort}/api/admin/fetch-documents`,
      }
    ];
  },
};

module.exports = nextConfig; 