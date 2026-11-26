# 知愈 · 让健康变得好懂

> 以下描述的是**当前已上线的 Beta 能力**，不是下一轮产品需求。当前唯一产品方案见 [产品蓝图](docs/product-blueprint-2026.md)；文档入口见 [docs/README.md](docs/README.md)；插图与 3D 解剖模型署名见 [媒体与模型署名](docs/media-attribution.md)。旧版方案已从仓库移除，需要追溯时查 Git 历史。

知愈是一个面向普通读者的中文健康科普与体检报告读懂工具站。通过体检指标图文解读、交互式原理图解、真实解剖 3D 模型与可追溯的权威参考资料，帮助读者认识身体、看懂体检单上的专业术语。

当前版本：`0.0.1-beta.23`。全站已具备内容后台、版本发布、场景联读专题、体检英文缩写 A–Z 速查词典、分享卡片、匿名内容纠错闭环和公开页面服务端渲染；目前包含 **26 个高频体检项目专题、7 篇「身体与日常」实用长文、6 个器官专题和 68 条体检英文缩写词条**：

- **26 项高频体检专题（100% 专属互动图解覆盖）**：全部为图文分节长文（微立体 3D 概念插图 + HTML 结构化图例 + 5 条常见问题 + 横向关联指标互跳），**全部配备双模式交互可视化流程图**（原理与检测流程 + 看单四步路径）；其中 **23 项配备专项交互图解**，**3 项高空间概念专题配备 Three.js 3D 剖面模型**。
- **7 篇「身体与日常」实用长文（100% 配备互动原理图解）**：覆盖影像检查分工、参考区间分布、体检前 72h 干扰因素、空腹喝水与吃药红绿灯、历年体检单趋势、爬楼心肺供氧与白大衣血压对比。
- **长文阅读体验增强**：正文自动识别 68 条词典中的医学缩写并提供**行内悬浮白话释义**；全站科普插图支持**点击全屏放大（Lightbox）**；文章页内置**顶部阅读进度条与章节快速跳转抽屉**。
- **6 大器官全覆盖 2D + 3D 互动沙盘**：心、肺、肝、胰腺、肾脏与甲状腺全部配备透明底 3D 插图、2D 步进式互动图解与 **Three.js 3D 真实解剖互动沙盘**；器官总览页内置 **3D 透明人体透视模型**（基于 NIH HuBMAP Human Reference Atlas 科研级网格经 Meshopt 压缩优化，7 组 `.glb` 总计仅 `247.6 KB`，按需懒加载、首页零首屏 JS 增量）。
- **读者界面**：采用清爽极简科技医疗风格（纯白与冷灰阶表面、医疗青绿主色、零字体包袱的系统无衬线排版）；首页以「读体检单」为轴，串联「单子怎么读」指南、高频缩写速查与 `/glossary` A–Z 词典入口、指标主推、按项目索引、身体与日常故事与 6 大器官入口。

## 目前可以做什么

- **读体检单（首页 & `/guide`）**：首页主推一篇指标长文（`featured` 优先，否则编号最小者），配该篇同款主图；搜索框下方串联「单子怎么读」、高频报告缩写/发现速查与「A–Z 缩写词典」，随后是按编号排列的项目索引、「身体与日常」故事（支持首页展开全部 7 篇）和器官入口。`/guide` 提供四列结构图、**交互式四步看单流程图**、六个阅读小节与全部 26 项常见报告行名映射。
- **体检英文缩写 A–Z 词典（`/glossary`）**：收录 **68 条**高频检验与影像英文缩写（如 `ALT`、`HbA1c`、`LDL-C`、`TSH`、`HBsAg`、`TCT`、`HPV`、`tPSA / fPSA`、`25-OH-D`、`Ferritin`、`TI-RADS`、`BI-RADS`、`DXA`、`C13` 等），支持 A–Z 字母快跳、按检查系统筛选、中英缩写与口语即时模糊检索，一键直达对应深度专题，并纳入服务端渲染与 `sitemap.xml`。
- **看懂 26 项高频体检项目（`/indicators`）**：涵盖血糖、血压、血脂、血常规、肝功能、肾功能、尿酸、甲状腺功能、尿常规、脂肪肝、甲状腺结节、肺结节、心电图、肿瘤标志物、幽门螺杆菌、颈动脉超声、胆囊超声、乳腺超声（BI-RADS）、便常规与便潜血、骨密度检查（DXA / T 值与 Z 值）、**乙肝两对半（乙肝五项）、胃肠镜检查、宫颈筛查（TCT 与 HPV）、妇科超声（子宫与卵巢）、前列腺超声与 PSA、维生素 D 与铁蛋白**。索引列表配备缩略图，每篇详情均内置「原理与检测流程 / 看单四步路径」双标签交互流程图与「报告单上常一起对照看」横向联读。
- **23 项指标 + 7 篇长文「互动原理图解」全覆盖**：在对应专题页内可直接动手切换视角、对照机制——涵盖心电图、血压、血脂、肝功能、肾功能、甲状腺功能、血糖、甲状腺结节、乳腺超声、血常规、尿常规、便潜血（FIT vs 化学法）、尿酸、幽门螺杆菌、脂肪肝、胆囊超声、肿瘤标志物、**乙肝五项组合解码、胃肠镜报告词与活检、TCT×HPV 双轨互补、妇科超声良性词拆解、前列腺增生钙化与 PSA 干扰、铁蛋白储备与维生素 D 钙吸收**，以及全部 7 篇「身体与日常」长文互动图解。
- **3D 透明人体透视、6 大器官 2D/3D 互动沙盘 & 3 篇专题 3D 剖面**：
  - 器官总览页内置 **3D 透明人体透视**（菲涅尔边缘光透明躯干 + 6 大真实解剖器官 + 浮动指示标注，点击平滑聚焦并直达器官专题）。
  - 心脏、肺、肝脏、胰腺、肾脏、甲状腺 **6 大器官全部支持 2D 步进图解与 3D 真实解剖沙盘一键切换**（含动态循环/气流/代谢粒子流、部位点选、静态全文与 `prefers-reduced-motion` 自动降级）。
  - **肺结节、骨密度、颈动脉超声** 3 篇高空间概念专题内置交互式 **3D 剖面模型**（毛玻璃/混杂/实性结节对照、正常与疏松骨小梁微结构、颈动脉三层管壁与斑块形态）。
- **读 7 篇实用日常长文 & 4 组体检场景联读（`/topics`）**：覆盖爬楼心跳、参考区间差异、空腹喝水吃药、熬夜饮酒运动干扰、白大衣血压与家庭自测、B 超/CT/MRI/X 光分工、保留历年旧报告建档，以及 `/topics` 4 组真实体检场景联读。
- **跨类搜索与口语别名**：兼容大小写、全角、空格和连字符差异，内置常见口语词与体检单原话别名；`/indicators` 搜索词同时匹配指标与体检准备/日常长文。
- **追溯来源与匿名纠错闭环**：从正文引用定位到参考资料，查看发布机构、章节定位和来源链接；完整部署下文章与器官页提供无需登录的匿名纠错入口，后台保留纠错审核队列与来源复核待办。
- **分享卡片与按需阅读**：指标和器官可生成带二维码、内容核对状态与科普提示的 PNG 分享卡片；支持文章目录直达、大字号本地偏好记忆与三项底部导航的移动端阅读。
- **公开页面服务端渲染与内容平台**：完整部署直接返回正文 HTML、独立标题、分享摘要与正式频道 `sitemap.xml`；未知或撤回内容返回 404，待核对演示保持 `noindex`。后台采用 Payload CMS 3 + PostgreSQL 16，支持来源管理、知识编辑、来源整理发布、批量知识包发布、版本记录、回滚和撤回；未提供读者账号、收藏同步、App 或小程序客户端。

正式内容 API（`/api/v1`）与待核对演示 API（`/api/demo`）相互独立。基础解剖、生理和术语在逐项核对具体来源、许可、中文表达与示意边界后即可发布，并明确显示“依据来源整理”，不要求独立专业审校。疾病诊疗、个人数值标准、特殊人群与用药方案不在当前产品范围。后台使用及部署见 [内容平台说明](docs/content-platform.md)。

## 内容与素材说明

- **参考来源**：专题包含内容版本、更新时间、来源整理状态和参考资料，来源包括 WHO、NIDDK、NHLBI、NLM / MedlinePlus 等公开权威机构。“依据来源整理”不表示来源机构为知愈背书；各篇状态以页面当前发布版本为准。
- **3D 模型与插图署名**：3D 解剖器官与躯干网格源自 [NIH HuBMAP Human Reference Atlas](https://humanatlas.io/)（CC BY 4.0），经本地离线流水线减面与 Meshopt 压缩后嵌入静态资源；其余插图与图解署名详情见 [媒体与模型署名](docs/media-attribution.md)。
- **医学边界**：内容用于健康科普，不替代医生诊断与个体化建议。当前不提供个人体检报告上传、OCR 或个体化治疗建议；「单子怎么读」与「专项交互图解」仅用于理解报告版面、缩写含义与生理/检查原理，不对任何人的具体数值作医学判断。

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

读者界面使用 React 19、Lucide 图标与 Three.js（3D 舞台与解码器通过动态分包按需懒加载，不阻塞首页与普通图文页）；完整站点由 Next.js 16 输出公开 HTML，后台采用 Payload CMS 3 + PostgreSQL 16。Vite 6 保留为离线演示和独立前端开发入口，两种入口复用同一套组件。项目内 JSON 用于离线演示与初始迁移，线上正文来自发布快照，搜索和分页通过 API 完成。

```text
src/
  components/                 页面与交互组件
    three/                    Three.js 3D 舞台、透明人体、6 器官沙盘与 3 篇概念切片
    IndicatorFlowchart.jsx    26 项体检项目双模式可视化流程图
    IndicatorVisualLab.jsx    23 项指标 + 7 篇日常长文互动图解入口（含 Extra/Story/ExpandedLabs）
    InlineGlossaryText.jsx    正文行内医学缩写悬浮释义
    FigureLightbox.jsx        全站科普插图点击放大（Lightbox）
    VisualLearning.jsx        6 大器官 2D 步进图解与 2D/3D 切换容器
    Glossary.jsx              体检英文缩写 A–Z 速查词典（/glossary）
    ReportGuide.jsx           「单子怎么读」页面、四步阅读流程图与文章内报告行小条
    FeedbackBox.jsx           匿名内容纠错反馈组件
  services/                   内容访问、路由、词典与筛选分页
    glossary.js               68 条体检英文缩写词库、行内匹配器与检索排序
    report-guide.js           「单子怎么读」的文字、来源与 26 项报告行映射
  hooks.js                    路由与本地阅读偏好
public/
  content/                    专题摘要、正文与参考资料
    indicator/                26 篇体检指标图文长文
    organ/                    6 个器官专题（全部含结构化分节与互动学习配置）
    story/                    7 篇身体与日常实用长文
  media/                      微立体 3D WebP 配图、器官透明底插图与 3D 模型
    models/                   7 组 Meshopt 压缩 NIH HuBMAP 真实解剖 .glb（共 247.6 KB）
  favicon.svg                 站点图标
scripts/                      内容构建、3D 模型压缩（prepare-3d-models.mjs）、生图与测试脚本
image-service/                内部图片生成服务（gpt-image-2.6，只绑定 127.0.0.1）
backend/                      Next.js 16 + Payload CMS 3 内容后台、公开 SSR、API 与迁移
compose.yaml                  PostgreSQL、CMS 与内部生图服务编排
deploy/                       通用静态与 SSR Nginx 配置示例
docs/                         产品蓝图、架构说明、媒体与模型署名及运维指南
```

默认使用项目内的静态内容，无需配置环境变量或启动后端。启用内容平台后，可参考 `.env.example` 设置 `VITE_CONTENT_API_BASE_URL=/api/demo` 使用待核对演示集合，或设置为 `/api/v1` 使用正式发布集合。后端启动、账号和迁移说明见 [内容平台说明](docs/content-platform.md)。

## 测试

内容、路由与数据单元测试：

```sh
npm run test:content
npm run test:routes
npm run test:discovery
npm run test:search
npm run test:topics
npm run test:share
npm run test:guide
npm run test:glossary
npm run test:report-data
npm run test:image-service
```

测试覆盖来源引用、关联内容、A–Z 缩写词典与专题映射、筛选分页、远程接口参数及失败重试，其中一万条合成摘要用于验证分页逻辑，不代表实际内容数量或线上性能保证。

浏览器交互与 3D 冒烟测试需要先启动开发服务（或指定线上/本地 SSR 地址），再在另一终端执行：

```sh
npx playwright install --with-deps chromium
npm run test:ui
npm run test:3d
npm run test:learning
npm run test:expansion
npm run test:figure
npm run test:report
node scripts/discovery-smoke.mjs
node scripts/reading-smoke.mjs
node scripts/search-smoke.mjs
node scripts/share-smoke.mjs
node scripts/topics-smoke.mjs
```

覆盖首页与索引、搜索、A–Z 词典、20 项流程图、14 项专项交互图解、3D 透明人体 / 6 器官 3D 沙盘 / 3 篇 3D 剖面、来源定位、文章链接与刷新、分页、错误重试及 320–1440px 响应式布局。截图保存到被 Git 忽略的 `artifacts/` 目录。

- `PLAYWRIGHT_BASE_URL`：指定待测试站点，默认使用本地开发服务。
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE`：指定本机现有 Chromium 浏览器路径。
- `CONTENT_API_BASE_URL`：API 模式的浏览器测试应设置为对应前缀，例如 `/api/demo`。
- `TEST_SSR=true`：配合 `PLAYWRIGHT_BASE_URL` 针对线上或本地 Next.js SSR 站点执行 `test:3d` 全量验证。

后台提供独立数据库中的权限、来源整理发布、版本切换、回滚与撤回测试，不会向正式数据库写入测试身份或数据。

## 部署

完整站点：从根目录使用 Compose 构建 Next.js + CMS 服务，按 [服务端渲染说明](docs/public-rendering.md) 配置发布集合与反向代理。HTML 不缓存，保证发布、回滚和撤回在下次请求生效；只有正式集合进入 `sitemap.xml`，演示集合保持 `noindex`。

离线演示：将 `npm run build` 生成的 `dist/` 发布到静态托管即可，无需 Node.js 常驻服务，但不具备服务端正文和内容级 404。使用 [静态 Nginx 示例](deploy/nginx.conf.example) 的 History 页面回退；完整站点则使用 [SSR 代理示例](deploy/nginx-ssr.conf.example)，不能继续把公开页面回退到 `index.html`。两种方式均保留旧 Hash 链接兼容，目前按域名根路径部署。

内部图片生成：`compose.yaml` 里的 `imagegen` 服务只绑定 `127.0.0.1`，用 Bearer token 鉴权，生成结果写到 `artifacts/imagegen`；它不进入反向代理，页面上也没有任何调用入口。启用方式与注意事项见 [生成图片](docs/image-generation.md)。

## 参与与后续方向

欢迎通过 Issue 提交问题、体验反馈和内容选题。反馈内容错误时，请提供具体专题、问题描述与可核验的来源；反馈界面问题时，请注明浏览器、设备和复现步骤。提交代码前请运行内容测试与生产构建，交互改动还应运行浏览器测试。

项目尚未选定开源许可证；当前版本不声明 MIT、Apache 等开源授权。

- [当前产品蓝图与文档索引](docs/README.md)
- [媒体与 3D 模型署名](docs/media-attribution.md)
- [版本记录](CHANGELOG.md)
