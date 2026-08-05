/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Telegram Mini Apps are served inside a WebView with no server-side
  // rendering benefit worth the complexity here — a static export keeps
  // deployment trivial (any static host / Cloudflare Pages / etc.) and
  // sidesteps SSR entirely trying to touch `window.Telegram`.
  images: { unoptimized: true },
};

module.exports = nextConfig;
