import path from "node:path";
import type { NextConfig } from "next";

function getRemoteImagePatterns() {
  const patterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
    { protocol: "https", hostname: "images.unsplash.com" }
  ];

  const candidateUrls = [
    process.env.API_URL,
    process.env.NEXT_PUBLIC_API_URL,
    "http://localhost:4000",
    "http://127.0.0.1:4000"
  ].filter((value): value is string => Boolean(value));

  for (const value of candidateUrls) {
    try {
      const url = new URL(value);
      patterns.push({
        protocol: url.protocol.replace(":", "") as "http" | "https",
        hostname: url.hostname,
        port: url.port || undefined
      });
    } catch {
      // Ignore invalid env values and keep known-safe defaults.
    }
  }

  return patterns;
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: getRemoteImagePatterns()
  },
  typedRoutes: true,
  outputFileTracingRoot: path.join(process.cwd(), "../..")
};

export default nextConfig;
