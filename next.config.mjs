/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pure client app (WebMCP is a client DOM API) — export a fully static site that runs on any
  // host and inside ChatGPT's in-app browser.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
