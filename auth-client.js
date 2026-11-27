const KEY = 'f1ap.auth.v1';
const DAY = 86400000;
const messages = {
  invalid_payload: '请检查输入内容。', invalid_captcha: '请重新完成人机验证。',
  invalid_credentials: '邮箱或密码不正确。', invalid_code: '验证码无效或已过期。',
  unauthorized: '登录已失效，请重新登录。', rate_limited: '操作过于频繁，请稍后再试。',
  captcha_unavailable: '人机验证服务暂不可用。', database_unavailable: '认证服务暂不可用。',
  auth_unavailable: '认证功能暂未开放。', auth_service_unavailable: '认证服务暂不可用。',
  network_error: '网络请求未完成，请检查网络后手动重试。', invalid_response: '认证响应无效，请稍后重试。',
};
export class AuthClientError extends Error {
  constructor(code, status = 0, uncertain = false) {
    super(messages[code] || messages.auth_service_unavailable);
    this.name = 'AuthClientError'; this.code = code; this.status = status; this.uncertain = uncertain;
  }
}
export function normalizeEmail(value) {
  if (typeof value !== 'string') throw new AuthClientError('invalid_payload');
  const trimmed = value.replace(/^ +| +$/g, '');
  if (/[^\x00-\x7f]/.test(trimmed)) throw new AuthClientError('invalid_payload');
  const email = trimmed.toLowerCase();
  const [local, domain, extra] = email.split('@');
  if (extra !== undefined || !local || local.length > 64 || email.length > 254 ||
      !/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/.test(local) ||
      !domain || domain.split('.').length < 2 || !domain.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) {
    throw new AuthClientError('invalid_payload');
  }
  return email;
}
export function validatePassword(value) {
  return typeof value === 'string' && [...value].every(point => !/^[\ud800-\udfff]$/.test(point)) &&
    [...value].length >= 12 && [...value].length <= 128 && new TextEncoder().encode(value).length <= 512;
}
const date = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value));
function requireStrings(...values) {
  if (values.some(value => typeof value !== 'string')) throw new AuthClientError('invalid_payload');
}
export function createAuthClient({ fetchImpl = globalThis.fetch.bind(globalThis), storage,
  now = () => Date.now(), setTimeout: later = globalThis.setTimeout.bind(globalThis),
  clearTimeout: cancel = globalThis.clearTimeout.bind(globalThis) } = {}) {
  let token = null, generation = 0, timer;
  // 浏览器禁用会话存储时只保留内存凭据，不使已完成的认证请求假失败。
  let persistence;
  try { persistence = storage === undefined ? globalThis.sessionStorage : storage; } catch { persistence = null; }
  function persist(method, ...args) {
    try { return persistence?.[method](...args); } catch { persistence = null; }
  }
  let state = { status: 'anonymous', user: null, expiresAt: null };
  const listeners = new Set();
  const getState = () => ({ ...state, user: state.user ? { ...state.user } : null });
  function publish(status, user = null) {
    state = { status, user, expiresAt: token?.expires_at || null };
    for (const listener of listeners) listener(getState());
  }
  function clear() {
    generation++; token = null; cancel(timer); persist('removeItem', KEY); publish('anonymous');
  }
  function validToken(value) {
    return value && typeof value.access_token === 'string' && /^[\x21-\x7e]+$/.test(value.access_token) &&
      date(value.expires_at) && Date.parse(value.expires_at) > now() && Date.parse(value.expires_at) - now() <= DAY;
  }
  function schedule() {
    cancel(timer);
    timer = later(() => { if (token && Date.parse(token.expires_at) <= now()) clear(); else if (token) schedule(); }, Date.parse(token.expires_at) - now());
    timer?.unref?.();
  }
  try {
    const saved = JSON.parse(persist('getItem', KEY) || 'null');
    if (validToken(saved)) { token = { access_token: saved.access_token, expires_at: saved.expires_at }; state.expiresAt = token.expires_at; schedule(); }
    else persist('removeItem', KEY);
  } catch { persist('removeItem', KEY); }
  async function request(path, { method = 'GET', body, bearer, expected = 200 } = {}) {
    const controller = new AbortController();
    // 长于本地代理的25秒上限，给人机验证、发信和数据库留出完整响应窗口。
    const timeout = later(() => controller.abort(), 30000);
    const post = method === 'POST';
    try {
      const response = await fetchImpl(path, { method, credentials: 'omit', redirect: 'error', signal: controller.signal,
        headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}) });
      if (response.status !== expected) {
        let code;
        try { code = (await response.json()).error; } catch { /* 不传播服务端原文。 */ }
        if (!Object.hasOwn(messages, code)) code = response.status === 404 ? 'auth_unavailable' : 'auth_service_unavailable';
        throw new AuthClientError(code, response.status, post && response.status >= 500);
      }
      if (expected === 204) return;
      try { return await response.json(); } catch { throw new AuthClientError('invalid_response', response.status, post); }
    } catch (error) {
      if (error instanceof AuthClientError) throw error;
      throw new AuthClientError('network_error', 0, post);
    } finally { cancel(timeout); }
  }
  async function me(current, version) {
    try {
      const user = await request('/api/v1/users/me', { bearer: current.access_token });
      if (!user || typeof user.id !== 'string' || !/^[1-9]\d*$/.test(user.id) || typeof user.email !== 'string') throw new AuthClientError('invalid_response', 200);
      try { if (normalizeEmail(user.email) !== user.email) throw new Error(); } catch { throw new AuthClientError('invalid_response', 200); }
      if (version !== generation || current !== token) throw new AuthClientError('unauthorized', 401);
      if (Date.parse(current.expires_at) <= now()) { clear(); throw new AuthClientError('unauthorized', 401); }
      const safe = { id: user.id, email: user.email }; publish('authenticated', safe); return { ...safe };
    } catch (error) {
      if (version === generation && current === token) {
        if (error.status === 401) clear(); else publish('unavailable');
      }
      throw error;
    }
  }
  return {
    getState,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    async getConfig() {
      const config = await request('/local/auth-config');
      if (typeof config?.enabled !== 'boolean' || !config.sitekeys || !['login', 'register', 'reset'].every(key => typeof config.sitekeys[key] === 'string')) throw new AuthClientError('invalid_response', 200);
      return { enabled: config.enabled, sitekeys: { login: config.sitekeys.login, register: config.sitekeys.register, reset: config.sitekeys.reset },
        ...(config.reason === 'configuration_unavailable' ? { reason: 'configuration_unavailable' } : {}) };
    },
    async login({ email, password, hcaptchaResponse }) {
      requireStrings(password, hcaptchaResponse);
      const version = ++generation;
      const data = await request('/api/v1/auth/login', { method: 'POST', body: { email: normalizeEmail(email), password, hcaptcha_response: hcaptchaResponse } });
      if (version !== generation) throw new AuthClientError('unauthorized', 401);
      if (data?.token_type !== 'Bearer' || !validToken(data)) throw new AuthClientError('invalid_response', 200, true);
      token = { access_token: data.access_token, expires_at: data.expires_at };
      persist('setItem', KEY, JSON.stringify(token)); schedule();
      publish('unavailable');
      return me(token, version);
    },
    async requestCode({ purpose, email, hcaptchaResponse }) {
      requireStrings(hcaptchaResponse);
      const path = { register: 'registration-codes', reset: 'password-reset-codes' }[purpose];
      if (!path || !['register', 'reset'].includes(purpose)) throw new AuthClientError('invalid_payload');
      const data = await request(`/api/v1/auth/${path}`, { method: 'POST', expected: 202, body: { email: normalizeEmail(email), hcaptcha_response: hcaptchaResponse } });
      if (typeof data?.challenge_id !== 'string' || !data.challenge_id || !date(data.expires_at)) throw new AuthClientError('invalid_response', 202, true);
      return { challenge_id: data.challenge_id, expires_at: data.expires_at };
    },
    async register({ challengeId, email, code, password }) {
      requireStrings(challengeId, code, password);
      await request('/api/v1/auth/register', { method: 'POST', expected: 204, body: { challenge_id: challengeId, email: normalizeEmail(email), code, password } });
    },
    async resetPassword({ challengeId, email, code, newPassword }) {
      requireStrings(challengeId, code, newPassword);
      await request('/api/v1/auth/password-reset', { method: 'POST', expected: 204, body: { challenge_id: challengeId, email: normalizeEmail(email), code, new_password: newPassword } });
    },
    async restore() {
      if (!token || Date.parse(token.expires_at) <= now()) { clear(); return null; }
      try { return await me(token, generation); } catch (error) { if (error.status === 401) return null; throw error; }
    },
    async logoutAll() {
      // 立即废止在途认证响应，但未知的退出结果仍保留令牌供显式重试。
      const version = ++generation, current = token;
      if (!current || Date.parse(current.expires_at) <= now()) { clear(); return; }
      try {
        await request('/api/v1/auth/logout-all', { method: 'POST', bearer: current.access_token, expected: 204 });
        if (version === generation && current === token) clear();
      } catch (error) {
        if (version === generation && current === token) {
          if (error.status === 401) { clear(); return; }
          publish('unavailable');
        }
        throw error;
      }
    },
  };
}
