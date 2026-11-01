(function () {
  "use strict";
  var CFG = window.__BAR_BACKEND__ || {};
  var ROUTES = {
    "GET|state": ["GET", "/state"],
    "GET|hotspots": ["GET", "/hotspots"],
    "PUT|bills": ["PUT", "/bills"],
    "DELETE|bills": ["DELETE", "/bills"],
    "PUT|settings": ["PUT", "/settings"],
    "POST|report": ["POST", "/report"],
    "POST|campaigns": ["POST", "/campaigns"]
  };

  function messageOf(d, status) {
    if (d && typeof d.error === "string") return d.error;
    if (d && d.error && typeof d.error.message === "string") return d.error.message;
    if (d && typeof d.message === "string") return d.message;
    return "请求失败（" + status + "）";
  }

  async function call(method, path, data) {
    var key = method + "|" + path;
    var route = ROUTES[key];
    if (!route) throw new Error("不支持的请求：" + method + " /api/" + path);
    var res;
    if (CFG.mode === "direct") {
      if (!CFG.baseURL) throw new Error("尚未配置后端地址");
      res = await fetch(CFG.baseURL.replace(/\/+$/, "") + route[1], {
        method: route[0],
        headers: data ? { "Content-Type": "application/json" } : undefined,
        body: data ? JSON.stringify(data) : undefined,
        signal: AbortSignal.timeout(120000)
      });
    } else {
      if (!CFG.url) throw new Error("尚未配置服务端代理地址");
      res = await fetch(CFG.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ route: route[0] + " " + route[1], payload: data || {} }),
        signal: AbortSignal.timeout(120000)
      });
    }
    var text = await res.text();
    var d = null;
    try { d = text ? JSON.parse(text) : null; } catch (e) { throw new Error("后端返回非 JSON（HTTP " + res.status + "）"); }
    if (!res.ok) throw new Error(messageOf(d, res.status));
    if (d && (d.ok === false || d.error)) throw new Error(messageOf(d, res.status));
    return d;
  }

  window.__barAdvisorLocalApi = function (path, method = "GET", data) {
    return call(method, path, data);
  };
})();
