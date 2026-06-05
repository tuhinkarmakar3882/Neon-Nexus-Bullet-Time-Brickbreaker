/** Forward VITE_* from .env so shared src/ modules work without renaming. */
function viteEnv() {
  const env = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('VITE_') && typeof value === 'string') env[key] = value;
  }
  return env;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  allowedDevOrigins: ['192.168.29.15'],
  trailingSlash: true,
  images: { unoptimized: true },
  // Phaser is a singleton; Strict Mode's mount→unmount→remount breaks WebGL in dev.
  reactStrictMode: false,
  env: viteEnv(),
  transpilePackages: [],
  // Next 16 defaults to Turbopack; Phaser needs webpack extensionAlias below.
  turbopack: {},
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
  },
};

export default nextConfig;
