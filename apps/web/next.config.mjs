/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@teamforge/contracts"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
