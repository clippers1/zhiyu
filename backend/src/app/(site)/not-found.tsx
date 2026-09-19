export default function NotFound() {
  return <main className="app"><section className="empty-state"><h1>内容不存在或已撤回</h1>
    <p>链接可能有误，或这篇内容已停止展示。不会继续显示旧版本，请返回目录查找其他知识。</p>
    <a className="primary-button" href="/indicators">浏览指标百科</a>
    <p><a href="/">返回健康地图</a></p>
  </section></main>;
}
