/* F1 账号面板 · 前端交互
 * 独立原生 ES module，不依赖 app.js / style.css。
 * 密码、验证码、令牌、人机验证票据不写日志、不进 URL、不回显到 DOM 属性；
 * 错误文案全部由本地映射生成，不透传服务端原文。 */

import { createAuthClient, AuthClientError, normalizeEmail, validatePassword } from './auth-client.js';
import { createCaptcha } from './hcaptcha.js';

const byId = id => document.getElementById(id);
const client = createAuthClient();

const COOLDOWN_MS = 60_000;
const CODE_PATTERN = /^\d{6}$/;
const EMAIL_HINT = '请输入有效的邮箱地址。';
const PASSWORD_HINT = '密码需为 12–128 个字符。';
const MANAGED = new Set(['login-submit', 'register-send', 'reset-send', 'register-submit', 'reset-submit']);

let config = null;
let configReady = false;
let configMessage = '';
let view = 'login';
let busy = false;
let renderSeq = 0;   // 视图/关闭变更后作废在途渲染
let opSeq = 0;       // 操作占用标记，finally 依此释放忙碌态
let lastUser = null;  // 最近一次已确认账户（内存，不持久化）
let ticker = null;
let loggingOut = false;
let focusHolder = null; // 请求期间被禁用的输入框，解锁后还焦

const flows = {
  register: { step: 1, email: '', challengeId: '', expiresAt: 0 },
  reset: { step: 1, email: '', challengeId: '', expiresAt: 0 },
};
const cooldowns = new Map(); // normalized email -> 冷却结束时间戳

const captcha = { purpose: null, widget: null, abort: null, token: '', loading: false };

const dom = {
  dialog: byId('auth-dialog'),
  kicker: byId('auth-kicker'),
  title: byId('auth-title'),
  desc: byId('auth-desc'),
  stepper: byId('auth-stepper'),
  notice: byId('auth-notice'),
  alert: byId('auth-alert'),
  close: byId('auth-close'),
  entry: byId('auth-open'),
  entryLabel: byId('auth-entry-label'),
  views: {
    login: byId('view-login'),
    register: byId('view-register'),
    reset: byId('view-reset'),
    account: byId('view-account'),
    unavailable: byId('view-unavailable'),
  },
};

const VIEW_META = {
  login: {
    kicker: 'ACCOUNT · SIGN IN', title: '登录',
    desc: '使用注册邮箱与密码登录。登录状态只保留在当前标签页，不提供“记住登录”。',
  },
  register: {
    kicker: 'ACCOUNT · SIGN UP', title: '注册',
    desc: '先验证邮箱，再设置密码。完成后请用邮箱和密码登录。',
  },
  reset: {
    kicker: 'ACCOUNT · RECOVERY', title: '找回密码',
    desc: '验证注册邮箱后设置新密码。完成后请使用新密码登录。',
  },
  account: {
    kicker: 'ACCOUNT · STATUS', title: '账号状态',
    desc: '查看当前登录信息，或退出全部设备。',
  },
  unavailable: {
    kicker: 'ACCOUNT · UNAVAILABLE', title: '账号服务暂未开放',
    desc: '当前部署未开放账号功能，赛事浏览与预测查看不受影响。',
  },
};

/* ---------- 提示条 ---------- */
function showAlert(message) {
  dom.notice.hidden = true;
  dom.notice.textContent = '';
  dom.alert.textContent = message;
  dom.alert.hidden = false;
}

function showNotice(message, kind = 'info') {
  dom.alert.hidden = true;
  dom.alert.textContent = '';
  dom.notice.textContent = message;
  dom.notice.className = `auth-notice is-${kind}`;
  dom.notice.hidden = false;
}

function clearMessages() {
  dom.alert.textContent = '';
  dom.alert.hidden = true;
  dom.notice.textContent = '';
  dom.notice.hidden = true;
}

function setFieldError(inputId, message) {
  const input = byId(inputId);
  const box = byId(`${inputId}-error`);
  if (box) {
    box.textContent = message || '';
    box.hidden = !message;
  }
  if (input) {
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }
}

/* ---------- 错误文案映射 ---------- */
const COPY = {
  invalid_payload: '提交的内容不符合要求，请检查后重试。',
  invalid_captcha: '人机验证未通过，请重新完成验证。',
  invalid_credentials: '邮箱或密码不正确，请重新输入。',
  invalid_code: '验证码无效或已过期，请重新申请验证码。',
  unauthorized: '登录已失效，请重新登录。',
  rate_limited: '操作过于频繁，请稍后再试。',
  captcha_unavailable: '人机验证服务暂不可用，请重新挑战后再试。',
  database_unavailable: '认证服务暂不可用，请稍后再重试。',
  auth_unavailable: '账号服务暂未开放。',
  auth_service_unavailable: '认证服务暂不可用，请稍后再试。',
  network_error: '网络请求未完成，请检查网络后手动重试。',
  invalid_response: '认证服务返回了无法识别的结果，请稍后再试。',
};

const UNCERTAIN = {
  login: '登录结果未确认，不会自动重试。请检查网络后手动重试。',
  sendCode: '验证码请求结果未确认，不会自动重试。请检查邮箱后再决定是否重新申请。',
  register: '提交结果未确认，不会自动重试。请返回登录页尝试登录以确认账号状态。',
  reset: '提交结果未确认，不会自动重试。请返回登录页尝试登录以确认账号状态。',
  logout: '退出结果未确认，不会自动重试。你可能仍处于登录状态，请稍后手动重试。',
  restore: '暂时无法验证登录状态，请检查网络后手动重试。',
  config: '暂时无法获取账号服务配置，请检查网络后手动重试。',
};

function describeError(error, context) {
  if (!(error instanceof AuthClientError)) return COPY.auth_service_unavailable;
  const code = error.code;
  if (error.status === 404 || code === 'auth_unavailable') return COPY.auth_unavailable;
  if (error.status === 429 || code === 'rate_limited') return COPY.rate_limited;
  if (code === 'captcha_unavailable' || code === 'invalid_captcha') return COPY.captcha_unavailable;
  if (code === 'invalid_credentials') return COPY.invalid_credentials;
  if (code === 'invalid_code') return COPY.invalid_code;
  if (code === 'unauthorized') return COPY.unauthorized;
  if (code === 'invalid_payload') return COPY.invalid_payload;
  if (error.uncertain) return UNCERTAIN[context] || UNCERTAIN.config;
  if (code === 'network_error') return COPY.network_error;
  return COPY[code] || COPY.auth_service_unavailable;
}

/* ---------- 工具 ---------- */
function formatExpiry(iso) {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return '—';
  const d = new Date(ms);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDuration(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes > 0 ? `${minutes} 分 ${String(seconds).padStart(2, '0')} 秒` : `${seconds} 秒`;
}

function flowExpired(flow) {
  return !flow.challengeId || !flow.expiresAt || flow.expiresAt <= Date.now();
}

function cooldownRemaining(email) {
  if (!email) return 0;
  return Math.max(0, (cooldowns.get(email) || 0) - Date.now());
}

function clearSensitive(purpose) {
  const ids = purpose
    ? [`${purpose}-code`, `${purpose}-password`, `${purpose}-password2`]
    : ['login-password', 'register-code', 'register-password', 'register-password2',
       'reset-code', 'reset-password', 'reset-password2'];
  for (const id of ids) {
    const node = byId(id);
    if (node) node.value = '';
  }
}

/* ---------- 人机验证 ---------- */
function captchaBlock(purpose) {
  return document.querySelector(`.auth-captcha[data-captcha="${purpose}"]`);
}

function setCaptchaState(purpose, state, text) {
  const block = captchaBlock(purpose);
  if (!block) return;
  const badge = block.querySelector('[data-role="state"]');
  const hint = block.querySelector('[data-role="hint"]');
  if (badge) {
    badge.dataset.state = state;
    badge.textContent = text;
  }
  if (hint) {
    hint.textContent = state === 'done'
      ? '人机验证已完成，可以提交。'
      : '完成人机验证后才能提交。';
  }
}

function resetCaptchaUI(purpose) {
  const block = captchaBlock(purpose);
  if (!block) return;
  const mount = block.querySelector('[data-role="mount"]');
  const start = block.querySelector('[data-role="start"]');
  if (mount) mount.replaceChildren();
  if (start) {
    start.hidden = false;
    start.disabled = false;
    start.textContent = '开始人机验证';
  }
  setCaptchaState(purpose, 'idle', '未完成');
}

function destroyCaptcha(purpose) {
  if (purpose && captcha.purpose !== purpose) return;
  const owned = captcha.purpose;
  if (captcha.abort) {
    captcha.abort.abort();
    captcha.abort = null;
  }
  if (captcha.widget) {
    try { captcha.widget.destroy(); } catch { /* 组件可能已失效 */ }
    captcha.widget = null;
  }
  captcha.token = '';
  captcha.loading = false;
  if (owned) resetCaptchaUI(owned);
}

function syncCaptcha(purpose) {
  if (captcha.purpose === purpose) return;
  destroyCaptcha();
  captcha.purpose = purpose;
}

function hasTicket(purpose) {
  return captcha.purpose === purpose && Boolean(captcha.token);
}

function consumeCaptcha(purpose) {
  if (captcha.purpose !== purpose) return;
  captcha.token = '';
  if (captcha.widget) {
    try { captcha.widget.reset(); } catch { /* 组件可能已失效 */ }
    setCaptchaState(purpose, 'ready', '请重新验证');
  } else {
    setCaptchaState(purpose, 'idle', '未完成');
  }
  refreshButtons();
}

async function loadCaptcha(purpose) {
  if (captcha.loading || busy) return;
  const block = captchaBlock(purpose);
  if (!block) return;
  const sitekey = config?.sitekeys?.[purpose];
  if (!sitekey) {
    showAlert('账号服务暂未开放。');
    return;
  }
  syncCaptcha(purpose);
  captcha.loading = true;
  setCaptchaState(purpose, 'loading', '加载中…');
  const start = block.querySelector('[data-role="start"]');
  const mount = block.querySelector('[data-role="mount"]');
  if (start) start.disabled = true;
  const controller = new AbortController();
  captcha.abort = controller;
  try {
    const widget = await createCaptcha({
      container: mount,
      sitekey,
      signal: controller.signal,
      size: (block.clientWidth - 24) < 320 ? 'compact' : 'normal',
      onToken: token => {
        if (captcha.purpose !== purpose || controller.signal.aborted) return;
        captcha.token = token;
        setCaptchaState(purpose, 'done', '已完成');
        refreshButtons();
      },
      onExpired: () => {
        if (captcha.purpose !== purpose) return;
        captcha.token = '';
        setCaptchaState(purpose, 'expired', '已过期');
        refreshButtons();
      },
      onError: () => {
        if (captcha.purpose !== purpose) return;
        captcha.token = '';
        destroyCaptcha(purpose);
        setCaptchaState(purpose, 'error', '加载失败');
        refreshButtons();
      },
    });
    if (controller.signal.aborted || captcha.purpose !== purpose) {
      widget.destroy();
      return;
    }
    captcha.widget = widget;
    captcha.loading = false;
    if (start) {
      start.hidden = true;
      start.disabled = false;
    }
    setCaptchaState(purpose, 'ready', '请完成验证');
  } catch {
    if (controller.signal.aborted || captcha.purpose !== purpose) return;
    captcha.loading = false;
    if (captcha.abort === controller) captcha.abort = null;
    resetCaptchaUI(purpose);
    const retry = block.querySelector('[data-role="start"]');
    if (retry) retry.textContent = '重新开始人机验证';
    setCaptchaState(purpose, 'error', '加载失败');
    showAlert('人机验证加载失败，请点击“开始人机验证”重试。');
  }
  refreshButtons();
}

/* ---------- 忙碌态 ---------- */
function setBusy(next) {
  busy = next;
  refreshButtons();
}

function updateSendButton(purpose) {
  const button = byId(purpose === 'register' ? 'register-send' : 'reset-send');
  if (!button) return;
  const remaining = cooldownRemaining(flows[purpose].email);
  if (remaining > 0) {
    button.textContent = `${Math.ceil(remaining / 1000)} 秒后可重新申请`;
    button.disabled = true;
    return;
  }
  button.textContent = flows[purpose].challengeId ? '重新发送验证码' : '发送验证码';
  button.disabled = busy || !hasTicket(purpose);
}

function refreshButtons() {
  const loginSubmit = byId('login-submit');
  if (loginSubmit) loginSubmit.disabled = busy || !hasTicket('login');
  for (const purpose of ['register', 'reset']) {
    updateSendButton(purpose);
    const submit = byId(`${purpose}-submit`);
    if (submit) {
      const flow = flows[purpose];
      submit.disabled = busy || flow.step !== 2 || flowExpired(flow);
    }
  }
  document.querySelectorAll('[data-busy-lock]').forEach(node => {
    if (MANAGED.has(node.id)) return;
    node.disabled = busy;
  });
  // 请求进行中锁住表单输入：邮箱/验证码/密码不能在请求途中被改动
  const inputs = dom.dialog ? dom.dialog.querySelectorAll('input') : [];
  if (busy) {
    const active = document.activeElement;
    if (active && active.tagName === 'INPUT' && active !== focusHolder && dom.dialog?.contains(active)) {
      focusHolder = active;
    }
    for (const input of inputs) input.disabled = true;
  } else {
    for (const input of inputs) input.disabled = false;
    const target = focusHolder;
    focusHolder = null;
    // 输入框被禁用会丢焦点，解锁后还原到原字段
    if (target && target.isConnected && !target.disabled && target.offsetParent) target.focus();
  }
  updateTtl();
}

/* ---------- 视图 ---------- */
function applyView(next) {
  view = next;
  renderSeq += 1;
  for (const [name, node] of Object.entries(dom.views)) {
    if (node) node.hidden = name !== next;
  }
  const meta = VIEW_META[next] || VIEW_META.login;
  dom.kicker.textContent = meta.kicker;
  dom.title.textContent = meta.title;
  dom.desc.textContent = meta.desc;
  dom.stepper.hidden = next !== 'register' && next !== 'reset';
  clearMessages();
  clearSensitive();
  if (next === 'login') syncCaptcha('login');
  else if (next === 'register') syncCaptcha('register');
  else if (next === 'reset') syncCaptcha('reset');
  else destroyCaptcha();
  if (next === 'register') applyStep('register', flows.register.challengeId && !flowExpired(flows.register) ? 2 : 1);
  if (next === 'reset') applyStep('reset', flows.reset.challengeId && !flowExpired(flows.reset) ? 2 : 1);
  if (next === 'account') renderAccount();
  refreshButtons();
  ensureTicker();
}

function requestView(next) {
  if (busy) return;
  applyView(next);
  focusView();
}

function focusView() {
  const node = dom.views[view];
  if (!node) return;
  const target = node.querySelector('input:not([type="hidden"]), button:not([disabled])');
  if (target) {
    target.focus();
    return;
  }
  const title = node.querySelector('.auth-view-title');
  if (title) {
    title.setAttribute('tabindex', '-1');
    title.focus();
  }
}

/* ---------- 注册 / 重置步骤 ---------- */
function applyStep(purpose, step, focus) {
  const flow = flows[purpose];
  flow.step = step;
  const root = dom.views[purpose];
  if (!root) return;
  root.querySelectorAll('.auth-step-pane').forEach(pane => {
    pane.hidden = pane.dataset.pane !== String(step);
  });
  const title = byId(`${purpose}-title`);
  if (title) {
    title.textContent = step === 1
      ? '第 1 步 · 验证邮箱'
      : (purpose === 'register' ? '第 2 步 · 设置密码' : '第 2 步 · 重置密码');
  }
  clearSensitive(purpose);
  if (step === 2) {
    destroyCaptcha(purpose);
    const emailNode = root.querySelector('[data-role="sent-email"]');
    if (emailNode) emailNode.textContent = flow.email;
  } else {
    const resume = root.querySelector('[data-role="resume"]');
    if (resume) resume.hidden = !(flow.challengeId && !flowExpired(flow));
  }
  updateStepper(purpose, step);
  refreshButtons();
  if (focus && step === 2) {
    requestAnimationFrame(() => byId(`${purpose}-code`)?.focus());
  }
}

function updateStepper(purpose, step) {
  dom.stepper.querySelectorAll('.auth-step').forEach(node => {
    const index = Number(node.dataset.step);
    node.classList.toggle('is-active', index === step);
    node.classList.toggle('is-done', index < step);
  });
}

function updateTtl() {
  for (const purpose of ['register', 'reset']) {
    const flow = flows[purpose];
    if (flow.step !== 2) continue;
    const ttl = dom.views[purpose]?.querySelector('[data-role="ttl"]');
    if (!ttl) continue;
    const remain = flow.expiresAt - Date.now();
    ttl.textContent = remain > 0 ? `${formatDuration(remain)}内有效` : '已过期，请重新申请';
  }
}

/* ---------- 发码 ---------- */
async function sendCode(purpose) {
  if (busy) return;
  const emailInput = byId(purpose === 'register' ? 'register-email' : 'reset-email');
  let email;
  try {
    email = normalizeEmail(emailInput.value);
  } catch {
    setFieldError(emailInput.id, EMAIL_HINT);
    emailInput.focus();
    return;
  }
  setFieldError(emailInput.id, '');

  const flow = flows[purpose];
  if (flow.email !== email) {
    flow.email = email;
    flow.challengeId = '';
    flow.expiresAt = 0;
    clearSensitive(purpose);
  }

  const remaining = cooldownRemaining(email);
  if (remaining > 0) {
    showAlert(`刚刚已为该邮箱申请过验证码，请在 ${Math.ceil(remaining / 1000)} 秒后再试。`);
    updateSendButton(purpose);
    ensureTicker();
    return;
  }
  if (!hasTicket(purpose)) {
    showAlert('请先完成人机验证。');
    return;
  }

  const ticket = captcha.token;
  const op = ++opSeq;
  const rseq = renderSeq;
  setBusy(true);
  const button = byId(purpose === 'register' ? 'register-send' : 'reset-send');
  button.textContent = '发送中…';
  try {
    const result = await client.requestCode({ purpose, email, hcaptchaResponse: ticket });
    if (rseq !== renderSeq) return;
    flow.email = email;
    flow.challengeId = result.challenge_id;
    flow.expiresAt = Date.parse(result.expires_at);
    cooldowns.set(email, Date.now() + COOLDOWN_MS);
    applyStep(purpose, 2, true);
    showNotice('请求已受理，请查看邮箱；未收到可稍后重新申请。');
    ensureTicker();
  } catch (error) {
    if (rseq !== renderSeq) return;
    const captchaError = error instanceof AuthClientError
      && (error.code === 'captcha_unavailable' || error.code === 'invalid_captcha');
    if (!captchaError && (error.uncertain || error.status === 429)) {
      cooldowns.set(email, Date.now() + COOLDOWN_MS);
    }
    showAlert(describeError(error, 'sendCode'));
  } finally {
    // 只在本次操作仍持有会话时作废票据：关闭弹窗后重开取得的新票据不能被旧请求清掉
    if (op === opSeq) consumeCaptcha(purpose);
    updateSendButton(purpose);
    if (op === opSeq) setBusy(false);
  }
}

/* ---------- 提交验证码与密码 ---------- */
async function submitCode(purpose) {
  if (busy) return;
  const flow = flows[purpose];
  const codeInput = byId(`${purpose}-code`);
  const passwordInput = byId(`${purpose}-password`);
  const confirmInput = byId(`${purpose}-password2`);
  const code = codeInput.value.trim();
  const password = passwordInput.value;

  if (!CODE_PATTERN.test(code)) {
    setFieldError(codeInput.id, '请输入 6 位数字验证码。');
    codeInput.focus();
    return;
  }
  setFieldError(codeInput.id, '');
  if (!validatePassword(password)) {
    setFieldError(passwordInput.id, PASSWORD_HINT);
    passwordInput.focus();
    return;
  }
  setFieldError(passwordInput.id, '');
  if (password !== confirmInput.value) {
    setFieldError(confirmInput.id, '两次输入的密码不一致。');
    confirmInput.focus();
    return;
  }
  setFieldError(confirmInput.id, '');
  if (!flow.challengeId) {
    showAlert('验证码申请已失效，请重新申请验证码。');
    applyStep(purpose, 1);
    return;
  }
  if (flowExpired(flow)) {
    showAlert('验证码已过期，请重新申请。');
    flow.challengeId = '';
    flow.expiresAt = 0;
    applyStep(purpose, 1);
    return;
  }

  const op = ++opSeq;
  const rseq = renderSeq;
  setBusy(true);
  const button = byId(`${purpose}-submit`);
  button.textContent = '提交中…';
  try {
    if (purpose === 'register') {
      await client.register({ challengeId: flow.challengeId, email: flow.email, code, password });
    } else {
      await client.resetPassword({ challengeId: flow.challengeId, email: flow.email, code, newPassword: password });
    }
    if (rseq !== renderSeq) return;
    const email = flow.email;
    flow.challengeId = '';
    flow.expiresAt = 0;
    flow.step = 1;
    clearSensitive(purpose);
    cooldowns.delete(email);
    applyView('login');
    byId('login-email').value = email;
    showNotice(purpose === 'register'
      ? '验证已完成，请使用邮箱和密码登录；若已有账号，请使用原密码或找回密码。'
      : '验证已完成，请尝试以新密码登录。');
  } catch (error) {
    if (rseq !== renderSeq) return;
    showAlert(describeError(error, purpose));
    if (error instanceof AuthClientError && error.code === 'invalid_code') {
      flow.challengeId = '';
      flow.expiresAt = 0;
      applyStep(purpose, 1);
    }
  } finally {
    button.textContent = purpose === 'register' ? '完成注册' : '重置密码';
    if (op === opSeq) setBusy(false);
  }
}

/* ---------- 登录 ---------- */
async function submitLogin() {
  if (busy) return;
  const emailInput = byId('login-email');
  const passwordInput = byId('login-password');
  let email;
  try {
    email = normalizeEmail(emailInput.value);
  } catch {
    setFieldError(emailInput.id, EMAIL_HINT);
    emailInput.focus();
    return;
  }
  setFieldError(emailInput.id, '');
  if (!passwordInput.value) {
    setFieldError(passwordInput.id, '请输入密码。');
    passwordInput.focus();
    return;
  }
  setFieldError(passwordInput.id, '');
  if (!hasTicket('login')) {
    showAlert('请先完成人机验证。');
    return;
  }

  const ticket = captcha.token;
  const op = ++opSeq;
  const rseq = renderSeq;
  setBusy(true);
  const button = byId('login-submit');
  button.textContent = '登录中…';
  try {
    await client.login({ email, password: passwordInput.value, hcaptchaResponse: ticket });
    if (rseq !== renderSeq) return;
    passwordInput.value = '';
    applyView('account');
    showNotice('登录成功。', 'success');
  } catch (error) {
    if (rseq !== renderSeq) return;
    showAlert(describeError(error, 'login'));
  } finally {
    // 同上：旧请求不得作废重开后新取得的登录票据
    if (op === opSeq) consumeCaptcha('login');
    button.textContent = '登录';
    if (op === opSeq) setBusy(false);
  }
}

/* ---------- 账号状态与退出 ---------- */
function renderAccount() {
  const state = client.getState();
  const user = state.user || lastUser;
  byId('account-email').textContent = user?.email || '—';
  byId('account-id').textContent = user?.id || '—';
  byId('account-expires').textContent = state.expiresAt ? formatExpiry(state.expiresAt) : '—';
}

async function logoutAll() {
  if (busy) return;
  const op = ++opSeq;
  const rseq = renderSeq;
  setBusy(true);
  loggingOut = true;
  const yes = byId('logout-yes');
  yes.textContent = '退出中…';
  try {
    await client.logoutAll();
    if (rseq !== renderSeq) return;
    lastUser = null;
    clearSensitive();
    byId('logout-confirm').hidden = true;
    applyView('login');
    showNotice('已退出全部设备。', 'success');
  } catch (error) {
    if (rseq !== renderSeq) return;
    showAlert(describeError(error, 'logout'));
  } finally {
    loggingOut = false;
    yes.textContent = '确认退出';
    if (op === opSeq) setBusy(false);
  }
}

/* ---------- 配置与会话 ---------- */
async function loadConfig() {
  try {
    config = await client.getConfig();
    configReady = true;
    configMessage = config.enabled
      ? ''
      : '当前部署未开放账号功能，赛事浏览与预测查看不受影响，无需登录即可继续使用。';
  } catch (error) {
    config = null;
    configReady = true;
    configMessage = describeError(error, 'config');
  }
}

async function restoreSession() {
  try {
    const user = await client.restore();
    if (user) lastUser = { id: user.id, email: user.email };
  } catch {
    showEntryState(client.getState());
  }
}

function showEntryState(state) {
  if (!dom.entry) return;
  const label = dom.entryLabel;
  if (state.status === 'authenticated' && state.user) {
    dom.entry.dataset.state = 'authenticated';
    label.textContent = state.user.email;
    dom.entry.setAttribute('aria-label', `账号：${state.user.email}`);
  } else if (state.status === 'unavailable') {
    dom.entry.dataset.state = 'unknown';
    label.textContent = '登录状态未知';
    dom.entry.setAttribute('aria-label', '登录状态未知，点击重新验证');
  } else {
    dom.entry.dataset.state = 'anonymous';
    label.textContent = '登录 / 注册';
    dom.entry.setAttribute('aria-label', '登录或注册账号');
  }
}

/* ---------- 对话框 ---------- */
function openDialog(target) {
  if (!dom.dialog) return;
  if (!dom.dialog.open) dom.dialog.showModal();
  let next = target || 'login';
  if (configReady && (!config || !config.enabled)) next = 'unavailable';
  if (next === 'unavailable') {
    const text = byId('unavailable-text');
    if (text) text.textContent = configMessage || '账号服务暂未开放，赛事浏览与预测查看不受影响。';
  }
  applyView(next);
  focusView();
}

function closeDialog() {
  if (dom.dialog?.open) dom.dialog.close();
}

function onDialogClosed() {
  renderSeq += 1;
  opSeq += 1;      // 作废在途操作
  busy = false;
  destroyCaptcha();
  clearSensitive();
  clearMessages();
  stopTicker();
  refreshButtons();
  dom.entry?.focus();
}

/* ---------- 计时器 ---------- */
function ensureTicker() {
  if (ticker) return;
  ticker = setInterval(() => {
    updateTtl();
    for (const purpose of ['register', 'reset']) {
      if (flows[purpose].step === 1) updateSendButton(purpose);
    }
    const active = flows.register.step === 2 || flows.reset.step === 2
      || cooldownRemaining(flows.register.email) > 0 || cooldownRemaining(flows.reset.email) > 0;
    if (!active && !dom.dialog?.open) stopTicker();
  }, 1000);
}

function stopTicker() {
  if (ticker) {
    clearInterval(ticker);
    ticker = null;
  }
}

/* ---------- 事件 ---------- */
function bindEvents() {
  dom.entry?.addEventListener('click', () => {
    const state = client.getState();
    if (state.status === 'authenticated') openDialog('account');
    else if (state.status === 'unavailable') openDialog('unavailable');
    else openDialog('login');
  });

  dom.close?.addEventListener('click', closeDialog);
  dom.dialog?.addEventListener('close', onDialogClosed);
  dom.dialog?.addEventListener('click', event => {
    if (event.target !== dom.dialog) return;
    const rect = dom.dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right
      || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog();
  });

  byId('go-register')?.addEventListener('click', () => requestView('register'));
  byId('go-reset')?.addEventListener('click', () => requestView('reset'));
  byId('go-login-register')?.addEventListener('click', () => requestView('login'));
  byId('go-login-reset')?.addEventListener('click', () => requestView('login'));

  byId('login-form')?.addEventListener('submit', event => {
    event.preventDefault();
    submitLogin();
  });
  byId('register-form')?.addEventListener('submit', event => {
    event.preventDefault();
    if (flows.register.step === 1) sendCode('register');
    else submitCode('register');
  });
  byId('reset-form')?.addEventListener('submit', event => {
    event.preventDefault();
    if (flows.reset.step === 1) sendCode('reset');
    else submitCode('reset');
  });

  byId('register-back')?.addEventListener('click', () => {
    if (!busy) applyStep('register', 1);
  });
  byId('reset-back')?.addEventListener('click', () => {
    if (!busy) applyStep('reset', 1);
  });
  byId('register-resume')?.addEventListener('click', () => {
    if (!busy) applyStep('register', 2, true);
  });
  byId('reset-resume')?.addEventListener('click', () => {
    if (!busy) applyStep('reset', 2, true);
  });

  const invalidate = purpose => event => {
    if (flows[purpose].email === event.target.value) return;
    flows[purpose].email = event.target.value;
    flows[purpose].challengeId = '';
    flows[purpose].expiresAt = 0;
    clearSensitive(purpose);
    setFieldError(`${purpose}-email`, '');
  };
  byId('register-email')?.addEventListener('input', invalidate('register'));
  byId('reset-email')?.addEventListener('input', invalidate('reset'));

  document.querySelectorAll('.auth-captcha [data-role="start"]').forEach(button => {
    button.addEventListener('click', () => {
      const purpose = button.closest('.auth-captcha')?.dataset.captcha;
      if (purpose) loadCaptcha(purpose);
    });
  });

  document.querySelectorAll('[data-toggle-password]').forEach(button => {
    button.addEventListener('click', () => {
      const input = byId(button.dataset.togglePassword);
      if (!input) return;
      const shown = input.type === 'text';
      input.type = shown ? 'password' : 'text';
      button.setAttribute('aria-pressed', String(!shown));
      button.setAttribute('aria-label', shown ? '显示密码' : '隐藏密码');
      input.focus();
    });
  });

  byId('logout-start')?.addEventListener('click', () => {
    if (busy) return;
    const panel = byId('logout-confirm');
    if (panel) panel.hidden = false;
    byId('logout-yes')?.focus();
  });
  byId('logout-no')?.addEventListener('click', () => {
    const panel = byId('logout-confirm');
    if (panel) panel.hidden = true;
    byId('logout-start')?.focus();
  });
  byId('logout-yes')?.addEventListener('click', () => logoutAll());

  byId('unavailable-retry')?.addEventListener('click', async () => {
    if (busy) return;
    setBusy(true);
    await loadConfig();
    let restored = null;
    let failed = false;
    try {
      restored = await client.restore();
    } catch {
      failed = true;
    }
    setBusy(false);
    if (restored) {
      lastUser = { id: restored.id, email: restored.email };
      applyView('account');
      showNotice('登录状态已恢复。', 'success');
      return;
    }
    if (failed) {
      showAlert(UNCERTAIN.restore);
      showEntryState(client.getState());
      return;
    }
    if (config && config.enabled) {
      applyView('login');
      showNotice('账号服务可用，请登录。', 'success');
      return;
    }
    const text = byId('unavailable-text');
    if (text) text.textContent = configMessage || '账号服务暂未开放。';
    showAlert(configMessage || '账号服务暂未开放。');
  });
  byId('unavailable-close')?.addEventListener('click', closeDialog);

  for (const id of ['register-code', 'reset-code']) {
    byId(id)?.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      const purpose = id.startsWith('register') ? 'register' : 'reset';
      if (flows[purpose].step === 2) submitCode(purpose);
    });
  }
}

/* ---------- 启动 ---------- */
function start() {
  if (!dom.dialog || !dom.entry) return;
  bindEvents();
  client.subscribe(state => {
    if (state.status === 'authenticated' && state.user) {
      lastUser = { id: state.user.id, email: state.user.email };
    }
    showEntryState(state);
    if (state.status === 'authenticated') renderAccount();
    if (state.status === 'anonymous' && !loggingOut) {
      lastUser = null;
      if (view === 'account') {
        applyView('login');
        showNotice('登录已失效，请重新登录。', 'warn');
      }
    }
  });
  showEntryState(client.getState());
  void loadConfig();
  void restoreSession();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
