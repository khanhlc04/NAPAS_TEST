import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 tự sinh AGENTS.md và CLAUDE.md khi chạy `next dev`; tắt để repo không có tệp lạ.
  agentRules: false,
};

export default nextConfig;
