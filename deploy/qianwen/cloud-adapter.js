(function () {
  "use strict";
  const URL = "https://mfjgq.fun/bar-advisor-proxy";
  const allowed = new Set([
    "GET /state", "GET /hotspots", "PUT /bills", "DELETE /bills",
    "PUT /settings", "POST /report", "POST /campaigns"
  ]);
  const reading = new Map();
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  function failure(message, retryable = false) {
    return Object.assign(new Error(message), { retryable });
  }
  async function request(body, safeToRetry) {
    for (let attempt = 0; ; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      try {
        const response = await fetch(URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "omit", cache: "no-store",
          body: JSON.stringify(body), signal: controller.signal
        });
        const text = await response.text();
        const transient = [429, 502, 503, 504].includes(response.status);
        let result;
        try { result = text ? JSON.parse(text) : null; }
        catch { throw failure(`云端网关暂时异常（HTTP ${response.status}）`, transient); }
        if (!response.ok || result?.error || result?.ok === false) {
          const message = typeof result?.error === "string"
            ? result.error : `请求失败（HTTP ${response.status}）`;
          throw failure(message, transient);
        }
        return result;
      } catch (error) {
        const network = controller.signal.aborted || error instanceof TypeError;
        if (safeToRetry && attempt < 2 && (network || error.retryable)) {
          clearTimeout(timer);
          await wait(800 * (attempt + 1));
          continue;
        }
        if (network) {
          throw failure(safeToRetry
            ? "网络连接暂时中断，请稍后重试"
            : "请求结果尚未确认，请先刷新查看，避免重复提交");
        }
        throw error;
      } finally { clearTimeout(timer); }
    }
  }
  async function call(path, method, data) {
    const route = `${method} /${path}`;
    if (!allowed.has(route)) throw new Error(`不支持的请求：${route}`);
    const generate = route === "POST /report" || route === "POST /campaigns";
    let result = await request({ route, payload: data ?? {}, async: generate }, method === "GET");
    const deadline = Date.now() + 120000;
    while (result?.pending === true) {
      if (Date.now() > deadline) throw new Error("生成仍在处理中，请稍后重新查看");
      const jobId = result.jobId;
      if (!jobId) throw new Error("生成任务返回格式异常");
      await wait(1500);
      result = await request({ route: "GET /job", payload: { jobId } }, true);
    }
    return result;
  }
  window.__barAdvisorLocalApi = function (path, method = "GET", data) {
    if (method !== "GET") return call(path, method, data);
    const key = JSON.stringify([path, data ?? null]);
    if (!reading.has(key)) {
      reading.set(key, call(path, method, data).finally(() => reading.delete(key)));
    }
    return reading.get(key);
  };
})();
