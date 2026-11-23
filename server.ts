import 'dotenv/config';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parsePositiveInt,
  validateBookInput,
  validateBorrowInput,
  validateStudentInput,
} from './src/lib/libraryLogic.ts';
import {
  HttpError,
  MemoryLibraryRepository,
  PgLibraryRepository,
  type LibraryRepository,
} from './server/repository.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createRepository(): LibraryRepository {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    return new PgLibraryRepository(databaseUrl);
  }
  return new MemoryLibraryRepository();
}

export function createApiRouter(repo: LibraryRepository): express.Router {
  const router = express.Router();

  router.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true, mode: repo.mode });
  });

  router.get('/students', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const students = await repo.listStudents();
      res.json({ students, mode: repo.mode });
    } catch (err) {
      next(err);
    }
  });

  router.post('/students', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = validateStudentInput(req.body ?? {});
      if (!validated.ok) {
        throw new HttpError(400, validated.error);
      }
      const student = await repo.addStudent(validated.data);
      res.status(201).json({ student });
    } catch (err) {
      next(err);
    }
  });

  router.get('/books', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const books = await repo.listBooks();
      res.json({ books, mode: repo.mode });
    } catch (err) {
      next(err);
    }
  });

  router.post('/books', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = validateBookInput(req.body ?? {});
      if (!validated.ok) {
        throw new HttpError(400, validated.error);
      }
      const book = await repo.addBook(validated.data);
      res.status(201).json({ book });
    } catch (err) {
      next(err);
    }
  });

  router.get('/borrows', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const borrows = await repo.listBorrows();
      res.json({ borrows, mode: repo.mode });
    } catch (err) {
      next(err);
    }
  });

  router.post('/borrows', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = validateBorrowInput(req.body ?? {});
      if (!validated.ok) {
        throw new HttpError(400, validated.error);
      }
      const borrow = await repo.issueBook(validated.data);
      res.status(201).json({ borrow });
    } catch (err) {
      next(err);
    }
  });

  router.patch(
    '/borrows/:transactionId/return',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const transactionId = parsePositiveInt(req.params.transactionId);
        if (transactionId === null) {
          throw new HttpError(400, 'Transaction ID must be a positive whole number.');
        }
        const borrow = await repo.markReturned(transactionId);
        res.json({ borrow });
      } catch (err) {
        next(err);
      }
    }
  );

  router.get('/', (_req: Request, res: Response) => {
    res.json({ ok: true, mode: repo.mode });
  });

  router.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  return router;
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;
  const repo = createRepository();

  app.use(express.json({ limit: '64kb' }));
  app.use('/api', createApiRouter(repo));

  app.use(
    (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      if (err instanceof SyntaxError && 'body' in err) {
        res.status(400).json({ error: 'Invalid JSON request body.' });
        return;
      }
      console.error('Unhandled API error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  );

  const distDir = path.resolve(__dirname, 'dist');
  const indexPath = path.join(distDir, 'index.html');
  const isDevLifecycle =
    process.env.npm_lifecycle_event === 'dev' ||
    process.env.NODE_ENV === 'development';
  const useProductionStatic =
    process.env.NODE_ENV === 'production' ||
    (!isDevLifecycle && fs.existsSync(indexPath));

  if (useProductionStatic) {
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output not found. Run "npm run build" first.');
      }
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(
      `Library Management Server (Frontend + API) listening on http://localhost:${port} (mode=${useProductionStatic ? 'production' : 'development'}, storage=${repo.mode})`
    );
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
