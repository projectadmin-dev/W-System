/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  typescript: {
    ignoreBuildErrors: true
  },
  allowedDevOrigins: ['43.153.224.59', '10.3.9.134'],
}

export default nextConfig
