import type { NextConfig } from "next";

// Low-risk hardening headers for every route. A Content-Security-Policy is deliberately not set here:
// it needs a tested allow-list for Stripe and Supabase and is a separate, riskier change.
// Stripe Checkout is a full-page redirect (not an iframe), so refusing framing is safe.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  // The menu is the front door; there is no separate landing page. A real redirect (not a page that
  // redirects) so there is no flash of content and search engines follow it.
  async redirects() {
    return [{ source: "/", destination: "/menu", permanent: false }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
