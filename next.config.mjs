/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build optimizations
  eslint: {
    ignoreDuringBuilds: true, // Since ESLint config has issues, keep this for now
  },
  typescript: {
    // Enable type checking in production - ensure `npm run build` passes locally first
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
    unoptimized: true,
  },
  // Security headers are applied in middleware.ts
  // Performance optimizations
  reactStrictMode: true,
  poweredByHeader: false, // Remove X-Powered-By header for security
  compress: true,
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Fix for face-api.js and other client-side libraries
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        encoding: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        process: false,
      }
    }
    return config
  },
}

export default nextConfig
