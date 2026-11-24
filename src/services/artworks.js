// Shared 3D organ illustration records generated via gpt-image-2.6 (transparent WebP).
// Used by organ pages and by the body rail on the home page.
export const ARTWORK_MODEL = "gpt-image-2.6";
export const ARTWORK_CREDIT = `AI 生成插图 · 模型 ${ARTWORK_MODEL}`;

export const artworks = {
  "heart": {
    "name": "心脏",
    "src": "/media/organ-heart.webp",
    "detail": "心脏与大血管",
    "className": "portrait",
    "width": 720,
    "height": 788
  },
  "lung": {
    "name": "肺",
    "src": "/media/organ-lung.webp",
    "detail": "肺叶与气管",
    "width": 720,
    "height": 621
  },
  "liver": {
    "name": "肝脏",
    "src": "/media/organ-liver.webp",
    "detail": "肝脏与胆囊",
    "width": 720,
    "height": 480
  },
  "kidney": {
    "name": "肾脏",
    "src": "/media/organ-kidney.webp",
    "detail": "双肾与血管",
    "width": 720,
    "height": 480
  },
  "pancreas": {
    "name": "胰腺",
    "src": "/media/organ-pancreas.webp",
    "detail": "胰腺外形",
    "className": "landscape",
    "width": 720,
    "height": 360
  }
};

export const artworkFor = id => artworks[id] || null;
