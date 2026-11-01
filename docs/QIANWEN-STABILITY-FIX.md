请修复酒吧顾问托管应用 https://o2leoqmgz2dg.appqianwen.com/ 的连接层并重新发布，所有UI和业务渲染保持原样。

服务端已部署两项修复：账单整数分统一换算为元，由代码输出正确收入、支出与收支差额；旧错误复盘缓存已清理。生成接口支持异步提交和任务轮询，避免长连接中断。不要再对金额乘除100或10000，不要把金额交给前端AI重写。原账单API仍使用整数分，settings.investment仍为元。

完整替换cloud-adapter.js为以下代码。无需更改gw-config.js，不添加凭证、登录或激活，不修改app.js的(path,method,data)调用约定。

```js
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
```

将index.html中现有cloud-adapter.js脚本引用替换成下面这一条，仍放在gw-config.js之后、app.js之前，不重复引用：

```html
<script src="./cloud-adapter.js?v=20261101-finance-async-3"></script>
```

保留现有gw-config.js和app.js引用。服务端POST /report与POST /campaigns在请求体async:true时快速返回202 {pending:true,jobId}；新适配器内部通过POST同一代理、route为GET /job、payload为{jobId}取回原始结果，因此渲染层不需要改动。只读网络错误最多重试两次；账单写入和首次生成不盲目重试。任务结果保留约十分钟，服务重启后任务ID可能失效，应显示实际错误。

真实发布后读取线上cloud-adapter.js确认有GET /job和async字段。刷新实际应用，验证账本正常、复盘金额与账单一致，生成请求先202随后轮询200。不要以本地测试代替真实发布。不要添加高频轮询；已有state刷新保持原样，生成轮询由适配器内部控制。

后端现有账单示例：300000分收入=3000.00元，10000分支出=100.00元，差额2900.00元。不得再展示30万元或29万元。月历仍使用原始账单整数分计算，勿二次换算。

如果仍报告网络失败，请提供发生时间、请求URL、状态码和控制台错误；不要直接归因于本地服务器。先刷新即可读取已纠正的复盘，不需要删除或重新保存账单。不要改动其他数据、定时任务或UI。
