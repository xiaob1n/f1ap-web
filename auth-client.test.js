import { test, expect } from 'bun:test';
import { createAuthClient, normalizeEmail, validatePassword } from './auth-client.js';
const KEY = 'f1ap.auth.v1';
const instant = Date.parse('2026-01-01T00:00:00.000Z');
const expires = new Date(instant + 3600000).toISOString();
const receipt = { access_token: 'TEST_FIXTURE.token', token_type: 'Bearer', expires_at: expires };
const user = { id: '1', email: 'fixture@example.com' };
const login = { email: ' FIXTURE@EXAMPLE.COM ', password: 'TEST_FIXTURE_password', hcaptchaResponse: 'TEST_FIXTURE_captcha' };
function setup(responses = [], saved, storage) {
  const data = new Map(saved ? [[KEY, JSON.stringify(saved)]] : []), calls = [], timers = new Map();
  let clock = instant, id = 0;
  const client = createAuthClient({ now: () => clock,
    storage: storage || { getItem: k => data.get(k), setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) },
    setTimeout: (fn, delay) => { timers.set(++id, { fn, delay }); return id; }, clearTimeout: id => timers.delete(id),
    fetchImpl: async (path, init) => { calls.push({ path, ...init }); const next = responses.shift(); if (next instanceof Error) throw next; if (typeof next === 'function') return next(); return new Response(next?.status === 204 ? null : JSON.stringify(next?.body), { status: next?.status || 200 }); },
  });
  return { client, data, calls, timers, expire() { clock = instant + 3600000; for (const { fn } of [...timers.values()]) fn(); } };
}
test('登录只持久化令牌和固定期限，me 才认证，返回不泄密', async () => {
  const s = setup([{ body: receipt }, { body: { ...user, access_token: 'secret' } }]);
  const states = []; const off = s.client.subscribe(state => states.push(state));
  expect(await s.client.login(login)).toEqual(user);
  expect(JSON.parse(s.data.get(KEY))).toEqual({ access_token: receipt.access_token, expires_at: expires });
  expect(s.client.getState()).toEqual({ status: 'authenticated', user, expiresAt: expires });
  expect(JSON.parse(s.calls[0].body)).toEqual({ email: user.email, password: login.password, hcaptcha_response: login.hcaptchaResponse });
  expect(s.calls[0].headers.Authorization).toBeUndefined();
  expect(s.calls[1].headers.Authorization).toBe(`Bearer ${receipt.access_token}`);
  expect(s.calls.every(call => call.credentials === 'omit')).toBe(true);
  expect(s.calls.every(call => call.redirect === 'error')).toBe(true);
  off(); s.expire(); expect(s.client.getState().status).toBe('anonymous'); expect(s.data.size).toBe(0);
  expect(states.length).toBe(2);
});
test('用途固定路径，注册重置204不签发token，验证码维持字符串', async () => {
  const s = setup([{ status: 202, body: { challenge_id: 'TEST_FIXTURE', expires_at: expires } }, { status: 202, body: { challenge_id: 'TEST_FIXTURE', expires_at: expires } }, { status: 204 }, { status: 204 }]);
  for (const purpose of ['register', 'reset']) await s.client.requestCode({ purpose, email: user.email, hcaptchaResponse: 'ticket' });
  await s.client.register({ challengeId: 'TEST_FIXTURE', email: user.email, code: '000123', password: login.password });
  await s.client.resetPassword({ challengeId: 'TEST_FIXTURE', email: user.email, code: '000123', newPassword: login.password });
  expect(s.calls.map(c => c.path)).toEqual(['/api/v1/auth/registration-codes', '/api/v1/auth/password-reset-codes', '/api/v1/auth/register', '/api/v1/auth/password-reset']);
  expect(JSON.parse(s.calls[3].body)).toEqual({ challenge_id: 'TEST_FIXTURE', email: user.email, code: '000123', new_password: login.password });
  expect(s.calls.every(c => !c.headers.Authorization)).toBe(true); expect(s.data.size).toBe(0);
  await expect(s.client.requestCode({ purpose: '__proto__', email: user.email, hcaptchaResponse: 'ticket' })).rejects.toMatchObject({ code: 'invalid_payload' });
  await expect(s.client.register({ challengeId: 'fixture', email: user.email, code: 123456, password: login.password })).rejects.toMatchObject({ code: 'invalid_payload' });
  expect(s.calls.length).toBe(4);
});
test('恢复每次查me，网络/503不可认证但保留，401撤销清理', async () => {
  const s = setup([{ body: user }, { status: 503, body: { error: 'database_unavailable' } }, new Error('secret'), { status: 401, body: { error: 'unauthorized' } }], receipt);
  expect(s.client.getState().status).toBe('anonymous'); await s.client.restore();
  await expect(s.client.restore()).rejects.toMatchObject({ code: 'database_unavailable', uncertain: false });
  expect(s.client.getState().status).toBe('unavailable'); expect(s.data.size).toBe(1);
  await expect(s.client.restore()).rejects.toMatchObject({ code: 'network_error', uncertain: false });
  expect(await s.client.restore()).toBeNull(); expect(s.data.size).toBe(0); expect(s.calls.length).toBe(4);
});
test('logout未知保留，不重试，204/401清理', async () => {
  for (const failure of [new Error('secret'), { status: 503, body: { error: 'database_unavailable' } }]) {
    const s = setup([failure, { status: 204 }], receipt);
    await expect(s.client.logoutAll()).rejects.toMatchObject({ uncertain: true });
    expect(s.data.size).toBe(1); expect(s.calls.length).toBe(1); expect(s.client.getState().status).toBe('unavailable');
    await s.client.logoutAll(); expect(s.data.size).toBe(0);
  }
  const s = setup([{ status: 401, body: { error: 'unauthorized' } }], receipt); await s.client.logoutAll(); expect(s.data.size).toBe(0);
});
test('晚到登录和me不能复活退出状态', async () => {
  let finish;
  const s = setup([() => new Promise(resolve => { finish = resolve; })]);
  const pending = s.client.login(login); await s.client.logoutAll();
  finish(new Response(JSON.stringify(receipt)));
  await expect(pending).rejects.toMatchObject({ code: 'unauthorized' }); expect(s.data.size).toBe(0);
  const t = setup([() => new Promise(resolve => { finish = resolve; }), { status: 204 }], receipt);
  const restore = t.client.restore(); await t.client.logoutAll(); finish(new Response(JSON.stringify(user)));
  expect(await restore).toBeNull(); expect(t.client.getState().status).toBe('anonymous');
});
test('错误登录不清其他token；响应shape/过期限制；未知错误不回显', async () => {
  const s = setup([{ status: 401, body: { error: 'invalid_credentials' } }], receipt);
  await expect(s.client.login(login)).rejects.toMatchObject({ code: 'invalid_credentials', uncertain: false }); expect(s.data.size).toBe(1);
  for (const body of [{ ...receipt, token_type: 'cookie' }, { ...receipt, expires_at: new Date(instant + 86400001).toISOString() }, { ...receipt, access_token: 123 }]) {
    await expect(setup([{ body }]).client.login(login)).rejects.toMatchObject({ code: 'invalid_response', uncertain: true });
  }
  const t = setup([{ status: 500, body: { error: 'TEST_FIXTURE_SECRET' } }]);
  await expect(t.client.login(login)).rejects.toMatchObject({ code: 'auth_service_unavailable', uncertain: true }); expect(t.calls.length).toBe(1);
  const expired = setup([], { ...receipt, expires_at: new Date(instant).toISOString() }); expect(await expired.client.restore()).toBeNull(); expect(expired.calls.length).toBe(0);
});
test('邮箱仅ASCII空格trim不折点plus，密码按codepoint不trim', () => {
  expect(normalizeEmail(' A.B+T@EXAMPLE.COM ')).toBe('a.b+t@example.com');
  for (const email of ['\ta@example.com', 'é@example.com', 'K@example.com', 'a@localhost', 'a..b@example.com', 'a'.repeat(65) + '@example.com']) expect(() => normalizeEmail(email)).toThrow();
  expect(validatePassword('😀'.repeat(12))).toBe(true); expect(validatePassword(' '.repeat(12))).toBe(true);
  expect(validatePassword('😀'.repeat(129))).toBe(false); expect(validatePassword('a'.repeat(11))).toBe(false);
  expect(validatePassword('a'.repeat(12) + '\ud800')).toBe(false);
  expect(validatePassword('\udc00' + 'a'.repeat(12))).toBe(false);
});
test('30秒超时长于代理25秒，中止POST无自动重试且结果未知', async () => {
  const s = setup([() => new Promise((resolve, reject) => {
    s.calls[0].signal.addEventListener('abort', () => reject(new Error('TEST_FIXTURE_ABORT')));
  })]);
  const pending = s.client.login(login);
  const timeout = [...s.timers.values()].find(timer => timer.delay === 30000);
  expect(timeout).toBeDefined(); timeout.fn();
  await expect(pending).rejects.toMatchObject({ code: 'network_error', uncertain: true });
  expect(s.calls.length).toBe(1); expect(s.data.size).toBe(0);
});
test('存储读写删除任一失败均退内存，登录成功且到期清理', async () => {
  for (const failing of ['getItem', 'setItem', 'removeItem']) {
    const storage = { getItem: () => null, setItem() {}, removeItem() {} };
    storage[failing] = () => { throw new Error('TEST_FIXTURE_ACCESS_DENIED'); };
    const s = setup([{ body: receipt }, { body: user }], undefined, storage);
    expect(await s.client.login(login)).toEqual(user);
    expect(s.client.getState().status).toBe('authenticated');
    s.expire(); expect(s.client.getState()).toEqual({ status: 'anonymous', user: null, expiresAt: null });
  }
});
test('sessionStorage getter拒绝访问时懒获取退内存，不抛异常', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get() { throw new Error('TEST_FIXTURE_ACCESS_DENIED'); } });
  try {
    const responses = [receipt, user];
    let expiry;
    let clock = instant;
    const client = createAuthClient({ now: () => clock, fetchImpl: async () => new Response(JSON.stringify(responses.shift())),
      setTimeout: (fn, delay) => { if (delay === 3600000) expiry = fn; return 1; }, clearTimeout() {} });
    expect(await client.login(login)).toEqual(user);
    clock += 3600000; expiry(); expect(client.getState().status).toBe('anonymous');
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor);
    else delete globalThis.sessionStorage;
  }
});
test('配置关闭故障原因保留但不透传额外字段', async () => {
  const config = { enabled: false, reason: 'configuration_unavailable', sitekeys: { login: '', register: '', reset: '' } };
  const s = setup([{ body: { ...config, private_field: 'TEST_FIXTURE' } }]);
  expect(await s.client.getConfig()).toEqual(config);
  expect(s.calls[0].path).toBe('/local/auth-config');
  expect(s.calls[0].headers.Authorization).toBeUndefined();
});
