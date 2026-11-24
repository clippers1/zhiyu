# 内部图片生成服务

一个约 400 行的零依赖 Node 服务，把 OpenAI 兼容的 `/v1/images/generations` 与 `/v1/images/edits` 包成内部 HTTP 接口，并把每张图连同元数据落到磁盘。

它**只绑定 `127.0.0.1`**（`compose.yaml` 的 `imagegen` 服务已固定），不经过 nginx，浏览器与公网都无法直接访问。上游密钥只存在于服务进程的环境变量里。

## 为什么需要它

- 单张图要 15–60 秒，需要超时、并发上限和队列，否则会把上游打爆或让调用方挂死；
- 密钥不能进浏览器、不能进 Git；
- 生成结果不可复现（没有 seed），所以必须**保存文件本身**，重跑不等于重放；
- 每张图都要留下 prompt、真实尺寸、sha256 与 token 用量，便于对账与追溯。

## 启动

```sh
IMAGE_SERVICE_TOKEN=dev-token \
IMAGE_API_BASE=https://clippers.anron.fun/v1 \
IMAGE_API_KEY=sk-... \
IMAGE_OUTPUT_DIR=artifacts/imagegen \
IMAGE_PORT=3120 \
node image-service/server.mjs
```

没有 `IMAGE_SERVICE_TOKEN` 会直接退出；输出目录不可写也会在启动时报错并说明原因。未填 `IMAGE_API_BASE` / `IMAGE_API_KEY` 时服务仍可启动（`/healthz` 返回 `configured:false`、可读取旧图），但生成请求返回 503。

### 容器

```sh
docker compose --env-file .env build imagegen
docker compose --env-file .env up -d imagegen
curl -s 127.0.0.1:3120/healthz
```

输出目录挂载到仓库的 `artifacts/imagegen`（已被 `.gitignore` 忽略）。容器以 `node` 用户写盘，若宿主机目录权限不符，启动日志会直接给出路径与原因。

## 接口

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| GET | `/` 或 `/admin` | 页面内输入 token | 状态与产物页面：健康、用量、已生成图片列表与预览 |
| GET | `/healthz` | 否 | 模型、是否已配置、当前并发/排队、当日用量、最近生成时间 |
| POST | `/v1/images` | Bearer | 生成或基于参考图改写（本服务自己的简化协议） |
| POST | `/v1/images/generations` | Bearer | 同一操作的 OpenAI 标准路径，返回 `created` + `data[]`，供外部 agent / SDK 直接接入 |
| GET | `/api/state` | Bearer | 管理页用的状态视图：health + usage + 已存张数 |
| GET | `/api/images?limit=&before=` | Bearer | 已生成图片分页（新的在前），含 prompt、尺寸、用量 |
| GET | `/files/<file>` | 否 | 读取已生成的图（仅限输出目录内的图片名） |
| GET | `/usage` | Bearer | 当日次数、累计张数与字节数、每日上限、是否开放 CORS |

请求体：

```jsonc
{
  "prompt": "一张暖白纸面上的化验单静物，无文字",
  "size": "1024x1280",            // 可选；代理可能吸附到自己的档位
  "quality": "high",              // 可选；当前代理会忽略并回显真实值
  "background": "transparent",    // 可选；返回真正的 RGBA PNG
  "count": 1,                     // 1–4
  "reference": "20261103-1200-abcd1234.png"  // 可选；走 edits，保持版式
}
```

响应同时包含两种形状，`images` 给本仓库的 CLI，`data` 给按 OpenAI 协议写的客户端：

```jsonc
{
  "created": 1794475612,
  "model": "gpt-image-2.6",
  "images": [{ "file": "20261103-1200-abcd1234.png", "url": "/files/...", "prompt": "...", "width": 1122, "height": 1402, "bytes": 1830000, "sha256": "...", "usage": {...} }],
  "data":   [{ "url": "/files/...", "revised_prompt": "..." }],
  "usage": { "input_tokens": 53, "output_tokens": 472, "total_tokens": 525 },
  "requested": { "size": "1024x1280", "quality": "high", "count": 1 }
}
```

`/v1/images/generations` 接受 OpenAI 的 `n`（等同本服务的 `count`）与 `response_format`（`url` 或 `b64_json`），并忽略本服务不支持的字段。

每张图旁边写一个 `<file>.json` sidecar：prompt、model、请求参数、上游回显参数、真实宽高、字节数、sha256、token 用量、创建时间、参考图（如有）。

## 错误码

| 状态 | error | 含义 |
| --- | --- | --- |
| 400 | `invalid_prompt` / `invalid_count` / `invalid_size` / `invalid_quality` / `invalid_background` / `invalid_json` / `invalid_reference` | 请求不合法，**未调用上游、不扣费** |
| 401 | `unauthorized` | Bearer token 不匹配 |
| 404 | `reference_not_found` / `not_found` | 参考图不在输出目录，或路径不支持 |
| 413 | `too_large` | 请求体超过 64 KB |
| 415 | `json_required` | 不是 `application/json` |
| 429 | `busy` | 并发与队列都满，`Retry-After: 30` |
| 429 | `daily_limit_reached` | 当日张数达到 `IMAGE_DAILY_LIMIT` |
| 502 | `upstream_failed` / `upstream_rejected` | 上游失败；4xx 不重试，避免重复扣费 |
| 504 | `upstream_timeout` | 超过 `IMAGE_TIMEOUT_MS` |

## 对外提供服务（可选）

内部调用继续用 `http://127.0.0.1:3120`。如果要让外部 agent 通过一个域名调用：

1. 设置 `IMAGE_PUBLIC_ORIGIN=https://img.example.com`，响应里的图片 URL 会变成绝对地址。
2. 只有还需要浏览器直接调用时才设置 `IMAGE_ALLOW_BROWSER=true`；此时只对该 origin 发 CORS 头，`OPTIONS` 预检返回 204，其他来源拿不到 `Access-Control-Allow-Origin`。
3. 反向代理把该域名转发到 `127.0.0.1:3120`，并保留 `Authorization` 头。**不要**把 `/`（管理页）也暴露到公网，或者至少确认 token 足够强——管理页本身就是给 token 持有者看的。
4. 服务在每日上限、并发与队列上对外部调用一视同仁。

## 状态与产物

- 健康：`curl 127.0.0.1:3120/healthz`。
- 浏览器：打开 `http://127.0.0.1:3120/`（或通过 SSH 隧道），输入 `IMAGE_SERVICE_TOKEN`，可以看到运行状态、当日张数与字节、已生成图片的缩略图、prompt、真实尺寸、token 用量，点开可看原图。
- 命令行：`curl -H "Authorization: Bearer $TOKEN" 127.0.0.1:3120/api/state`，或 `npm run image:gen -- --json`。
- 文件：`artifacts/imagegen/<时间戳>-<随机>.png` 与同名 `.json`；`.usage.json` 记录当日计数。管理页直接读这些文件，不做额外数据库。

## 环境变量

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `IMAGE_SERVICE_TOKEN` | 必填 | 调用方 Bearer token |
| `IMAGE_API_BASE` | 必填 | 上游 origin，含 `/v1`，如 `https://clippers.anron.fun/v1` |
| `IMAGE_API_KEY` | 必填 | 上游密钥 |
| `IMAGE_MODEL` | `gpt-image-2.6` | 模型名 |
| `IMAGE_OUTPUT_DIR` | `artifacts/imagegen` | 落盘目录 |
| `IMAGE_PORT` | `3120` | 监听端口 |
| `IMAGE_MAX_CONCURRENCY` | `2` | 同时进行的上游请求数 |
| `IMAGE_MAX_QUEUE` | `8` | 排队上限，满了返回 429 |
| `IMAGE_DAILY_LIMIT` | `200` | 每日张数上限 |
| `IMAGE_TIMEOUT_MS` | `300000` | 单次上游超时 |
| `IMAGE_PUBLIC_ORIGIN` | 空 | 对外 origin；设置后响应里的图片 URL 变为绝对地址 |
| `IMAGE_ALLOW_BROWSER` | `false` | 是否为该 origin 开启 CORS / 预检 |

## 命令行

```sh
npm run image:gen -- "一张暖白纸面上的化验单静物，无文字"
npm run image:gen -- --size 1024x1280 --count 2 "手绘便签风的流程"
npm run image:gen -- --prompt-file prompts/report.txt --json
npm run image:gen -- --reference 20261103-1200-abcd1234.png "改成青灰配色"
```

需要 `IMAGE_SERVICE_TOKEN`（与启动服务时一致）；可选 `IMAGE_SERVICE_URL`，默认 `http://127.0.0.1:3120`。

## 测试

```sh
npm run test:image-service
```

测试注入假的 `fetchImpl`，监听随机端口，输出到临时目录，覆盖鉴权、请求体上限、参数校验、4xx 不重试 / 5xx 重试、并发与队列上限、每日上限、edits 分支、文件读取防穿越与 header 尺寸解析。不会调用真实上游。
