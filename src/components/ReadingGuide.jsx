import React from "react";
import { Citation } from "./ContentUI";
import "./reading-guide.css";
import { contentTrust } from "../services/content-status";

function Statement({ value, content }) {
  return <p>{value.text}<Citation ids={value.sourceIds} references={content.references} prefix="article-source" /></p>;
}

export function QuickRead({ guide, content }) {
  if (!guide?.concept && !guide?.reminder) return null;
  return <section className="quick-read" id="article-quick-read" aria-labelledby="quick-read-title">
    <span className="overline">先抓住重点，再展开了解</span>
    <h2 id="quick-read-title">快速了解{content.title}</h2>
    <p className="guide-note">以下原句来自本页当前版本，不是额外的医学判断。 {contentTrust(content).label}，适用范围见文末。</p>
    {guide.concept && <div><h3>先认识概念</h3><Statement value={guide.concept} content={content} /></div>}
    {guide.reminder && <div className="quick-read-reminder"><h3>解读时的边界</h3><Statement value={guide.reminder} content={content} /></div>}
    <a href="#article-overview">继续阅读全文</a>
  </section>;
}

export function TermQuestions({ guide, content }) {
  if (!guide?.questions.length) return null;
  return <section className="term-questions" id="article-questions" aria-labelledby="term-questions-title">
    <h2 id="term-questions-title">常见术语，按需展开</h2>
    <p className="guide-note">选一个术语，查看本页已有的解释与依据。不用于判断个人检查结果。</p>
    {guide.questions.map(item => <details key={item.id}>
      <summary>{item.question}</summary>
      <Statement value={item.answer} content={content} />
      <a className="guide-original" href="#article-metrics">回到完整指标说明</a>
    </details>)}
  </section>;
}
