import qrcode from "qrcode-generator";
import { routePath } from "./routes.js";
import { contentTrust } from "./content-status.js";

const plain = (value, max = 300) => Array.from(typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, " ").trim() : "").slice(0, max).join("");
const dateLabel = value => /^\d{4}-\d{2}-\d{2}/.test(String(value || "")) ? String(value).slice(0, 10) : "未标注";
export function shareCardModel(content, origin, generatedAt = new Date()) {
  if (!content || !["indicator", "organ", "story"].includes(content.kind)) throw new Error("暂不支持这类内容的分享卡片。");
  const site = new URL(origin);
  if (!["http:", "https:"].includes(site.protocol)) throw new Error("分享地址不正确。");
  const url = `${site.origin}${routePath(content.kind === "organ" ? "organs" : "article", content.id)}`;
  const title = plain(content.kind === "organ" ? content.name : content.title);
  if (!title || !Array.isArray(content.references)) throw new Error("内容记录不完整，请重新加载。");
  const trust = contentTrust(content);
  const reviewed = trust.kind === "reviewed";
  return {
    title, subtitle: plain(content.kind === "organ" ? content.headline : content.subtitle),
    kindLabel: content.kind === "organ" ? "器官科普" : content.kind === "story" ? "身体与日常" : "指标科普",
    reviewed, verified: trust.trusted,
    status: trust.label,
    referenceCount: content.references.length,
    version: plain(String(content.version || "未标注"), 32), updatedAt: dateLabel(content.updatedAt),
    generatedAt: generatedAt.toISOString().slice(0, 10), url,
    disclaimer: "仅用于健康科普，不替代医生诊断与个体化建议。",
    filename: `zhiyu-${content.kind}-${content.id}.png`,
  };
}

// Family-friendly "one-glance poster" model derived strictly from verified public
// content fields — larger typography, calm reassurance, and top 3 takeaways for parents.
export function familyPosterModel(content, origin, generatedAt = new Date()) {
  const base = shareCardModel(content, origin, generatedAt);
  const openingFigure = Array.isArray(content.figures)
    ? content.figures.find((fig) => fig?.src && fig?.attribution?.kind !== "third-party")
    : null;
  const organSrc = content.kind === "organ" && /^[a-z0-9-]+$/.test(String(content.id || ""))
    ? `/media/organ-${content.id}.webp`
    : "";
  const figureSrc = openingFigure?.src || organSrc || "";

  const answer = plain(
    content.questionAnswer || (content.kind === "organ" ? content.text : content.desc) || base.subtitle,
    180,
  );
  const reassurance = plain(
    content.tip ||
      (content.kind === "story"
        ? "单次体检数字容易受近期作息、饮食、情绪和医院检测方法影响，不必单凭一个箭头过度紧张。"
        : "认识器官功能有助于看懂体检报告，不能用来自行判断疾病或替代医生面诊。"),
    160,
  );

  let points = [];
  if (Array.isArray(content.metrics) && content.metrics.length) {
    points = content.metrics.slice(0, 3).map((m) => ({
      title: plain(m.name, 40),
      text: plain(m.text, 84),
    }));
  } else if (Array.isArray(content.sections) && content.sections.length) {
    points = content.sections.slice(0, 3).map((s) => ({
      title: plain(s.short || s.title, 40),
      text: plain(s.paragraphs?.[0]?.text || "", 84),
    }));
  } else if (Array.isArray(content.chain) && content.chain.length) {
    points = content.chain.slice(0, 3).map((step, i) => ({
      title: `第 ${i + 1} 步`,
      text: plain(step, 84),
    }));
  }

  const publishers = Array.from(
    new Set(
      (content.references || [])
        .map((r) => plain(r?.publisher || "", 40))
        .filter(Boolean),
    ),
  ).slice(0, 2);

  return {
    ...base,
    variant: "family",
    headline: plain(content.question || `看懂${base.title}`, 64),
    answer,
    reassurance,
    points,
    figureSrc,
    publishers,
    filename: `zhiyu-family-${content.kind}-${content.id}.png`,
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
