const messages = {
  rate_limited: "操作太频繁，请稍后再试。",
  content_changed: "这篇内容已更新，请刷新页面、确认新版后再提交。",
  content_unavailable: "这篇内容已下线，暂时无法提交新纠错。已有反馈仍可凭查询码查询。",
  invalid_feedback: "请填写 10–1500 字的问题描述，并确认提交说明。",
  invalid_receipt: "请输入完整的 64 位查询码。",
  not_found: "未找到反馈，请检查查询码；已删除的反馈无法查询。",
  receipt_conflict: "此查询码已用于另一条反馈，请重新打开页面后填写。",
  too_large: "提交内容过长，请缩短问题描述。",
};

export function newReceipt() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), value => value.toString(16).padStart(2, "0")).join("");
}

export async function sendFeedback(action, body, { base = "", fetcher = fetch } = {}) {
  if (!base) throw new Error("当前为离线演示，未启用纠错服务。");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetcher(`${base.replace(/\/$/, "")}/${action}`, {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body), signal: controller.signal, credentials: "omit", cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) {
      const retry = Number(response.headers.get("Retry-After"));
      throw new Error((messages[data.error] || "纠错服务暂时不可用，请稍后重试。") + (response.status === 429 && retry > 0 ? `约 ${Math.ceil(retry / 60)} 分钟后可重试。` : ""));
    }
    return data;
  } catch (error) {
    if (error.name === "AbortError" || error instanceof TypeError || error instanceof SyntaxError) throw new Error("暂时无法确认结果，请保留查询码查询，或稍后重试相同提交。");
    throw error;
  } finally { clearTimeout(timeout); }
}
