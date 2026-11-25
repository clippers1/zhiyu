import React, { useState } from "react";
import { MessageSquareWarning, Send } from "lucide-react";
import { useReader } from "../reader-context";

const CATEGORIES = [
  { id: "clarity", label: "某处没讲清 / 表达可以更通俗" },
  { id: "source", label: "来源链接或引用核对建议" },
  { id: "accuracy", label: "内容细节可能有误" },
  { id: "experience", label: "页面排版或使用问题" },
];

function generateReceipt() {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

export default function FeedbackBox({ content }) {
  const { runtime } = useReader();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("clarity");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState("");

  const channel = content?.demo ? "demo" : "official";
  const releaseID = content?.releaseID;
  if (!runtime?.feedbackBase || !content?.id || !releaseID || !["indicator", "organ", "story"].includes(content.kind)) {
    return null;
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    const trimmed = message.trim();
    if (trimmed.length < 10) {
      setError("请至少填写 10 个字的具体说明，方便编辑准确核对。");
      return;
    }
    if (!consent) {
      setError("请先勾选隐私确认，勿填写姓名、联系方式或个人检验数值。");
      return;
    }
    setSubmitting(true);
    try {
      const code = generateReceipt();
      const res = await fetch(`${runtime.feedbackBase.replace(/\/+$/, "")}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receipt: code,
          kind: content.kind,
          channel,
          slug: content.id,
          releaseID,
          category,
          message: trimmed,
          consent: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) throw new Error("提交过于频繁，请稍后再试。");
        if (res.status === 409) throw new Error("该内容刚刚更新，请刷新页面后再提交。");
        throw new Error(data.error === "invalid_feedback" ? "请检查字数（10–1500 字）与必填项。" : "提交暂时失败，请稍后重试。");
      }
      setReceipt(code);
      setMessage("");
      setConsent(false);
    } catch (err) {
      setError(err.message || "提交暂时失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="feedback-box" aria-label="内容纠错与改进建议">
      <div className="feedback-box-head">
        <div>
          <b>发现某处表述不清、链接失效，或希望补充某个体检词？</b>
          <p>匿名提交给编辑核对。本通道仅用于改进科普内容，不回复个人病情或体检数值解读。</p>
        </div>
        <button type="button" className="feedback-toggle" onClick={() => { setOpen(v => !v); setError(""); }}>
          <MessageSquareWarning size={15} aria-hidden="true" />
          {open ? "收起" : "纠错与建议"}
        </button>
      </div>
      {open && (
        receipt ? (
          <div className="feedback-receipt" role="status">
            <strong>已收到你的反馈，感谢帮助改进内容。</strong>
            <p>你的匿名查询码（仅在当前页面显示一次）：<code>{receipt}</code></p>
            <button type="button" className="text-link" onClick={() => setReceipt("")}>继续提交另一条</button>
          </div>
        ) : (
          <form className="feedback-form" onSubmit={submit}>
            <div className="feedback-categories" role="radiogroup" aria-label="问题类型">
              {CATEGORIES.map(item => (
                <label key={item.id} className={category === item.id ? "active" : ""}>
                  <input type="radio" name="feedback-category" value={item.id} checked={category === item.id} onChange={() => setCategory(item.id)} />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
            <textarea
              rows={3}
              maxLength={1500}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="请描述具体段落、来源问题，或你在体检单上看到但站内还没解释的术语（至少 10 字）…"
              aria-label="反馈说明"
            />
            <label className="feedback-consent">
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
              <span>我确认不包含姓名、手机号、身份证号或个人化验数值/病历信息</span>
            </label>
            {error && <p className="feedback-error" role="alert">{error}</p>}
            <button type="submit" className="primary-button" disabled={submitting}>
              <Send size={15} aria-hidden="true" />
              {submitting ? "正在提交…" : "匿名提交"}
            </button>
          </form>
        )
      )}
    </section>
  );
}
