import { defineConfig, loadEnv } from 'vite'
import type { Plugin, HtmlTagDescriptor } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

function apiDevPlugin(): Plugin {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];

        if (url === '/api/generate-devotional' || url === '/api/generate-quiz') {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Método não permitido.' }));
            return;
          }

          try {
            const chunks: Uint8Array[] = [];
            for await (const chunk of req) {
              chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
            }
            const rawBody = Buffer.concat(chunks).toString('utf-8');
            let body: unknown = {};
            if (rawBody.trim()) {
              try {
                body = JSON.parse(rawBody);
              } catch {
                body = rawBody;
              }
            }

            const filePath =
              url === '/api/generate-devotional'
                ? '/api/generate-devotional.ts'
                : '/api/generate-quiz.ts';

            const mod = await server.ssrLoadModule(filePath);
            const handler = mod.default;

            const vercelReq = Object.assign(req, { body });
            const vercelRes = Object.assign(res, {
              status(code: number) {
                res.statusCode = code;
                return this;
              },
              json(data: unknown) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
                return this;
              },
            });

            await handler(vercelReq, vercelRes);
          } catch (err: unknown) {
            console.error(`Erro no endpoint ${url}:`, err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            const msg = err instanceof Error ? err.message : String(err);
            res.end(
              JSON.stringify({
                error: msg || 'Erro interno no servidor de desenvolvimento.',
              })
            );
          }
          return;
        }

        next();
      });
    },
  };
}

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

  // Popula process.env para que as Serverless Functions locais (/api/...) consigam ler as chaves
  process.env.GEMINI_API_KEY = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  process.env.VITE_GEMINI_API_KEY = env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  process.env.FIREBASE_PROJECT_ID = env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'kevin-iara-site';

  return {
    plugins: [
      react(),
      apiDevPlugin(),
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
