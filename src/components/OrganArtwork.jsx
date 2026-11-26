import React, { useState } from "react";
import { ZoomIn } from "lucide-react";
import { artworks, ARTWORK_CREDIT } from "../services/artworks";
import FigureLightbox from "./FigureLightbox";

export default function OrganArtwork({ id }) {
  const [zoomed, setZoomed] = useState(false);
  const artwork = artworks[id];
  if (!artwork) return null;

  return (
    <>
      <figure className={`organ-artwork organ-artwork-${id}`}>
        <div className="organ-artwork-stage">
          <span className="organ-artwork-kicker">器官结构示意</span>
          <button
            type="button"
            className="figure-zoom-trigger"
            aria-label={`放大查看${artwork.name}插图`}
            onClick={() => setZoomed(true)}
          >
            <img
              className={artwork.className || ""}
              src={artwork.src}
              alt={`${artwork.name}${artwork.detail}3D 医学概念插图`}
              width={artwork.width}
              height={artwork.height}
              decoding="async"
            />
            <span className="figure-zoom-badge" aria-hidden="true">
              <ZoomIn size={13} />
              放大
            </span>
          </button>
          <span className="organ-artwork-detail">{artwork.detail}</span>
        </div>
        <figcaption>
          <span>{artwork.name}概念示意 · 非真实解剖比例</span>
          <small>插图：{ARTWORK_CREDIT}</small>
        </figcaption>
      </figure>
      <FigureLightbox
        figure={
          zoomed
            ? {
                src: artwork.src,
                alt: `${artwork.name}${artwork.detail}3D 医学概念插图`,
                caption: `${artwork.name}（${artwork.detail}）· 概念示意，非真实解剖比例`,
                credit: `插图：${ARTWORK_CREDIT}`,
              }
            : null
        }
        onClose={() => setZoomed(false)}
      />
    </>
  );
}
