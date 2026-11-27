import React, { useEffect, useState } from "react";
import { HeartHandshake, ImageDown } from "lucide-react";
import Modal from "./Modal";
import { useReader } from "../reader-context";
import { familyPosterModel, shareCardModel } from "../services/share";
import "./share-card.css";

export default function ShareCardButton({ content }) {
  const [openVariant, setOpenVariant] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  useEffect(() => { setOpenVariant(""); }, [content.kind, content.id]);
  return <>
    <div className="share-card-triggers">
      <button className="share-card-trigger" disabled={!ready} onClick={() => setOpenVariant("card")}>
        <ImageDown size={17} />生成分享卡片
      </button>
      <button className="share-family-trigger" disabled={!ready} onClick={() => setOpenVariant("family")}>
        <HeartHandshake size={17} />发给家人 · 一图读懂
      </button>
    </div>
    {openVariant && (
      <Modal className="share-card-modal" onClose={() => setOpenVariant("")}>
        <ShareCard kind={content.kind} id={content.id} initialVariant={openVariant} />
      </Modal>
    )}
  </>;
}

function ShareCard({ kind, id, initialVariant = "card" }) {
  const { repository } = useReader();
  const [variant, setVariant] = useState(initialVariant);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [message, setMessage] = useState("");
  const [sharing, setSharing] = useState(false);

  useEffect(() => { setVariant(initialVariant); }, [initialVariant]);

  useEffect(() => {
    let active = true;
    let imageURL;
    const controller = new AbortController();
    setState({ loading: true, error: "", data: null });
    setMessage("");
    (async () => {
      try {
        // Bypass SSR bootstrap: recheck current publication before generating.
        const current = await repository.get(kind, id, { signal: controller.signal, refresh: true });
        const model = variant === "family"
          ? familyPosterModel(current, window.location.origin)
          : shareCardModel(current, window.location.origin);
        const { drawFamilyPoster, drawShareCard } = await import("../services/share-image");
        const blob = variant === "family" ? await drawFamilyPoster(model) : await drawShareCard(model);
        if (!active) return;
        imageURL = URL.createObjectURL(blob);
        setState({ loading: false, error: "", data: { model, blob, imageURL, variant } });
      } catch (error) {
        if (active && error.name !== "AbortError") setState({ loading: false, data: null, error: error.message || "卡片生成失败，请稍后重试。" });
      }
    })();
    return () => { active = false; controller.abort(); if (imageURL) URL.revokeObjectURL(imageURL); };
  }, [kind, id, variant, attempt, repository]);

  const data = state.data;
  const isFamily = variant === "family";

  async function copy() {
    try { await navigator.clipboard.writeText(data.model.url); setMessage("阅读链接已复制"); }
    catch { setMessage("自动复制不可用，请选中下方阅读链接复制。"); }
  }
  async function shareImage() {
    if (sharing) return;
    try {
      const file = new File([data.blob], data.model.filename, { type: "image/png" });
      if (!navigator.share || !navigator.canShare?.({ files: [file] })) {
        setMessage("当前浏览器不支持系统分享图片，请下载或长按图片保存后转发。"); return;
      }
      setSharing(true);
      await navigator.share({ files: [file], title: `${data.model.title} · 知愈` });
      setMessage("已交给系统分享，请在目标应用确认发送。");
    } catch (error) {
      setMessage(error.name === "AbortError" ? "已取消分享，仍可下载或长按图片保存。" : "系统分享暂不可用，请下载或长按图片保存后转发。");
    } finally { setSharing(false); }
  }
  return <>
    <h2 id="dialog-title">{isFamily ? "发给家人看 · 大字一图读懂" : "把知识入口分享出去"}</h2>
    <div className="share-mode-switch" role="group" aria-label="选择分享卡片版式">
      <button
        type="button"
        className={!isFamily ? "active" : ""}
        aria-pressed={!isFamily}
        disabled={sharing}
        onClick={() => setVariant("card")}
      >
        简洁入口卡
      </button>
      <button
        type="button"
        className={isFamily ? "active" : ""}
        aria-pressed={isFamily}
        disabled={sharing}
        onClick={() => setVariant("family")}
      >
        发给家人 · 大字长图
      </button>
    </div>
    <p className="share-card-note">
      {isFamily
        ? "专为发给父母长辈设计：大字白话结论 + 3 个重点 + 不必恐慌提示，均取自已核对正文，在本地浏览器生成。"
        : "卡片在当前浏览器生成，不上传图片；转发前请确认内容和核对状态。"}
    </p>
    {state.loading && <p role="status">正在核对当前内容并生成卡片…</p>}
    {state.error && <div role="alert"><p>{state.error}</p><p>未生成旧内容卡片。可关闭后重新打开文章，确认内容是否已更新或撤回。</p></div>}
    {data && <>
      <img
        className={`share-card-preview${data.variant === "family" ? " family" : ""}`}
        src={data.imageURL}
        width="1080"
        height={data.variant === "family" ? "1920" : "1440"}
        alt={`${data.model.title}${data.variant === "family" ? "给家人看的一图读懂长图" : "分享卡片"}；${data.model.status}；${data.model.disclaimer}`}
      />
      <p className="share-card-status">{data.model.status} · {data.model.referenceCount} 份参考资料</p>
      <div className="share-card-actions">
        <a href={data.imageURL} download={data.model.filename}>下载 PNG 图片</a>
        <button disabled={sharing} onClick={shareImage}>{sharing ? "正在打开系统分享…" : "系统分享图片"}</button>
        <button onClick={copy}>复制阅读链接</button>
      </div>
      <p className="share-card-note">微信等浏览器可能需要长按上方图片保存，再手动转发；尚未接入微信自定义分享卡片。图片保存后无法随原文撤回，请以扫码打开的最新内容为准。</p>
      {new URL(data.model.url).protocol !== "https:" && <p className="share-card-note">当前地址不是 HTTPS 正式访问地址，其他设备可能无法打开。</p>}
      <label className="share-card-link">阅读链接<input readOnly value={data.model.url} aria-label="卡片阅读链接" onFocus={event => event.target.select()} /></label>
    </>}
    <p className="share-card-message" role="status">{message}</p>
    <button className="share-card-refresh" disabled={state.loading || sharing} onClick={() => setAttempt(value => value + 1)}>{data ? "重新核对并生成" : "重试生成"}</button>
  </>;
}
