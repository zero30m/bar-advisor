# 酒吧顾问

面向国内独立酒吧经营者的移动端经营工作台。原生 HTML/CSS/JavaScript + Node HTTP + SQLite，零 npm 运行时依赖，无构建步骤。

公开仓库：https://github.com/zero30m/bar-advisor

- [完整部署步骤](docs/DEPLOYMENT.md)
- [给另一个 AI 的复刻规范](docs/REPLICATION.md)
- [AI 接口接入示例](docs/AI.md)
- [经营资料说明](knowledge/README.md)

## 本地运行

需要 Node.js 22.13+（建议 Node 24 LTS）。

```sh
git clone https://github.com/zero30m/bar-advisor.git
cd bar-advisor
cp knowledge/knowledge.txt private/knowledge.txt
cp .env.example .env
# 在 .env 填写 CHATANYWHERE_API_KEY
npm start
```

打开 http://127.0.0.1:4317 。当前为单门店本地版，绑定本机回环地址并限制 Host/Origin。尚未实现公网多租户登录、成员权限或支付；不要直接将此进程暴露到公网。

## 功能

- 账单：上海时区自动日期、按月日历、收入支出、利润、历史修改删除、SQLite WAL 持久化，金额使用整数分。
- 分析：账单保存后 15 秒合并更新，生成当日与近七天复盘；历史修改使受影响报告失效。启动补跑，每分钟检查任务，最多每小时检查一次经营报告；相同输入通过哈希缓存，不重复调用。
- 活动：UApi 热榜八个平台，每 6 小时更新；每批两个并发，规则初筛和风险话题排除、去重，保留来源及失败状态。热点接口不是关键词全网搜索；未入榜的话题可能未采集。
- 营销：按主题生成策划、朋友圈文案、博主邀约、海报标题、执行清单。服务端保存，复制文案，Canvas PNG 海报导出。执行清单勾选保存在当前浏览器。
- 游戏：MBTI/心情/口味匹配、低度与无酒精选择、现场点单卡、破冰话题卡。匹配使用本地规则，无 AI 花费；点单卡不会发送订单。

## 服务端经营资料

经用户授权，原始 DOCX 与提取文本已放入公开仓库的 `knowledge/` 目录。部署时将文本复制为 `private/knowledge.txt`。公开仓库访客可以下载资料，但应用前端不展示或提供资料下载。服务启动时载入并分为 1,000 字片段，按任务关键词选取最多 4 段。资料仅在服务端作为参考，不作为可执行指令；不提供静态下载路由。模型生成的是建议，模型端不输出资料原文通过提示约束，不能当作形式化防泄漏保证。

导入资料：

```sh
python3 scripts/import-knowledge.py /absolute/path/资料.docx
```

随后重启服务。仅提取 DOCX 正文和表格中的文字，嵌入附件与图片不做 OCR。

## AI 与成本

ChatAnywhere OpenAI 兼容 `POST /v1/chat/completions`，默认模型 `gpt-4o-mini`，可通过 `.env` 更换。每次最大输出 1,500 tokens，资料片段最多约 4,000 字；相同任务合并并发、持久缓存，默认每日最多 20 次请求（失败也计入）。不自动无限重试。模型返回错误会显示在界面；业务数据会按用户授权发送给配置的 AI 服务。

用户给定投资回本逻辑作为服务端参考，10% 仅作情景假设，不是行业保证。显示利润是录入收入减支出，不等同于完整会计净利润。

## 数据与备份

`.env` 与 `private/` 中的运行时数据库、资料副本及缓存全部忽略于 Git。停止进程后复制整个 `private/` 目录可做备份；不要在服务写入时只复制 SQLite 主文件。GitHub 包含应用源码、文档及用户授权公开的经营资料，不包含密钥和经营账本。

定时采集和分析依赖本地服务运行，电脑关机、休眠或进程退出时不会执行；重新启动后补跑。要持续运营，需后续迁移到常驻服务器并加上身份认证、独立调度与备份。

## 必要检查

```sh
npm run check
npm test
```

测试用独立临时数据库，不触碰真实账本：覆盖保存、修改、重启读回、删除、无效日期/负数、私有文件不可访问、跨域写入拒绝。

## 接口资料

- https://docs.chatanywhere.tech/
- https://uapis.cn/docs/api-reference/get-misc-hotboard
