import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

type ConnectMiddleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
) => void;

export default defineConfig({
  base: '/admin/',
  plugins: [
    react(),
    {
      name: 'redirect-root-to-admin',
      configureServer(server) {
        const redirect: ConnectMiddleware = (req, res, next) => {
          const url = req.url?.split('?')[0] ?? '';
          if (url === '/' || url === '' || url === '/admin') {
            res.statusCode = 302;
            const q = req.url?.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
            res.setHeader('Location', '/admin/' + q);
            res.end();
            return;
          }
          next();
        };
        server.middlewares.use(redirect);
      },
    },
  ],
  server: {
    port: 5173,
    open: '/admin/',
    proxy: {
      '/ingest': { target: 'http://localhost:3000', changeOrigin: true, timeout: 0 },
      '/drafts': { target: 'http://localhost:3000', changeOrigin: true },
      '/publish': { target: 'http://localhost:3000', changeOrigin: true },
      '/sources': { target: 'http://localhost:3000', changeOrigin: true },
      '/articles': { target: 'http://localhost:3000', changeOrigin: true },
      '/config': { target: 'http://localhost:3000', changeOrigin: true },
      '/stats': { target: 'http://localhost:3000', changeOrigin: true },
      '/cluster-categories': { target: 'http://localhost:3000', changeOrigin: true },
      '/topics': { target: 'http://localhost:3000', changeOrigin: true },
      '/topic-rules': { target: 'http://localhost:3000', changeOrigin: true },
      '/trends': { target: 'http://localhost:3000', changeOrigin: true },
      '/health': { target: 'http://localhost:3000', changeOrigin: true },
      '/writer-history': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
})
