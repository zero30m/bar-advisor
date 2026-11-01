# 云端后端对接（2026-11-01）

Base URL：`https://mfjgq.fun/bar-advisor-api`

这是单店私有账本。多个授权设备共用同一账本，不是多租户系统。服务器 API 与现有网站隔离运行。此地址只提供 API，不是前端页面。

## 给接入 AI 的提示词

请将你已交付的“酒吧顾问”从 IndexedDB 本地预览版接入真实云端后端，完成并交付可打开的应用。

仓库：https://github.com/zero30m/bar-advisor 。保持原版四个 Tab 的 DOM、CSS、字体、间距、对齐、图标、动画、海报和交互完全一致，不新增登录页、输入框、设置项或按钮。可以修改请求适配、资源路径和无视觉影响的初始化逻辑，不要求改动后的 JS/HTML 哈希相同。style.css、icon.svg、manifest.json 保持原样。

后端已经部署，你不需要部署 Node、数据库、云函数或另外接入 ChatAnywhere。使用 `https://mfjgq.fun/bar-advisor-api`，完整 API 约定见本文。移除 local-adapter 对业务 API 的 IndexedDB 拦截，云端是唯一数据来源。不要用本地数据、模拟文案或空结果掩盖接口错误。不要自动导入旧账本；保留原本的浏览器数据与旧云端表不动。

### 无用户激活流程的服务端接入

设备激活码、兑换接口和设备会话已删除。不要新增登录页或激活页面。

在你的平台创建服务端代理/云函数，设置 Secret `BAR_BACKEND_TOKEN`，值由本机私有交接文件提供。浏览器调用平台代理；代理调用本后端时附加 `Authorization: Bearer <BAR_BACKEND_TOKEN>`。代理须使用平台身份或私有应用访问控制确认调用者有权访问这个单店账本。不要把代理做成任何人都能调用的公共转发器，不要信任浏览器传入的目标URL。

密钥只存在于服务端Secret，不进入JS、HTML、静态zip、仓库、日志或截图。前端只替换请求地址/适配层，UI保持原样。如果平台仅支持静态托管，或无法无界面地识别授权用户，应明确报告缺失能力；不能把后端密钥塞进前端来绕过。

CORS不是身份验证。后端支持HTTPS Origin、localhost开发Origin和null沙箱Origin，但所有业务接口仍要求服务端bearer凭证。

### API 合约

除 health 外均需服务端 bearer token。JSON 请求带 Content-Type: application/json。所有路径均相对 Base URL，**不要再追加 /api**。

| 方法 | 路径 | 请求与响应 |
|---|---|---|
| GET | /health | `{ok:true,service:"bar-advisor",version:"1"}`，仅连通性检查 |
| GET | /state | `{today,bills,settings,reports,campaigns,aiReady}`，与原前端 API 一致 |
| PUT | /bills | `{date:"YYYY-MM-DD",income:100000,expense:30000,note:"..."}` → `{ok:true}`；收入支出为整数分；同一天覆盖 |
| DELETE | /bills | JSON `{date}` → `{ok:true}` |
| PUT | /settings | `{name,investment,months}` → `{ok:true}`；investment 为元，months 为1—120的整数 |
| POST | /report | `{date,weekly:false}` → `{summary,hash,updated}`；weekly:true 为近七天复盘；无账单可返回null；也可能200返回`{error,hash}`，必须检查error |
| GET | /hotspots | `{items,sources,updated,stale}`；每项结构沿用仓库前端，不要自行猜测字段 |
| POST | /campaigns | `{title:"主题"}` → `{id,title,content,created}`；content包含title/concept/social/creator/poster/checklist |

state.bills 项为 `{date,income,expense,note,updated}`。state.settings 为 `{name,investment,months}`。reports 为键值对象，键 `report:YYYY-MM-DD` 或 `report:week:YYYY-MM-DD`。campaigns.content 是 JSON 对象，不是字符串。日期按 Asia/Shanghai，禁止未来日期，金额不可为负，备注不超过300字。

请求帮助函数须同时检查 HTTP 非2xx与 JSON.error。网络超时建议75秒以上；禁止无限重试，AI请求不得盲目重发。保存后重新 GET state，不要重建页面布局。后端保存账单后约15秒合并触发分析；前端可在页面可见时短暂刷新state获取结果，停止刷新不影响后台处理。AI繁忙时不要承诺15秒完成。

热点、AI复盘、活动生成、资料检索、缓存、并发去重和每日AI上限20次均在后端。你不需要创建每小时定时任务，也不要让旧任务往新库重复写入。原版游戏匹配、破冰卡、Canvas海报导出仍由前端完成；海报文案由campaigns提供，这不是AI图片生成接口。

### 必要验收

- 真实托管应用中验证预检、带 Authorization 的请求、账单保存/编辑/删除和刷新读回，不以curl或应用封面代替。
- 通过平台授权入口在两个设备读取同一账本；未经授权请求被代理或后端拒绝。
- 验证真实日报、热点与整套营销内容；必要的小量AI调用即可。
- 同一浏览器/视口/数据下与仓库UI截图比较，包括月历、弹层、四个Tab；不要只靠文件哈希判断视觉一致。
- 不删旧数据，不向浏览器下发后端密钥。
- 最终交付应用链接、实际完成/仍受限功能及仅涉及连接层的改动清单。若缺少平台能力，给具体报错证据，禁止降级为本地预览版后宣布完成。
