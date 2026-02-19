/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_GA_ID: process.env.GOOGLE_ANALYTICS_ID,
    NEXT_PUBLIC_FB_PIXEL_ID: process.env.META_PIXEL_ID,
  },
}

module.exports = nextConfig
