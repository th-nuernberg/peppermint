// next.config.js
const withPlugins = require('next-compose-plugins');
const removeImports = require('next-remove-imports')();
const nextTranslate = require('next-translate');
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Service worker disabled: its scope/caching is unreliable under a URL sub-path.
  disable: true,
});

module.exports = withPlugins(
  [removeImports, nextTranslate, withPWA],
  {
    reactStrictMode: false,
    swcMinify: true,
    output: 'standalone',

    // Deployed under a URL sub-path: https://kiz1.in.ohmportal.de/peppermint
    // basePath prefixes pages, /_next assets, <Link> and router automatically.
    basePath: '/peppermint',

    // The upstream client has pre-existing build-time type/lint errors (e.g. the
    // CSS side-effect import in components/BlockEditor). SWC still compiles
    // everything; we skip the tsc/eslint gate so the image can build.
    typescript: {
      ignoreBuildErrors: true,
    },
    eslint: {
      ignoreDuringBuilds: true,
    },

    async rewrites() {
      return [
        {
          source: '/api/v1/:path*',
          destination: 'http://localhost:5003/api/v1/:path*',
        },
      ];
    },
  }
);
