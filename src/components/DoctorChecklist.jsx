import React, { useMemo, useState } from "react";
import { Check, ClipboardList, Copy, Printer } from "lucide-react";
import { buildDoctorChecklistItems, formatChecklistText } from "../services/doctor-checklist";
import { reportRowsFor } from "../services/report-guide";
import "./doctor-checklist.css";

export default function DoctorChecklist({ detail, relatedIndicators = [] }) {
  const reportRows = useMemo(() => reportRowsFor(detail?.id), [detail?.id]);
  const bundle = useMemo(
    () => buildDoctorChecklistItems(detail, relatedIndicators, reportRows),
    [detail, relatedIndicators, reportRows],
  );
  const allItems = useMemo(
    () => (bundle && !Array.isArray(bundle) ? [...bundle.questions, ...bundle.preps] : []),
    [bundle],
  );

  const [checkedIds, setCheckedIds] = useState(() =>
    new Set(allItems.filter((item) => item.defaultChecked).map((item) => item.id)),
  );
  const [statusMessage, setStatusMessage] = useState("");
  const [fallbackText, setFallbackText] = useState("");

  // Reset ephemeral selection when navigating to another indicator article
  const [lastId, setLastId] = useState(detail?.id);
  if (detail?.id !== lastId) {
    setLastId(detail?.id);
    setCheckedIds(new Set(allItems.filter((item) => item.defaultChecked).map((item) => item.id)));
    setStatusMessage("");
    setFallbackText("");
  }

  if (!detail || detail.kind !== "indicator" || !allItems.length) return null;

  const toggle = (id) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setStatusMessage("");
  };

  const selectedQuestions = bundle.questions.filter((item) => checkedIds.has(item.id));
  const selectedPreps = bundle.preps.filter((item) => checkedIds.has(item.id));
  const selectedCount = selectedQuestions.length + selectedPreps.length;

  async function handleCopy() {
    if (!selectedCount) {
      setStatusMessage("请先至少勾选 1 条想问医生的问题或准备项。");
      return;
    }
    const text = formatChecklistText(detail.title, selectedQuestions, selectedPreps);
    try {
      await navigator.clipboard.writeText(text);
      setFallbackText("");
      setStatusMessage(`已复制 ${selectedCount} 条提问与准备清单，可直接粘贴到备忘录或发给家人。`);
    } catch {
      setFallbackText(text);
      setStatusMessage("当前浏览器不支持自动复制，请全选下方文字手动复制。");
    }
  }

  return (
    <section
      className="doctor-checklist"
      id="article-doctor-checklist"
      aria-labelledby="doctor-checklist-title"
    >
      <div className="checklist-head">
        <div>
          <span className="checklist-kicker">
            <ClipboardList size={14} aria-hidden="true" />
            就诊实用工具 · 零数据上传
          </span>
          <h2 id="doctor-checklist-title">带去复诊：可以这样问医生</h2>
        </div>
        <span className="checklist-count">已选 {selectedCount} 项</span>
      </div>
      <p className="checklist-lead">
        勾选你最关心的问题，一键复制到手机备忘录或发给准备去复诊的家人；勾选仅停留在当前页面，不会上传或保存任何个人健康记录。
      </p>

      <div className="checklist-group">
        <h3>沟通问题（可按需增减）</h3>
        <ul className="checklist-list">
          {bundle.questions.map((item) => {
            const active = checkedIds.has(item.id);
            return (
              <li key={item.id} className={active ? "checked" : ""}>
                <label>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggle(item.id)}
                  />
                  <span className="checklist-box" aria-hidden="true">
                    {active && <Check size={13} strokeWidth={3} />}
                  </span>
                  <span className="checklist-item-body">
                    <small>{item.tag}</small>
                    <span>{item.text}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="checklist-group">
        <h3>就诊前随身准备</h3>
        <ul className="checklist-list compact">
          {bundle.preps.map((item) => {
            const active = checkedIds.has(item.id);
            return (
              <li key={item.id} className={active ? "checked" : ""}>
                <label>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggle(item.id)}
                  />
                  <span className="checklist-box" aria-hidden="true">
                    {active && <Check size={13} strokeWidth={3} />}
                  </span>
                  <span className="checklist-item-body">
                    <span>{item.text}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="checklist-actions">
        <button type="button" className="checklist-copy-btn" onClick={handleCopy}>
          <Copy size={15} aria-hidden="true" />
          复制提问清单
        </button>
        <button
          type="button"
          className="checklist-print-btn"
          onClick={() => window.print()}
        >
          <Printer size={15} aria-hidden="true" />
          打印 / 存 PDF
        </button>
      </div>

      {statusMessage && (
        <p className="checklist-status" role="status">
          {statusMessage}
        </p>
      )}
      {fallbackText && (
        <textarea
          className="checklist-fallback"
          readOnly
          rows={6}
          value={fallbackText}
          aria-label="可手动复制的复诊提问清单"
          onFocus={(event) => event.target.select()}
        />
      )}
    </section>
  );
}
