/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Vercel sets VERCEL_GIT_COMMIT_SHA at build time; expose a short,
    // client-readable build id so the splash version stamp auto-updates on
    // every deploy with no manual bump. Falls back to "dev" when run locally.
    NEXT_PUBLIC_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || "dev",
  },
};

export default nextConfig;
