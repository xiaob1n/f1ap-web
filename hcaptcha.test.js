import { test, expect } from 'bun:test';
import { createCaptchaLoader, createCaptcha } from './hcaptcha.js';
test('脚本只注入一次，共用promise，ready后可用，失败允许显式重试', async () => {
  const scripts = [], window = {};
  const load = createCaptchaLoader({ window, document: { createElement: () => ({ remove() { this.removed = true; } }), head: { appendChild: script => scripts.push(script) } } });
  const first = load(); expect(load()).toBe(first); expect(scripts.length).toBe(1);
  expect(scripts[0].src).toBe('https://js.hcaptcha.com/1/api.js?render=explicit&hl=zh-CN');
  scripts[0].onerror(); await expect(first).rejects.toThrow('人机验证加载失败'); expect(scripts[0].removed).toBe(true);
  const retry = load(); expect(scripts.length).toBe(2);
  let ready; window.hcaptcha = { render() {}, ready(fn) { ready = fn; } }; scripts[1].onload(); ready();
  expect(await retry).toBe(window.hcaptcha); expect(await load()).toBe(window.hcaptcha); expect(scripts.length).toBe(2);
});
test('脚本30秒超时清理并允许手动重试，晚到回调忽略', async () => {
  const scripts = [], timers = new Map(), window = {};
  let id = 0;
  const load = createCaptchaLoader({ window,
    document: { createElement: () => ({ remove() { this.removed = true; } }), head: { appendChild: script => scripts.push(script) } },
    setTimeout: (fn, delay) => { expect(delay).toBe(30000); timers.set(++id, fn); return id; }, clearTimeout: id => timers.delete(id) });
  const first = load(); timers.get(1)();
  await expect(first).rejects.toThrow('人机验证加载失败');
  expect(scripts[0].removed).toBe(true); expect(timers.size).toBe(0);
  const retry = load(); expect(scripts.length).toBe(2);
  window.hcaptcha = { render() {} }; scripts[0].onload(); scripts[0].onerror(); scripts[1].onload();
  expect(await retry).toBe(window.hcaptcha); expect(timers.size).toBe(0);
});
test('用途sitekey独立，reset/destroy及晚回调隔离', async () => {
  const options = [], reset = [], removed = [], tokens = [];
  const sdk = { render(container, opts) { options.push(opts); return options.length; }, reset: id => reset.push(id), remove: id => removed.push(id) };
  const a = await createCaptcha({ container: {}, sitekey: 'TEST_FIXTURE_LOGIN', loadSdk: async () => sdk, onToken: token => tokens.push(token) });
  options[0].callback('ticket'); a.reset(); a.destroy(); options[0].callback('late'); a.reset(); a.destroy();
  const b = await createCaptcha({ container: {}, sitekey: 'TEST_FIXTURE_REGISTER', size: 'compact', loadSdk: async () => sdk }); b.destroy();
  expect(tokens).toEqual(['ticket']); expect(reset).toEqual([1]); expect(removed).toEqual([1, 2]);
  expect(options.map(o => o.sitekey)).toEqual(['TEST_FIXTURE_LOGIN', 'TEST_FIXTURE_REGISTER']);
  expect(options[0].theme).toBe('dark'); expect(options[0].size).toBe('normal');
  expect(options[1].size).toBe('compact');
});
test('打开后加载期间关闭不render，错误回调不泄漏厂商信息', async () => {
  let finish, renders = 0, errors = 0, expired = 0, opts;
  const sdk = { render(container, options) { renders++; opts = options; return 0; }, remove() {}, reset() {} };
  const controller = new AbortController();
  const pending = createCaptcha({ container: {}, sitekey: 'TEST_FIXTURE_RESET', signal: controller.signal, loadSdk: () => new Promise(resolve => { finish = resolve; }) });
  controller.abort(); finish(sdk); const dead = await pending; dead.destroy(); expect(renders).toBe(0);
  const live = await createCaptcha({ container: {}, sitekey: 'TEST_FIXTURE_RESET', loadSdk: async () => sdk, onError: (...args) => { expect(args).toEqual([]); errors++; }, onExpired: () => expired++ });
  opts['error-callback']('SECRET'); opts['expired-callback'](); opts['chalexpired-callback']();
  live.destroy(); opts['error-callback']('late'); expect(errors).toBe(1); expect(expired).toBe(2);
  await expect(createCaptcha({ container: {}, sitekey: 'TEST_FIXTURE', loadSdk: async () => { throw new Error('SECRET'); } })).rejects.toThrow('人机验证加载失败，请手动重试。');
});
