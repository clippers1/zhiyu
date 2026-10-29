// Shared medical-illustration records. The same files and attribution are used
// by organ pages and by the editorial plate on the discovery page.
export const LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";
export const ARTWORK_CREDIT = "Servier Medical Art by Servier · CC BY 4.0";

export const artworks = {
  heart: {
    name: "心脏",
    src: "/media/heart-servier.png",
    source: "https://smart.servier.com/smart_image/smart-heart/",
    detail: "心脏剖面",
    className: "portrait",
    width: 396,
    height: 801,
  },
  lung: {
    name: "肺",
    src: "/media/lung-servier.png",
    source: "https://smart.servier.com/smart_image/lungs-11/",
    detail: "肺叶与气管",
    width: 408,
    height: 363,
  },
  liver: {
    name: "肝脏",
    src: "/media/liver-servier.png",
    source: "https://smart.servier.com/smart_image/liver/",
    detail: "肝脏外形",
    width: 748,
    height: 587,
  },
  kidney: {
    name: "肾脏",
    src: "/media/kidney-servier.png",
    source: "https://smart.servier.com/smart_image/kidney-overview/",
    detail: "双肾剖面与血管",
    width: 717,
    height: 410,
  },
  pancreas: {
    name: "胰腺",
    src: "/media/pancreas-servier.png",
    source: "https://smart.servier.com/smart_image/pancreas-overview/",
    detail: "胰腺外形",
    className: "landscape",
    width: 936,
    height: 370,
  },
};

// Catalog summaries do not carry organ relations, so organ pages and body rows
// resolve their illustration by id. The discovery page no longer uses this map:
// its lead shows the article's mechanism diagram, because a body-outline plate
// left readers unsure what the home page was for.
export const artworkFor = id => artworks[id] || null;
