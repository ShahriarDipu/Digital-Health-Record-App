import type { NextConfig } from "next";

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  customWorkerDir: "worker",
  runtimeCaching: require("./pwa-cache"),
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  async redirects() {
    return [
      { source: "/visits", destination: "/dashboard/visits", permanent: true },
      { source: "/prescription", destination: "/dashboard/prescription", permanent: true },
      { source: "/lab-report", destination: "/dashboard/lab-report", permanent: true },
      { source: "/lifestyle", destination: "/dashboard/lifestyle", permanent: true },
      { source: "/reminders", destination: "/dashboard/reminders", permanent: true },
    ];
  },
};

module.exports = withPWA(nextConfig);
