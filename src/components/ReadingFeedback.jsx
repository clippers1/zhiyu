import React, { useEffect, useId, useRef, useState } from "react";
import { useReader } from "../reader-context";
import { newReceipt, sendFeedback } from "../services/feedback";
import { READING_REACTIONS, readingFeedbackBody } from "../services/reading-feedback";
import { Receipt } from "./Feedback";
import "./reading-guide.css";

export default function ReadingFeedback({ content }) {
  const { runtime: { feedbackBase } } = useReader();
  const id = useId();
  const [ready, setReady] = useState(false);
  const [choice, setChoice] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [received, setReceived] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState("");
  const attempt = useRef(null);
  const pending = useRef(false);
  useEffect(() => { setReady(true); }, []);
  const available = Boolean(feedbackBase && Number.isSafeInteger(content.releaseID) && content.releaseID > 0);
  async function submit(event) {
    event.preventDefault();
    if (!ready || !available || pending.current || received) return;
    pending.current = true; setBusy(true); setError("");
    try {
      // Freeze the complete attempt on first send. Uncertain delivery retries
      // exactly the same choice and receipt, never create a second ticket.
      if (!attempt.current) attempt.current = readingFeedbackBody(content, choice, newReceipt(), consent);
      setReceipt(attempt.current.receipt);
      const result = await sendFeedback("submit", attempt.current, { base: feedbackBase });
      if (result.received !== true) throw new Error("未能确认提交结果，请保留查询码查询或重试。");
      setReceived(true);
    } catch (failure) { setError(failure.message); }
    finally { pending.current = false; setBusy(false); }
  }
  return <section className="reading-feedback" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>这篇内容帮你看懂了吗？</h3>
    <p>帮助编辑改进表达与选题，不代表医学准确性评价，也不是问诊入口。</p>
    {!available ? <p className="guide-note">当前为离线演示，未开启阅读反馈，不会记录你的选择。</p> : received ?
      <p role="status">阅读反馈已收到，谢谢。可凭查询码查看处理情况或删除。</p> : <form onSubmit={submit}>
        <fieldset disabled={!ready || busy || Boolean(receipt)}>
          <legend>选择阅读感受</legend>
          <div className="reading-reactions">{READING_REACTIONS.map(item => <label key={item.id}>
            <input type="radio" name={`${id}-reaction`} value={item.id} checked={choice === item.id} onChange={() => setChoice(item.id)} required />{item.label}
          </label>)}</div>
          <label className="reaction-consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} required />
            我同意将所选感受与本篇版本发送给编辑，不提交个人健康信息。
          </label>
        </fieldset>
        <p className="guide-note">提交后保存至你凭查询码删除或维护者清理，不公开展示，不要求联系方式。页面底部「查询纠错进度」也可查询这条反馈。</p>
        <button type="submit" disabled={!ready || busy || !choice || !consent}>{busy ? "正在提交阅读反馈…" : receipt ? "重试相同反馈" : "提交阅读反馈"}</button>
        <noscript><p>阅读反馈需要 JavaScript；正文、目录和来源仍可阅读。</p></noscript>
      </form>}
    {error && <p role="alert" className="feedback-error">{error}</p>}
    {receipt && <Receipt value={receipt} />}
  </section>;
}
