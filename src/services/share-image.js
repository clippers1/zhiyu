import { qrMatrix, wrapCardText } from "./share";

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1440;
export const FAMILY_POSTER_WIDTH = 1080;
export const FAMILY_POSTER_HEIGHT = 1920;
// Canvas does not inherit the page's @font-face stack, so name the bundled
// CJK font first and make sure both weights are decoded before drawing.
const font = '-apple-system, BlinkMacSystemFont, "PingFang SC", "HarmonyOS Sans SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';

export async function drawShareCard(model) {
  if (document.fonts?.ready) {
    await document.fonts.ready.catch(() => {});
  }
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH; canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("当前浏览器无法生成图片，请使用页面上的链接分享。");
  function text(value, x, y, size, color = "#0f172a", weight = 400) {
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.fillStyle = color;
    ctx.fillText(wrapCardText(value, str => ctx.measureText(str).width, 1000 - x, 1)[0] || "", x, y);
  }
  function lines(value, y, size, count, width = 920, color = "#0f172a", weight = 400) {
    ctx.font = `${weight} ${size}px ${font}`;
    wrapCardText(value, str => ctx.measureText(str).width, width, count).forEach((line, index) => text(line, 80, y + index * size * 1.45, size, color, weight));
  }
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.fillStyle = "#0f766e"; ctx.fillRect(0, 0, CARD_WIDTH, 18);
  text("知愈", 80, 132, 64, "#0f172a", 700);
  text("让健康变得好懂", 254, 126, 28, "#64748b");
  text(model.kindLabel, 80, 214, 26, "#0f766e", 600);
  text("从一份了解开始", 738, 214, 26, "#64748b");
  ctx.strokeStyle = "#e6ebf2"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(80, 242); ctx.lineTo(1000, 242); ctx.stroke();
  lines(`认识${model.title}`, 354, 76, 3, 920, "#0f172a", 700);
  lines(model.subtitle, 670, 34, 3, 920, "#475569");
  ctx.fillStyle = model.verified ? "#f0fdfa" : "#fffbeb";
  ctx.fillRect(80, 818, 920, 80);
  text(model.status, 104, 869, 30, model.verified ? "#115e59" : "#b45309", 600);
  text(`${model.referenceCount} 份参考资料 · 完整来源见原文`, 80, 950, 28, "#64748b");

  const matrix = qrMatrix(model.url);
  const quiet = 4;
  const cell = Math.floor(268 / (matrix.length + quiet * 2));
  if (cell < 2) throw new Error("分享地址过长，请使用链接分享。");
  const extent = (matrix.length + quiet * 2) * cell;
  const x = 80, y = 1000;
  ctx.fillStyle = "#f6f8fa"; ctx.fillRect(x, y, extent, extent);
  ctx.fillStyle = "#0f172a";
  matrix.forEach((row, r) => row.forEach((dark, c) => { if (dark) ctx.fillRect(x + (c + quiet) * cell, y + (r + quiet) * cell, cell, cell); }));
  text("扫码阅读完整专题", 398, 1055, 36, "#0f172a", 700);
  text("查看依据、适用范围与核对状态", 398, 1110, 28, "#64748b");
  text("以扫码打开的最新内容为准", 398, 1157, 28, "#64748b");
  text(`内容版本 ${model.version} · 整理于 ${model.updatedAt}`, 398, 1215, 22, "#64748b");
  text(`卡片生成于 ${model.generatedAt}`, 398, 1255, 22, "#64748b");
  lines(model.url, 1310, 21, 1, 920, "#64748b");
  text(model.disclaimer, 80, 1388, 25, "#b45309");
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("图片生成失败，请重试或使用链接分享。")), "image/png"));
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function loadImageSafe(src, timeoutMs = 6000) {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = setTimeout(() => resolve(null), timeoutMs);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img.naturalWidth > 0 ? img : null);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

// High-legibility "one-glance family poster" (1080x1920) designed for sharing
// with parents/family in messaging apps: large CJK type, calm reassurance card,
// embedded 3D illustration, 3 plain-language points, and decodable QR footer.
export async function drawFamilyPoster(model) {
  if (document.fonts?.ready) {
    await document.fonts.ready.catch(() => {});
  }
  const figureImg = await loadImageSafe(model.figureSrc);
  const canvas = document.createElement("canvas");
  canvas.width = FAMILY_POSTER_WIDTH;
  canvas.height = FAMILY_POSTER_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("当前浏览器无法生成图片，请使用页面上的链接分享。");

  const pad = 64;
  const contentW = FAMILY_POSTER_WIDTH - pad * 2;

  function drawLine(value, x, y, size, maxWidth, color = "#0f172a", weight = 400) {
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.fillStyle = color;
    const clipped = wrapCardText(value, (s) => ctx.measureText(s).width, maxWidth, 1)[0] || "";
    ctx.fillText(clipped, x, y);
  }

  function drawWrapped(value, x, y, size, maxLines, maxWidth, color = "#0f172a", weight = 400, lineHeight = 1.48) {
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.fillStyle = color;
    const wrapped = wrapCardText(value, (s) => ctx.measureText(s).width, maxWidth, maxLines);
    wrapped.forEach((line, i) => {
      ctx.fillText(line, x, y + i * size * lineHeight);
    });
    return wrapped.length;
  }

  // Soft studio backdrop
  ctx.fillStyle = "#f4f8f8";
  ctx.fillRect(0, 0, FAMILY_POSTER_WIDTH, FAMILY_POSTER_HEIGHT);

  // Top medical-teal header banner
  const grad = ctx.createLinearGradient(0, 0, FAMILY_POSTER_WIDTH, 210);
  grad.addColorStop(0, "#0f766e");
  grad.addColorStop(1, "#115e59");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, FAMILY_POSTER_WIDTH, 200);

  drawLine("知愈 · 给家人的体检小抄", pad, 84, 34, 620, "#ccfbf1", 600);
  drawLine(`${model.kindLabel} · 一图读懂`, pad, 146, 54, 700, "#ffffff", 700);

  // Verification status pill on top right
  const badgeText = model.verified ? "依据权威来源整理" : "Beta 科普整理";
  ctx.font = `600 24px ${font}`;
  const badgeW = Math.min(260, ctx.measureText(badgeText).width + 44);
  roundRect(ctx, FAMILY_POSTER_WIDTH - pad - badgeW, 52, badgeW, 50, 25);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(badgeText, FAMILY_POSTER_WIDTH - pad - badgeW + 22, 86);

  // Main white poster sheet (mathematically spaced with 18–22px gaps, zero overlap)
  let cursorY = 220;

  // Title + optional 3D illustration card
  const heroH = figureImg ? 408 : 190;
  roundRect(ctx, pad, cursorY, contentW, heroH, 28);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#dce8e7";
  ctx.lineWidth = 2;
  ctx.stroke();

  const titleLines = drawWrapped(model.title, pad + 36, cursorY + 66, 52, 2, contentW - 72, "#0f172a", 700, 1.28);
  drawWrapped(
    model.headline !== `看懂${model.title}` ? model.headline : model.subtitle,
    pad + 36,
    cursorY + 66 + titleLines * 60,
    27,
    2,
    contentW - 72,
    "#475569",
    500,
    1.36,
  );

  if (figureImg) {
    const imgBoxY = cursorY + 170;
    const imgBoxH = 216;
    const imgBoxW = contentW - 72;
    roundRect(ctx, pad + 36, imgBoxY, imgBoxW, imgBoxH, 20);
    ctx.fillStyle = "#f6f8fa";
    ctx.fill();
    const scale = Math.min((imgBoxW - 12) / figureImg.naturalWidth, (imgBoxH - 10) / figureImg.naturalHeight);
    const drawW = figureImg.naturalWidth * scale;
    const drawH = figureImg.naturalHeight * scale;
    ctx.drawImage(
      figureImg,
      pad + 36 + (imgBoxW - drawW) / 2,
      imgBoxY + (imgBoxH - drawH) / 2,
      drawW,
      drawH,
    );
  }

  cursorY += heroH + 20;

  // Block 1: Plain-language answer (fits 4 full lines cleanly at 29px)
  const block1H = 256;
  roundRect(ctx, pad, cursorY, contentW, block1H, 24);
  ctx.fillStyle = "#eefaf8";
  ctx.fill();
  ctx.strokeStyle = "#99d5ce";
  ctx.lineWidth = 2;
  ctx.stroke();
  drawLine("01 · 先说大白话", pad + 34, cursorY + 46, 25, 400, "#0f766e", 700);
  drawWrapped(model.answer, pad + 34, cursorY + 92, 29, 4, contentW - 68, "#132a2e", 500, 1.44);
  cursorY += block1H + 18;

  // Block 2: Calm reassurance ("Don't panic / can't diagnose from this alone")
  const block2H = 224;
  roundRect(ctx, pad, cursorY, contentW, block2H, 24);
  ctx.fillStyle = "#fff9ef";
  ctx.fill();
  ctx.strokeStyle = "#f2cfa1";
  ctx.lineWidth = 2;
  ctx.stroke();
  drawLine("02 · 先别急着对号入座", pad + 34, cursorY + 46, 25, 500, "#b45309", 700);
  drawWrapped(model.reassurance, pad + 34, cursorY + 92, 28, 3, contentW - 68, "#452910", 500, 1.46);
  cursorY += block2H + 18;

  // Block 3: Top 3 readable points (ends at 1554, leaving clean 26px gap before footer at 1580)
  const pts = (model.points || []).slice(0, 3);
  const block3H = 390;
  roundRect(ctx, pad, cursorY, contentW, block3H, 24);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#dce8e7";
  ctx.lineWidth = 2;
  ctx.stroke();
  drawLine("03 · 拿到单子重点看这几项", pad + 34, cursorY + 46, 25, 600, "#0f766e", 700);

  pts.forEach((pt, idx) => {
    const py = cursorY + 78 + idx * 98;
    roundRect(ctx, pad + 34, py, 42, 42, 21);
    ctx.fillStyle = "#0f766e";
    ctx.fill();
    drawLine(String(idx + 1), pad + 48, py + 30, 23, 30, "#ffffff", 700);
    drawLine(pt.title, pad + 94, py + 27, 27, contentW - 132, "#0f172a", 700);
    drawWrapped(pt.text, pad + 94, py + 62, 23.5, 2, contentW - 132, "#475569", 400, 1.35);
  });

  // Footer: QR code + sources + disclaimer (pinned cleanly at bottom)
  const footerY = 1580;
  roundRect(ctx, pad, footerY, contentW, 280, 24);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#d5e4e2";
  ctx.lineWidth = 2;
  ctx.stroke();

  const matrix = qrMatrix(model.url);
  const quiet = 4;
  const cell = Math.floor(220 / (matrix.length + quiet * 2));
  if (cell < 2) throw new Error("分享地址过长，请使用链接分享。");
  const extent = (matrix.length + quiet * 2) * cell;
  const qrX = pad + 28;
  const qrY = footerY + 30;
  ctx.fillStyle = "#f6f8fa";
  ctx.fillRect(qrX, qrY, extent, extent);
  ctx.fillStyle = "#0f172a";
  matrix.forEach((row, r) => row.forEach((dark, c) => {
    if (dark) ctx.fillRect(qrX + (c + quiet) * cell, qrY + (r + quiet) * cell, cell, cell);
  }));

  const textX = qrX + extent + 32;
  const rightW = pad + contentW - textX - 24;
  drawLine("长按或扫码看完整互动图解", textX, footerY + 66, 32, rightW, "#0f172a", 700);
  drawLine(`${model.status} · ${model.referenceCount} 份权威参考资料`, textX, footerY + 114, 24, rightW, "#0f766e", 600);
  if (model.publishers?.length) {
    drawLine(`参考机构：${model.publishers.join("、")}`, textX, footerY + 154, 21, rightW, "#64748b", 400);
  }
  drawLine(`版本 ${model.version} · 更新 ${model.updatedAt} · 生成 ${model.generatedAt}`, textX, footerY + 194, 20, rightW, "#64748b", 400);
  drawLine(model.disclaimer, textX, footerY + 240, 23, rightW, "#b45309", 600);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("图片生成失败，请重试或使用链接分享。"))),
      "image/png",
    ),
  );
}
