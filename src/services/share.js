import qrcode from "qrcode-generator";
import { routePath } from "./routes.js";

const plain = (value, max = 300) => Array.from(typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, " ").trim() : "").slice(0, max).join("");
const dateLabel = value => /^\d{4}-\d{2}-\d{2}/.test(String(value || "")) ? String(value).slice(0, 10) : "未标注";
export function shareCardModel(content, origin, generatedAt = new Date()) {
  if (!content || !["indicator", "organ"].includes(content.kind)) throw new Error("暂不支持这类内容的分享卡片。");
  const site = new URL(origin);
  if (!["http:", "https:"].includes(site.protocol)) throw new Error("分享地址不正确。");
  const url = `${site.origin}${routePath(content.kind === "organ" ? "organs" : "article", content.id)}`;
  const title = plain(content.kind === "organ" ? content.name : content.title);
  if (!title || !Array.isArray(content.references)) throw new Error("内容记录不完整，请重新加载。");
  const reviewed = content.reviewStatus === "reviewed" && Boolean(content.review?.name);
  return {
    title, subtitle: plain(content.kind === "organ" ? content.headline : content.subtitle),
    kindLabel: content.kind === "organ" ? "器官科普" : "指标科普", reviewed,
    status: reviewed ? "该版本已完成专业审校" : "Beta 科普 · 待专业审校",
    referenceCount: content.references.length,
    version: plain(String(content.version || "未标注"), 32), updatedAt: dateLabel(content.updatedAt),
    generatedAt: generatedAt.toISOString().slice(0, 10), url,
    disclaimer: "仅用于健康科普，不替代医生诊断与个体化建议。",
    filename: `zhiyu-${content.kind}-${content.id}.png`,
  };
}

export function qrMatrix(url) {
  const qr = qrcode(0, "M");
  qr.addData(url, "Byte");
  qr.make();
  return Array.from({ length: qr.getModuleCount() }, (_, row) => Array.from({ length: qr.getModuleCount() }, (_, col) => qr.isDark(row, col)));
}

// Bounded wrapping prevents a long editorial title from covering the QR or warning.
export function wrapCardText(text, measure, width, maxLines) {
  const chars = Array.from(text);
  const lines = [];
  let line = "";
  for (let i = 0; i < chars.length; i++) {
    if (line && measure(line + chars[i]) > width) {
      lines.push(line);
      line = "";
      if (lines.length === maxLines) {
        let last = lines.pop();
        while (last && measure(last + "…") > width) last = Array.from(last).slice(0, -1).join("");
        return [...lines, last + "…"];
      }
    }
    line += chars[i];
  }
  if (line) lines.push(line);
  return lines;
}
