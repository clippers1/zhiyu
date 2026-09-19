import React, { useEffect, useState } from "react";
import { ImageDown } from "lucide-react";
import Modal from "./Modal";
import { useReader } from "../reader-context";
import { shareCardModel } from "../services/share";
import "./share-card.css";

export default function ShareCardButton({ content }) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  useEffect(() => { setOpen(false); }, [content.kind, content.id]);
  return <>
    <button className="share-card-trigger" disabled={!ready} onClick={() => setOpen(true)}><ImageDown size={17} />生成分享卡片</button>
    {open && <Modal className="share-card-modal" onClose={() => setOpen(false)}><ShareCard kind={content.kind} id={content.id} /></Modal>}
  </>;
}

function ShareCard({ kind, id }) {
  const { repository } = useReader();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [message, setMessage] = useState("");
  const [sharing, setSharing] = useState(false);
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
        const model = shareCardModel(current, window.location.origin);
        const { drawShareCard } = await import("../services/share-image");
        const blob = await drawShareCard(model);
        if (!active) return;
        imageURL = URL.createObjectURL(blob);
        setState({ loading: false, error: "", data: { model, blob, imageURL } });
      } catch (error) {
        if (active && error.name !== "AbortError") setState({ loading: false, data: null, error: error.message || "卡片生成失败，请稍后重试。" });
      }
    })();
    return () => { active = false; controller.abort(); if (imageURL) URL.revokeObjectURL(imageURL); };
  }, [kind, id, attempt, repository]);
  const data = state.data;
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
    <h2 id="dialog-title">把知识入口分享出去</h2>
    <p className="share-card-note">卡片在当前浏览器生成，不上传图片；转发前请确认内容和审校状态。</p>
    {state.loading && <p role="status">正在核对当前内容并生成卡片…</p>}
    {state.error && <div role="alert"><p>{state.error}</p><p>未生成旧内容卡片。可关闭后重新打开文章，确认内容是否已更新或撤回。</p></div>}
    {data && <>
      <img className="share-card-preview" src={data.imageURL} width="1080" height="1440" alt={`${data.model.title}分享卡片；${data.model.status}；${data.model.disclaimer}`} />
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
