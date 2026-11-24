import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { selfTestComputeAge, validateDatabase } from './server/playerDatabase';
import {
  applySecurityHeaders,
  healthHandler,
  searchPlayerHandler,
  playerProfileHandler,
  aiAssistantHandler,
} from './server/apiHandlers';

dotenv.config();

// Run startup database validations and self-tests
selfTestComputeAge();
validateDatabase();

const app = express();
const PORT = 3000;

// Security settings (AI Studio preview iframe friendly: NO X-Frame-Options or frame-ancestors)
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((_req: Request, res: Response, next: NextFunction) => {
  applySecurityHeaders(res);
  next();
});

// JSON body parser with 50kb limit
app.use(express.json({ limit: '50kb' }));

// Custom JSON error handler
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err && err.status === 413) {
    return res.status(413).json({ error: 'حجم الطلب كبير جداً (Payload Too Large)' });
  }
  if (err && (err.type === 'entity.parse.failed' || err.status === 400)) {
    return res.status(400).json({ error: 'طلب غير صالح (Invalid JSON)' });
  }
  next(err);
});

function methodNotAllowed(allowedMethod: 'GET' | 'POST') {
  return (_req: Request, res: Response) => {
    res.setHeader('Allow', allowedMethod);
    return res.status(405).json({
      error: 'الطريقة غير مسموحة (Method Not Allowed)',
      errorCode: 'METHOD_NOT_ALLOWED',
    });
  };
}

// Health check endpoint (GET only)
app.get('/api/health', healthHandler);
app.all('/api/health', methodNotAllowed('GET'));

// 1. Search player endpoint (POST only)
app.post('/api/search-player', searchPlayerHandler);
app.all('/api/search-player', methodNotAllowed('POST'));

// 2. Comprehensive Player Profile (POST only)
app.post('/api/player-profile', playerProfileHandler);
app.all('/api/player-profile', methodNotAllowed('POST'));

// 3. Round Picker AI Assistant (POST only)
app.post('/api/ai-assistant', aiAssistantHandler);
app.all('/api/ai-assistant', methodNotAllowed('POST'));

// Process-level unhandled exception handlers
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [Server] Unhandled Rejection:', reason instanceof Error ? reason.message : 'Unknown error');
});

process.on('uncaughtException', (err) => {
  console.error('⚠️ [Server] Uncaught Exception:', err instanceof Error ? err.message : 'Unknown error');
});

// Vite middleware setup
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
