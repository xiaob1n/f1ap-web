import { expect, test } from 'bun:test';
import { createAuthHandler } from './auth-proxy';
import { createServerHandler } from './server';

// TEST_FIXTURE：仅合成公开配置与内存替身，不连接真实服务。
const sitekeys = { login: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', register: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', reset: 'cccccccc-cccc-cccc-cccc-cccccccccccc' };
function setup(overrides: Record<string, unknown> = {}) {
  const calls: { url: string; init: RequestInit }[] = [];
  const handler = createAuthHandler({ apiBase: 'http://upstream.invalid', enabled: true, sitekeys,
    isAllowedHost: url => url.host === 'localhost:3000',
    isAllowedOrigin: (origin, url) => !origin || origin === url.origin,
    fetch: (async (url, init) => { calls.push({ url: String(url), init: init! }); return Response.json({ error: 'invalid_captcha' }, { status: 400 }); }) as typeof fetch,
    ...overrides });
  return { handler, calls };
}
function req(path = '/api/v1/auth/login', init: RequestInit = {}) {
  const headers = new Headers({ Origin: 'http://localhost:3000', 'Content-Type': 'application/json' });
  new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  return new Request(`http://localhost:3000${path}`, { method: 'POST', body: '{}', ...init,
    headers });
}

test('公开配置和关闭、无效、重复、官方测试 key 均故障关闭', async () => {
  const get = () => req('/local/auth-config', { method: 'GET', body: undefined });
  expect(await (await setup().handler(get()))!.json()).toEqual({ enabled: true, sitekeys });
  for (const overrides of [{ enabled: false }, { sitekeys: { ...sitekeys, login: '' } }, { sitekeys: { ...sitekeys, login: sitekeys.reset } },
    ...['10000000', '20000000', '30000000'].map(prefix => ({ sitekeys: { ...sitekeys, login: `${prefix}-ffff-ffff-ffff-ffffffffffff` } }))]) {
    const { handler, calls } = setup(overrides);
    expect((await (await handler(get()))!.json()).enabled).toBe(false);
    expect((await handler(req()))!.status).toBe(404);
    expect(calls).toHaveLength(0);
  }
});

test('精确方法、路径、query、Host、Origin 和 fetch-site 边界', async () => {
  const { handler, calls } = setup();
  for (const request of [req('/api/v1/auth/login?token=x'), req('/api/v1/auth/login/'), req('/api/v1/auth/login', { method: 'GET', body: undefined }),
    new Request('http://evil.invalid/api/v1/auth/login', { method: 'POST' }),
    new Request('http://localhost:3000/api/v1/auth/login', { method: 'POST' }),
    req(undefined, { headers: { Origin: 'https://evil.invalid' } }), req(undefined, { headers: { 'Sec-Fetch-Site': 'cross-site' } })]) {
    expect((await handler(request))!.status).toBeGreaterThanOrEqual(400);
  }
  expect(await handler(req('/api/v1/other'))).toBeNull();
  expect(calls).toHaveLength(0);
});

test('匿名原 JSON 透传但剥离凭据、Cookie、转发头；后端错误原契约', async () => {
  const { handler, calls } = setup();
  const body = '{"email":"test@example.invalid","password":"TEST_FIXTURE"}';
  const response = (await handler(req(undefined, { body, headers: { Authorization: 'Bearer user.jwt', Cookie: 'session=x', Forwarded: 'for=x', 'X-Forwarded-For': 'x' } })))!;
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: 'invalid_captcha' });
  expect(calls).toHaveLength(1);
  expect(calls[0].url).toBe('http://upstream.invalid/api/v1/auth/login');
  expect(new TextDecoder().decode(calls[0].init.body as Uint8Array)).toBe(body);
  expect([...new Headers(calls[0].init.headers).keys()]).toEqual(['content-type']);
  expect(calls[0].init.redirect).toBe('error');
  expect(response.headers.get('cache-control')).toBe('no-store');
});

test('受保护接口只接受单个 Bearer，不接受 cookie 或多值', async () => {
  const { handler, calls } = setup();
  for (const authorization of ['', 'Basic x', 'Bearer x, Bearer y', 'Bearer x y']) {
    expect((await handler(req('/api/v1/users/me', { method: 'GET', body: undefined, headers: { Authorization: authorization, Cookie: 'token=x' } })))!.status).toBe(401);
  }
  await handler(req('/api/v1/users/me', { method: 'GET', body: undefined, headers: { Authorization: 'Bearer user.jwt.signature', Cookie: 'token=x' } }));
  expect([...new Headers(calls[0].init.headers)]).toEqual([['authorization', 'Bearer user.jwt.signature']]);
});

test('16KiB 长度声明、实际字节、无长度分块、媒体类型限制', async () => {
  const { handler, calls } = setup();
  for (const request of [req(undefined, { headers: { 'Content-Length': '16385' } }), req(undefined, { body: 'x'.repeat(16385) }),
    req(undefined, { headers: { 'Content-Type': 'text/plain' } }), req(undefined, { body: new ReadableStream({ start(controller) {
      controller.enqueue(new Uint8Array(10000)); controller.enqueue(new Uint8Array(6385)); controller.close();
    } }) })]) expect((await handler(request))!.status).toBe(400);
  expect(calls).toHaveLength(0);
  await handler(req(undefined, { body: ' '.repeat(16382) + '{}', headers: { 'Content-Type': 'application/problem+json' } }));
  expect(calls).toHaveLength(1);
});

test('25秒默认策略可注入短超时；断网、重定向、巨大上游、非法 JSON 只调用一次', async () => {
  for (const fetchStub of [async () => { throw new Error('TEST_FIXTURE'); }, async () => new Response(null, { status: 302, headers: { Location: 'https://evil.invalid' } }),
    async () => new Response('x'.repeat(65537)), async () => new Response('not-json'),
    async () => new Promise<Response>(() => {})]) {
    let count = 0;
    const { handler } = setup({ timeoutMs: 5, fetch: async () => { count++; return fetchStub(); } });
    const response = (await handler(req()))!;
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'auth_service_unavailable' });
    expect(count).toBe(1);
  }
});

test('204 无正文且移除 Set-Cookie、Location、CORS', async () => {
  const { handler } = setup({ fetch: async () => new Response(null, { status: 204, headers: { 'Set-Cookie': 'x=y', Location: '/x', 'Access-Control-Allow-Origin': '*' } }) });
  const response = (await handler(req('/api/v1/auth/logout-all', { body: undefined, headers: { Authorization: 'Bearer user.jwt.signature' } })))!;
  expect(response.status).toBe(204);
  expect(await response.text()).toBe('');
  for (const name of ['set-cookie', 'location', 'access-control-allow-origin']) expect(response.headers.has(name)).toBe(false);
});

test('六个精确 POST 与 me 可达，400/401/429/503 错误保留', async () => {
  const { handler, calls } = setup();
  for (const name of ['registration-codes', 'register', 'login', 'password-reset-codes', 'password-reset', 'logout-all']) {
    expect((await handler(req(`/api/v1/auth/${name}`, { headers: { Authorization: 'Bearer user.jwt.signature' } })))!.status).toBe(400);
  }
  expect(calls).toHaveLength(6);
  for (const status of [400, 401, 429, 503]) {
    const current = setup({ fetch: async () => Response.json({ error: 'TEST_FIXTURE' }, { status }) });
    expect((await current.handler(req()))!.status).toBe(status);
  }
});

test('原入口 internal POST 405、健康探针不受 Host 限制、内部查询不接收用户 JWT', async () => {
  const calls: RequestInit[] = [];
  const handler = createServerHandler((async (_, init) => { calls.push(init!); return Response.json({}); }) as typeof fetch);
  expect((await handler(req('/internal/v2/rounds/1/predictions'))).status).toBe(405);
  expect((await handler(new Request('http://evil.invalid/healthz'))).status).toBe(200);
  const response = await handler(req('/internal/v2/rounds/1/predictions', { method: 'GET', body: undefined, headers: { Authorization: 'Bearer user.jwt.signature' } }));
  expect([200, 503]).toContain(response.status);
  if (calls.length) expect(new Headers(calls[0].headers).get('authorization')).not.toBe('Bearer user.jwt.signature');
});

test('上游错误只保留稳定错误码，额外秘密和非 JSON 消息不外泄', async () => {
  for (const [status, body, error] of [
    [400, { error: 'invalid_payload', credentials: 'TEST_FIXTURE_SECRET' }, 'invalid_payload'],
    [503, { error: 'TEST_FIXTURE_SECRET', detail: 'TEST_FIXTURE_SECRET' }, 'auth_service_unavailable'],
    [404, { error: 'not_found', secret: 'TEST_FIXTURE_SECRET' }, 'auth_unavailable'],
    [500, 'TEST_FIXTURE_SECRET', 'auth_service_unavailable'],
  ] as const) {
    const { handler } = setup({ fetch: async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }) });
    const response = (await handler(req()))!;
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error });
  }
});

test('成功响应按路径投影，结构错误及非约定204均返回502', async () => {
  const expires_at = '2026-11-27T12:00:00.000Z';
  for (const [path, status, data] of [
    ['/api/v1/auth/login', 200, { access_token: 'TEST_FIXTURE_TOKEN', token_type: 'Bearer', expires_at }],
    ['/api/v1/auth/registration-codes', 202, { challenge_id: 'TEST_FIXTURE', expires_at }],
    ['/api/v1/auth/password-reset-codes', 202, { challenge_id: 'TEST_FIXTURE', expires_at }],
    ['/api/v1/users/me', 200, { id: '1', email: 'test@example.invalid' }],
  ] as const) {
    const { handler } = setup({ fetch: async () => Response.json({ ...data, debug: 'TEST_FIXTURE_SECRET', credentials: 'TEST_FIXTURE_SECRET' }, { status }) });
    const response = (await handler(req(path, { ...(path.endsWith('/me') ? { method: 'GET', body: undefined } : {}), headers: { Authorization: 'Bearer user.jwt.signature' } })))!;
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual(data);
  }
  for (const response of [new Response(null, { status: 204 }), Response.json({}),
    Response.json({ access_token: 'x', token_type: 'Basic', expires_at }), Response.json({ access_token: 'x', token_type: 'Bearer', expires_at: 123 })]) {
    const { handler } = setup({ fetch: async () => response });
    expect((await handler(req()))!.status).toBe(502);
  }
});

test('慢请求正文限时取消，且不触发上游请求', async () => {
  let cancelled = false;
  const { handler, calls } = setup({ timeoutMs: 5 });
  const response = (await handler(req(undefined, { body: new ReadableStream({ cancel() { cancelled = true; } }) })))!;
  expect(response.status).toBe(400);
  expect(cancelled).toBe(true);
  expect(calls).toHaveLength(0);
});

test('请求读取消耗同一总期限，上游不能重新获得完整期限', async () => {
  let calls = 0;
  let upstreamSignal: AbortSignal | undefined;
  let responseTimer: ReturnType<typeof setTimeout> | undefined;
  const { handler } = setup({ timeoutMs: 100,
    fetch: async (_url: string, init: RequestInit) => {
      calls++;
      upstreamSignal = init.signal as AbortSignal;
      // 请求已耗用60ms；再用60ms应超出总100ms，但不超出重新计时的100ms。
      return new Promise<Response>(resolve => {
        responseTimer = setTimeout(() => resolve(Response.json({ error: 'invalid_captcha' }, { status: 400 })), 60);
      });
    } });
  const body = new ReadableStream<Uint8Array>({ start(controller) {
    setTimeout(() => { controller.enqueue(new TextEncoder().encode('{}')); controller.close(); }, 60);
  } });
  try {
    const response = (await handler(req(undefined, { body })))!;
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'auth_service_unavailable' });
    expect(calls).toBe(1);
    expect(upstreamSignal?.aborted).toBe(true);
  } finally { clearTimeout(responseTimer); }
});
