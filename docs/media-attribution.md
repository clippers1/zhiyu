# 医学插图来源与授权

项目中的器官医学插图来自 [Servier Medical Art by Servier](https://smart.servier.com/)，依据 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 使用。页面会在相应图片附近显示作者、来源链接和授权链接。

| 本地文件 | 内容 | 官方来源 |
| --- | --- | --- |
| `public/media/heart-servier.png` | 心脏剖面 | [Heart](https://smart.servier.com/smart_image/smart-heart/) |
| `public/media/lung-servier.png` | 肺与气管 | [Lungs](https://smart.servier.com/smart_image/lungs-11/) |
| `public/media/alveoli-servier.png` | 肺泡与毛细血管 | [Intrapulmonary airways](https://smart.servier.com/smart_image/intrapulmonary-airways-lungs/) |
| `public/media/liver-servier.png` | 肝脏 | [Liver](https://smart.servier.com/smart_image/liver/) |
| `public/media/kidney-servier.png` | 双肾剖面与血管 | [Kidney](https://smart.servier.com/smart_image/kidney-overview/) |
| `public/media/pancreas-servier.png` | 胰腺 | [Pancreas](https://smart.servier.com/smart_image/pancreas-overview/) |

图片授权与项目源代码许可证相互独立。转载、修改或重新分发图片时，仍须遵守 CC BY 4.0 的署名要求，不应移除页面或本文件中的归属信息。

## 指标详情页图解使用记录

| 内容 | 本地文件 | 页面用途 | 权利说明 |
| --- | --- | --- | --- |
| 血糖（`indicator/glucose`） | `public/media/pancreas-servier.png` | 器官页与身体行的胰腺插图（`src/services/artworks.js`）；首页主推与正文机制均由自制示意图 `glucose-flow` 说明，不再使用器官外形 | 同上，CC BY 4.0，页面图下署名 |

## 自制示意图

以下示意图由知愈自行绘制，以 React 内联 SVG 渲染（`src/components/Diagrams.jsx`，手绘线条由 `src/components/Sketch.jsx` 用 rough.js 生成），不使用任何第三方素材，因此不涉及外部授权；页面图注统一标注「知愈自制示意图」，每张图都写明简化边界并引用本文已有来源编号。

图内标题使用得意黑（Smiley Sans，SIL Open Font License 1.1）作为展示字体。仓库只在 `assets/fonts/` 保存原始字体文件，构建时由 `npm run fonts:build` 把页面真正用到的字符裁成约 50 KB 的 `public/fonts/smiley-sans.woff2`；正文字体不受影响。

| 图解标识 | 用于 | 内容 |
| --- | --- | --- |
| `glucose-flow` | 血糖 | 碳水化合物 → 葡萄糖进入血液 → 胰岛素信号 → 细胞摄取 / 肝脏储存 |
| `glucose-windows` | 血糖 | 空腹、口服葡萄糖耐量试验与糖化血红蛋白覆盖的时间范围 |
| `stairs-heart` | 爬楼与心率（故事） | 腿部肌肉需求 → 心脏加快 → 肺补充氧气 → 送回肌肉 |
| `pressure-pulse` | 血压 | 一次搏动周期里收缩压与舒张压的位置 |
| `lipid-transport` | 血脂 | LDL 运出、HDL 运回、甘油三酯作为储能形式 |
| `lab-range` | 参考区间（故事） | 同一份样本 → 两套检测方法 → 各自的参考区间 |
| `cbc-components` | 血常规 | 一份血样 → 红细胞 / 白细胞 / 血小板三组分别计数 |
| `liver-tests` | 肝功能 | 一份血样 → 蛋白质、酶、胆红素三类项目 |
| `kidney-filter` | 肾功能 | 血液流经肾小球 → 血肌酐与 eGFR；尿液一侧的尿白蛋白肌酐比 |
| `uric-acid-path` | 尿酸 | 嘌呤分解 → 尿酸入血 → 肾脏过滤 → 随尿排出；生成与排出两端 |
| `thyroid-axis` | 甲状腺功能 | 垂体释放 TSH → 甲状腺产生 T4 / T3 → 激素水平反馈影响 TSH |
| `urinalysis-layers` | 尿常规 | 同一份尿样 → 外观 / 试纸化学 / 显微镜三个层面 |
| `report-anatomy` | 单子怎么读 | 检验报告单的列结构：项目名 / 结果 / 单位 / 参考区间，四列编号对应页面图例 |

自制示意图不是按真实比例绘制的解剖图，也不替代医学影像或检验结果；修改图形时仍需重新核对事实与简化说明。第三方图片与自制示意图的判断标准一致：未核对权利或与当前发布版本不一致的素材不会进入发布快照，无图时页面保持纯文字，不占位。

## 3D 解剖网格模型（Three.js 互动视图）

3D 透明人体位置透视（`BodyMap3D`）及心脏、肺、肾脏、甲状腺 3D 互动沙盘（`OrganScene3D`）使用的真实成人参考解剖三维网格来自美国国立卫生研究院 [NIH HuBMAP Human Reference Atlas (HRA)](https://humanatlas.io/)，依据 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 使用。原始科研 `.glb` 资产通过 `scripts/prepare-3d-models.mjs` 进行网格合并、减面、平滑法线重建及 Meshopt 几何压缩后存于 `public/media/models/`，页面在 3D 视口下方直接展示来源与授权链接。

| 本地文件 | 解剖内容 | 官方来源（NIH HuBMAP HRA） |
| --- | --- | --- |
| `public/media/models/torso.glb` | 上半身躯干透明轮廓（裁自标准成人皮肤外壳） | [skin-male v1.4](https://cdn.humanatlas.io/digital-objects/ref-organ/skin-male/v1.4/assets/3d-vh-m-skin.glb) |
| `public/media/models/heart.glb` | 心脏四腔室（右心房、右心室、左心房、左心室） | [heart-male v1.3](https://cdn.humanatlas.io/digital-objects/ref-organ/heart-male/v1.3/assets/3d-vh-m-heart.glb) |
| `public/media/models/lung.glb` | 双肺外叶与内部支气管树 | [lung-male v1.4](https://cdn.humanatlas.io/digital-objects/ref-organ/lung-male/v1.4/assets/3d-vh-m-lung.glb) |
| `public/media/models/liver.glb` | 肝脏左右叶 | [liver-male v1.2](https://cdn.humanatlas.io/digital-objects/ref-organ/liver-male/v1.2/assets/3d-vh-m-liver.glb) |
| `public/media/models/pancreas.glb` | 胰腺头、体、尾部 | [pancreas-male v1.3](https://cdn.humanatlas.io/digital-objects/ref-organ/pancreas-male/v1.3/assets/3d-vh-m-pancreas.glb) |
| `public/media/models/kidneys.glb` | 腹膜后双侧肾脏 | [kidney-male-left v1.3](https://cdn.humanatlas.io/digital-objects/ref-organ/kidney-male-left/v1.3/assets/3d-vh-m-kidney-l.glb) · [kidney-male-right v1.3](https://cdn.humanatlas.io/digital-objects/ref-organ/kidney-male-right/v1.3/assets/3d-vh-m-kidney-r.glb) |
| `public/media/models/trachea.glb` | 气管与喉软骨（甲状腺与气道位置锚点） | [trachea-male v1.1](https://cdn.humanatlas.io/digital-objects/ref-organ/trachea-male/v1.1/assets/3d-vh-m-trachea.glb) · [larynx-male v1.1](https://cdn.humanatlas.io/digital-objects/ref-organ/larynx-male/v1.1/assets/3d-vh-m-larynx.glb) |

注：甲状腺腺体及文章内概念微结构切片（肺结节磨玻璃密度、骨小梁微结构、颈动脉管壁剖面）为知愈基于 Three.js 自行构建的程序化科普三维模型，不涉及第三方版权素材。
