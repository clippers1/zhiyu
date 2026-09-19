import React, { useState } from "react";
import Library from "./Library";
import Modal from "./Modal";
import { LoadState, PageIntro } from "./ContentUI";
import { useContent } from "../hooks";

export function BookmarkNotice({ bookmarks }) {
  return bookmarks.storageError ? <p className="bookmark-warning" role="status">无法正常读写浏览器收藏，本次更改可能无法保存。若要移除旧收藏，请清除此站点的浏览器数据。</p> : null;
}

export default function SavedLibrary({ bookmarks, navigate }) {
  const [kind, setKind] = useState("indicator");
  const [undo, setUndo] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const ids = kind === "indicator" ? bookmarks.saved : bookmarks.savedOrgans;
  const label = kind === "indicator" ? "指标" : "器官";
  function remove(item) {
    bookmarks.remove(kind, [item.id]);
    setUndo({ kind, id: item.id, title: item.title || item.id });
  }
  return <section className="saved-library" id="reading-collection">
    <PageIntro label="YOUR LITTLE HEALTH LIBRARY" title="把有用的知识，留给自己。" description="指标和器官都可以收藏。仅保存在当前浏览器，不跨设备同步；清除站点数据会丢失收藏。打开本页会查询收藏内容的当前可用状态。" />
    <BookmarkNotice bookmarks={bookmarks} />
    <noscript><p>收藏保存在浏览器中，需要启用 JavaScript 后查看与管理。</p></noscript>
    {!bookmarks.ready ? <p role="status">正在读取本地收藏…</p> : <>
      <div className="saved-kind" role="group" aria-label="收藏类型">
        <button aria-pressed={kind === "indicator"} onClick={() => setKind("indicator")}>指标（{bookmarks.saved.length}）</button>
        <button aria-pressed={kind === "organ"} onClick={() => setKind("organ")}>器官（{bookmarks.savedOrgans.length}）</button>
        <button disabled={!ids.length} onClick={() => setConfirm({ kind, label, ids: [...ids] })}>清空{label}收藏</button>
      </div>
      {undo && <div className="saved-undo" role="status">已移除{undo.title} <button onClick={() => { bookmarks.add(undo.kind, [undo.id]); setUndo(null); }}>撤销移除</button></div>}
      <Library key={kind} savedOnly kind={kind} saved={ids} onOpen={id => navigate(kind === "organ" ? "organs" : "article", id)} onBrowse={() => navigate(kind === "organ" ? "organs" : "indicators")} onRemove={remove} />
      <UnavailableSaved kind={kind} ids={ids} onRemove={remove} />
    </>}
    {confirm && <Modal className="bookmark-confirm" onClose={() => setConfirm(null)}>
      <h2 id="dialog-title">清空{confirm.label}收藏？</h2>
      <p>将移除当前选定的 {confirm.ids.length} 条{confirm.label}收藏，不影响另一类收藏和阅读记录。清空后无法一键恢复。</p>
      <button className="primary-button" onClick={() => setConfirm(null)}>保留收藏</button>
      <button className="remove-saved" onClick={() => { bookmarks.remove(confirm.kind, confirm.ids); setConfirm(null); setUndo(null); }}>确认清空</button>
    </Modal>}
  </section>;
}

function UnavailableSaved({ kind, ids, onRemove }) {
  const state = useContent("saved", [{ kind, ids, limit: 1 }]);
  const available = new Set(state.data?.availableIds || []);
  const missing = state.data ? ids.filter(id => !available.has(id)) : [];
  if (!ids.length) return null;
  return <section className="unavailable-saved" aria-label="收藏可用性">
    <LoadState {...state} />
    {missing.length > 0 && <>
      <h2>{missing.length} 条收藏暂不可用</h2>
      <p>可能已撤回或当前频道未开放。不展示旧正文，也不会自动删除；可以保留等待恢复，或自行移除。</p>
      <ul>{missing.map(id => <li key={id}><span>{kind === "organ" ? "器官" : "指标"} · {id}</span><button className="remove-saved" aria-label={`移除不可用收藏${id}`} onClick={() => onRemove({ id })}>移除</button></li>)}</ul>
    </>}
  </section>;
}
