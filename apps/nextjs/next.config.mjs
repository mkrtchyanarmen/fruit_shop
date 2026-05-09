/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@fruit-shop/types"],
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "1337",
        pathname: "/**",
      },
    ],
  },
}

export default nextConfig
