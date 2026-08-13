import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@tgim/api-client', '@tgim/shared'],
  experimental: {
    useTypeScriptCli: false,
  },
};

export default nextConfig;
