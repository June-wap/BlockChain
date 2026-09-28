/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "hardhat",
      "@nomicfoundation/edr",
      "@electric-sql/pglite",
      "pg",
    ],
  },
  eslint: {
    // Warnings should not fail production build
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "hardhat"];
    }
    return config;
  },
};

export default nextConfig;
