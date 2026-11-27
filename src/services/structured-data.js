import { GLOSSARY_ITEMS } from "./glossary.js";
import { GUIDE_CONTENT, GUIDE_FAQ } from "./report-guide.js";

function absUrl(origin, path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${origin.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function organizationNode(origin) {
  return {
    "@type": "Organization",
    "@id": `${origin}/#organization`,
    name: "知愈",
    url: origin,
    logo: absUrl(origin, "/favicon.svg"),
  };
}

function breadcrumbNode(origin, items) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: absUrl(origin, item.path),
    })),
  };
}

// Builds valid Schema.org JSON-LD for official public SSR pages.
// Demo and /saved pages return null so unverified or private surfaces never emit SEO schema.
export function buildStructuredData(page, origin) {
  if (!page || page.channel !== "official") return null;
  const baseOrigin = new URL(origin).origin;
  const pageName = page.route?.page;
  if (!pageName || pageName === "saved" || pageName === "not-found") return null;

  const org = organizationNode(baseOrigin);
  const canonical = page.canonical || baseOrigin;

  if (pageName === "map") {
    return {
      "@context": "https://schema.org",
      "@graph": [
        org,
        {
          "@type": "WebSite",
          "@id": `${baseOrigin}/#website`,
          url: baseOrigin,
          name: "知愈 · 让健康变得好懂",
          description: "面向普通读者的中文健康科普与体检报告读懂知识站，提供权威溯源图文、互动图解与 3D 器官模型。",
          inLanguage: "zh-CN",
          publisher: { "@id": `${baseOrigin}/#organization` },
          potentialAction: {
            "@type": "SearchAction",
            target: `${baseOrigin}/indicators?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        },
      ],
    };
  }

  if (pageName === "guide") {
    const graph = [
      org,
      breadcrumbNode(baseOrigin, [
        { name: "读体检单", path: "/" },
        { name: "单子怎么读", path: "/guide" },
      ]),
      {
        "@type": "MedicalWebPage",
        url: canonical,
        name: "单子怎么读 · 知愈",
        headline: "先看卡片上这一行：看懂化验单的四列结构与参考区间",
        description: "解释检验报告单上的项目名、结果、单位与参考区间分别是什么意思，不解读个人具体数值。",
        inLanguage: "zh-CN",
        dateModified: GUIDE_CONTENT.updatedAt,
        image: absUrl(baseOrigin, "/media/fig-report-guide.webp"),
        audience: { "@type": "PeopleAudience", audienceType: "一般成年读者" },
        citation: GUIDE_CONTENT.references.map((r) => r.url),
        publisher: { "@id": `${baseOrigin}/#organization` },
      },
      {
        "@type": "FAQPage",
        mainEntity: GUIDE_FAQ.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
    ];
    return { "@context": "https://schema.org", "@graph": graph };
  }

  if (pageName === "glossary") {
    return {
      "@context": "https://schema.org",
      "@graph": [
        org,
        breadcrumbNode(baseOrigin, [
          { name: "读体检单", path: "/" },
          { name: "体检英文缩写 A–Z 词典", path: "/glossary" },
        ]),
        {
          "@type": "DefinedTermSet",
          url: canonical,
          name: "知愈体检英文缩写 A–Z 速查词典",
          description: `收录 ${GLOSSARY_ITEMS.length} 条体检报告常见检验与影像英文缩写，提供中文全称、白话观察方向与对应深度专题链接。`,
          inLanguage: "zh-CN",
          publisher: { "@id": `${baseOrigin}/#organization` },
          hasDefinedTerm: GLOSSARY_ITEMS.map((item) => ({
            "@type": "DefinedTerm",
            termCode: item.code,
            name: `${item.code}（${item.zh}）`,
            description: item.summary,
            url: absUrl(baseOrigin, `/article/${item.articleId}`),
          })),
        },
      ],
    };
  }

  if (pageName === "article" && page.detail) {
    const d = page.detail;
    const isStory = d.kind === "story";
    const openingFig = Array.isArray(d.figures) ? d.figures.find((f) => f?.src) : d.figure;
    const reviewedAt = d.review?.reviewedAt || d.sourceCheck?.checkedAt || undefined;
    const graph = [
      org,
      breadcrumbNode(baseOrigin, [
        { name: "读体检单", path: "/" },
        { name: isStory ? "身体与日常" : "体检项目", path: "/indicators" },
        { name: d.title, path: `/article/${d.id}` },
      ]),
      {
        "@type": "MedicalWebPage",
        url: canonical,
        mainEntityOfPage: canonical,
        name: `${d.title} · 知愈`,
        headline: d.question || `认识${d.title}`,
        description: d.questionAnswer || d.subtitle || d.desc,
        inLanguage: "zh-CN",
        ...(d.updatedAt ? { dateModified: d.updatedAt } : {}),
        ...(reviewedAt ? { lastReviewed: String(reviewedAt).slice(0, 10) } : {}),
        ...(openingFig?.src ? { image: absUrl(baseOrigin, openingFig.src) } : {}),
        ...(Array.isArray(d.tags) && d.tags.length ? { keywords: d.tags.join(", ") } : {}),
        audience: { "@type": "PeopleAudience", audienceType: "一般成年读者" },
        citation: (d.references || []).map((r) => r.url).filter(Boolean),
        publisher: { "@id": `${baseOrigin}/#organization` },
      },
    ];
    if (Array.isArray(d.faq) && d.faq.length > 0) {
      graph.push({
        "@type": "FAQPage",
        mainEntity: d.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      });
    }
    return { "@context": "https://schema.org", "@graph": graph };
  }

  if (pageName === "organs" && page.detail) {
    const d = page.detail;
    return {
      "@context": "https://schema.org",
      "@graph": [
        org,
        breadcrumbNode(baseOrigin, [
          { name: "读体检单", path: "/" },
          { name: "认识身体", path: "/organs/heart" },
          { name: d.name || d.title, path: `/organs/${d.id}` },
        ]),
        {
          "@type": "MedicalWebPage",
          url: canonical,
          mainEntityOfPage: canonical,
          name: `${d.name || d.title} · 认识身体 · 知愈`,
          headline: d.headline || d.subtitle || d.name,
          description: d.text || d.desc || d.headline,
          inLanguage: "zh-CN",
          ...(d.updatedAt ? { dateModified: d.updatedAt } : {}),
          image: absUrl(baseOrigin, `/media/organ-${d.id}.webp`),
          audience: { "@type": "PeopleAudience", audienceType: "一般成年读者" },
          citation: (d.references || []).map((r) => r.url).filter(Boolean),
          publisher: { "@id": `${baseOrigin}/#organization` },
        },
      ],
    };
  }

  if (pageName === "indicators" || pageName === "topics") {
    const label = pageName === "indicators" ? "体检项目" : "从体检单开始";
    const path = pageName === "indicators" ? "/indicators" : `/topics${page.route.id ? `/${page.route.id}` : ""}`;
    return {
      "@context": "https://schema.org",
      "@graph": [
        org,
        breadcrumbNode(baseOrigin, [
          { name: "读体检单", path: "/" },
          { name: label, path },
        ]),
        {
          "@type": "CollectionPage",
          url: canonical,
          name: `${label} · 知愈`,
          inLanguage: "zh-CN",
          publisher: { "@id": `${baseOrigin}/#organization` },
        },
      ],
    };
  }

  return null;
}

// Escapes HTML-significant characters so embedded <script type="application/ld+json"> can never break out.
export function serializeJsonLd(data) {
  if (!data) return "";
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
