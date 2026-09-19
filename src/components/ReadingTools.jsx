import React, { useEffect } from "react";
import { useContent } from "../hooks";
import { LoadState } from "./ContentUI";
import { RouteLink } from "./RouteLink";

export function ReadingTools({ reading, kind, id }) {
  const { ready, enabled, record } = reading;
  useEffect(() => {
    if (ready && enabled) record(kind, id);
  }, [ready, enabled, record, kind, id]);
  return <div className="reading-tools">
    <button disabled={!ready} aria-pressed={reading.large} onClick={reading.toggleSize}>大字号</button>
    <span>阅读记录{enabled ? "已开启" : "默认关闭"}，可在「收藏」中管理</span>
    {reading.error && <p role="status">无法写入浏览器，设置仅在本次会话有效。若需移除旧记录，请清除此站点的浏览器数据。</p>}
  </div>;
}

export function RecentReading({ reading, navigate }) {
  return <section className="recent-reading" aria-labelledby="recent-reading-title">
    <h2 id="recent-reading-title">最近阅读</h2>
    <p>默认不记录。开启后仅在当前浏览器保存最近 90 天、最多 20 个专题，不保存正文或搜索词。共用设备请谨慎开启。</p>
    <div className="history-actions">
      <button disabled={!reading.ready} aria-pressed={reading.enabled} onClick={reading.toggleHistory}>
        {reading.enabled ? "关闭并清除记录" : "开启本地阅读记录"}
      </button>
      {reading.enabled && <button disabled={!reading.entries.length} onClick={reading.clear}>清空阅读记录</button>}
    </div>
    {reading.error && <p role="status">无法写入浏览器，本次更改可能未保存。若需移除旧记录，请清除此站点的浏览器数据。</p>}
    {reading.enabled && (reading.entries.length ? <RecentItems entries={reading.entries} navigate={navigate} /> : <p role="status">还没有阅读记录。打开一篇知识后，会出现在这里。</p>)}
  </section>;
}

function RecentItems({ entries, navigate }) {
  const indicators = useContent("list", [{ kind: "indicator", ids: entries.filter(item => item.kind === "indicator").map(item => item.id), limit: 24 }]);
  const organs = useContent("list", [{ kind: "organ", ids: entries.filter(item => item.kind === "organ").map(item => item.id), limit: 24 }]);
  const items = [...(indicators.data?.items || []), ...(organs.data?.items || [])];
  return <>
    <LoadState {...indicators} /><LoadState {...organs} />
    {indicators.data && organs.data && <>
      <ul className="recent-list">{entries.map(entry => {
        const item = items.find(item => item.kind === entry.kind && item.id === entry.id);
        if (!item) return null;
        const page = entry.kind === "indicator" ? "article" : "organs";
        return <li key={`${entry.kind}:${entry.id}`}><RouteLink page={page} id={entry.id} onNavigate={() => navigate(page, entry.id)}>
          <span>{item.title}<small>{entry.kind === "indicator" ? "指标" : "器官"}</small></span>
          <time dateTime={new Date(entry.at).toISOString()}>{new Date(entry.at).toLocaleDateString("zh-CN")}</time>
        </RouteLink></li>;
      })}</ul>
      <p className="history-note">已撤回或不可用的内容不显示。此处会查询条目当前状态，不保留旧正文。</p>
    </>}
  </>;
}
