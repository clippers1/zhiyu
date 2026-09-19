import React, { useId, useRef, useState } from "react";
import { MessageSquare, Check, Copy } from "lucide-react";
import { feedbackBase, newReceipt, sendFeedback } from "../services/feedback";
import "./feedback.css";

const statusNames = { new: "已收到", triaging: "处理中", "awaiting-review": "等待专业复核", resolved: "已处理", dismissed: "暂不调整" };

function Receipt({ value }) {
  const [copied, setCopied] = useState(false);
  const input = useRef(null);
  return <div className="feedback-receipt">
    <label>专属查询码<input ref={input} value={value} readOnly spellCheck={false} aria-label="专属查询码" onFocus={event => event.target.select()} /></label>
    <button type="button" className="text-link" onClick={async () => {
      try { await navigator.clipboard.writeText(value); setCopied(true); }
      catch { input.current?.focus(); input.current?.select(); }
    }}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "已复制" : "复制查询码"}</button>
    <p>请自行保存，可从页面底部“查询纠错进度”查看回复或删除反馈。查询码不自动保存在浏览器；任何持码者都可查询和删除，请勿公开分享。</p>
  </div>;
}

export function FeedbackPanel({ content }) {
  const id = useId();
  const [category, setCategory] = useState("accuracy");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [received, setReceived] = useState(false);
  const [receipt, setReceipt] = useState("");
  const attempt = useRef(null);
  if (!feedbackBase || !content.releaseID) return null;
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (message.trim().length < 10 || !consent) { setError("请填写至少 10 字的问题描述，并确认提交说明。"); return; }
    setBusy(true);
    try {
      const body = { kind: content.kind, slug: content.id, channel: content.demo ? "demo" : "official", releaseID: content.releaseID, category, message: message.trim(), consent };
      const signature = JSON.stringify(body);
      if (attempt.current?.signature !== signature) attempt.current = { signature, receipt: newReceipt() };
      setReceipt(attempt.current.receipt);
      const result = await sendFeedback("submit", { ...body, receipt: attempt.current.receipt });
      if (result.received !== true) throw new Error("未能确认提交结果，请保留查询码查询或重试。");
      setReceived(true); setMessage("");
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <section className="feedback-panel" aria-label="内容纠错">
    <details>
      <summary><MessageSquare size={17} />发现内容或来源有问题？<span>向编辑反馈</span></summary>
      <div className="feedback-body">
        {received ? <div role="status"><h3>反馈已收到，谢谢你的提醒。</h3><p>编辑会查看具体版本并评估；这不代表问题已确认或内容已修正。</p></div> : <form onSubmit={submit}>
          <p>针对「{content.title || content.name}」版本 v{content.version}，帮助我们定位需要核查的地方。这里不提供个人问诊或紧急帮助。</p>
          <label htmlFor={`${id}-category`}>问题类型</label>
          <select id={`${id}-category`} value={category} disabled={busy} onChange={event => setCategory(event.target.value)}>
            <option value="accuracy">内容可能有误</option><option value="source">来源链接或引用问题</option>
            <option value="clarity">表达不易理解</option><option value="experience">页面使用问题</option>
          </select>
          <label htmlFor={`${id}-message`}>具体问题 <small>{message.length}/1500</small></label>
          <textarea id={`${id}-message`} value={message} onChange={event => setMessage(event.target.value)} disabled={busy} required minLength={10} maxLength={1500} rows={5}
            placeholder="例如：哪一段表述不清楚，或哪一条参考链接打不开？请说明位置和问题。" aria-describedby={`${id}-privacy`} />
          <p id={`${id}-privacy`} className="feedback-privacy">只提交页面问题，请勿填写姓名、电话、病史、检查结果或报告。问题和对应版本将发送至知愈后台，供编辑处理，不公开展示；保留至你凭查询码删除或维护者清理。服务使用短期限流标识防止滥用，不需要注册或联系方式。</p>
          <label className="feedback-consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} disabled={busy} required />我理解这是内容纠错，并确认未填写个人健康或身份信息。</label>
          <button className="feedback-primary" type="submit" disabled={busy}>{busy ? "正在提交…" : error ? "重试提交" : "提交给编辑"}</button>
        </form>}
        {error && <p role="alert" className="feedback-error">{error}</p>}
        {receipt && <Receipt value={receipt} />}
      </div>
    </details>
  </section>;
}

export function FeedbackTracker() {
  const [receipt, setReceipt] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  async function request(action) {
    if (busy) return;
    setBusy(true); setError(""); setDeleted(false);
    try {
      const data = await sendFeedback(action, { receipt: receipt.trim() });
      if (action === "delete") { setResult(null); setConfirmDelete(false); setDeleted(true); }
      else setResult(data);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <div className="feedback-tracker">
    <span className="overline">CONTENT FEEDBACK</span><h2 id="dialog-title">查询纠错进度</h2>
    <p>无需登录，使用提交时的专属查询码查看编辑回复。反馈不公开，查询码遗失后无法通过身份找回。</p>
    <form onSubmit={event => { event.preventDefault(); setResult(null); request("status"); }}>
      <label>查询码<input aria-label="查询码" value={receipt} spellCheck={false} autoComplete="off" required pattern="[a-f0-9]{64}" maxLength={64} disabled={busy}
        onChange={event => { setReceipt(event.target.value.trim()); setResult(null); setDeleted(false); setError(""); setConfirmDelete(false); }} /></label>
      <button type="submit" className="feedback-primary" disabled={busy}>{busy ? "请稍候…" : "查询处理结果"}</button>
    </form>
    {error && <p role="alert" className="feedback-error">{error}</p>}
    {deleted && <p role="status">反馈已删除，查询码已失效。已有备份中的副本随维护者的备份保留周期清理。</p>}
    {result && <div className="feedback-result" role="status">
      <b>{statusNames[result.status] || "等待处理"}</b>
      <p>{result.contentTitle} · v{result.version}</p>
      <p className="feedback-reply">{result.publicReply || "暂未有处理说明。涉及医学观点的问题需由专业人员复核，不承诺即时回复。"}</p>
      <small>最近更新：{new Date(result.updatedAt).toLocaleDateString("zh-CN")}</small>
      <p>反馈保留至你主动删除或维护者清理；这里只返回状态与回复，不回显原始问题。</p>
      {!confirmDelete ? <button type="button" className="text-link" disabled={busy} onClick={() => setConfirmDelete(true)}>删除这条反馈</button> : <div className="feedback-delete">
        <p>删除后无法继续处理或查询。确定删除吗？</p>
        <button type="button" disabled={busy} onClick={() => request("delete")}>确认删除</button>
        <button type="button" disabled={busy} onClick={() => setConfirmDelete(false)}>保留反馈</button>
      </div>}
    </div>}
  </div>;
}
