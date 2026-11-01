# 云端后端对接（2026-11-01）

Base URL：`https://mfjgq.fun/bar-advisor-api`

这是单店私有账本。多个授权设备共用同一账本，不是多租户系统。服务器 API 与现有网站隔离运行。此地址只提供 API，不是前端页面。

## 给接入 AI 的提示词

请将你已交付的“酒吧顾问”从 IndexedDB 本地预览版接入真实云端后端，完成并交付可打开的应用。

仓库：https://github.com/zero30m/bar-advisor 。保持原版四个 Tab 的 DOM、CSS、字体、间距、对齐、图标、动画、海报和交互完全一致，不新增登录页、输入框、设置项或按钮。可以修改请求适配、资源路径和无视觉影响的初始化逻辑，不要求改动后的 JS/HTML 哈希相同。style.css、icon.svg、manifest.json 保持原样。

后端已经部署，你不需要部署 Node、数据库、云函数或另外接入 ChatAnywhere。使用 `https://mfjgq.fun/bar-advisor-api`，完整 API 约定见本文。移除 local-adapter 对业务 API 的 IndexedDB 拦截，云端是唯一数据来源。不要用本地数据、模拟文案或空结果掩盖接口错误。不要自动导入旧账本；保留原本的浏览器数据与旧云端表不动。

### 无登录界面的设备激活

1. 单独提供给你的激活码是一次性私密凭证，不可写入 JS、HTML、静态 zip、公开仓库、日志、截图或封面。不要提前在你自己的环境兑换用户的激活码。
2. 交付时另给用户一个私密激活链接：`应用实际访问地址#bar_activation=激活码`。仅当实际应用可以读取自己的 URL fragment 时采用此方式；若平台将应用放在 iframe 且不传 fragment，先核实平台支持的私密启动参数/身份桥接能力，不要把码硬编码到静态包绕过限制。
3. 初始化时读取并立即用 history.replaceState 清除 fragment 中的激活码，保存其他原有路由参数；POST `/session/exchange`，JSON `{code}`。返回 `{token,expiresAt}`，token 只保存在当前用户设备的 localStorage 中。然后开始正常业务加载。整个过程不新增可见 UI。
4. 之后请求使用 `Authorization: Bearer <设备token>`，`credentials: 'omit'`。设备会话有效期90天，激活码7天且只能使用一次；新设备、清除存储或过期后需新激活链接。激活链接持有者可以访问该单店账本，应私下交付。
5. 无凭证/凭证失效时用原有错误区域提示需要有效专属链接，不要无限刷新或重复兑换。不要创建匿名写接口，不要把服务端主令牌、模型密钥下发浏览器。
6. 跨域允许 HTTPS Origin、localhost开发Origin及平台沙箱null Origin；服务端依靠 bearer 鉴权，不依靠 Origin 隐藏接口。若平台 CSP 阻止请求，配置 connect-src 加入 API 的 https://mfjgq.fun；若宿主平台不允许则明确报告实际阻塞。

### API 合约

除 health 和 session/exchange 外均需 bearer token。JSON 请求带 Content-Type: application/json。所有路径均相对 Base URL，**不要再追加 /api**。

| 方法 | 路径 | 请求与响应 |
|---|---|---|
| GET | /health | `{ok:true,service:"bar-advisor",version:"1"}`，仅连通性检查 |
| POST | /session/exchange | `{code}` → `{token,expiresAt}` |
| POST | /session/revoke | `{}` → `{ok:true}`，撤销当前设备凭证 |
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
- 两个分别授权的设备读取同一账本；未经授权设备401。
- 验证真实日报、热点与整套营销内容；必要的小量AI调用即可。
- 同一浏览器/视口/数据下与仓库UI截图比较，包括月历、弹层、四个Tab；不要只靠文件哈希判断视觉一致。
- 不删旧数据、不消耗用户激活码做自动测试；测试凭证须单独申请。
- 最终交付应用链接、私密激活链接、实际完成/仍受限功能及仅涉及连接层的改动清单。若缺少平台能力，给具体报错证据，禁止降级为本地预览版后宣布完成。
