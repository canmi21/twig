import { Hono } from 'hono';

const app = new Hono<{ Bindings: Cloudflare.Env }>();

app.get('/', (c) => c.json({ ok: true, service: 'api' }));

// Future scopes mount here:
// app.route('/auth', authRoutes);
// app.route('/link', linkRoutes);

export default app;
