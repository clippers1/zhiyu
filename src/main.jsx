import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BookOpen,
  Bookmark,
  Heart,
  Map,
  Search,
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
import { useBookmarks, useRoute } from "./hooks";
import "./styles.css";
import "./mobile.css";

const nav = [
  { id: "map", title: "健康地图", short: "发现", icon: Map },
  { id: "indicators", title: "指标百科", short: "指标", icon: BookOpen },
  { id: "organs", title: "器官探索", short: "人体", icon: Heart },
  { id: "saved", title: "我的收藏", short: "收藏", icon: Bookmark },
];
function App() {
  const { route, navigate, back } = useRoute();
  const { saved, toggleSave, storageError } = useBookmarks();
  const [searchOpen, setSearchOpen] = useState(false);
  const [tour, setTour] = useState(null);
  useEffect(() => {
    setSearchOpen(false);
    setTour(null);
    document.title = `${route.page === "article" ? "指标解读" : nav.find((n) => n.id === route.page)?.title || "健康地图"} · 知愈`;
  }, [route.page, route.id]);
  const onOpen = (id) => navigate("article", id);
  const onOrgan = (id) => navigate("organs", id);
  const activePage = route.page === "article" ? "indicators" : route.page;
  return (
    <div className={route.page === "article" ? "app article-view" : "app"}>
      <header className="header">
        <div className="header-inner">
          <a
            href="#/map"
            className="brand"
            onClick={(event) => {
              event.preventDefault();
              navigate("map");
            }}
          >
            <span className="brand-icon">
              <Sprout size={26} />
            </span>
            <span className="brand-name">
              知愈<span>ZH I Y U</span>
            </span>
            <span className="brand-divider" />
            <span className="brand-tagline">让健康变得好懂</span>
          </a>
          <nav aria-label="主导航">
            {nav.map((item) => (
              <button
                key={item.id}
                className={activePage === item.id ? "active" : ""}
                aria-current={activePage === item.id ? "page" : undefined}
                onClick={() => navigate(item.id)}
              >
                {item.title}
                {item.id === "saved" && saved.length > 0 && (
                  <i>{saved.length}</i>
                )}
              </button>
            ))}
          </nav>
          <div className="header-actions">
            <button
              className="search-trigger"
              onClick={() => setSearchOpen(true)}
              aria-label="搜索指标或器官"
            >
              <Search size={17} />
              <span>搜索指标、器官</span>
              <kbd>⌕</kbd>
            </button>
            <button
              className="avatar"
              aria-label="查看我的收藏"
              onClick={() => navigate("saved")}
            >
              知
            </button>
          </div>
        </div>
      </header>
      <main id="main-content">
        {route.page === "map" && (
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
        {route.page === "saved" && (
          <Library
            key="saved"
            savedOnly
            saved={saved}
            onOpen={onOpen}
            onBrowse={() => navigate("indicators")}
          />
        )}
        {route.page === "article" && (
          <Article
            key={route.id}
            id={route.id}
            onBack={back}
            onOrgan={onOrgan}
            saved={saved}
            toggleSave={toggleSave}
            storageError={storageError}
          />
        )}
        <footer>
          <span className="footer-brand">
            <Sprout size={17} /> 知愈 <i>让每一份了解，成为照顾自己的力量。</i>
          </span>
          <span>
            <ShieldCheck size={13} />{" "}
            内容用于健康科普，不替代医生诊断与个体化建议。
          </span>
        </footer>
      </main>
      <nav className="mobile-nav" aria-label="移动端导航">
        {nav.map(({ id, short, title, icon: Icon }) => (
          <button
            key={id}
            aria-label={title}
            aria-current={activePage === id ? "page" : undefined}
            className={activePage === id ? "active" : ""}
            onClick={() => navigate(id)}
          >
            <span>
              <Icon size={22} strokeWidth={activePage === id ? 2 : 1.6} />
              {id === "saved" && saved.length > 0 && <i>{saved.length}</i>}
            </span>
            <b>{short}</b>
          </button>
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
      {tour !== null && (
        <Modal className="tour-modal" onClose={() => setTour(null)}>
          <Tour tour={tour} setTour={setTour} go={navigate} />
        </Modal>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
