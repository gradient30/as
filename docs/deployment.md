# 部署指南

本项目支持部署到 **GitHub Pages** 和 **Cloudflare Pages**，使用 GitHub Actions 自动化构建与发布。

---

## 前置条件

- 项目使用 **Bun** 作为包管理器
- 构建工具为 **Vite**（输出目录 `dist`）
- 需要在 GitHub 仓库中配置相应的 Secrets

---

## 一、GitHub Secrets 配置

进入仓库 → **Settings → Secrets and variables → Actions → New repository secret**，添加以下 Secrets：

### 通用（两种部署都需要）

| Secret 名称 | 说明 | 获取方式 |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase 项目 URL | Lovable Cloud 后台 |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase 匿名公钥 | Lovable Cloud 后台 |

### Cloudflare Pages 额外需要

| Secret 名称 | 说明 | 获取方式 |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API 令牌 | [Cloudflare Dashboard → API Tokens](https://dash.cloudflare.com/profile/api-tokens)，创建令牌时选择 **Cloudflare Pages: Edit** 权限 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID | Cloudflare Dashboard 右侧栏可见 |

---

## 二、GitHub Pages 部署

### 工作流文件

`.github/workflows/deploy-pages.yml`

### 触发条件

- 推送到 `main` 或 `master` 分支
- 手动触发（workflow_dispatch）

### 额外步骤

1. **启用 GitHub Pages**：进入仓库 → Settings → Pages → Source 选择 **GitHub Actions**
2. **Base Path 配置**（如果部署在子路径 `https://username.github.io/repo-name/`）：
   - 修改 `vite.config.ts`，添加 `base: '/repo-name/'`
   - 或通过环境变量动态设置（推荐）

### SPA 路由支持

项目已在 `public/404.html` 中配置了 SPA 重定向脚本，GitHub Pages 会自动使用该文件处理客户端路由。

---

## 三、Cloudflare Pages 部署

### 工作流文件

`.github/workflows/deploy-cloudflare.yml`

### 触发条件

- 推送到 `main` 或 `master` 分支
- 手动触发（workflow_dispatch）

### 额外步骤

1. **在 Cloudflare 创建 Pages 项目**：
   - 进入 [Cloudflare Dashboard → Pages](https://dash.cloudflare.com/?to=/:account/pages)
   - 创建项目，项目名称需与工作流中的 `--project-name=knowledge-base` 一致
   - 如需修改项目名称，编辑 `.github/workflows/deploy-cloudflare.yml` 最后一行

2. **自定义域名**（可选）：在 Cloudflare Pages 项目设置中绑定自定义域名

### SPA 路由支持

项目已在 `public/_redirects` 中配置了 `/* /index.html 200` 规则，Cloudflare Pages 会自动识别。

---

## 四、相关文件清单

| 文件 | 用途 |
|---|---|
| `.github/workflows/deploy-pages.yml` | GitHub Pages 部署工作流 |
| `.github/workflows/deploy-cloudflare.yml` | Cloudflare Pages 部署工作流 |
| `public/404.html` | GitHub Pages SPA 路由重定向 |
| `public/_redirects` | Cloudflare Pages SPA 路由重定向 |
| `vite.config.ts` | 构建配置（含 base path） |

---

## 五、常见问题

### Q: 部署后页面刷新 404？
确认 SPA 路由文件已正确配置（`public/404.html` 或 `public/_redirects`）。

### Q: 构建失败提示缺少环境变量？
检查 GitHub Secrets 是否已正确添加 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY`。

### Q: Cloudflare 部署报 project not found？
确认 Cloudflare Pages 中已创建名为 `knowledge-base` 的项目，或修改工作流中的 `--project-name` 参数。
