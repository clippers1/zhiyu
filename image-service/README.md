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

没有 `IMAGE_SERVICE_TOKEN` 或 `IMAGE_API_KEY` 会直接退出；输出目录不可写也会在启动时报错并说明原因。

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
| GET | `/healthz` | 否 | 模型、是否已配置、当前并发/排队、当日用量 |
| POST | `/v1/images` | Bearer | 生成或基于参考图改写 |
| GET | `/files/<file>` | 否 | 预览已生成的图（仅限输出目录内的图片名） |
| GET | `/usage` | Bearer | 当日次数、累计张数与字节数、每日上限 |

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

响应：

```jsonc
{
  "model": "gpt-image-2.6",
  "images": [{ "file": "20261103-1200-abcd1234.png", "url": "/files/...", "width": 1122, "height": 1402, "bytes": 1830000, "sha256": "...", "usage": {...} }],
  "usage": { "input_tokens": 53, "output_tokens": 472, "total_tokens": 525 },
  "requested": { "size": "1024x1280", "quality": "high", "count": 1 },
  "returned": { "size": "1122x1402", "quality": "low", "output_format": "png" }
}
```

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
