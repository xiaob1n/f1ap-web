import { test, expect } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, chmodSync, statSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// TEST_FIXTURE：所有 Docker/flock 调用均由独立临时目录中的桩接管。
function run(options: { tag?: string; failure?: string; previous?: boolean; override?: boolean; env?: boolean; selector?: boolean } = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'web-release-test-')));
  mkdirSync(join(root, 'deploy')); mkdirSync(join(root, 'bin'));
  copyFileSync(new URL('./release.sh', import.meta.url), join(root, 'deploy/release.sh'));
  writeFileSync(join(root, 'deploy/compose.release.yml'), 'services: {}');
  writeFileSync(join(root, 'compose.yml'), 'services: {}');
  if (options.env !== false) writeFileSync(join(root, '.env'), 'TEST_FIXTURE=true\n');
  if (options.override !== false) writeFileSync(join(root, 'compose.override.yml'), 'services: {}');
  const old = 'F1AP_WEB_IMAGE=TEST_FIXTURE_OLD\n';
  if (options.selector !== false) writeFileSync(join(root, '.web-release.env'), old, { mode: 0o600 });
  writeFileSync(join(root, 'bin/flock'), '#!/bin/bash\n[[ "$FAILURE" != lock ]]');
  writeFileSync(join(root, 'bin/docker'), `#!/bin/bash
printf '%s|' "$F1AP_WEB_IMAGE" >> "$FIXTURE/log"
printf '%s ' "$@" >> "$FIXTURE/log"
printf '\\n' >> "$FIXTURE/log"
if [[ "$1" == inspect ]]; then
  if [[ "$3" == '{{.Image}}' ]]; then echo sha256:TEST_FIXTURE; else echo f1ap-web:local; fi
elif [[ "$1" == pull ]]; then [[ "$FAILURE" != pull ]]
elif [[ "$1" == compose ]]; then
  case " $* " in
    *' config '*) [[ "$FAILURE" != config ]];;
    *' ps '*) [[ "$PREVIOUS" != yes ]] || echo TEST_FIXTURE_CONTAINER;;
    *' up '*)
      if [[ "$F1AP_WEB_IMAGE" == f1ap-web-rollback:* ]]; then [[ "$FAILURE" != rollback ]];
      else [[ "$FAILURE" != up && "$FAILURE" != rollback ]]; fi;;
  esac
fi
`);
  chmodSync(join(root, 'bin/docker'), 0o700); chmodSync(join(root, 'bin/flock'), 0o700);
  try {
    const result = spawnSync('/bin/bash', [join(root, 'deploy/release.sh'), options.tag ?? 'v1.2.3'], {
      env: { PATH: `${join(root, 'bin')}:/usr/bin:/bin`, FIXTURE: root, FAILURE: options.failure ?? '', PREVIOUS: options.previous === false ? 'no' : 'yes' }, encoding: 'utf8',
    });
    let log = ''; let state: string | null = null; let mode = 0;
    try { log = readFileSync(join(root, 'log'), 'utf8'); } catch {}
    try { state = readFileSync(join(root, '.web-release.env'), 'utf8'); mode = statSync(join(root, '.web-release.env')).mode & 0o777; } catch {}
    return { status: result.status, output: result.stdout + result.stderr, log, state, mode, root, old };
  } finally { rmSync(root, { recursive: true, force: true }); }
}

test('成功仅发布精确标签和 web，保留 override，选择器权限 600', () => {
  const r = run(); expect(r.status).toBe(0);
  expect(r.state).toBe('F1AP_WEB_IMAGE=ghcr.io/xiaob1n/f1ap-web:v1.2.3\n'); expect(r.mode).toBe(0o600);
  expect(r.log).toContain('pull ghcr.io/xiaob1n/f1ap-web:v1.2.3');
  expect(r.log).toContain(`-f ${r.root}/compose.yml -f ${r.root}/compose.override.yml -f ${r.root}/deploy/compose.release.yml`);
  expect(r.log).toContain('up -d --no-deps --no-build --wait --wait-timeout 120 web');
  expect(r.log).toContain('tag sha256:TEST_FIXTURE f1ap-web-rollback:');
});
test('无 override 且首次成功创建选择器', () => {
  const r = run({ override: false, selector: false, previous: false });
  expect(r.status).toBe(0); expect(r.log).not.toContain('compose.override.yml'); expect(r.mode).toBe(0o600);
});
for (const tag of ['bad', 'vbad;id', 'vbad\nnext', 'v' + 'a'.repeat(128), 'v$(id)']) {
  test(`拒绝非法标签 ${JSON.stringify(tag)}`, () => { const r = run({ tag }); expect(r.status).toBe(2); expect(r.log).toBe(''); });
}
for (const failure of ['lock', 'config', 'pull']) {
  test(`${failure} 失败不启动且不改选择器`, () => {
    const r = run({ failure }); expect(r.status).not.toBe(0); expect(r.log).not.toContain(' up '); expect(r.state).toBe(r.old);
    if (failure === 'lock') expect(r.log).toBe('');
  });
}
test('缺少 .env 不调用 Docker', () => { const r = run({ env: false }); expect(r.status).toBe(2); expect(r.log).toBe(''); });
test('失败回退到已固定的旧镜像且保留旧选择器', () => {
  const r = run({ failure: 'up' }); expect(r.status).toBe(6); expect(r.output).toContain('ROLLED_BACK');
  expect(r.log.split('\n').filter(x => x.includes(' up '))).toHaveLength(2);
  expect(r.log.split('\n').find(x => x.startsWith('f1ap-web-rollback:') && x.includes(' up '))).toBeDefined(); expect(r.state).toBe(r.old);
});
test('回退失败明确报告', () => { const r = run({ failure: 'rollback' }); expect(r.status).toBe(6); expect(r.output).toContain('ROLLBACK_FAILED'); expect(r.state).toBe(r.old); });
test('首次失败不伪造旧版本或创建选择器', () => {
  const r = run({ failure: 'up', previous: false, selector: false }); expect(r.status).toBe(6); expect(r.output).toContain('NO_PREVIOUS_RELEASE'); expect(r.state).toBeNull();
  expect(r.log.split('\n').filter(x => x.includes(' up '))).toHaveLength(1);
});
