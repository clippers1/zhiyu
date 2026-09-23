import React from "react";
import { ArrowUpRight, BookOpen, Heart, ListTree } from "lucide-react";

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
      <a href="/topics">
        <ListTree size={22} /><span><b>跟着专题读</b><small>按主题串联多篇知识，一次读完整条路线</small></span><ArrowUpRight size={18} />
      </a>
    </div>
    <p className="start-boundary">这里只提供知识查找，不上传或解读个人报告。每篇内容都会说明参考来源和当前版本状态。</p>
  </section>;
}
