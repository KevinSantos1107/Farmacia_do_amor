import { defineConfig, loadEnv } from 'vite'
import type { Plugin, HtmlTagDescriptor } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

function htmlMetaPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'html-meta-transform',
    transformIndexHtml() {
      const siteUrl = env.VITE_SITE_URL ? env.VITE_SITE_URL.replace(/\/+$/, '') : '';
      const siteName = env.VITE_SITE_NAME || '';
      const siteDescription = env.VITE_SITE_DESCRIPTION || '';
      const siteOgImage = env.VITE_SITE_OG_IMAGE || (siteUrl ? `${siteUrl}/capa_principal.jpg` : '');

      const tags: HtmlTagDescriptor[] = [];

      // Title & basic metadata
      if (siteName) {
        tags.push({ tag: 'title', children: siteName });
        tags.push({ tag: 'meta', attrs: { name: 'apple-mobile-web-app-title', content: siteName } });
        tags.push({ tag: 'meta', attrs: { property: 'og:title', content: `${siteName} 💕` } });
        tags.push({ tag: 'meta', attrs: { name: 'twitter:title', content: `${siteName} 💕` } });
      } else {
        tags.push({ tag: 'title', children: 'Nosso Espaço' });
      }

      if (siteDescription) {
        tags.push({ tag: 'meta', attrs: { name: 'description', content: siteDescription } });
        tags.push({ tag: 'meta', attrs: { property: 'og:description', content: siteDescription } });
        tags.push({ tag: 'meta', attrs: { name: 'twitter:description', content: siteDescription } });
      }

      tags.push({ tag: 'meta', attrs: { property: 'og:type', content: 'website' } });
      tags.push({ tag: 'meta', attrs: { property: 'og:locale', content: 'pt_BR' } });
      tags.push({ tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } });

      // og:url deve ser URL absoluta. Se VITE_SITE_URL não existir, omite
      if (siteUrl) {
        tags.push({ tag: 'meta', attrs: { property: 'og:url', content: `${siteUrl}/` } });
      }

      // og:image deve ser URL absoluta. Se VITE_SITE_URL / VITE_SITE_OG_IMAGE não existir, omite
      if (siteOgImage) {
        tags.push({ tag: 'meta', attrs: { property: 'og:image', content: siteOgImage } });
        tags.push({ tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } });
        tags.push({ tag: 'meta', attrs: { property: 'og:image:height', content: '630' } });
        tags.push({ tag: 'meta', attrs: { name: 'twitter:image', content: siteOgImage } });
      }

      return tags;
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const siteName = env.VITE_SITE_NAME || 'Nosso Espaço';
  const siteDescription = env.VITE_SITE_DESCRIPTION || 'Um espaço especial para nós — nossa história, memórias e momentos únicos.';

  return {
    plugins: [
      react(),
      htmlMetaPlugin(env),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
        manifest: {
          name: siteName,
          short_name: siteName,
          description: siteDescription,
          theme_color: '#05050A',
          background_color: '#05050A',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) return 'firebase';
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) return 'vendor';
              if (id.includes('swiper') || id.includes('lucide')) return 'ui';
            }
          }
        }
      }
    }
  };
})
