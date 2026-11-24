import { readFileSync } from 'node:fs';

// 优先从环境变量读取令牌，其次支持 Docker Secret 文件路径注入
function loadToken() {
  const inline = process.env.F1AP_INTERNAL_WRITE_TOKEN?.trim();
  if (inline) return inline;
  const filePath = process.env.F1AP_INTERNAL_WRITE_TOKEN_FILE?.trim();
  if (filePath) return readFileSync(filePath, 'utf8').trim();
  return '';
}

const token = loadToken();
const apiBase = (process.env.F1AP_API_BASE_URL || 'http://127.0.0.1:8080').replace(/\/+$/, '');
const serviceLabel = process.env.F1AP_SERVICE_LABEL || 'F1AP 预测服务';
const listenHost = process.env.F1AP_WEB_HOST || '127.0.0.1';
const listenPort = Number(process.env.F1AP_WEB_PORT || '3000');

const rawAllowedHosts = process.env.F1AP_ALLOWED_HOSTS;
const allowAnyHost = rawAllowedHosts === '*';
const allowedHosts = new Set(
  (rawAllowedHosts && !allowAnyHost ? rawAllowedHosts : `127.0.0.1:${listenPort},localhost:${listenPort}`)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
);

const publicOrigins = new Set(
  (process.env.F1AP_PUBLIC_ORIGIN || '')
    .split(',')
    .map(item => item.trim().replace(/\/+$/, ''))
    .filter(Boolean)
);

const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
]);

function isAllowedOrigin(origin, url) {
  if (!origin) return true;
  if (origin === url.origin || publicOrigins.has(origin)) return true;
  // 经过 Cloudflare HTTPS 反代回源 HTTP 时，放行已白名单域名的 https 同域 Origin
  return !allowAnyHost && allowedHosts.has(url.host) && origin === `https://${url.host}`;
}

const server = Bun.serve({
  hostname: listenHost,
  port: listenPort,
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== 'GET') return new Response('方法不允许', { status: 405 });

    // 容器与反代存活探针，不依赖上游状态且不受 Host 白名单拦截
    if (url.pathname === '/healthz') {
      return Response.json({ status: 'UP' }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (!allowAnyHost && !allowedHosts.has(url.host)) {
      return new Response('Host 不允许', { status: 403 });
    }

    // 仅开放只读预测查询路由；公网展示端绝不代理任何写入接口
    const internalRead = /^\/internal\/v2\/rounds\/[1-9][0-9]*\/predictions$/.test(url.pathname)
      || /^\/internal\/v2\/rounds\/[1-9][0-9]*\/predictions\/(?:definition|final)$/.test(url.pathname)
      || /^\/internal\/v2\/rounds\/[1-9][0-9]*\/predictions\/[0-9a-f-]{36}$/.test(url.pathname);
    if (internalRead) {
      if (!isAllowedOrigin(request.headers.get('origin'), url)) {
        return new Response('Origin 不允许', { status: 403 });
      }
      if (!token) return Response.json({ error: '服务端未配置内部访问令牌' }, { status: 503 });
      try {
        const upstream = await fetch(`${apiBase}${url.pathname}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(12000),
          redirect: 'error',
        });
        return new Response(upstream.body, {
          status: upstream.status,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        });
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        return Response.json({ error: '预测服务暂时无法连接。' }, { status: 502 });
      }
    }

    if (url.pathname === '/local/connection') {
      const started = performance.now();
      try {
        const res = await fetch(`${apiBase}/actuator/health/readiness`, { signal: AbortSignal.timeout(2500) });
        const data = await res.json().catch(() => ({}));
        const online = res.ok && data?.status === 'UP';
        return Response.json({
          online,
          host: serviceLabel,
          latencyMs: Math.max(1, Math.round(performance.now() - started)),
          status: res.status,
        }, { headers: { 'Cache-Control': 'no-store' } });
      } catch {
        return Response.json({
          online: false,
          host: serviceLabel,
          latencyMs: null,
        }, { headers: { 'Cache-Control': 'no-store' } });
      }
    }

    if (url.pathname === '/actuator/health/readiness'
        || /^\/api\/v1\/rounds(?:\/[1-9][0-9]*\/prediction)?$/.test(url.pathname)) {
      try {
        const upstream = await fetch(`${apiBase}${url.pathname}${url.search}`, {
          signal: AbortSignal.timeout(8000),
        });
        return new Response(upstream.body, {
          status: upstream.status,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        });
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        return Response.json({ message: 'API 暂时无法连接。' }, { status: 502 });
      }
    }

    const asset = assets.get(url.pathname);
    if (!asset) return new Response('未找到页面', { status: 404 });
    const [name, type] = asset;
    return new Response(Bun.file(`${import.meta.dir}/${name}`), {
      headers: { 'Content-Type': type ?? 'application/octet-stream', 'Cache-Control': 'no-store' },
    });
  },
});

const shutdown = () => {
  server.stop(true);
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log(`F1AP_WEB_READY http://${server.hostname}:${server.port}`);
