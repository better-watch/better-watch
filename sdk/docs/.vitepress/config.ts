import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'TraceInject',
  description: 'Build-time dynamic instrumentation for TypeScript applications',
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/overview' },
      { text: 'Plugins', link: '/plugins/webpack' },
      { text: 'Frameworks', link: '/frameworks/nextjs' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/getting-started' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Quick Start', link: '/guide/quick-start' },
          ],
        },
        {
          text: 'Configuration',
          items: [
            { text: 'Configuration Reference', link: '/guide/config-reference' },
            { text: 'Remote Configuration', link: '/guide/remote-config' },
            { text: 'Environment Variables', link: '/guide/environment-variables' },
          ],
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Tracepoints', link: '/guide/tracepoints' },
            { text: 'Variable Capture', link: '/guide/variable-capture' },
            { text: 'Redaction & Filtering', link: '/guide/redaction' },
          ],
        },
      ],
      '/plugins/': [
        {
          text: 'Build Tool Plugins',
          items: [
            { text: 'Webpack Plugin', link: '/plugins/webpack' },
            { text: 'Vite Plugin', link: '/plugins/vite' },
            { text: 'Rollup Plugin', link: '/plugins/rollup' },
            { text: 'esbuild Plugin', link: '/plugins/esbuild' },
            { text: 'TypeScript Plugin', link: '/plugins/typescript' },
          ],
        },
      ],
      '/frameworks/': [
        {
          text: 'Framework Integration',
          items: [
            { text: 'Next.js', link: '/frameworks/nextjs' },
            { text: 'Nuxt', link: '/frameworks/nuxt' },
            { text: 'Hono', link: '/frameworks/hono' },
            { text: 'Remix', link: '/frameworks/remix' },
            { text: 'Express', link: '/frameworks/express' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/overview' },
            { text: 'Parser API', link: '/api/parser' },
            { text: 'Injector API', link: '/api/injector' },
            { text: 'Capture API', link: '/api/capture' },
            { text: 'Config API', link: '/api/config-api' },
            { text: 'Server API', link: '/api/server-api' },
          ],
        },
      ],
      '/troubleshooting/': [
        {
          text: 'Troubleshooting',
          items: [
            { text: 'Common Issues', link: '/troubleshooting/common-issues' },
            { text: 'Performance Tips', link: '/troubleshooting/performance' },
            { text: 'Security Best Practices', link: '/troubleshooting/security' },
            { text: 'FAQ', link: '/troubleshooting/faq' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com' },
    ],
  },
})
