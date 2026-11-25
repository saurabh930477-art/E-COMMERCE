import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import express from 'express';
import { rateLimit } from 'express-rate-limit';

const root = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || (isProduction ? 5173 : 3001));
const sessionDuration = 30 * 24 * 60 * 60 * 1000;
const sessionCookie = 'commonplace_session';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

mkdirSync(path.join(root, 'data'), { recursive: true });

const database = new Database(path.join(root, 'data', 'commonplace.sqlite'));
database.pragma('journal_mode = WAL');
database.pragma('foreign_keys = ON');
database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY,
    product_id TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    body TEXT NOT NULL CHECK (length(body) BETWEEN 3 AND 1000),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (product_id, user_id)
  );
`);
database.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb', strict: true }));

const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const productIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const getCookie = (request, name) => {
  const entry = (request.headers.cookie || '')
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));
  if (!entry) return null;
  try {
    return decodeURIComponent(entry.slice(name.length + 1));
  } catch {
    return null;
  }
};
const getSessionUser = (request) => {
  const token = getCookie(request, sessionCookie);
  if (!token) return null;
  const tokenHash = hashToken(token);
  const user = database.prepare(`
    SELECT users.id, users.name, users.email
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `).get(tokenHash, Date.now());
  if (!user) database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
  return user || null;
};
const setSessionCookie = (response, token) => {
  const options = [
    `${sessionCookie}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(sessionDuration / 1000)}`,
  ];
  if (isProduction) options.push('Secure');
  response.setHeader('Set-Cookie', options.join('; '));
};
const clearSessionCookie = (response) => {
  response.setHeader('Set-Cookie', `${sessionCookie}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProduction ? '; Secure' : ''}`);
};
const createSession = (response, userId) => {
  const token = randomBytes(32).toString('base64url');
  database.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(hashToken(token), userId, Date.now() + sessionDuration);
  setSessionCookie(response, token);
};
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 10 : 50,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many unsuccessful sign-in attempts. Please wait 15 minutes and try again.' },
});
const reviewRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 20 : 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many review submissions. Please wait and try again.' },
});
const asyncRoute = (handler) => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next);
};

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.get('/api/products/:productId/reviews', (request, response) => {
  const { productId } = request.params;
  if (!productIdPattern.test(productId)) {
    response.status(400).json({ error: 'Invalid product ID.' });
    return;
  }

  const currentUser = getSessionUser(request);
  const summary = database.prepare(`
    SELECT COUNT(*) AS reviewCount, ROUND(AVG(rating), 1) AS averageRating
    FROM reviews WHERE product_id = ?
  `).get(productId);
  const reviews = database.prepare(`
    SELECT reviews.id, reviews.rating, reviews.body, reviews.created_at AS createdAt, users.name,
      CASE WHEN users.id = ? THEN 1 ELSE 0 END AS isOwn
    FROM reviews JOIN users ON users.id = reviews.user_id
    WHERE reviews.product_id = ?
    ORDER BY reviews.created_at DESC, reviews.id DESC
    LIMIT 50
  `).all(currentUser?.id ?? null, productId);

  response.json({
    summary: {
      reviewCount: summary.reviewCount,
      averageRating: summary.averageRating || 0,
    },
    reviews,
  });
});

app.post('/api/products/:productId/reviews', reviewRateLimit, (request, response) => {
  const { productId } = request.params;
  if (!productIdPattern.test(productId)) {
    response.status(400).json({ error: 'Invalid product ID.' });
    return;
  }

  const user = getSessionUser(request);
  if (!user) {
    response.status(401).json({ error: 'Sign in to submit a product review.' });
    return;
  }

  const rating = request.body?.rating;
  const body = request.body?.body;
  const reviewBody = typeof body === 'string' ? body.trim() : '';
  if (!Number.isInteger(rating) || rating < 1 || rating > 5
    || reviewBody.length < 3 || reviewBody.length > 1000) {
    response.status(400).json({ error: 'Choose a rating from 1 to 5 and write a review between 3 and 1000 characters.' });
    return;
  }

  database.prepare(`
    INSERT INTO reviews (product_id, user_id, rating, body)
    VALUES (?, ?, ?, ?)
    ON CONFLICT (product_id, user_id) DO UPDATE SET
      rating = excluded.rating,
      body = excluded.body,
      created_at = CURRENT_TIMESTAMP
  `).run(productId, user.id, rating, reviewBody);

  response.status(201).json({ message: 'Your review has been saved.' });
});

app.post('/api/auth/signup', authRateLimit, asyncRoute(async (request, response) => {
  const name = typeof request.body.name === 'string' ? request.body.name.trim() : '';
  const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  const password = typeof request.body.password === 'string' ? request.body.password : '';

  if (!name || name.length > 80 || !emailPattern.test(email) || email.length > 254
    || password.length < 8 || password.length > 128 || request.body.termsAccepted !== true) {
    response.status(400).json({ error: 'Enter a valid name and email, use a password between 8 and 128 characters, and accept the terms.' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let result;
  try {
    result = database.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
      .run(name, email, passwordHash);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      response.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }
    throw error;
  }

  const user = { id: Number(result.lastInsertRowid), name, email };
  createSession(response, user.id);
  response.status(201).json({ user });
}));

app.post('/api/auth/login', authRateLimit, asyncRoute(async (request, response) => {
  const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  const password = typeof request.body.password === 'string' ? request.body.password : '';
  const user = database.prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?').get(email);

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    response.status(401).json({ error: 'Email or password is incorrect. Try again.' });
    return;
  }

  createSession(response, user.id);
  response.json({ user: { id: user.id, name: user.name, email: user.email } });
}));

app.get('/api/auth/me', (request, response) => {
  const token = getCookie(request, sessionCookie);
  if (!token) {
    response.json({ user: null });
    return;
  }

  const user = getSessionUser(request);
  if (!user) {
    clearSessionCookie(response);
    response.json({ user: null });
    return;
  }
  response.json({ user });
});

app.post('/api/auth/logout', (request, response) => {
  const token = getCookie(request, sessionCookie);
  if (token) database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
  clearSessionCookie(response);
  response.status(204).end();
});

app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'API endpoint not found.' });
});

app.use((error, _request, response, _next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    response.status(400).json({ error: 'Request body must be valid JSON.' });
    return;
  }
  if (error.status === 413) {
    response.status(413).json({ error: 'Request body is too large.' });
    return;
  }
  console.error(error);
  response.status(500).json({ error: 'The server encountered an unexpected error.' });
});

if (isProduction) {
  const distDirectory = path.join(root, 'dist');
  app.use(express.static(distDirectory));
  app.get('/{*splat}', (_request, response) => response.sendFile(path.join(distDirectory, 'index.html')));
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Commonplace server listening at http://localhost:${port}`);
});
