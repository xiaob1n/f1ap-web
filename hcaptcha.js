const SCRIPT = 'https://js.hcaptcha.com/1/api.js?render=explicit&hl=zh-CN';
export function createCaptchaLoader({ document = globalThis.document, window = globalThis.window,
  setTimeout: later = globalThis.setTimeout.bind(globalThis), clearTimeout: cancel = globalThis.clearTimeout.bind(globalThis) } = {}) {
  let pending;
  return function loadSdk() {
    if (window.hcaptcha) return Promise.resolve(window.hcaptcha);
    if (pending) return pending;
    pending = new Promise((resolve, reject) => {
      let settled = false;
      const script = document.createElement('script');
      const timeout = later(fail, 30000);
      script.src = SCRIPT; script.async = true; script.defer = true;
      script.onload = () => {
        if (settled) return;
        if (window.hcaptcha?.ready) window.hcaptcha.ready(succeed);
        else if (window.hcaptcha?.render) succeed();
        else fail();
      };
      function succeed() {
        if (settled) return;
        settled = true; cancel(timeout); resolve(window.hcaptcha);
      }
      function fail() {
        if (settled) return;
        settled = true; cancel(timeout); script.remove(); pending = undefined;
        reject(new Error('人机验证加载失败，请手动重试。'));
      }
      script.onerror = fail;
      document.head.appendChild(script);
    });
    return pending;
  };
}
let defaultLoader;
export async function createCaptcha({ container, sitekey, onToken = () => {}, onExpired = () => {}, onError = () => {},
  signal, size = 'normal', loadSdk = () => (defaultLoader ||= createCaptchaLoader())() }) {
  if (!container || typeof sitekey !== 'string' || !sitekey) throw new Error('缺少人机验证配置。');
  if (!['normal', 'compact'].includes(size)) throw new Error('人机验证尺寸无效。');
  let destroyed = signal?.aborted || false, sdk, widget;
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    signal?.removeEventListener('abort', destroy);
    if (widget !== undefined) sdk.remove(widget);
  }
  signal?.addEventListener('abort', destroy, { once: true });
  try {
    sdk = await loadSdk();
    if (!destroyed) widget = sdk.render(container, {
      sitekey, theme: 'dark', size,
      callback: token => { if (!destroyed) onToken(token); },
      'expired-callback': () => { if (!destroyed) onExpired(); },
      'chalexpired-callback': () => { if (!destroyed) onExpired(); },
      'error-callback': () => { if (!destroyed) onError(); },
    });
    return { reset() { if (!destroyed && widget !== undefined) sdk.reset(widget); }, destroy };
  } catch {
    destroy();
    throw new Error('人机验证加载失败，请手动重试。');
  }
}
