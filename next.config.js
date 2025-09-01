/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize for Vercel serverless functions
  output: 'standalone',
  // Ensure API routes work properly
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, X-ADMIN-TOKEN' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
