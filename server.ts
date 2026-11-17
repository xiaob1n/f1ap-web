import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const token = process.env.F1AP_INTERNAL_WRITE_TOKEN;
const apiBase = (process.env.F1AP_API_BASE_URL || 'http://127.0.0.1:8080').replace(/\/+$/, '');
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
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
]);
const server = Bun.serve({
  hostname: listenHost, port: listenPort,
  async fetch(request) {
    const url = new URL(request.url);
    if (!allowAnyHost && !allowedHosts.has(url.host)) return new Response('Host 不允许', { status: 403 });
    const internal = url.pathname === '/internal/v1/round-syncs'
      || /^\/internal\/v2\/rounds\/[1-9][0-9]*\/predictions\/definition$/.test(url.pathname)
      || /^\/internal\/v2\/rounds\/[1-9][0-9]*\/predictions\/[0-9a-f-]{36}$/.test(url.pathname);
    if (internal) {
      if (request.headers.get('origin') && request.headers.get('origin') !== url.origin) return new Response('Origin 不允许', { status: 403 });
      const allowed = url.pathname === '/internal/v1/round-syncs' ? request.method === 'POST' : request.method === 'GET';
      if (!allowed) return new Response('方法不允许', { status: 405 });
      if (!token) return Response.json({ error: '本地代理未配置内部令牌' }, { status: 503 });
      if (request.method === 'POST' && !request.headers.get('content-type')?.startsWith('application/json')) return Response.json({ error: '需要 application/json' }, { status: 415 });
      try {
        const upstream = await fetch(`${apiBase}${url.pathname}`, {
          method: request.method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          ...(request.method === 'POST' ? { body: await request.text() } : {}), signal: AbortSignal.timeout(12000), redirect: 'error',
        });
        return new Response(upstream.body, { status: upstream.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        return Response.json({ error: 'API 连接失败；提交可能已保存，请先读回确认，勿自动重发。' }, { status: 502 });
      }
    }
    if (request.method !== 'GET') return new Response('方法不允许', { status: 405 });
    if (url.pathname === '/local/connection') {
      const started = performance.now();
      const targetUrl = new URL(apiBase);
      try {
        const res = await fetch(`${apiBase}/actuator/health/readiness`, { signal: AbortSignal.timeout(2500) });
        const data = await res.json().catch(() => ({}));
        const online = res.ok && data?.status === 'UP';
        return Response.json({
          online,
          host: targetUrl.host,
          latencyMs: Math.max(1, Math.round(performance.now() - started)),
          status: res.status,
        }, { headers: { 'Cache-Control': 'no-store' } });
      } catch (error) {
        return Response.json({
          online: false,
          host: targetUrl.host,
          latencyMs: null,
          error: error instanceof Error ? error.message : '连接失败',
        }, { headers: { 'Cache-Control': 'no-store' } });
      }
    }
    if (url.pathname === '/local/agent') {
      // 使用产品健康探针验证进程身份与订阅，不将私有健康文件暴露给浏览器。
      const probe = Bun.spawn([`${root}/f1ap-agent/.venv/bin/python`, '-m', 'f1ap_agent.messaging',
        '--healthcheck', '--require-ready', '--runtime-dir', `${root}/.omc/local-agent-runtime`],
        { env: process.env, stdout: 'ignore', stderr: 'ignore', timeout: 5000 });
      return Response.json({ status: await probe.exited === 0 ? 'UP' : 'DOWN' });
    }
    if (url.pathname === '/actuator/health/readiness' ||
        /^\/api\/v1\/rounds(?:\/[1-9][0-9]*\/prediction)?$/.test(url.pathname)) {
      try {
        const upstream = await fetch(`${apiBase}${url.pathname}${url.search}`,
          { signal: AbortSignal.timeout(8000) });
        return new Response(upstream.body, { status: upstream.status,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        return Response.json({ message: 'API 暂时无法连接，请检查本地进程。' }, { status: 502 });
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
console.log(`LOCAL_UI_READY http://${server.hostname}:${server.port}`);
