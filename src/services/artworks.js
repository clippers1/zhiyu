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

// Catalog summaries do not carry organ relations, so the discovery plate uses a
// fixed, reviewable illustration map. Every id below is an organ the article
// itself names; thyroid-function has no matching illustration and falls back to
// the typographic plate.
const indicatorArtworkIds = {
  glucose: "pancreas",
  pressure: "heart",
  lipids: "liver",
  cbc: "heart",
  "liver-function": "liver",
  "kidney-function": "kidney",
  "uric-acid": "kidney",
  "urinalysis": "kidney",
};

// Stories have no organ of their own. Only map one when the illustration is
// literally what the story is about; otherwise the feature stays typographic.
const storyArtworkIds = {
  "stairs-heart": "heart",
};

export const artworkFor = id => artworks[id] || null;
export const indicatorArtwork = item =>
  artworks[indicatorArtworkIds[item?.id] || storyArtworkIds[item?.id]] || null;
