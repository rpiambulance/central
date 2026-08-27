import type { NextConfig } from "next";

/**
 * Certification files are uploaded through a server action, and three
 * separate ceilings stand in front of the API's own 50MB rule. All of them
 * have to be raised together: whichever is lowest is the one that decides,
 * and each fails differently and unhelpfully.
 */
const UPLOAD_BODY_LIMIT = "52mb"; // 50MB of file, plus multipart overhead

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      // Default 1MB — small enough that a photo of a card taken on a phone is
      // refused before the API is ever asked.
      bodySizeLimit: UPLOAD_BODY_LIMIT,
    },
    // Default 10MB, applied because this app has a proxy (middleware) file, so
    // every request body passes through it. Exceeding it does not produce a
    // size error: the stream is truncated at the limit and the multipart
    // parser downstream reports "Unexpected end of form", which reads like a
    // corrupt upload rather than a large one.
    proxyClientMaxBodySize: UPLOAD_BODY_LIMIT,
  },
};

export default nextConfig;
