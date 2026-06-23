import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Empty config silences the error
    // Turbopack ignores webpack watchOptions but it's faster anyway
  },
};

export default nextConfig