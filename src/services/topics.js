import { routePath } from "./routes.js";

// Navigation only: relationships and titles come from the published content,
// not a new medical knowledge map or an inferred diagnosis.
export function readingRoute(detail, availableOrgans = []) {
  if (!detail || detail.kind !== "indicator") return [];
  const related = new Set((detail.relatedOrgans || []).map(item => item.id));
  const seen = new Set();
  const organs = availableOrgans.filter(item => {
    if (item.kind !== "organ" || !related.has(item.id) || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  return [
    { key: "concept", title: `先认识${detail.title}`, description: "了解概念、指标说明和阅读提示。", href: routePath("article", detail.id), trust: detail },
    ...organs.map(item => ({ key: `organ-${item.id}`, title: `一起了解${item.title}`, description: "阅读专题中已有的器官关联，认识它的基本功能。", href: routePath("organs", item.id), trust: item })),
    { key: "sources", title: "最后核对来源", description: "查看参考原文、适用范围、内容版本与核对状态。", href: `${routePath("article", detail.id)}#article-source-panel`, trust: detail },
  ];
}
