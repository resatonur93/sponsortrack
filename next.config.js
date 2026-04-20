/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs"],
  },
  webpack: (config, { dev }) => {
    if (!dev && process.env.REDUCE_WEBPACK_MEMORY === "1") {
      config.parallelism = 1;
    }
    return config;
  },
};

module.exports = nextConfig;
