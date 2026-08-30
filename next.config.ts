import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Default is 1MB, too small for a real bank/account statement PDF
    // (src/app/portal/(protected)/foundation/statements). Vercel's own
    // serverless function platform may still cap large uploads below this
    // regardless — if a real client hits that, the fix is either bumping
    // this further or moving to Vercel Blob's direct-from-browser client
    // upload flow (see @vercel/blob docs), which bypasses the function body
    // limit entirely. Deferred unless it actually comes up.
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
