type AuthOptions = {
  apiBase: string;
  enabled?: boolean;
  sitekeys?: { login: string; register: string; reset: string };
  isAllowedHost: (url: URL) => boolean;
  isAllowedOrigin: (origin: string | null, url: URL) => boolean;
  fetch?: typeof fetch;
  timeoutMs?: number;
};

const postPaths = new Set(['registration-codes', 'register', 'login', 'password-reset-codes', 'password-reset', 'logout-all']
  .map(name => `/api/v1/auth/${name}`));
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const json = (error: string, status: number) => Response.json({ error }, { status, headers });
const stableErrors = new Set(['invalid_payload', 'invalid_captcha', 'invalid_credentials', 'invalid_code',
  'unauthorized', 'rate_limited', 'captcha_unavailable', 'database_unavailable']);

// 流式限长，不先把不可信正文完整读入内存。
async function boundedBody(body: ReadableStream<Uint8Array> | null, limit: number, signal?: AbortSignal) {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal?.addEventListener('abort', cancel, { once: true });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        void reader.cancel().catch(() => {});
        throw new Error('正文超限');
      }
      chunks.push(value);
    }
  } finally { signal?.removeEventListener('abort', cancel); reader.releaseLock(); }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}

export function createAuthHandler(options: AuthOptions) {
  const sitekeys = options.sitekeys ?? { login: '', register: '', reset: '' };
  const keys = Object.values(sitekeys);
  const configured = keys.every(key => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)
    && !/^(10000000|20000000|30000000)-/i.test(key)) && new Set(keys.map(key => key.toLowerCase())).size === 3;
  const enabled = options.enabled === true && configured;
  const fetchUpstream = options.fetch ?? fetch;
  return async (request: Request): Promise<Response | null> => {
    const url = new URL(request.url);
    const config = url.pathname === '/local/auth-config';
    const me = url.pathname === '/api/v1/users/me';
    const exact = me || postPaths.has(url.pathname);
    const namespace = url.pathname === '/api/v1/auth' || url.pathname.startsWith('/api/v1/auth/')
      || url.pathname.startsWith('/api/v1/users/me/');
    if (!config && !exact && !namespace) return null;
    if (!options.isAllowedHost(url)) return json('forbidden', 403);
    if (request.headers.get('sec-fetch-site') === 'cross-site') return json('forbidden', 403);
    if (url.search) return json('invalid_payload', 400);
    if (!config && !enabled) return json('auth_unavailable', 404);
    if (!config && !exact) return json('not_found', 404);
    if (request.method !== (config || me ? 'GET' : 'POST')) return json('method_not_allowed', 405);
    const origin = request.headers.get('origin');
    if ((request.method === 'POST' && !origin) || !options.isAllowedOrigin(origin, url)) return json('forbidden', 403);
    if (config) return Response.json({ enabled, sitekeys: enabled ? sitekeys : { login: '', register: '', reset: '' },
      ...(options.enabled && !configured ? { reason: 'configuration_unavailable' } : {}) }, { headers });
    const protectedRoute = me || url.pathname === '/api/v1/auth/logout-all';
    const upstreamHeaders = new Headers();
    if (protectedRoute) {
      const authorization = request.headers.get('authorization');
      if (!authorization || !/^Bearer [A-Za-z0-9._~+\/-]+=*$/.test(authorization)) return json('unauthorized', 401);
      upstreamHeaders.set('Authorization', authorization);
    }
    let body: Uint8Array | undefined;
    let contentType = '';
    if (request.method === 'POST') {
      const length = request.headers.get('content-length');
      if (length && (!/^\d+$/.test(length) || Number(length) > 16384)) return json('invalid_payload', 400);
      contentType = request.headers.get('content-type') ?? '';
      // logout-all 无业务载荷，也允许无正文、无 Content-Type。
      if (!/^application\/(?:json|[a-z0-9!#$&^_.+-]+\+json)(?:\s*;.*)?$/i.test(contentType)
          && !(protectedRoute && !contentType && !request.body)) return json('invalid_payload', 400);
    }
    // 同一总期限覆盖请求读取、上游调用与响应读取，网络结果未知时绝不重试。
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 25000);
    try {
      if (request.method === 'POST') {
        try { body = await boundedBody(request.body, 16384, controller.signal); }
        catch { return json('invalid_payload', 400); }
        if (contentType) upstreamHeaders.set('Content-Type', contentType);
      }
      controller.signal.throwIfAborted();
      const timeout = new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => reject(new Error('认证服务超时')), { once: true });
      });
      return await Promise.race([timeout, (async () => {
        const upstream = await fetchUpstream(`${options.apiBase.replace(/\/+$/, '')}${url.pathname}`, {
          method: request.method, headers: upstreamHeaders, body, signal: controller.signal, redirect: 'error',
        });
        if (upstream.status >= 300 && upstream.status < 400) throw new Error('不接受重定向');
        const emptySuccess = ['/api/v1/auth/register', '/api/v1/auth/password-reset', '/api/v1/auth/logout-all'].includes(url.pathname);
        if (upstream.status === 204) {
          if (!emptySuccess) throw new Error('响应结构不符');
          return new Response(null, { status: 204, headers });
        }
        const payload = await boundedBody(upstream.body, 65536, controller.signal);
        let data: any;
        try { data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(payload)); }
        catch { if (upstream.ok) throw new Error('响应结构不符'); }
        if (!upstream.ok) return json(upstream.status === 404 ? 'auth_unavailable'
          : stableErrors.has(data?.error) ? data.error : 'auth_service_unavailable', upstream.status);
        const codes = url.pathname.endsWith('-codes');
        const fields = me ? ['id', 'email'] : codes ? ['challenge_id', 'expires_at'] : ['access_token', 'token_type', 'expires_at'];
        const expectedStatus = codes ? 202 : 200;
        if (emptySuccess || upstream.status !== expectedStatus || !data || Array.isArray(data)
            || !fields.every(field => typeof data[field] === 'string' && data[field].length > 0)
            || (me && !/^[1-9][0-9]*$/.test(data.id))
            || (!me && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(data.expires_at))
            || (!me && !codes && data.token_type !== 'Bearer')) throw new Error('响应结构不符');
        return Response.json(Object.fromEntries(fields.map(field => [field, data[field]])), { status: upstream.status, headers });
      })()]);
    } catch { return json('auth_service_unavailable', 502); }
    finally { clearTimeout(timer!); }
  };
}
