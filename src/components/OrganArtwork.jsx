import React from "react";
import { artworks, LICENSE_URL } from "../services/artworks";

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
