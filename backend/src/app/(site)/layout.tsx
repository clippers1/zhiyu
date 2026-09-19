import type { Metadata, Viewport } from 'next';
import '../../../reader/styles.css';
import '../../../reader/mobile.css';

export const metadata: Metadata = { icons: { icon: { url: '/favicon.svg', type: 'image/svg+xml' } } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#f5f7f4' };

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><body>
    <noscript><p style={{ padding: '12px 20px', margin: 0 }}>正文与来源可直接阅读；搜索、收藏和纠错等交互需要启用 JavaScript。</p></noscript>
    {children}
  </body></html>;
}
