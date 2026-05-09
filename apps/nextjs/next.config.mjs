/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@fruit-shop/types"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
}

export default nextConfig
