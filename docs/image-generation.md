# 生成图片的注意事项

这份文档回答「用 gpt-image-2.6 生成图片要注意什么」。服务本身的启动、接口与错误码见 [image-service/README.md](../image-service/README.md)。

以下结论来自 2026-11-03 通过 `clippers.anron.fun` 代理的实际调用，不是模型文档的转述；代理参数随时可能变化，以响应里回显的值和本机重新验证为准。

## 1. 先定用途，再写 prompt

同一句话，用在首页主推、文章内插图、分享卡片上，需要的构图完全不同：

| 用途 | 构图要求 | 建议尺寸 |
| --- | --- | --- |
| 首页 / 文章插图 | 主体居中、四周留白、纸色底，便于嵌进 360–760px 的正文列 | 竖版或方版 |
| 分享卡片底图 | 大面积可压字区域，避免细节集中在中心 | 3:4 竖版 |
| 器官 / 器物特写 | 单一主体、纯色底，最好透明 | 方版 + `background: "transparent"` |

## 2. 尺寸与参数不能假设

- 代理会把请求尺寸**吸附到自己的档位**：请求 `1024x1024` 实际得到 `1536x1024`，请求 `1024x1280` 得到 `1122x1402`。服务因此从 PNG/JPEG/WebP 头里读真实宽高写进 sidecar，**不要用请求值当作结果**。
- 当前代理**忽略** `quality` 与 `output_format`，一律返回 PNG、`quality: "low"`；响应会回显真实值，照着记录即可。
- `background: "transparent"` 返回真正的 RGBA PNG（colorType 6），可以直接叠在纸色底上。

## 3. 不可复现

没有 seed，同一个 prompt 两次生成的结果不同。**要留的图必须保存文件本身**；service 的 sidecar（prompt + sha256 + 尺寸 + usage）是可追溯的唯一凭据，重跑不等于重放。

## 4. 图内文字

- 中文可以写，密集中文标签也能读，但会出现形近字（例如把「碳」写成别的字），并且**图内文字不可选中、改文案必须重画**。
- 会被读者当成**事实**的文字（项目名、数值、参考区间、箭头含义）不要交给模型生成；这些应该留在 HTML/SVG 里，可访问、可修改、可被搜索引擎读到。
- 生成后必须逐字核对图内文字；核对不通过的图不进站点。

## 5. 医学边界（知愈适用）

- 不生成看起来像真实检验报告、医学影像或诊断截图的图。
- 图中不出现具体数值、阈值、分级标准或「偏高 / 偏低」结论。
- 自制示意图必须配「图示边界」，写明简化了什么、不表示什么。
- 生成图不能替代已有来源；如果图里表达了一个医学关系，它仍要挂到内容包已有的 `sourceIds` 上。

## 6. 授权与署名

- AI 生成图不属于第三方版权素材，但也不是「真人绘制」。发布时标注「AI 生成插图 · 模型 gpt-image-2.6」，并保留 prompt 记录（sidecar 就是记录）。
- 是否允许进入内容包、如何写入 `attribution`，是内容闸门问题，**本轮不改 schema**：生成结果先留在 `artifacts/imagegen`，人工挑选后再决定是否复制进 `public/media`。

## 7. 体积与成本

- 单张 1.5–2.7 MB、生成 15–60 秒；带参考图的 edits 约 1 分钟，并且额外计输入图 tokens。
- 网页使用前应用 sharp 缩到实际显示尺寸并转 WebP（`public/media` 现有 PNG 都在 30–190 KB）。
- 每日上限（`IMAGE_DAILY_LIMIT`）与 `.usage.json` 是对账依据；服务在超限时直接拒绝，而不是先调用后报错。

## 8. 安全

- 密钥只在服务端；服务只绑 `127.0.0.1`，不进 nginx 配置。
- 调用方需要 `IMAGE_SERVICE_TOKEN`；token 与上游密钥都不出现在日志、响应或健康检查里。
- 请求体上限 64 KB、prompt ≤ 4,000 字符、`count` 1–4；参考图只能是输出目录里的图片名（防路径穿越）。
- 4xx 不重试（避免重复扣费），5xx 最多重试 2 次。

## 9. 对外给外部 agent 调用

内部调用走 `http://127.0.0.1:3120`；外部 agent 走 `https://imggpt.anron.fun`（已配好 TLS，只放行生成接口、图片与 `/healthz`）。

- 标准路径是 `POST /v1/images/generations`（与 `/v1/images` 等价），请求体用 OpenAI 的 `prompt / n / size / quality / background`，需要 base64 时加 `response_format: "b64_json"`；响应对同时返回 `data[]` 与 `images[]`。
- 设置 `IMAGE_PUBLIC_ORIGIN=https://<域名>`，图片 URL 才会是可直接打开的绝对地址。
- 反向代理只放行 `/v1/images`、`/v1/images/generations`、`/files/`、`/healthz`（示例见 `deploy/nginx-imagegen.conf.example`），管理页与 `/api/*` 留在本机。
- `proxy_read_timeout` 要大于单张图的生成时间（15–60 秒），否则反向代理会先断开。
- 只有浏览器要直接调用时才开 `IMAGE_ALLOW_BROWSER=true`；它会只对 `IMAGE_PUBLIC_ORIGIN` 返回 CORS 头。把密钥放进任何网页都会泄露，通常不建议。

## 10. 怎么知道服务状态、怎么看生成图

| 方式 | 内容 |
| --- | --- |
| `http://127.0.0.1:3120/` | 管理页：输入 `IMAGE_SERVICE_TOKEN` 后显示运行状态、当日张数/字节、并发与排队、已生成图片（缩略图、prompt、真实尺寸、token 用量），可点开原图 |
| `GET /healthz` | 给监控用：模型、是否配置、并发、排队、当日用量、最近生成时间 |
| `GET /api/state`（Bearer） | 管理页用的同一份数据 |
| `GET /api/images?limit=24&before=<file>`（Bearer） | 分页列出已生成图片，最新在前 |
| `artifacts/imagegen/` | 文件本身与 `<file>.json` sidecar；`.usage.json` 是当日计数 |
| 容器日志 | 每行一条 JSON：`generated` / `generation_failed`，含张数、耗时、字节，不含 prompt 与密钥 |

首次使用管理页时需要注意：

1. 页面把 token 存在 `sessionStorage`，关闭标签页即失效，不写 cookie、不发到第三方。
2. 管理页与 `/api/*` **不要**通过公网反向代理暴露；需要远程查看时用 SSH 隧道：`ssh -L 3120:127.0.0.1:3120 <host>`，然后打开 `http://127.0.0.1:3120/`。
3. 页面只读取生成文件，不做删除或重命名；清理仍按 `IMAGE_DAILY_LIMIT` 与磁盘策略人工处理（生成图不进 Git）。

## 11. 社区 Web UI 与自建服务的差异

`tannic666/gpt-image-2-webui`（MIT，Docker 镜像约 138 MB）实测可以接同一个上游，适合**人工试 prompt**；自建服务适合**被程序调用**。两者不是替代关系：

| 能力 | 自建服务 | 社区 Web UI |
| --- | --- | --- |
| 文生图 / 参考图编辑 | ✅ `/v1/images`、`/v1/images/generations` | ✅ 界面操作、蒙版编辑、批量 |
| 给外部 agent 的标准协议 | ✅ OpenAI 兼容路径 | ❌ 页面 + 自己的 `/api/images`，需自建鉴权 |
| 服务状态 / 用量 | ✅ `/healthz`、`/api/state`、管理页 | 界面内显示本次耗时与估算成本，无服务级指标 |
| 已生成图片浏览 | ✅ 管理页 + `/api/images` | ✅ 历史列表、详情、下载（默认 3 天自动清理） |
| 鉴权 | Bearer token（`IMAGE_SERVICE_TOKEN`） | `APP_PASSWORD`（请求体里带 sha256 密码） |
| 并发 / 队列 / 每日上限 | ✅ 并发上限、有界队列、每日上限 | 无服务端配额，只有前端逐次调用 |
| 参数与结果留痕 | ✅ sidecar：prompt、真实尺寸、sha256、usage | 历史在浏览器 localStorage，图片在服务端 3 天 |
| 体积 | 326 MB 镜像、零依赖 | 138 MB 镜像（Next.js） |
| 适合 | 被脚本、agent、其他服务调用 | 人坐下来试 prompt、挑图 |

如果只是偶尔挑图，直接用社区 UI；要接入自动化流程，用本服务。两者可以同时跑，共用同一个上游 key。


```sh
npm run test:image-service                     # 假上游，不花钱
IMAGE_SERVICE_TOKEN=... node image-service/server.mjs &
IMAGE_SERVICE_TOKEN=... npm run image:gen -- "一张暖白纸面上的化验单静物，无文字"
ls artifacts/imagegen                          # PNG + .json + .usage.json
```
