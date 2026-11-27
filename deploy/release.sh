#!/usr/bin/env bash
set -euo pipefail

# 仅接受公开版本标签；部署目录由脚本位置确定，不能由参数或环境替换。
if [[ $# != 1 || ${#1} -gt 128 || ! $1 =~ ^v[a-zA-Z0-9_.-]+$ ]]; then
  echo 'INVALID_TAG' >&2; exit 2
fi
tag=$1
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
[[ -f "$root/.env" && -f "$root/compose.yml" && -f "$root/deploy/compose.release.yml" ]] || { echo 'MISSING_CONFIG' >&2; exit 2; }
exec 9>"$root/.web-release.lock"
flock -n 9 || { echo 'RELEASE_LOCKED' >&2; exit 3; }
compose=(docker compose --project-name f1ap-web --project-directory "$root" --env-file "$root/.env" -f "$root/compose.yml")
[[ ! -f "$root/compose.override.yml" ]] || compose+=(-f "$root/compose.override.yml")
compose+=(-f "$root/deploy/compose.release.yml")
export F1AP_WEB_IMAGE="ghcr.io/xiaob1n/f1ap-web:$tag"
echo "VALIDATE $tag"
"${compose[@]}" config --quiet >/dev/null 2>&1 || { echo 'CONFIG_FAILED' >&2; exit 4; }
container=$("${compose[@]}" ps -q web 2>/dev/null) || { echo 'INSPECT_FAILED' >&2; exit 4; }
previous_id=''
previous_ref=''
if [[ -n "$container" ]]; then
  previous_id=$(docker inspect --format '{{.Image}}' "$container" 2>/dev/null) || { echo 'INSPECT_FAILED' >&2; exit 4; }
  previous_ref=$(docker inspect --format '{{.Config.Image}}' "$container" 2>/dev/null) || { echo 'INSPECT_FAILED' >&2; exit 4; }
  [[ -n "$previous_id" && -n "$previous_ref" ]] || { echo 'INSPECT_FAILED' >&2; exit 4; }
fi
rollback=''
if [[ -n "$previous_id" ]]; then
  pin_failed() { echo 'PIN_FAILED' >&2; exit 5; }
  if ! docker image inspect "$previous_id" >/dev/null 2>&1; then
    # containerd 索引可能只剩运行平台清单；必须证明候选与运行容器的平台清单相同。
    expected=$(docker inspect --format '{{if .ImageManifestDescriptor}}{{.ImageManifestDescriptor.Digest}} {{.ImageManifestDescriptor.Platform.OS}}/{{.ImageManifestDescriptor.Platform.Architecture}}{{end}}' "$container" 2>/dev/null) || pin_failed
    [[ "$expected" =~ ^sha256:[a-f0-9]{64}\ linux/arm64$ ]] || pin_failed
    candidate=$(docker image inspect --format '{{.Id}}' "$previous_ref" 2>/dev/null) || pin_failed
    [[ "$candidate" =~ ^sha256:[a-f0-9]{64}$ ]] || pin_failed
    selected=$(docker image inspect --platform linux/arm64 --format '{{.Id}} {{.Os}}/{{.Architecture}}' "$candidate" 2>/dev/null) || pin_failed
    [[ "$selected" == "$expected" ]] || pin_failed
    previous_id=$candidate
  fi
  rollback="f1ap-web-rollback:$(date +%s)-$$"
  docker tag "$previous_id" "$rollback" >/dev/null 2>&1 || pin_failed
fi
echo "PULL $tag"
docker pull "$F1AP_WEB_IMAGE" >/dev/null 2>&1 || { echo 'PULL_FAILED' >&2; exit 5; }
up() { "${compose[@]}" up -d --no-deps --no-build --wait --wait-timeout 120 web >/dev/null 2>&1; }
rollback_release() {
  if [[ -z "$rollback" ]]; then echo 'NO_PREVIOUS_RELEASE' >&2; return 1; fi
  export F1AP_WEB_IMAGE="$rollback"
  if up; then echo 'ROLLED_BACK' >&2; else echo 'ROLLBACK_FAILED' >&2; fi
  return 1
}
echo "DEPLOY $tag"
if ! up; then rollback_release || true; exit 6; fi
# 成功后才原子替换选择器；不读取或执行任何私有环境文件。
umask 077
state=$(mktemp "$root/.web-release.env.XXXXXX") || { rollback_release || true; exit 7; }
trap 'rm -f -- "$state"' EXIT
if ! printf 'F1AP_WEB_IMAGE=%s\n' "$F1AP_WEB_IMAGE" >"$state" || ! chmod 600 "$state" || ! mv -f -- "$state" "$root/.web-release.env"; then
  rollback_release || true; exit 7
fi
echo "RELEASED $tag"
