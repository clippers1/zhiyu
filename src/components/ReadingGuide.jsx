import React from "react";
import { Citation } from "./ContentUI";
import "./reading-guide.css";

function Statement({ value, content }) {
  return <p>{value.text}<Citation ids={value.sourceIds} references={content.references} prefix="article-source" /></p>;
}

// Long-form articles publish their own questions; entry-style indicators fall
// back to the generated term list. Callers pass whichever applies.
export function TermQuestions({ guide, items, content }) {
  const questions = items || guide?.questions || [];
  if (!questions.length) return null;
  const longForm = Boolean(content?.faq?.length);
  return <section className="term-questions" id="article-questions" aria-labelledby="term-questions-title">
    <h2 id="term-questions-title"><i>附</i>{longForm ? "常见问题" : "常见术语，按需展开"}</h2>
    <p className="guide-note">
      {longForm
        ? "选一个问题，查看本页已有的解释与依据。不用于判断个人检查结果。"
        : "选一个术语，查看本页已有的解释与依据。不用于判断个人检查结果。"}
    </p>
    {questions.map(item => <details key={item.id}>
      <summary>{item.question}</summary>
      <Statement value={item.answer} content={content} />
      <a className="guide-original" href={longForm ? "#article-overview" : "#article-metrics"}>
        {longForm ? "回到正文开头" : "回到完整指标说明"}
      </a>
    </details>)}
  </section>;
}
