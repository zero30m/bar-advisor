# AI 接入

原始教程：

- https://docs.chatanywhere.tech/
- 文档主页指向的 API 参考：https://chatanywhere.apifox.cn/
- 热点接口：https://uapis.cn/docs/api-reference/get-misc-hotboard
- 另一可参考热点项目：https://github.com/orz-ai/hot_news （当前代码使用 UApi）

## 配置

在项目根目录创建 `.env`，不要提交 Git：

```dotenv
CHATANYWHERE_API_KEY=由用户私下提供
AI_BASE_URL=https://api.chatanywhere.tech/v1
AI_MODEL=gpt-4o-mini
PORT=4317
HOST=127.0.0.1
DAILY_AI_LIMIT=20
```

可手动改用 `https://api.chatanywhere.org/v1`；现有代码不会自动故障切换，避免重复收费。不要使用 OpenAI 官方域名发送这个供应商的密钥。

## 请求协议

服务端 Node 原生 fetch，`POST {AI_BASE_URL}/chat/completions`。Base URL 已含 `/v1`，不要重复拼接。

```js
const response = await fetch(`${process.env.AI_BASE_URL}/chat/completions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.CHATANYWHERE_API_KEY}`,
  },
  body: JSON.stringify({
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: '你是酒吧经营顾问。仅输出 JSON，包含 summary 字段。' },
      { role: 'user', content: '给出一条减少采购浪费的建议。' },
    ],
    temperature: 0.65,
    max_tokens: 1500,
    response_format: { type: 'json_object' },
  }),
  signal: AbortSignal.timeout(60000),
});
if (!response.ok) throw new Error(`AI request failed: ${response.status}`);
const result = await response.json();
const output = JSON.parse(result.choices[0].message.content);
```

这是协议示例；复刻时直接保留 `server.mjs` 的完整实现，不用示例替换原代码。原实现含经营提示、资料检索、返回格式校验、缓存、并发去重、日限额与错误处理。模型可用性由供应商与账户决定，报错时保留明确反馈，不伪造生成结果。

热榜请求示例：`GET https://uapis.cn/api/v1/misc/hotboard?type=weibo`。前端调用本站 `/api/hotspots`，由服务端采集筛选；不在每个用户点击时向所有平台重复抓取。
