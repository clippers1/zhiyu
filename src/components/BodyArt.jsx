import React from "react";
export default function BodyArt({
  selected = "heart",
  onSelect = () => {},
  large = false,
}) {
  const props = (id) => ({
    className: `organ organ-${id} ${selected === id ? "selected" : ""}`,
    onClick: () => onSelect(id),
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(id);
      }
    },
    tabIndex: 0,
    role: "button",
    "aria-label": `了解${{ heart: "心脏", lung: "肺", liver: "肝脏", pancreas: "胰腺", kidney: "肾脏" }[id]}`,
  });
  return (
    <svg
      className={`body-art ${large ? "large" : ""}`}
      viewBox="0 0 440 420"
      aria-label="人体器官互动示意图，位置经过简化"
    >
      <defs>
        <linearGradient id="bodyFill" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#e4eeea" />
          <stop offset="1" stopColor="#cbded5" />
        </linearGradient>
        <linearGradient id="heartFill" x1="0" x2="1" y1="0" y2="1">
          <stop stopColor="#e99a88" />
          <stop offset="1" stopColor="#cd645a" />
        </linearGradient>
        <linearGradient id="lungFill">
          <stop stopColor="#c4cbd9" />
          <stop offset="1" stopColor="#a9b8cb" />
        </linearGradient>
      </defs>
      <circle cx="228" cy="204" r="164" fill="#e6eeE7" opacity=".55" />
      <circle
        cx="228"
        cy="204"
        r="141"
        fill="none"
        stroke="#cfddd1"
        strokeDasharray="3 6"
      />
      <ellipse
        cx="228"
        cy="212"
        rx="195"
        ry="79"
        fill="none"
        stroke="#d4dfd2"
        transform="rotate(-34 228 212)"
      />
      <path
        d="M205 103 L204 124 Q193 133 166 138 Q146 142 140 166 L112 254 Q108 265 120 270 Q133 275 139 260 L164 202 L164 270 Q171 296 166 320 L157 390 L211 390 L227 325 L242 390 L295 390 L286 320 Q281 296 288 270 L289 202 L314 260 Q320 275 333 270 Q345 265 341 254 L313 166 Q307 142 288 138 Q260 133 250 124 L250 103"
        fill="url(#bodyFill)"
        stroke="#b5ccbf"
        strokeWidth="1.5"
      />
      <path
        d="M199 62 Q202 35 227 35 Q253 35 256 62 L255 83 Q252 111 227 116 Q203 111 200 86Z"
        fill="url(#bodyFill)"
        stroke="#b5ccbf"
        strokeWidth="1.5"
      />
      <path
        d="M227 126 L227 180 M212 142 L227 159 L242 142"
        stroke="#91b8a6"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <g
        {...props("lung")}
        fill="url(#lungFill)"
        stroke="#98a9be"
        strokeWidth="1.2"
      >
        <path d="M214 155 Q197 146 183 169 Q171 190 175 219 Q190 228 214 210Z" />
        <path d="M239 155 Q255 146 270 169 Q280 191 277 219 Q264 227 240 210Z" />
        <path
          d="M214 165 L194 186 M202 177 L200 207 M240 165 L261 188 M251 178 L254 207"
          fill="none"
          opacity=".7"
        />
      </g>
      <g fill="none" strokeLinecap="round">
        <path
          d="M228 184 C236 211 221 232 227 276 L217 320 M227 276 L239 320"
          stroke="#d38b81"
          strokeWidth="4"
        />
        <path
          d="M237 180 L237 263 M235 247 L198 263 M236 248 L264 263"
          stroke="#8aaec4"
          strokeWidth="3"
        />
      </g>
      <g {...props("heart")}>
        <path
          className="heart-shape"
          d="M227 183 C216 169 202 183 212 200 L230 220 Q252 204 249 190 Q244 178 234 184 L233 171 L227 170Z"
          fill="url(#heartFill)"
          stroke="#c8756a"
          strokeWidth="1.5"
        />
      </g>
      <g {...props("liver")}>
        <path
          d="M178 230 Q205 218 242 228 L265 234 Q253 249 229 251 L212 246 Q191 261 177 250Z"
          fill="#be8b79"
          stroke="#a77767"
          strokeWidth="1.2"
        />
        <path d="M219 230 L212 246" stroke="#a77767" fill="none" />
      </g>
      <g {...props("pancreas")}>
        <path
          d="M210 259 Q220 250 235 255 Q248 251 266 257 Q254 267 238 265 Q222 273 210 265Z"
          fill="#e7bd78"
          stroke="#c8a365"
          strokeWidth="1.2"
        />
      </g>
      <g {...props("kidney")} fill="#c58983" stroke="#ad756e" strokeWidth="1.2">
        <rect
          x="180"
          y="268"
          width="94"
          height="29"
          fill="transparent"
          stroke="none"
        />
        <path d="M197 270 C181 268 182 291 194 294 Q205 296 205 285 Q194 285 200 279 Q203 273 197 270Z" />
        <path d="M258 270 C274 268 273 291 261 294 Q250 296 250 285 Q261 285 255 279 Q252 273 258 270Z" />
      </g>
      <path
        d="M208 284 C211 292 207 308 227 313 C247 308 244 292 246 284"
        fill="none"
        stroke="#b4b997"
        strokeWidth="2"
      />
      <path
        d="M181 303 Q198 298 214 305 T269 303 M181 312 Q195 305 214 313 T271 312"
        fill="none"
        stroke="#b2c8b9"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <g className="flow-dots">
        <circle r="3.5" fill="#f1d3aa">
          <animateMotion
            dur="4s"
            repeatCount="indefinite"
            path="M228 184 C236 211 221 232 227 276 L217 320"
          />
        </circle>
        <circle r="3" fill="#e7f6ed">
          <animateMotion
            dur="3.5s"
            repeatCount="indefinite"
            path="M237 263 L237 180"
          />
        </circle>
      </g>
      <g stroke="#98b3a3" fill="none" strokeWidth="1">
        <path d="M252 192 L300 172 L326 172" />
        <path d="M192 239 L147 223 L105 223" />
        <path d="M266 281 L307 281 L326 296" />
      </g>
      <g fontSize="12" fill="#536d60" fontFamily="inherit">
        <text x="334" y="176">
          心脏
        </text>
        <text x="72" y="227">
          肝脏
        </text>
        <text x="333" y="303">
          肾脏
        </text>
      </g>
      <circle cx="252" cy="192" r="3" fill="#719a85" />
      <circle cx="192" cy="239" r="3" fill="#719a85" />
      <circle cx="266" cy="281" r="3" fill="#719a85" />
      <g transform="translate(82 112)">
        <rect width="82" height="29" rx="14.5" fill="#fff" stroke="#e3e9e0" />
        <circle cx="16" cy="14.5" r="4" fill="#73a78a" />
        <text x="28" y="19" fontSize="10" fill="#5f786b">
          协同运作中
        </text>
      </g>
    </svg>
  );
}
