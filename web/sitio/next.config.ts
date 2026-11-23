import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

const nextConfig: NextConfig = {
  poweredByHeader: false,
};

export default nextConfig;

// Permite usar los bindings de Cloudflare en `next dev`.
initOpenNextCloudflareForDev();
