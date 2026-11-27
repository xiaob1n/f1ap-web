# Web 邮箱认证与后端联调

本说明随 `local-ui` 仓库分发，描述认证入口、同源代理与联调要求。现有赛事与预测页面仍可匿名浏览，用户认证不把内部业务接口改成可写接口，也不替代内部固定令牌。

**实现存在不等于真实链路已验收。** 本地替身测试不能证明真实 hCaptcha、邮件送达或后端数据库链路可用；真实验收须由用户完成人机挑战，并使用明确授权的测试收件邮箱。

## 本机连接后端

后端由其运行负责人启动；Web 不负责启动 API、执行迁移或准备第三方账号。开始前确认：

- API 在预期地址可访问，本机默认 `http://127.0.0.1:8080`。
- API 已启用 `f1ap.auth.enabled=true`，并显式设置 `server.forward-headers-strategy=none`；认证表、独立认证密钥、hCaptcha 和邮件配置由后端负责人准备。
- 已准备注册、登录、重置三个互不相同的真实公开 sitekey，并与 API 对应用途一致；不能用厂商测试 key 替代真实验收。
- 已指定唯一获授权的测试收件邮箱。未指定收件人时不发送邮件。

在 `local-ui` 目录使用私有 `.env` 配置，然后直接运行 Web：

```bash
# 仅在尚无 .env 时复制；不要覆盖已有私有配置。
test -e .env || cp .env.example .env
chmod 600 .env
# 在私有编辑器中填写配置后运行：
bun server.ts
```

Bun 默认自动读取 `.env`，相关行为见 [Bun 环境变量说明](https://bun.sh/docs/runtime/environment-variables)。核对本机其他环境文件或已注入变量，避免连接到错误上游；不要打印完整有效环境。默认页面为 `http://127.0.0.1:3000`。已有实例时不要重复启动。

`.env.example` 的上游地址用于容器网络（`http://api:8080`）；**本机直接运行时须改为 `http://127.0.0.1:8080`**。认证相关字段如下，空值仅为填写位置，不能直接启用认证：

```dotenv
F1AP_API_BASE_URL=http://127.0.0.1:8080
F1AP_AUTH_ENABLED=false
F1AP_HCAPTCHA_LOGIN_SITEKEY=
F1AP_HCAPTCHA_REGISTER_SITEKEY=
F1AP_HCAPTCHA_RESET_SITEKEY=
```

填完真实公开 sitekey 后，显式将 `F1AP_AUTH_ENABLED` 改为 `true`，再启动 Web；运行中的服务不会因编辑文件自动重载配置。sitekey 是公开标识，不是 secret。hCaptcha secret、OCI 私钥和身份凭据、JWT/HMAC 密钥只在 API 服务端配置，不能注入 Web 或写进浏览器、命令参数、仓库、截图及日志。内部固定令牌也只由 Web 服务端持有，来源为 `F1AP_INTERNAL_WRITE_TOKEN` 或 `F1AP_INTERNAL_WRITE_TOKEN_FILE`。

本次本机联调优先使用 `bun server.ts`，而不是 `start.ts`：后者在分派模式前就会登录并读取 Nacos，不是纯离线页面启动器。预测内部查询若需固定令牌，由运行负责人私下注入；缺少令牌不应用用户 JWT 顶替。

## 功能与接口

浏览器请求当前 Web 的同源地址，由 Web 代理访问 API，不要求 API 开放跨域访问。代理仅开放下表精确方法与路径，不接受查询参数；`/api/v1/auth` 命名空间的其他路径不转发。

| 用途 | 方法与路径 | 请求字段 | 正常结果 |
| --- | --- | --- | --- |
| 注册发码 | `POST /api/v1/auth/registration-codes` | `email, hcaptcha_response` | `202`：`challenge_id, expires_at` |
| 注册确认 | `POST /api/v1/auth/register` | `challenge_id, email, code, password` | `204`，不自动登录 |
| 登录 | `POST /api/v1/auth/login` | `email, password, hcaptcha_response` | `200`：`access_token, token_type, expires_at`；随后查询 `/me` |
| 重置发码 | `POST /api/v1/auth/password-reset-codes` | `email, hcaptcha_response` | `202`：`challenge_id, expires_at` |
| 重置确认 | `POST /api/v1/auth/password-reset` | `challenge_id, email, code, new_password` | `204`，不自动登录 |
| 退出全部设备 | `POST /api/v1/auth/logout-all` | 无业务载荷；用户 Bearer | `204` |
| 确认当前用户 | `GET /api/v1/users/me` | 用户 Bearer | `200`：仅 `id, email` |

注册与重置的最终提交使用邮件挑战，不再次携带发码时的 hCaptcha 票据。发码和登录每次提交均使用新的人机票据；失败或结果未知后不能复用旧票据。`202` 仅表示按协议受理，不保证送达，也不证明账号存在。注册、重置的统一 `204` 同样不能用于探测账号状态。

邮箱只接受 ASCII 常见 dot-atom 格式，仅去除首尾 ASCII 空格并将全邮箱小写，不折叠点或 `+` 标签。新密码为 12–128 个 Unicode code point、UTF-8 最多 512 字节，不去空格、不作 Unicode 规范化。验证码、挑战 ID、用户 ID 均为字符串，不能转为数字处理。

## 配置与代理边界

`GET /local/auth-config` 返回公开的 `enabled` 和三个用途的 `sitekeys`。Web 认证默认关闭。仅当 `F1AP_AUTH_ENABLED=true`，且三个 key 均满足 UUID 格式、互不相同、不是实现所拒绝的厂商测试 key 前缀时才启用。配置缺失或格式错误时返回 `enabled=false`、空 sitekeys；显式启用但 key 不合格还会返回 `reason=configuration_unavailable`。通过格式检查不证明 key 在厂商处真实有效或已绑定当前域名。

认证请求受 Host/Origin 检查约束，POST 必须带受允许的 Origin，跨站 `Sec-Fetch-Site` 请求被拒绝。默认 Host 为本机 `127.0.0.1:3000` 和 `localhost:3000`；对外部署须核对 `F1AP_ALLOWED_HOSTS`、`F1AP_PUBLIC_ORIGIN` 与实际域名，不为排错直接放宽边界。

代理按需重建上游请求头，只将用户 Bearer 用于 `/me` 与 `logout-all`，不转发浏览器 Cookie、内部固定令牌或 `X-Forwarded-For`。内部预测查询仍限定为源码白名单中的 GET，由服务端附加内部固定令牌；其他业务写请求不因此开放。

**后端按原始 TCP 来源限流。** 经 Web 代理后，后端看到的是代理地址，多名用户共享该地址的 IP 额度；上线前必须确认此影响。不能悄悄启用转发头处理或扩大后端可信 IP 边界来绕过共享限制。具体额度、后端配置和错误协议以 API 仓库根目录的 `AUTH.md` 为准；它不是本仓库独立克隆时的本地链接目标。

认证代理请求体最多 16 KiB，上游响应读取最多 64 KiB，不透传第三方原始错误。代理从读取请求正文到调用上游、读取响应正文，共用一个 25 秒总期限和中止信号；客户端请求超时为 30 秒。客户端与代理均拒绝重定向。网络失败、超时或 POST 的服务端错误可能意味着结果未知，均不自动重试。请根据界面提示显式重试；申请新邮件码仍须遵守后端冷却与限流。

## 浏览器会话与人机验证

- JWT 只持久化到当前标签页的 `sessionStorage`；存储不可用时退回当前页面内存，不改用 `localStorage` 或 Cookie。内存降级时刷新不能恢复登录。
- 后端凭据固定 24 小时到期，无 refresh token、不滑动续期。客户端按返回的到期时间清理凭据，不能通过刷新延长。
- 登录拿到 Token 后，以及页面刷新恢复凭据时，均需 `/me` 成功才进入已确认登录状态。`401` 清理本地凭据；`503` 等暂时失败保留未到期凭据，但状态为不可用，须显式重验，不能展示为已认证。
- 退出全部设备只有收到成功响应才能确认撤销成功；超时或服务故障保留凭据供显式重试，不宣称已退出所有设备。`401` 表示本地凭据已不再被接受，客户端清理本地状态。
- 人机 SDK 来自真实 hCaptcha。打开认证且公开配置启用后，点击“开始人机验证”才加载 SDK，按登录、注册发码、重置发码选择对应 sitekey。共享 loader 的加载超时为 30 秒；失败后移除脚本、清空等待状态并提示手动重试，不自动循环加载，也不接受晚到回调。真实挑战由用户亲自完成；浏览器 stub 只可用于本地交互测试，不能算真实人机验收。

## 验证方式与发布边界

本地自动化测试入口：

```bash
bun test auth-proxy.test.ts auth-client.test.js hcaptcha.test.js
```

这是 `LOCAL_TEST`，不是 `REAL_SERVICE`。静态核对记为 `OFFLINE_STATIC`。本次实际命令、浏览器结果与未验证项见 [认证验证记录](AUTH-VERIFICATION.md)。真实联调须分别确认人机挑战、邮件受理与实际收件、注册、登录及 `/me`、刷新恢复、重置后旧凭据失效、退出全部设备、失败后的状态与重试提示；不得保存原始密码、验证码、JWT 或人机票据作为证据。

`/healthz` 只检查 Web 进程存活，`/local/connection` 检查 API readiness；两者都不证明认证或第三方链路通过。测试结论应记录实际命令、退出码、浏览器观察和未验证项，而不是引用历史截图或测试数量。

容器入口仍为 `bun server.ts`。`Dockerfile` 已列出认证模块，`compose.yml` 已声明公开认证配置，但文件存在不代表镜像已构建、运行或部署成功。当前 Compose 接入外部网络，并设置 `linux/arm64`；本机回环地址不能直接当作容器内的后端地址。构建、部署和真实外部服务调用须另按授权执行。

实现依据：[认证 UI](auth-ui.js)、[代理](auth-proxy.ts)、[服务入口](server.ts)、[认证客户端](auth-client.js)、[人机模块](hcaptcha.js)、[配置示例](.env.example)、[容器编排](compose.yml)。
