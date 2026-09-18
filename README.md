# 知愈 · 让健康变得好懂

一个中文健康科普交互原型，使用 React + Vite 构建。

## 本地运行

```sh
npm install
npm run dev
```

## 构建

```sh
npm run build
```

包含健康地图、血糖/血压/血脂指标百科、五个器官的互动示意图、关键词搜索、入门导览和浏览器本地收藏。图形均由 SVG/CSS 绘制，支持移动端及减少动态效果偏好。

内容为一般健康教育，附 ADA、WHO、AHA 参考入口；尚未提供个人报告上传、OCR、诊断或个体化治疗建议。正式上线前应由有资质的医疗专业人员审校内容。

## 交互验证

启动本地开发服务（5173 端口），安装 Playwright Chromium 后运行：

```sh
npx playwright install chromium
node scripts/smoke.mjs
```

可通过 `PLAYWRIGHT_CHROMIUM_EXECUTABLE` 环境变量指定现有浏览器。脚本检查搜索、收藏持久化、器官点击、入门导览、移动端菜单与横向溢出，并将页面截图保存到 `artifacts/`。
