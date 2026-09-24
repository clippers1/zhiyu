# 知愈重构：代码设计与分步实施方案

更新：2026-09-24 · **设计稿；`refactor/reader-structure` 已实现 T1/T2 页面候选版、现有专题及器官页的结构优化，未完成真实读者任务验证；T3–T5 的新契约/策展/新领域未实施**。不代表功能已上线；主题、配色、字体品牌均待定。

对应 [业务与版式重构方案](reference-app-restructuring-plan.md)、[体检疑问 PRD](PRD-zhiyu-health-questions.md)。本文件解决“从现有仓库如何实施”；业务顺序、医学审核边界以上述文档为准。遇到现有未提交代码与旧 PRD 的执行记录冲突，先核实当前分支/实际部署，再决定实施范围；本轮不改运行代码、不覆盖未提交改动。

## 1. 实施边界与仓库现状

| 现有事实（以当前工作区代码为准） | 对重构的约束 |
| --- | --- |
| `src/App.jsx` 负责页面路由组合和导航；`Home.jsx` 同时渲染搜索入口、9 个指标问题、专题卡及器官区；`Library.jsx` 管理筛选；`Article.jsx` 管理指标详情 | **先拆页面职责与顺序**，不把所有页面一次性改造成新设计系统；首页只做有限精选，完整列表留在目录 |
| `src/services/content.js` 提供 `list/get`：Vite 演示读 `public/content`，正式站读 API；`src/hooks.js` 用 `useContent` 读预取或网络数据 | 沿用一个仓库接口，不让页面直接读 JSON、直接查 CMS 或自行拼搜索结果；新数据先定义双端一致的契约 |
| `backend/src/site.ts` 对正式站路由预取公开内容；`backend/src/public-api.ts` 查询当前未撤回的 `publications`；`backend/src/domain.ts` 产生正文/摘要发布快照 | HTML、元数据、客户端首屏必须指向同一发布口径；策展 ID 只作入口，不产生第二份医学事实或绕过发布门槛 |
| `src/services/routes.js` 和 `TopicRoute.jsx` 已用 `/topics`、`/topics/:id` 表达指标衍生阅读路线；`backend/src/site.ts` 按此做 SSR/SEO | 旧文章、旧专题、`/map` 与 `/organs` 链接保留；跨指标编辑路线如有必要另开路由，不能把已有 `:id` 偷换成另一种语义 |
| `backend/scripts/sync-reader.mjs` 把根目录 `src/` 同步至 `backend/reader/`，供 Next 构建；`scripts/build-content-catalog.mjs` 生成离线目录 | **只编辑根目录 `src/`**；`backend/reader/` 是构建副本，不在里面手工开发。涉及新字段要同步校验 CMS、公开 API、离线构建脚本和测试 |

当前多处 H02/H03/H04 文件有未提交改动，包括前端、发布脚本、迁移、内容 JSON 和测试。本方案是**在这批改动核实以后**的小步重构顺序，不假定旧 PRD 中“未实施”的说法仍正确；开工前先冻结基线，逐文件检查差异和现有行为。

### 1.1 设计原则

1. 已发布文章是唯一医学正文；列表摘要、问题卡、路线说明都必须引用同一已发布修订，不从搜索词或 AI 生成医学结论。
2. 显示入口的前提是其目标在**当前通道**可读；撤回时隐藏入口、断链时返回明确状态，不能用旧缓存当实时发布结果。
3. 先做现有内容的呈现与路径优化；读者验证通过、确有跨文章路线需求后才增加 CMS 策展表或新路由。
4. 无图可读、有图可查来源；必要限制靠近答案，详细参考资料保留原有锚点和完整页面。
5. 移动端单列 DOM 顺序作为基线，宽屏增强而不复制第二份 DOM；不把色板选择捆绑进结构重构。

## 2. 目标模块和职责

```text
CMS 草稿/来源/审校（既有）
      ↓ 当前审核发布流程
publications 公开快照（既有） ──→ publicContent /api/{v1|demo}/content（既有）
      │                                     │
      │ 仅引用公开 ID                        ├─→ SSR buildPage + pageMetadata
      │                                     └─→ createContentRepository → useContent → 页面
      └─→ [条件触发] 策展记录 ─→ 服务端过滤/排序 ─→ discovery/guides 公开视图

离线 public/content/*.json ─→ build-content-catalog ─→ 同一 repository 接口
```

| 层 | 建议落点（拟新增文件仍是设计，不是已有实现） | 单一职责 |
| --- | --- | --- |
| 路由外壳 | `src/App.jsx`、`src/services/routes.js`、`src/components/RouteLink.jsx` | 页面选择、真实 `href`、主导航、弹窗；不放筛选/医学内容选择逻辑 |
| 页面容器 | `src/components/Home.jsx`、`Library.jsx`、`Article.jsx`、`TopicRoute.jsx`、`OrganExplorer.jsx` | 定义屏幕区块顺序和加载/空/撤回状态；从仓库取得数据 |
| 纯展示组件 | `src/components/ContentUI.jsx` 逐步拆出 `QuestionPreview.jsx`、`CatalogRow.jsx`、`TrustLine.jsx`、`FigureBlock.jsx`（需要时） | 以显式 props 展示一项任务；不发请求、不推断用户病情；避免把每行都包装成同种浮起卡片 |
| 页面选择器 | 拟 `src/services/discovery.js` | 对当前可读摘要作**确定性**精选/去重/入口可见性判断；无 React、可单测、不得生成新的医学主张 |
| 内容仓库 | `src/services/content.js`、`src/hooks.js` | 列表/详情、请求取消与重试；如新增策展能力，在这里定义 `discovery()` / `guide()`，不在组件里散写 fetch |
| 发布与检索 | `backend/src/domain.ts`、`collections.ts`、`public-api.ts`、`site.ts`；`scripts/build-content-catalog.mjs` | 唯一发布规则、通道隔离、公开数据序列化、SSR 首屏预取及静态演示口径 |
| 排版 | `src/discovery.css`、`reading.css`、`mobile.css`，视已有规则局部调整 `styles.css`/`topics.css` | 流式单列、大字号/触控/图注与多断点；现有颜色变量暂保留，不趁重构定主题 |

**不建议**此时引入新的路由框架、全站状态管理、UI 组件库、客户端缓存框架或新的医学内容类型；目前能力可以增量实施。若后续评估需要，再附独立迁移提案。

## 3. 数据契约与安全边界

### 3.1 第一阶段：利用现有公开摘要，不先建表

`list({kind:'indicator', limit:24})` 已返回 `id/kind/title/question/questionAnswer/subtitle/category/featured/...`；详情 `get('indicator', id)` 包含 `limitations/applicability/references/figure`。首期在客户端和 SSR **复用同一批可读摘要**：

```text
selectDiscovery(indicators, organs, optionalSelection):
  questions: 不超过 3 个不同 indicator ID 的可读问题
  topicPreview: 仅展示真实可打开的旧 /topics/:id（且不与问题卡重复造另一张问题卡）
  organPreview: 仅当 organ 列表中确有可读项目
  fallback: 无可读条目时仅呈现真实目录链接/诚实空态
```

选择规则：过滤无 `id/question` 项；仅使用 `list` 当前通道返回的 ID；编辑指定 ID 顺序若尚无配置，先使用 `featured` 等**已有字段加稳定的公开排序**，不要称为“热门”。具体排序先记录快照并用读者测试确认；不要依赖两个服务端接口恰好按同一数组顺序返回。问题区、专题预览、器官区各有不同任务；同一篇文章可以被相关路线引用，但不要在首页重复做两张同角色推荐卡。`questionAnswer` 必须由原发布快照核对，首页只显示一句已发布摘要，不能自行截掉改变意义的条件。

**契约注意：**`list` 当前默认上限 24，搜索结果有 `total/nextCursor/categories/suggestions`；9 个指标暂可一次取得，增长后不能用“取第一页再本地精选”假装全站推荐。此时再进入 3.2 的策展视图。`useContent` 的 key 是方法名及完整参数 JSON；新接口的 SSR 预取键必须逐字节匹配客户端调用，否则会出现首屏重复请求/水合差异。

### 3.2 第二阶段：确有跨文章策展需求才建公开视图

新能力**不直接让浏览器读取 CMS 草稿**。建议“编辑配置 → 服务端组装 → 仓库统一读取”三层，发布门槛先独立审查：

| 数据 | 必需字段 | 校验/对外规则 |
| --- | --- | --- |
| 编辑配置（拟 `editorial-guides`；仅在需求验证后） | `slug`、`channel`、`title`、`purpose`、`status`（draft/live/withdrawn）、`steps[{kind,id,reason,position,expectedContentHash}]`、更新时间 | `slug` 稳定且不与旧 ID 路由混用；`reason` 解释“为什么读下一篇”，不得新增医学断言；只允许获授权编辑写，发布动作有审计记录；记录编排时对应的发布修订指纹 |
| 公开路线视图 `GuideView` | `id/title/purpose/steps[{href,title,reason,kind,publicationId}]`、`updatedAt` | 服务端按 `channel` 联查**当前未撤回**的公开发布记录并比对每步的当前修订指纹；无有效起点、关键步骤版本变化或无法解释路线则隐藏整条，等待编辑复核并重新发布；绝不把内部草稿、权限字段和未审文案透给客户端 |
| 发现页视图 `DiscoveryView` | `questions[]`、`guides[]`、`organPreview[]` | 在服务端以当前公开摘要过滤及排序；来源/审校字段只继承发布快照；不引入虚假的热度/诊断状态；没有内容的区块为空数组 |

`GET /api/v1/discovery` 与 `GET /api/demo/discovery`、按需的 `GET /api/{v1|demo}/guides/:slug` 仅作为**候选接口**；有公开编辑配置和跨文章路线后再开通，扩展 `backend/src/public-api.ts`（或相邻独立处理模块）与 `src/services/content.js`。状态：200 当前可读视图（可为空数组）；400 非法参数；404 不存在/已撤回的路线；暂时不可用返回错误，不把旧快照改为 200。保持现有 `Cache-Control: no-store` 口径；对列表读到条目而在点击前恰逢撤回的竞争，只能保证下一次详情请求返回 404 并给出可返回目录的文案，不承诺绝对没有短暂孤儿入口。正式、演示严格隔离；对外展示不能靠前端过滤演示条目。建议限制步骤数、ID 格式及重复 ID，并在提交发布时用**服务端**检查公开目标；版本变更时即使 ID 不变，旧路线也不可悄悄沿用未经复核的引导文案。新增 CMS 表时将迁移登记到 `backend/src/migrations/index.ts`，更新生成的 Payload 类型及工作流测试，再单独部署。

离线 Vite 演示则在 `public/content` 旁编译出相同结构的**构建时视图**，构建器在 `--check` 模式验证所有引用存在；删除或撤回离线材料须重新构建/部署，不宣称浏览器离线快照具备线上即时撤回能力。官方站不回退使用演示 JSON。若只实现现有指标路线，不必添加本节接口、表或新 URL。

### 3.3 来源、图示、个人数据

- `snapshotArticle()` 已生成公开正文/摘要并以正文、摘要及范围等信息参与快照指纹；增改**会承载医学主张**的摘要、首屏限制或图解时，先明确快照字段与审校/来源整理校验的关系，再迁移/重新发布，不能只改前端字符串。既有 `figure` 需提供来源编号、简化说明、替代文本和授权；不为页面填空默认回退到任意器官图。
- 详情的“核对状态”复用 `src/services/content-status.js` 已定义的 `reviewed/source-curated/demo` 区分；不新增前端自称“已医学审校”的徽章。适用范围和限制依旧来自已发布详情，缺数据时不编造一个通用医学结论；风险内容未获专业复核不上线。
- 阅读/找不到反馈不需要账号或上传体检单。若将来记录搜索词，另立隐私评审：可能包含健康信息；在此设计里只做页面空态，不默认发日志、埋点或保存原始输入。

## 4. 页面级改造清单

### 4.1 首页 `/`、旧 `/map`

**先只动展示层**：`Home.jsx` 从“9 个问题 + 重复 3 张专题卡 + 全部器官 + 大器官图”收敛为任务句/单一搜索 → 两种有内容支撑的入口 → 1–3 个不同问题 → 一条真实路线（如果有）→ 一条身体原理延伸（如果有）。先对照重构方案的 A/B 线框验证顺序，**不以文档线框直接替代用户验证**。`selectDiscovery` 接收 `state.data?.items`，组件不写 `.slice(0,3)` 这种临时策展规则；`TopicCards` 在首页与 `/topics` 列表的职责可分离：前者是一条任务路线预览，后者才是完整索引。

- 首页仅一个显著的搜索操作；复用现有目录搜索/`SearchDialog`，不复制两个输入框或在不支持报告上传时暗示上传。
- 每区都按“loading → error/retry → empty/降级 → ready”渲染；如果问题列表失败，已有目录链接可用，但不得把旧卡片冒充当前可读。
- 可读问题卡：`question`、`questionAnswer`（原文）、项目名、真实详情 `href`；触发导航的 JSX 用 `RouteLink` 保持未水合时可打开。
- 不在首页用硬编码词条创建推荐，即使演示目录与正式站有不同内容也必须自然退化。

### 4.2 目录 `/indicators` 与全站搜索

保留 `Library.jsx` 当前 `query/category/cursor` 状态与 `useSearchInput` 防抖；把搜索及已发布分类置于导语前面，列表行用 `CatalogRow` 显示**问题标题 → 命中原因/项目名 → 简短摘要 → 内容状态**，避免同一正文在三张大卡里重复。`SearchDialog.jsx` 与 `Library.jsx` 通过同一个公开搜索契约排序/匹配，不在两个组件复制一套别名规则；先验证 `backend/src/content-search.ts` 与 `src/services/search.js` 在典型同义词上的差异，再改两端并加契约测试。

服务端仍以 `publicContent` 的分页结果为准，不用客户端全量筛选来伪造 `total`；搜索未命中、筛选后为空、接口失败、输入法合成中各自有可辨认的状态。清空/切换分类重置 cursor，分页 `href`/浏览器返回/直接访问状态按实际页面能力补测试；**若要把筛选状态放进 URL**，先定义 query 参数与 SSR 初始参数一致，再实现，不能先写入 `history` 而让服务器渲染另一组结果。未命中建议只能指向确实可读的发布内容。

### 4.3 指标详情 `/article/:id`

在 `Article.jsx` 提取头部与正文区域：**问题标题 + 当前核对状态 → 一句话回答 + 必要限制 → （可选）已核对主图及文字替代 → 解释 → 完整“不能据此说明什么” → 术语/器官关联 → 详细来源及版本 → 有理由的下一篇**。限制文案以详情 `limitations` 为准；若要在答案旁单列 `limitationExcerpt`，这是新的医学表达字段，须经编辑核对、进入 `snapshotArticle()` 快照/发布门槛，并同时适配静态 JSON；未完成前可移动现有已发布限制全文或明确原有文字位置，不在前端随意截句。

- `FigureBlock` 使用既有 `figure` 与来源定位；无图/加载失败仍显示完整文字和图注（若无图不要留下空盒）。后续分步图优先从已核对步骤配置渲染，动效只是可关闭的增强，不自动播放。
- `relatedOrgans` 和关联阅读先与当前公开 `organ` 摘要交集，再输出可点击项；解释“为何相关”必须有编辑依据，不能用相关算法自动推断因果。
- 保留 `#article-source-panel`、分享 URL、直接访问 404、已撤回 404；现有 `TopicReturn` 与首屏来源跳转须继续工作。分享摘要也不能截掉必需限制。

### 4.4 专题与器官

`/topics` 及 `/topics/:id` 仍保持已有“单指标 → 相关器官 → 来源”路线，不能把旧 `id` 默认为新跨主题 slug。若路线经验证必须串多个指标，再新开如 `/guides/:slug`（名称上线前确认），同步 `routes.js`、`App.jsx`、`site.ts`、元数据、sitemap、API 和静态演示的回退；只展示已发布且可用的步骤，没有来源或撤回后路线不再可见。`OrganExplorer` 中图文/互动继续作为深入阅读，不将器官图前移抢走首页搜索位置；缩减动态效果下保留文字路径。

### 4.5 排版实现（与配色解耦）

不新建色板；先整理**语义尺寸变量**，例如容器宽度、正文宽度、页面内边距、正文/摘要/标题字号、行高、卡片内距、区块间距、触控尺寸；在现有 CSS 文件按页面职责渐进替换固定尺寸。中文正文与卡片摘要放大时允许行高和卡片高度增长，不 `line-clamp` 截断医学条件，超长英文缩写与图标签可换行。首页/目录/详情分别检查 320/390/430px、桌面、200% 文字缩放与浏览器重排；底栏不遮挡最后的来源/分步按钮，键盘焦点、标题层级、`prefers-reduced-motion` 都有可测试状态。**同一 DOM 阅读顺序**而不是移动端/桌面各渲染一份不同医学正文。

## 5. 实施批次、依赖与改动范围

| 批次 | 前置条件与落点 | 提交粒度（拟） | 验收/回滚 |
| --- | --- | --- | --- |
| T0 · 固定基线 | 先核对未提交的 H02–H04、现行 SSR/演示与旧 PRD 状态；记录 3 页现状、URL 和已知失败 | 仅测试清单/线框结论，不动线上行为 | 有能复现的基线；不得把别人的工作区变更当成待删除旧代码 |
| T1 · 页面骨架 | 读者验证选定 A/B 首页顺序；改 `Home.jsx`、必要展示组件及 CSS；复用现有 list/get | 首页拆主次、减少重复，无新 DB/URL/医学字段 | 未发布/撤回不出卡；页面失败仍能查目录；旧 `/` `/map` 可用；不满意可独立回滚呈现层 |
| T2 · 目录与详情 | `Library.jsx`、`SearchDialog.jsx`、`Article.jsx`、`ContentUI.jsx`、相关 CSS；先用现有快照调整布局，依赖新字段的部分等待 T3 | 目录/搜索共享结果，详情回答与限制靠前，图可选；不临时填医学短句 | 查项目→复述局限→找来源/下一篇；旧分享、深链接、空/错/大字号可用 |
| T3 · 契约增量 | **仅当** T1/T2 无法安全用现有快照表达：`domain.ts`、`collections.ts`、`public-api.ts`、`site.ts`、静态构建脚本和迁移/发布脚本 | 每个医学字段单独审核、迁移、双端校验与测试；需要 T3 的 T2 子功能完成后再上线，不同时引入新主题 | 指纹/版本/审校不被绕过，SSR/API/离线数据一致；有恢复旧发布版本的办法 |
| T4 · 编辑路线（可选） | 观察证实需要跨内容路线且有人维护时：策展配置、公开视图、新路由、仓库方法、SSR、sitemap | 独立于版式上线，可关入口且旧 `/topics/:id` 继续工作 | 编辑记录撤回后 API/SSR 不再展示；旧路线/分享仍可访问或诚实返回不可读 |
| T5 · 新领域试点（另立项） | 慢病/脑科学/婴幼儿之一，有专业复核与发布拦截方案 | 单独数据模型、审核门槛和模板评审，不与 T1–T4 混发 | 缺审阅者不发布；不在本重构自动开放新导航 |

**部署先后：**如需新增数据字段/接口，先做兼容旧页面的后端读取与校验 → 完成迁移及相应内容的重新发布 → 部署能兼容旧/新快照的前端 → 再启用新入口；移除字段/旧 URL 另提案。任何阶段避免在已发布正文缺少新字段时读者页面崩溃。撤回或回滚用现有 `publications` 发布/撤回机制，T4 的策展状态则需单独保障与审计；不要通过“改首页硬编码数组”当发布操作。

## 6. 测试矩阵与完成定义

| 层 | 新增/复用测试位置 | 至少覆盖 |
| --- | --- | --- |
| 纯逻辑 | 拟 `scripts/discovery.test.mjs` + 现有 `scripts/search.test.mjs`、`topics.test.mjs` | 空列表、重复 ID、无问题标题、排序稳定、卡片去重、不同通道视图、同义词对齐、已撤回目标不入视图 |
| 公开数据 | `scripts/content.test.mjs`、`scripts/figure-smoke.mjs`、`npm run content:check`；如涉及 CMS 同步 `backend/scripts/workflow.test.ts`、`search.test.ts` | 快照/发布门槛、图的来源许可、摘要与正文版本相同、官方/演示隔离、静态引用全部存在 |
| 路由/SSR | `scripts/routes.test.mjs`、`scripts/ssr-smoke.mjs`、`backend/scripts/rendering.test.ts` | `/` `/map` `/indicators` `/article/:id` `/topics` `/topics/:id` 和条件性新路由；刷新、深链、旧分享、404、撤回、预取 key 与客户端一致、metadata/sitemap 不索引已撤回内容 |
| 页面/可用性 | `scripts/discovery-smoke.mjs`、`scripts/search-smoke.mjs`、`scripts/reading-smoke.mjs`、`scripts/smoke.mjs`、真实手机读者任务 | 首页一处搜索、不重复推荐、问题可点、目录分页/未命中、答案/局限/来源顺序、无图/坏图、无 JS、大字号/窄屏/键盘/减少动画 |

建议各批从最小测试开始，再跑 `npm run test:content`、`npm run test:routes`、`npm run test:search`、`npm run test:topics`、`npm run test:figure`、`npm run build`；触及 CMS 时追加 `cd backend && npm run typecheck && npm run test:workflow && npm run test:rendering && npm run build`。其中部分脚本可能要求数据库/服务或已配置环境，先按各脚本实际依赖运行；不可把“缺环境未执行”写成通过。工作区已有失败应单独记录，不为此方案顺手修无关问题。

**完成定义**：线框已用真实读者任务验证；首页/目录/详情各自有可读的空、错、撤回状态；答案与限制来自同一公开版本；来源和分享不丢；移动/桌面与放大文字下阅读顺序稳定；离线演示与正式站各自按发布规则取数；旧 URL 与审核门槛未退化。**不以“卡片更多、代码更少、配色换了”作为成功标准。**

## 7. 开工前待定的具体决策

1. 首页线框 A/B 哪个在读者任务中更易用？确定后才冻结 T1 的区块顺序和展示组件，不用开发先后替代验证。
2. 第一条“从体检单开始”能否用现有 `/topics/:id` 的单指标路线表达？若不能且已有真实内容，才进入 T4 的跨指标路线设计。
3. 首屏“必要限制”当前 `limitations` 是否可直接移动到答案附近？若必须精简为新摘要，应由谁审阅并负责重新发布？没有批准前不增加医学文案字段。
4. 官方站实际发布内容、Vite 静态演示和未提交代码各处是否一致？核实后给 T0 的迁移、回滚与测试提供明确起点。

**实施记录（2026-09-24）**：基线已提交至 `main`（`fd504bf`），工作分支 `refactor/reader-structure` 基于现有已发布摘要实现：首页精选/去重；目录搜索先行与问题优先的结果行；详情把原有已发布答案、局限和可选图解提前，坏图有文字退路；`/topics` 用三个当前可读问题引导读者从体检单中任选一项，并可从文章返回选择其他问题；器官页先给功能说明、仅在内容可读时加载插画。复用原有 `/topics/:id`、`/article/:id` 与撤回/来源机制，没有新增医学结论、CMS 表、数据库迁移、新医学字段或新路由。**这是候选布局和现有基础内容的任务闭环，不是完成读者验证或上线新业务领域。** T3–T5 仍受专业审阅与发布门槛约束。
