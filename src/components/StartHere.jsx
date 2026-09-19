import React from "react";
import { ArrowUpRight, BookOpen, Heart, Bookmark } from "lucide-react";

export default function StartHere() {
  return <section className="start-here" aria-labelledby="start-here-title">
    <h2 id="start-here-title">今天想从哪里开始？</h2>
    <div className="start-grid">
      <a href="/indicators#indicator-search">
        <BookOpen size={22} /><span><b>查体检单上的术语</b><small>按指标名称或英文缩写查找知识</small></span><ArrowUpRight size={18} />
      </a>
      <a href="#organ-topics">
        <Heart size={22} /><span><b>认识一个器官</b><small>先选器官，再了解功能与关联指标</small></span><ArrowUpRight size={18} />
      </a>
      <a href="/saved#reading-collection">
        <Bookmark size={22} /><span><b>找回读过的知识</b><small>查看收藏，或管理本地阅读记录</small></span><ArrowUpRight size={18} />
      </a>
    </div>
    <p className="start-boundary">这里只提供知识查找，不上传或解读个人报告。参考资料不等于专业审校，请留意每篇内容的审校状态。</p>
  </section>;
}
