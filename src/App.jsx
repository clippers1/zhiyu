import React, { useEffect, useState } from "react";
import {
  BookOpen,
  Heart,
  Map,
  Search,
  Settings2,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import Home from "./components/Home";
import Library from "./components/Library";
import Article from "./components/Article";
import OrganExplorer from "./components/OrganExplorer";
import SearchDialog from "./components/SearchDialog";
import Tour from "./components/Tour";
import Modal from "./components/Modal";
import { ReaderProvider, useReader } from "./reader-context";
import { RouteLink } from "./components/RouteLink";
import { useRoute } from "./hooks";
import { useReading } from "./useReading";
import ToolsModal from "./components/ToolsModal";
import ReportGuide from "./components/ReportGuide";
import Glossary from "./components/Glossary";
import "./reading.css";
import "./discovery.css";
import "./topics.css";
import "./report-guide.css";
import TopicRoute from "./components/TopicRoute";

const nav = [
  { id: "map", title: "读体检单", short: "读体检单", icon: Map },
  { id: "indicators", title: "体检项目", short: "体检项目", icon: BookOpen },
  { id: "organs", title: "认识身体", short: "认识身体", icon: Heart },
];
function ReaderApp() {
  const { runtime, initialRoute } = useReader();
  const { route, navigate, back } = useRoute(initialRoute, runtime.serverRendered);
  const reading = useReading();
  const [searchOpen, setSearchOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [tour, setTour] = useState(null);
  useEffect(() => {
    setSearchOpen(false);
    setToolsOpen(false);
    setTour(null);
    if (!runtime.serverRendered) document.title = `${route.page === "not-found" ? "页面不存在" : route.page === "topics" ? "专题阅读路线" : route.page === "article" ? "体检项目" : route.page === "guide" ? "单子怎么读" : route.page === "glossary" ? "体检缩写 A–Z 速查" : nav.find((n) => n.id === route.page)?.title || "读体检单"} · 知愈`;
  }, [route.page, route.id, runtime.serverRendered]);
  const onOpen = (id) => navigate("article", id);
  const onOrgan = (id) => navigate("organs", id);
  // The guide is part of reading a report, so it keeps 读体检单 highlighted
  // instead of leaving the navigation with no current item.
  const activePage = route.page === "guide" ? "map" : ["article", "topics", "glossary"].includes(route.page) ? "indicators" : route.page;
  return (
    <div className={`app${route.page === "article" ? " article-view" : ""}${reading.large ? " reading-large" : ""}`}>
      <header className="header">
        <div className="header-inner">
          <RouteLink
            page="map"
            className="brand"
            onNavigate={() => navigate("map")}
          >
            <span className="brand-icon">
              <Sprout size={26} />
            </span>
            <span className="brand-name">
              知愈<span>ZH I Y U</span>
            </span>
            <span className="brand-divider" />
            <span className="brand-tagline">看懂体检单，从一个问题开始</span>
          </RouteLink>
          <nav aria-label="主导航">
            {nav.map((item) => (
              <RouteLink page={item.id}
                key={item.id}
                className={activePage === item.id ? "active" : ""}
                aria-current={activePage === item.id ? "page" : undefined}
                onNavigate={() => navigate(item.id)}
              >
                {item.title}
              </RouteLink>
            ))}
          </nav>
          <div className="header-actions">
            <button
              className="search-trigger"
              onClick={() => setSearchOpen(true)}
              aria-label="搜索体检项目或器官"
            >
              <Search size={17} />
              <span>搜索体检项目、器官</span>
              <kbd>⌕</kbd>
            </button>
            <button
              className="tools-trigger"
              aria-label="偏好设置"
              aria-haspopup="dialog"
              onClick={() => setToolsOpen(true)}
            >
              <Settings2 size={19} />
            </button>
          </div>
        </div>
      </header>
      <main id="main-content">
        {route.page === "topics" && <TopicRoute key={route.id} id={route.id} />}
        {route.page === "guide" && <ReportGuide go={navigate} />}
        {route.page === "glossary" && <Glossary go={navigate} onOpen={onOpen} />}
        {route.page === "not-found" && (
          <section className="empty-state">
            <h1>这个页面不存在</h1>
            <p>链接可能有误，可以回到首页继续查找。</p>
            <button className="primary-button" onClick={() => navigate("map")}>
              返回首页
            </button>
          </section>
        )}
        {(route.page === "map" || route.page === "saved") && (
          <Home
            go={navigate}
            onOpen={onOpen}
            onOrgan={onOrgan}
            setTour={setTour}
          />
        )}
        {route.page === "indicators" && (
          <Library key="library" onOpen={onOpen} />
        )}
        {route.page === "organs" && (
          <OrganExplorer id={route.id} onSelect={onOrgan} onOpen={onOpen} />
        )}
        {route.page === "article" && (
          <Article
            key={route.id}
            id={route.id}
            go={navigate}
            onBack={back}
            onOpen={onOpen}
            onOrgan={onOrgan}
            onTools={() => setToolsOpen(true)}
          />
        )}
        <footer>
          <span className="footer-brand">
            <Sprout size={17} /> 知愈 <i>看懂一个健康问题，再知道哪些事不能仅凭一项结果判断。</i>
          </span>
          <span>
            <ShieldCheck size={13} />{" "}
            内容用于健康科普，不替代医生诊断与个体化建议。
          </span>
        </footer>
      </main>
      <nav className="mobile-nav" aria-label="移动端导航">
        {nav.map(({ id, short, title, icon: Icon }) => (
          <RouteLink page={id}
            key={id}
            aria-label={title}
            aria-current={activePage === id ? "page" : undefined}
            className={activePage === id ? "active" : ""}
            onNavigate={() => navigate(id)}
          >
            <span>
              <Icon size={22} strokeWidth={activePage === id ? 2 : 1.6} />
            </span>
            <b>{short}</b>
          </RouteLink>
        ))}
      </nav>
      {searchOpen && (
        <Modal className="search-modal" onClose={() => setSearchOpen(false)}>
          <SearchDialog
            onOpen={(id) => {
              setSearchOpen(false);
              onOpen(id);
            }}
            onOrgan={(id) => {
              setSearchOpen(false);
              onOrgan(id);
            }}
          />
        </Modal>
      )}
      {toolsOpen && <ToolsModal reading={reading} onClose={() => setToolsOpen(false)} />}
      {tour !== null && (
        <Modal className="tour-modal" onClose={() => setTour(null)}>
          <Tour tour={tour} setTour={setTour} go={navigate} />
        </Modal>
      )}
    </div>
  );
}
export default function App({ runtime = {}, initialRoute, preloaded = {} }) {
  return <ReaderProvider runtime={runtime} initialRoute={initialRoute} preloaded={preloaded}><ReaderApp /></ReaderProvider>;
}