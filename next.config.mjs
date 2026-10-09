/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['node:sqlite'],
  eslint: {
    // Don't fail build on eslint warning during automated builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Enforce strict types
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
