import React from "react";
import { artworks, ARTWORK_CREDIT } from "../services/artworks";

export default function OrganArtwork({ id }) {
  const artwork = artworks[id];
  if (!artwork) return null;

  return (
    <figure className={`organ-artwork organ-artwork-${id}`}>
      <div className="organ-artwork-stage">
        <span className="organ-artwork-kicker">器官结构示意</span>
        <img
          className={artwork.className || ""}
          src={artwork.src}
          alt={`${artwork.name}${artwork.detail}3D 医学概念插图`}
          width={artwork.width}
          height={artwork.height}
          decoding="async"
        />
        <span className="organ-artwork-detail">{artwork.detail}</span>
      </div>
      <figcaption>
        <span>{artwork.name}概念示意 · 非真实解剖比例</span>
        <small>插图：{ARTWORK_CREDIT}</small>
      </figcaption>
    </figure>
  );
}
