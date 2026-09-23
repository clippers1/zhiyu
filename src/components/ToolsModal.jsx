import React from "react";
import { Type, Trash2 } from "lucide-react";
import Modal from "./Modal";

export default function ToolsModal({ reading, onClose }) {
  return <Modal className="tools-modal" onClose={onClose}>
    <span className="overline">SETTINGS</span>
    <h2 id="dialog-title">偏好设置</h2>
    <p className="tools-note">所有设置仅保存在当前浏览器。</p>
    <div className="tools-list">
      <div className="tools-row">
        <span className="tools-icon"><Type size={18} /></span>
        <div>
          <b>大字号阅读</b>
          <small>放大正文与界面文字</small>
        </div>
        <button
          className="tools-switch"
          role="switch"
          aria-checked={reading.large}
          disabled={!reading.ready}
          onClick={reading.toggleSize}
        >
          <span />
        </button>
      </div>
      <button
        className="tools-row tools-row-action"
        onClick={() => {
          try { localStorage.clear(); } catch { /* ignore */ }
          onClose();
        }}
      >
        <span className="tools-icon tools-icon-warm"><Trash2 size={18} /></span>
        <div>
          <b>清除本地数据</b>
          <small>移除本站点在此浏览器保存的全部数据</small>
        </div>
      </button>
    </div>
    {reading.error && <p className="tools-warning" role="status">无法写入浏览器，设置仅在本次会话有效。</p>}
  </Modal>;
}
