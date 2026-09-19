# 知愈 · 让健康变得好懂

一个以移动端为重点的中文健康科普交互原型，使用 React + Vite 构建。

## 本地运行

```sh
npm install
npm run dev
```

## 构建

```sh
npm run build
```

包含健康地图、血糖/血压/血脂指标百科、五个器官的互动示意图、关键词搜索、分类分页、入门导览和浏览器本地收藏。移动端使用底部导航、独立阅读页、安全区适配和链接分享。文章可直接打开或刷新，例如 `/#/article/glucose`。

知识内容以独立 JSON 保存，正文按需加载。指标解释与器官介绍附 WHO、NIDDK、NHLBI、MedlinePlus 来源、核验日期、版本和待审校状态。正文引用编号可定位到具体来源。当前不提供个人报告上传、OCR、诊断或个体化治疗建议。

当前是可静态部署的前端，尚无后台。可通过 `.env.example` 中的配置切换到兼容 API，但需要先部署后端。规模化数据、API 契约、审核流程和 App/小程序/公众号路线见 [架构说明](docs/architecture.md)。

## 交互验证

启动本地开发服务（5173 端口），安装 Playwright Chromium 后运行：

```sh
npx playwright install chromium
npm run test:content
npm run test:ui
```

可通过 `PLAYWRIGHT_CHROMIUM_EXECUTABLE` 环境变量指定现有浏览器。内容测试使用一万条合成摘要检查分页和筛选正确性；UI 测试覆盖引用、按需加载、链接刷新/返回、错误重试、收藏、搜索与 320–768px 布局，并将截图保存到 `artifacts/`。

## 静态部署

执行 `npm run build` 后，将生成的 `dist/` 目录发布到任意静态托管平台或 Web 服务器，无需运行 Node.js 服务。项目使用哈希路由，文章链接刷新不需要额外的路由回退配置。

使用 Nginx 时可参考 [通用配置示例](deploy/nginx.conf.example)，按实际环境设置域名、站点目录和 HTTPS。建议 HTML 与内容 JSON 重新验证缓存，带哈希的 JS/CSS 使用长期缓存。

可设置 `PLAYWRIGHT_BASE_URL` 环境变量，让 `npm run test:ui` 验证已部署的站点；不设置时默认访问本地开发服务。
