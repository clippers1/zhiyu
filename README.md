# 知愈 · 让健康变得好懂

知愈是一个面向普通读者的中文健康科普项目。通过体检指标解读、器官互动示意和可追溯的参考资料，帮助读者认识身体、理解健康知识。

当前版本：`0.0.1-beta.6`。这是以移动端阅读为重点的早期 Beta，已具备内容后台、版本发布、读者纠错和公开页面服务端渲染，现有科普内容仍待专业审校。

## 目前可以做什么

- **按目的进入**：从首页选择查体检术语、认识器官或找回读过的知识；器官入口只展示当前可用内容。
- **看懂指标**：阅读血糖、血压、血脂专题，了解常见术语与指标含义。
- **探索身体**：查看心脏、肺、肝脏、胰腺、肾脏的互动示意与相关知识。
- **查找知识**：按关键词搜索，使用分类筛选与分页浏览专题。
- **追溯来源**：从正文引用定位到参考资料，查看发布机构和来源链接。
- **收藏与分享**：在当前浏览器保存收藏，通过链接分享文章。
- **移动端阅读**：使用底部导航、独立文章页和入门导览；支持直接打开文章、刷新与返回。
- **内容纠错**：启用后台后，可对当前版本提交问题，凭专属查询码查看编辑回复或删除反馈；无需注册，不收集报告和联系方式。
- **维护待办**：后台显示待处理纠错、到期与未安排复核的来源，编辑可追踪关联草稿。
- **公开页面**：完整部署时直接返回正文 HTML、独立标题与分享摘要；未知或撤回内容返回 404，待审校演示不参与搜索收录。
- **按需阅读**：文章目录直达、大字号记忆，以及可手动开启、清空和关闭的本地阅读记录；默认不记录健康兴趣。

当前包含 3 个指标专题和 5 个器官专题。收藏保存在浏览器本地，不支持跨设备同步。后台采用 Payload CMS + PostgreSQL，支持来源管理、知识编辑、医学审校、版本发布、回滚和撤回；未提供读者账号、App 或小程序客户端。

正式内容 API 与待审校演示 API 相互独立。现有内容迁移不产生医学审校记录，也不自动进入正式发布集合。后台使用及部署见 [内容平台说明](docs/content-platform.md)。

## 内容说明

专题包含内容版本、更新时间、审校状态和参考资料，来源包括 WHO、NIDDK、NHLBI、NLM / MedlinePlus。当前内容均处于待专业审校状态；来源核验不等于医学审校。

内容用于健康科普，不替代医生诊断与个体化建议。当前不提供个人体检报告上传、OCR 或个体化治疗建议。

## 快速开始

建议使用 Node.js 22 LTS 与 npm。

```sh
npm ci
npm run dev
```

打开终端显示的本地地址，默认端口为 `5173`。

构建并预览生产版本：

```sh
npm run build
npm run preview
```

## 技术与目录

读者界面使用 React 19 与 Lucide 图标；完整站点由 Next.js 16 输出公开 HTML，后台采用 Payload CMS 3 + PostgreSQL。Vite 6 保留为离线演示和独立前端开发入口，两种入口复用同一套组件。项目内 JSON 用于离线演示与初始迁移，线上正文来自发布快照，搜索和分页通过 API 完成。

```text
src/
  components/       页面与交互组件
  services/         内容访问与筛选分页
  hooks.js          路由与本地收藏
public/
  content/          专题摘要、正文与参考资料
  favicon.svg       站点图标
scripts/            内容测试与浏览器交互测试
backend/            内容后台、API、数据库迁移与流程测试
compose.yaml        PostgreSQL 与 CMS 服务
deploy/             通用 Nginx 配置示例
docs/               架构说明与拓展计划
```

默认使用项目内的静态内容，无需配置环境变量或启动后端。启用本项目的内容平台后，可参考 `.env.example` 设置 `VITE_CONTENT_API_BASE_URL=/api/demo` 使用待审校演示集合，或设置为 `/api/v1` 使用正式发布集合。后端启动、账号和迁移说明见 [内容平台说明](docs/content-platform.md)。

## 测试

内容与数据访问测试：

```sh
npm run test:content
npm run test:routes
npm run test:feedback
npm run test:reading
```

测试覆盖来源引用、关联内容、筛选分页、远程接口参数及失败重试，其中一万条合成摘要用于验证分页逻辑，不代表实际内容数量或线上性能保证。

浏览器交互测试需要先启动开发服务，再在另一终端执行：

```sh
npx playwright install --with-deps chromium
npm run test:ui
node scripts/reading-smoke.mjs
node scripts/discovery-smoke.mjs
```

覆盖搜索、收藏、来源定位、文章链接与刷新、分页、错误重试及 320–768px 布局。截图保存到被 Git 忽略的 `artifacts/` 目录。

- `PLAYWRIGHT_BASE_URL`：指定待测试站点，默认使用本地开发服务。
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE`：指定现有 Chromium 浏览器路径。
- `CONTENT_API_BASE_URL`：API 模式的浏览器测试应设置为对应前缀，例如 `/api/demo`。

后台提供独立数据库中的权限、审校、发布、回滚与撤回测试，不会向正式数据库写入测试医生身份。

## 部署

完整站点：从根目录使用 Compose 构建 Next.js + CMS 服务，按 [服务端渲染说明](docs/public-rendering.md) 配置发布集合与反向代理。HTML 不缓存，保证发布、回滚和撤回在下次请求生效；只有正式集合进入 sitemap，演示集合保持 noindex。

离线演示：将 `npm run build` 生成的 `dist/` 发布到静态托管即可，无需 Node.js 常驻服务，但不具备服务端正文和内容级 404。使用 [静态 Nginx 示例](deploy/nginx.conf.example) 的 History 页面回退；完整站点则使用 [SSR 代理示例](deploy/nginx-ssr.conf.example)，不能继续把公开页面回退到 `index.html`。两种方式均保留旧 Hash 链接兼容，目前按域名根路径部署。

## 参与与后续方向

欢迎通过 Issue 提交问题、体验反馈和内容选题。反馈内容错误时，请提供具体专题、问题描述与可核验的来源；反馈界面问题时，请注明浏览器、设备和复现步骤。提交代码前请运行内容测试与生产构建，交互改动还应运行浏览器测试。

项目尚未选定开源许可证；当前版本不声明 MIT、Apache 等开源授权。

- [版本记录](CHANGELOG.md)
- [内容与多端架构](docs/architecture.md)
- [内容平台使用与维护](docs/content-platform.md)
- [纠错与来源复核](docs/feedback-and-maintenance.md)
- [公开页面渲染与部署](docs/public-rendering.md)
- [阅读体验与本地记录](docs/reading-experience.md)
- [场景入口与查找路径](docs/discovery-entry.md)
- [项目拓展计划](docs/roadmap.md)
- [ToC 产品规划](docs/product-plan.md)
- [知识来源与内容平台](docs/knowledge-platform.md)
- [History 与页面渲染决策](docs/rendering-and-routing.md)
