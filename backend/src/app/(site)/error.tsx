'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="app"><section className="empty-state" role="alert"><h1>内容暂时无法加载</h1>
    <p>服务暂时不可用，不会改用可能过期的内容。请稍后重试。</p>
    <button className="primary-button" onClick={reset}>重新加载页面</button>
  </section></main>;
}
