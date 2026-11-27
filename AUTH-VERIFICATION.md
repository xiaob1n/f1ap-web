# Web 认证验证记录

## 结论与范围

本次认证模块测试、限定浏览器流程及构建检查通过；**真实后端、hCaptcha 与邮件端到端联调尚未通过，不能据此发布为公网就绪。** 使用与配置见 [AUTH.md](AUTH.md)。

本记录依据实际验证命令、退出码、结果及源码核对。修改范围为 `local-ui` 的认证 UI、客户端、人机模块、同源代理、入口资源、环境示例、Docker/Compose、三个测试文件及说明；原 `app.js`、`style.css` 未改，API/Agent 生产代码未改。未执行 Docker 构建、部署或 Git commit/push。

下列证据使用本机临时目录，不随仓库分发，也不是运行依赖：

```text
T=/private/var/folders/tk/bg9p9_7903s472pgns813v1h0000gn/T/opencode
```

## LOCAL_TEST：模块与构建

在 `local-ui` 执行：

```bash
bun test auth-proxy.test.ts auth-client.test.js hcaptcha.test.js
```

退出码 `0`：**28 pass、0 fail、218 次断言**。日志为 `$T/auth-web-unit-final.log`；执行方确认测试对应的十文件模块清单哈希未变。覆盖代理路由与边界、认证客户端状态及存储、人机组件生命周期等本地行为，不使用真实人机或邮件服务。

最终检查均退出 `0`：

```bash
git diff --check
node --check auth-ui.js
bun build --target browser auth-ui.js --outfile "$T/auth-web-ui-verify.js"
bun build --target bun server.ts --outfile "$T/auth-web-server-verify.js"
```

浏览器构建为 3 modules，服务端构建为 2 modules。构建通过不代表容器镜像或真实服务运行通过。

## LOCAL_TEST：浏览器流程

浏览器仅访问 `http://127.0.0.1:3100`，允许域名限定为 `127.0.0.1`。临时 `$T/auth-web-fixture.ts` 使用实际 `createServerHandler` 配合上游 fetch 替身；`$T/auth-web-captcha-fixture.js` 用本地按钮替代人机交互，**不生成真实票据、不访问厂商、不连接真实 API**。替身仅在临时测试载体中，不进入产品或 Docker，不是生产测试绕过。

```bash
python3 "$T/auth-web-browser-checks.py"
```

最终退出码 `0`。`$T/auth-web-browser-results.json` 记录 11 项主断言，覆盖：

- 注册发码进入第二步、有效期与焦点；注册 `204` 不自动登录，提交结束释放忙碌状态。
- 错密码后旧人机票据失效；新票据登录后须经 `/me` 确认。
- 凭据仅用 `sessionStorage` 持久化；检查未发现 Token 出现在 DOM、Cookie 或 `localStorage`。
- ESC 关闭后焦点返回入口；刷新重新请求 `/me`；退出成功清理凭据。
- 密码重置不自动登录，随后可用新密码登录。

`$T/auth-web-browser-extra-results.json` 另记录：

- 模拟页面时间推进 6 分钟后，过期验证码不能提交；注册与重置返回导航正常。
- 320 像素视口下，文档宽 320、弹窗宽 308、视图 client/scroll 宽均为 306，无横向溢出。
- 退出 `503` 保留会话并显示结果未知，可手动重试，不宣称退出成功；恢复 `/me` 遇 `503` 保持不可用状态，手动重验后返回账户视图。
- 发码 `503` 结果未知时，UI 保留 60 秒冷却；公开配置关闭时明确提示暂未开放、不加载人机 SDK，赛事 DOM 仍保留。
- 抽查的 22 次认证请求中，匿名请求携带 Bearer 为 0，受保护请求缺少 Bearer 为 0；该替身运行无外部资源请求，页面错误为 0。

最终 UI 修复后，11 项主断言重跑通过；`python3 "$T/auth-web-late-response-check.py"` 退出 `0`，`$T/auth-web-late-response-results.json` 的 4 项断言确认忙碌时邮箱禁用、重开后新票据就绪、旧请求 finally 不清除新票据、旧响应不改变新邮箱或步骤。

最终 UI 文件哈希清单为 `$T/auth-web-ui-manifest.json`。以上观察仅证明替身环境中的 UI 行为，不证明真实撤销、数据库状态、邮件送达或第三方网络可用性。

## 可访问性检查限制

axe 在账户、登录、注册及移动端验证码视图中报告 **0 violations**，但仍有 **1 项 `color-contrast` incomplete**，装饰背景无法自动判定。证据为 `$T/auth-web-a11y-account.json`、`auth-web-a11y-login.json`、`auth-web-a11y-register.json`、`auth-web-a11y-code-mobile.json`。设计方提供的关键颜色人工计算比值在 4.70 以上，仅供参考；自动判定未决，不宣称完整 WCAG 合规或认证。

## REAL_SERVICE：未完成与人工下一步

最初对本机 `8080` 的 socket、健康与 `/me` 连通检查均无法连接；没有取得后续真实认证成功证据。用户选择自行启动后端、稍后提供测试邮箱；当前尚缺三个真实公开 sitekey 和唯一获授权收件人。没有发送真实邮件或提交真实人机挑战。

后续须由运行负责人和用户完成：

1. 确认用户启动的后端 ready，认证开关、数据库、第三方及安全日志配置就绪；不擅自启动 API 或执行迁移。
2. 按 [AUTH.md](AUTH.md) 私下配置 Web `.env`，填入与 API 一致的三个真实公开 sitekey，明确唯一测试收件邮箱；不将服务端秘密注入 Web。
3. 用户亲自完成各用途真实 hCaptcha，逐项确认实际收件、注册、登录与 `/me`、刷新恢复、重置后旧凭据失效、退出全部设备及异常提示。
4. 单独记录真实调用结果和未完成项，不复制密码、邮件验证码、JWT、人机票据或凭据；不能用本记录的 stub 结果替代真实验收。
