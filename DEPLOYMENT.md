# Web 的 Drone 发布与服务器部署

本仓库为 `xiaob1n/f1ap-web`，服务器部署目录为 `/home/ubuntu/docker/f1ap-web`。发布定义见 [.drone.yml](.drone.yml)，服务器入口见 [deploy/release.sh](deploy/release.sh)，镜像覆盖层见 [deploy/compose.release.yml](deploy/compose.release.yml)。认证配置与未完成的真实联调见 [AUTH.md](AUTH.md) 和 [AUTH-VERIFICATION.md](AUTH-VERIFICATION.md)。

## 当前配置状态

- 已通过浏览器激活 Drone 仓库，GitHub webhook 已自动创建。
- 已核实服务器为 ARM64、Docker Compose 5.5.1；现有 Web 使用 `f1ap-web:local`，容器健康并接入 `f1ap_default` 网络。API 已更新至 `v0.2.1`，不代表 Web 已更新。
- 服务器已有 `compose.yml`、`compose.override.yml` 和权限为 `600` 的私有 `.env`。现有基础配置绑定 `0.0.0.0:3000`，override 保留公网 Origin 与 Host 白名单；本次不重写这些文件或调整暴露范围。
- 已安装服务器发布脚本与覆盖层并通过静默配置检查，未重启现有 Web；本地认证与发布测试通过，详见下文。
- 六项发布 Secrets 已按授权从 API 仓库复制到 Web，值一致性检查通过；浏览器已确认六个名称及各项 PULL REQUESTS 为 Disabled。配置成功不代表 GHCR 拉取或首次发布已验证。
- 本次已明确授权将认证与 CI 改动 commit/push 至 `dev`，并创建、推送首次发布标签 `v0.1.0`；已确认远端 `dev` 与本地 HEAD 一致且该标签不存在。**执行结果待发布证据确认，不提前宣称新 Web 已上线；未来发布仍须逐次确认。**

## Drone 配置与触发规则

Drone 仓库已配置以下 Secrets，值仅通过私有渠道注入，不放在 YAML、命令参数、浏览器截图或日志中：

| Secret | 用途 |
| --- | --- |
| `ghcr_username` | GHCR 发布账号 |
| `ghcr_token` | GHCR 镜像推送凭据 |
| `deploy_host` | SSH 部署主机 |
| `deploy_user` | SSH 部署用户 |
| `deploy_key` | SSH 私钥 |
| `deploy_fingerprint` | SSH 主机指纹校验 |

流水线使用 ARM64 runner，单流水线并发上限为 1，仅接受 `tag` 事件与 `refs/tags/v*`，普通分支 push 不发布。标签还须以 `v` 开头、后接至少一个 ASCII 字母/数字或 `_.-`，总长最多 128 字符。标签事件不限制来源分支；发布前必须人工核对标签对应的代码。

步骤按顺序执行：

1. `validate-test`：运行三个认证测试文件与 `deploy/release.test.ts`，构建 `app.js`、`auth-ui.js` 和 `server.ts`。
2. `publish`：通过 `plugins/docker` 推送 `ghcr.io/xiaob1n/f1ap-web:${DRONE_TAG}`。
3. `deploy`：通过 SSH 执行固定路径 `/home/ubuntu/docker/f1ap-web/deploy/release.sh "${DRONE_TAG}"`。

这些是已定义的步骤，不是本仓流水线运行成功记录。将发布所需文件纳入 Git 并推送后，远端才可获得它们；本机未跟踪文件不会随标签发布。不要为测试配置随意创建或推送 `v*` 标签。

## 服务器一次性准备

由获授权的运行负责人把 `deploy/release.sh` 与 `deploy/compose.release.yml` 安装到部署目录的 `deploy/` 下，并赋予脚本执行权限。脚本依赖 Bash、`flock`、Docker CLI/Compose；部署用户须能操作 Docker、读私有 `.env` 并写部署目录。安装文件本身不重启容器。

保留现有 base、override、`.env` 和网络配置，不用仓库版本覆盖生产文件。先使用真实文件进行 `docker compose ... config --quiet` 静默校验，不输出完整展开配置，也不通过 `source .env` 执行私有文件。

服务器需具备 GHCR 拉取权限。已有 root GHCR 登录配置不证明部署用户能拉取新的 Web package；首次发布前须验证对应身份的精确标签拉取权限，不打印认证文件或 Token。

发布覆盖层只替换镜像与四项公开认证变量，认证开关默认 `false`。本次首次发布不修改服务器私有 `.env`，登录保持关闭，不影响 API。后续启用由用户另行决定：须先私下准备 `F1AP_AUTH_ENABLED` 和三个用途的公开 sitekey，并满足后端要求；不要注入 hCaptcha secret、OCI 或 JWT/HMAC 密钥，也不要因发布自动开启认证。

本次已获授权执行远端安装，`python3 "$T/web_drone_install.py"` 退出 `0`：脚本权限为 `755`，覆盖层为 `644`；同名不同内容会拒绝覆盖。服务端 `bash -n` 和 base + 现有 override + 发布覆盖层的 `config --quiet` 均退出 `0`。原 `.env`、base、override 哈希未变，Web 容器 ID、镜像 ID、启动时间均未变且仍 healthy；未执行 pull/up/build。服务器 `.env` 尚无四项认证变量，按覆盖层默认值发布仍会关闭认证，须由用户在决定启用后私下编辑。

## 发布、回退与手动操作

正式发布获授权后，核对目标代码、标签及六项 Secrets，再推送目标标签。脚本会：

- 取得目录级非阻塞发布锁，静默校验合并配置并检查现有 Web 容器镜像。
- **先拉取精确标签**，成功后才尝试更新；以旧容器的镜像 ID 创建临时本地回退标签，避免旧引用已被移动。
- 仅执行 `web` 的 `up -d --no-deps --no-build --wait --wait-timeout 120`，不重启 API、不构建源码、不删除其他服务。
- 更新失败时尝试用固定的旧镜像恢复；回退本身可能失败，首次部署没有旧容器时也无法回退。必须检查 `ROLLED_BACK`、`ROLLBACK_FAILED` 或 `NO_PREVIOUS_RELEASE`，不能把非零退出当作成功。
- 只有新 Web 达到运行/健康条件后，才以权限 `600` 原子替换 `.web-release.env`；选择器写入失败也尝试回退。健康检查不证明真实认证与邮件联调通过。

脚本退出码：`2` 参数/文件缺失，`3` 发布锁占用，`4` 配置或旧容器检查失败，`5` 拉取或固定旧镜像失败，`6` 更新失败，`7` 成功后的选择器写入失败；非零均需人工处理。

首次成功后，`.web-release.env` 保存已选镜像。后续手动 Compose 操作必须显式加载它和发布覆盖层，避免退回基础文件中的本地镜像。以下仅为静默检查，不会更新容器；示例适用于当前存在 override 的服务器：

```bash
cd /home/ubuntu/docker/f1ap-web
docker compose --project-name f1ap-web --project-directory "$PWD" \
  --env-file .env --env-file .web-release.env \
  -f compose.yml -f compose.override.yml -f deploy/compose.release.yml \
  config --quiet
```

没有 override 时才省略对应 `-f`；首次成功前没有选择器，不能直接运行此示例。检查调用环境中的 `F1AP_WEB_IMAGE` 未覆盖选择器值；shell 环境优先于 env 文件。不要省略覆盖层后直接执行默认 `docker compose up`，也不要在排错时输出展开的 Secrets。

## 验证边界

在 `local-ui` 实际执行以下命令，退出 `0`：**42 pass、0 fail、263 次断言**。

```bash
bun test auth-proxy.test.ts auth-client.test.js hcaptcha.test.js deploy/release.test.ts
```

`bash -n deploy/release.sh`、`app.js` 与 `auth-ui.js` 的 browser 构建、`server.ts` 的 bun 构建，以及 `git diff --check` 均退出 `0`。测试日志为 `$T/web-drone-final-tests.log`，远端安装日志为 `$T/drone-ssh-web-install.log`；其中 `T=/private/var/folders/tk/bg9p9_7903s472pgns813v1h0000gn/T/opencode`，临时证据不随仓库分发。

Secrets 复制命令 `python3 "$T/web_drone_secrets.py" copy` 退出 `0`，六次目标 Drone API POST 均为 `200`，日志为 `$T/web-drone-secrets-copy.log`。源/目标 SQLite 检查仅以 `mode=ro` 读取，写入仅通过 Web 目标 Drone API；值与源一致、名称匹配，`pull_request` 和 `pull_request_push` 均为 `false`。检查确认源 Secrets、容器、服务器文件及 Web 构建计数均未变，无直接数据库写入或凭据值输出。用户提供的 Token 仅经权限 `600` 的本地私有文件、SSH stdin 进入服务器内存，不进入 argv 或日志、不在服务器持久化；Secret 值未返回助手。

[发布脚本测试](deploy/release.test.ts) 使用临时目录中的 Docker/锁替身，覆盖标签拒绝、配置/拉取失败、精确镜像、override 保留、回退及选择器行为。本地测试、Secrets 配置与远端安装检查不证明 GHCR 拉取、Drone 发布或真实容器更新成功。本次 `dev` 提交/推送与 `v0.1.0` 首次发布已获授权，执行结果待后续证据；未来发布仍逐次确认。真实发布须单独记录 Drone 各步骤结果、服务器精确镜像与健康状态，并继续完成认证真实链路验收。已有 API 发布成功或现有 Web 健康状态不计作新 Web 发布成功。
