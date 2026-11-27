# ARM64 / AMD64 通用 Bun 轻量镜像；支持用户认证，内部业务接口仍只读
FROM oven/bun:1-slim

ENV TZ=UTC \
    F1AP_WEB_HOST=0.0.0.0 \
    F1AP_WEB_PORT=3000

WORKDIR /app

# 仅复制前端静态资源与代理服务入口，不包含任何凭据或本地运行产物
COPY index.html style.css app.js server.ts auth-proxy.ts auth-client.js hcaptcha.js auth-ui.js auth.css /app/

# 非 root 运行身份（10001:10001）
RUN groupadd --gid 10001 app \
    && useradd --uid 10001 --gid 10001 --no-create-home --shell /usr/sbin/nologin app \
    && chown -R 10001:10001 /app
USER 10001:10001

EXPOSE 3000

# 使用内置 Bun fetch 探测 /healthz，零额外工具依赖
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s \
  CMD ["bun", "-e", "fetch('http://127.0.0.1:' + (process.env.F1AP_WEB_PORT || '3000') + '/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

ENTRYPOINT ["bun", "server.ts"]
