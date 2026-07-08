import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Permanent DALL·E images are re-hosted on Vercel Blob; allow next/image to optimize them.
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  // Keep these server-only SDKs + Prisma's engine (and the big disposable-domain
  // list) out of the client bundle.
  serverExternalPackages: [
    "@prisma/client",
    "@anthropic-ai/sdk",
    "openai",
    "disposable-email-domains",
  ],
};

export default nextConfig;
