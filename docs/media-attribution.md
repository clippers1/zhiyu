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
| 血糖（`indicator/glucose`） | `public/media/pancreas-servier.png` | 胰腺外形示意，配合「胰岛素帮助身体利用葡萄糖」的正文（来源编号 `insulin`），不显示胰岛细节或疾病 | 同上，CC BY 4.0，页面图下署名 |

## 自制示意图

以下示意图由知愈自行绘制，以 React 内联 SVG 渲染（`src/components/Diagrams.jsx`），不使用任何第三方素材，因此不涉及外部授权；页面图注统一标注「知愈自制示意图」，每张图都写明简化边界并引用本文已有来源编号。

| 图解标识 | 用于 | 内容 |
| --- | --- | --- |
| `glucose-flow` | 血糖 | 碳水化合物 → 葡萄糖进入血液 → 胰岛素信号 → 细胞摄取 / 肝脏储存 |
| `glucose-windows` | 血糖 | 空腹、口服葡萄糖耐量试验与糖化血红蛋白覆盖的时间范围 |
| `stairs-heart` | 爬楼与心率（故事） | 腿部肌肉需求 → 心脏加快 → 肺补充氧气 → 送回肌肉 |
| `pressure-pulse` | 血压 | 一次搏动周期里收缩压与舒张压的位置 |
| `lipid-transport` | 血脂 | LDL 运出、HDL 运回、甘油三酯作为储能形式 |
| `lab-range` | 参考区间（故事） | 同一份样本 → 两套检测方法 → 各自的参考区间 |

自制示意图不是按真实比例绘制的解剖图，也不替代医学影像或检验结果；修改图形时仍需重新核对事实与简化说明。第三方图片与自制示意图的判断标准一致：未核对权利或与当前发布版本不一致的素材不会进入发布快照，无图时页面保持纯文字，不占位。
