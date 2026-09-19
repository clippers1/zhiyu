import React from "react";

export default function SearchSuggestions({ suggestions = [], onChoose }) {
  if (!suggestions.length) return null;
  return <div className="spelling-suggestions" aria-label="候选查找词">
    <p>是否想查找以下词？请确认后再选择，系统不会自动纠正医学术语。</p>
    <div>{suggestions.map(word => <button key={word} onClick={() => onChoose(word)}>查找{word}</button>)}</div>
  </div>;
}
