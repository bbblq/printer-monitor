# Printer Monitor - Agent Instructions

## Project Overview
- **Type**: Next.js 16 + SQLite + SNMP 打印机监控系统
- **Location**: 独立部署 (Docker)，数据库存储在 `/app/data`
- **关键路径**: `src/lib/` (核心逻辑), `src/app/` (页面和 API)

## 重要修复记录 (避免重复踩坑)

### 飞书通知时区
- **文件**: `src/lib/notification.ts`
- **问题**: `getTimezoneOffset()` 返回的是本地时区与 UTC 的差值（分钟），北京位于 UTC+8，getTimezoneOffset 返回 `-480`
- **正确公式**: `utc = now.getTime() - (now.getTimezoneOffset() * 60000)`
- **错误公式**: `utc = now.getTime() + (now.getTimezoneOffset() * 60000)` (之前错误使用 + 号)

### 自动刷新功能
- **文件**: `src/lib/init.ts`
- **问题**: `startAutoRefresh()` 被导入但从未调用，导致定时刷新失效
- **修复**: 在 `initializeApp()` 中添加 `startAutoRefresh()` 调用

## Docker 镜像
- **Docker Hub**: `bbblq/printer-monitor:latest`
- **GitHub Container Registry**: `ghcr.io/bbblq/printer-monitor:latest`
- **推送命令**: `docker build -t bbblq/printer-monitor:latest . && docker push bbblq/printer-monitor:latest`

## Git 工作流
- 推送到 GitHub: `git push`
- Docker 推送需要 Docker Hub 登录状态

## 构建验证
- 运行 `npm run build` 验证代码无错误
- Docker 构建成功会在输出最后显示 "DONE"

## 时区处理原则
所有涉及时间的代码都应使用 `getTimezoneOffset()` 硬编码计算北京时间，避免依赖容器 TZ 环境变量。
