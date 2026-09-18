import React from "react";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Droplet,
  Heart,
  HeartPulse,
  Layers3,
  ShieldCheck,
  Sprout,
  TrendingUp,
} from "lucide-react";
export default function Tour({ tour, setTour, go }) {
  return (
    <>
      <span className="overline">ONE MINUTE, A LITTLE CLOSER</span>
      <h2 id="dialog-title">
        {
          [
            "身体，是一个协作的系统",
            "指标，是观察身体的窗口",
            "看懂联系，比记住数字更重要",
          ][tour]
        }
      </h2>
      <div className="tour-art">
        {tour === 0 ? (
          <>
            <HeartPulse />
            <span className="tour-dash" />
            <Activity />
            <span className="tour-dash" />
            <Sprout />
          </>
        ) : tour === 1 ? (
          <>
            <Droplet />
            <span className="tour-dash" />
            <TrendingUp />
            <span className="tour-dash" />
            <Heart />
          </>
        ) : (
          <>
            <BookOpen />
            <span className="tour-dash" />
            <Layers3 />
            <span className="tour-dash" />
            <ShieldCheck />
          </>
        )}
      </div>
      <p>
        {
          [
            "心脏推动血液，肺交换氧气，肝脏处理营养，肾脏调节水盐。它们一直通过血液与信号相互配合。",
            "血糖反映葡萄糖状态，血压描述血流对血管壁的压力，血脂帮助我们认识脂类运输。它们观察的是不同侧面。",
            "先了解指标测量了什么，再连接相关器官与其他指标。结合个人背景和规范复查，才能更接近身体的真实状态。",
          ][tour]
        }
      </p>
      <div className="tour-controls">
        <div className="tour-dots">
          {[0, 1, 2].map((n) => (
            <button
              className={n === tour ? "active" : ""}
              key={n}
              onClick={() => setTour(n)}
              aria-label={`第 ${n + 1} 步`}
            />
          ))}
        </div>
        <button
          className="primary-button"
          onClick={() => {
            if (tour < 2) setTour(tour + 1);
            else {
              setTour(null);
              go("organs");
            }
          }}
        >
          {tour === 2 ? "开始探索" : "继续了解"}
          <ArrowRight size={16} />
        </button>
      </div>
    </>
  );
}
