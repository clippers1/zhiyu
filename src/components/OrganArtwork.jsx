import React from "react";

const LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";

const artworks = {
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

export default function OrganArtwork({ id }) {
  const artwork = artworks[id];
  if (!artwork) return null;

  return <figure className={`organ-artwork organ-artwork-${id}`}>
    <div className="organ-artwork-stage">
      <span className="organ-artwork-kicker">医学结构图</span>
      <img
        className={artwork.className || ""}
        src={artwork.src}
        alt={`${artwork.name}${artwork.detail}医学插图`}
        width={artwork.width}
        height={artwork.height}
        decoding="async"
      />
      <span className="organ-artwork-detail">{artwork.detail}</span>
    </div>
    <figcaption>
      <span>{artwork.name}结构示意 · 非真实比例</span>
      <small>
        插图：<a href={artwork.source} target="_blank" rel="noreferrer">Servier Medical Art by Servier</a>
        {" · "}<a href={LICENSE_URL} target="_blank" rel="noreferrer">CC BY 4.0</a>
      </small>
    </figcaption>
  </figure>;
}
