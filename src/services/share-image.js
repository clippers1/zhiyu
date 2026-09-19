import { qrMatrix, wrapCardText } from "./share";

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1440;
const font = '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';

export async function drawShareCard(model) {
  if (document.fonts?.ready) await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH; canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("当前浏览器无法生成图片，请使用页面上的链接分享。");
  function text(value, x, y, size, color = "#284b3b", weight = 400) {
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.fillStyle = color;
    ctx.fillText(wrapCardText(value, str => ctx.measureText(str).width, 1000 - x, 1)[0] || "", x, y);
  }
  function lines(value, y, size, count, width = 920, color = "#284b3b", weight = 400) {
    ctx.font = `${weight} ${size}px ${font}`;
    wrapCardText(value, str => ctx.measureText(str).width, width, count).forEach((line, index) => text(line, 80, y + index * size * 1.45, size, color, weight));
  }
  ctx.fillStyle = "#f7f8f0"; ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.fillStyle = "#284b3b"; ctx.fillRect(0, 0, CARD_WIDTH, 18);
  text("知愈", 80, 132, 64, "#284b3b", 600);
  text("让健康变得好懂", 254, 126, 28, "#60725f");
  text(model.kindLabel, 80, 214, 26, "#60725f");
  text("从一份了解开始", 738, 214, 26, "#60725f");
  ctx.strokeStyle = "#d7e1cf"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(80, 242); ctx.lineTo(1000, 242); ctx.stroke();
  lines(`认识${model.title}`, 354, 76, 3, 920, "#284b3b", 600);
  lines(model.subtitle, 670, 34, 3, 920, "#60725f");
  ctx.fillStyle = model.verified ? "#e5eedf" : "#f3e8cf";
  ctx.fillRect(80, 818, 920, 80);
  text(model.status, 104, 869, 30, model.verified ? "#355638" : "#745c29", 600);
  text(`${model.referenceCount} 份参考资料 · 完整来源见原文`, 80, 950, 28, "#60725f");

  const matrix = qrMatrix(model.url);
  const quiet = 4;
  const cell = Math.floor(268 / (matrix.length + quiet * 2));
  if (cell < 2) throw new Error("分享地址过长，请使用链接分享。");
  const extent = (matrix.length + quiet * 2) * cell;
  const x = 80, y = 1000;
  ctx.fillStyle = "#ffffff"; ctx.fillRect(x, y, extent, extent);
  ctx.fillStyle = "#132d23";
  matrix.forEach((row, r) => row.forEach((dark, c) => { if (dark) ctx.fillRect(x + (c + quiet) * cell, y + (r + quiet) * cell, cell, cell); }));
  text("扫码阅读完整专题", 398, 1055, 36, "#284b3b", 600);
  text("查看依据、适用范围与核对状态", 398, 1110, 28, "#60725f");
  text("以扫码打开的最新内容为准", 398, 1157, 28, "#60725f");
  text(`内容版本 ${model.version} · 整理于 ${model.updatedAt}`, 398, 1215, 22, "#60725f");
  text(`卡片生成于 ${model.generatedAt}`, 398, 1255, 22, "#60725f");
  lines(model.url, 1310, 21, 1, 920, "#60725f");
  text(model.disclaimer, 80, 1388, 25, "#745c29");
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("图片生成失败，请重试或使用链接分享。")), "image/png"));
}
