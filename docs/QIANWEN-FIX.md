> 后续连接与金额修复请优先执行 [QIANWEN-STABILITY-FIX.md](QIANWEN-STABILITY-FIX.md)。

# 给千问的最终修复与发布提示词

用户已明确授权此应用作为公开共用账本：无需登录或激活，任何访客可以读写账单、设置、营销内容，并共用每日最多20次AI额度。不要再添加登录、邀请或激活流程。后端密钥仍只存在服务器；静态文件不需要任何密钥。

新代理已经部署并验证：`https://mfjgq.fun/bar-advisor-proxy`。

请拉取 https://github.com/zero30m/bar-advisor 的最新main，原样替换托管产物中的两个文件：

- `deploy/qianwen/gw-config.js` → 产物根目录 `gw-config.js`
- `deploy/qianwen/cloud-adapter.js` → 产物根目录 `cloud-adapter.js`

原版app.js、index.html、style.css、icon.svg、manifest.json保留，不重做UI。现有index.html已有gw-config.js和cloud-adapter.js引用，无需增加界面。

配置必须为mode:"proxy"，url:"https://mfjgq.fun/bar-advisor-proxy"。不要切direct，不要调用原database.meoo.xyz云函数，不要增加/api，不要附加末尾斜杠。

适配器入口是(path,method="GET",data)，内部转为call(method,path,data)，已修复参数顺序及HTTP200带error的处理。

协议：POST新代理，Content-Type:application/json，body为{"route":"GET /state","payload":{}}。其他白名单路由为GET /hotspots、PUT /bills、DELETE /bills、PUT /settings、POST /report、POST /campaigns。响应为原后端JSON，不增加data包装。不要设置credentials:"include"；此公开模式无Cookie，无Authorization。跨域响应Access-Control-Allow-Origin:*。

服务器验证：实际千问Origin的OPTIONS204、state200、hotspots200、非白名单400。独立端口8790，未占用原统计服务8787。每日AI上限20、请求限速、最多4个并发代理请求、禁止缓存均保留。旧后端令牌已更换，旧平台代理不再能调用；不要要求或再次配置新令牌。

完成后必须重新发布到 https://o2leoqmgz2dg.appqianwen.com/ ，并读取该地址实际发布的两个JS文件确认内容已更新，必要时更新资源版本号避免缓存。不要只修改工作区后宣布完成。

验收：真实页面正常加载账本及四个Tab，Network中POST目标是mfjgq.fun/bar-advisor-proxy而不是database.meoo.xyz，state为200 JSON。维护方已用本地镜像的原版页面和这两个文件进行真实浏览器验证，但你仍需验证千问实际发布环境的CSP与资源缓存。排查连接不需要反复消耗AI或写测试账单。

不要改变任何原有视觉布局，不重置数据，不新增定时任务。最终返回实际应用链接、发布文件核对结果及真实浏览器验证结果；若平台CSP或发布缓存仍阻断，提供具体证据。
