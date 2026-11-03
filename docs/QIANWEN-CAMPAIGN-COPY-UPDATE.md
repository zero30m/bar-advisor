请修改并重新发布当前“酒吧顾问”应用。后端已更新活动/营销提示词，统一用gpt-6-luna，已去掉客群等固定模板、待确认提醒与博主邀约信要求；经营资料及小红书语气片段仍由服务端投喂。不要在前端审核、改写、补全文案或添加替代文案。生成失败只显示真实错误。既有API和异步轮询保持不变。

本次前端只需让活动方案、朋友圈正文和博主正文支持加粗与分段，保留现有UI。以下是所有必要代码。

1. 在app.js的openCampaign函数前加入以下函数（已有同名函数则替换）：

```javascript
function campaignMarkup(text) {
  return '<div class="campaign-prose">' + String(text ?? '').trim().split(/\n\s*\n/).filter(Boolean).map(paragraph =>
    '<p>' + esc(paragraph).replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>') + '</p>'
  ).join('') + '</div>';
}
```

2. 在openCampaign的模板字符串中做这两处精确替换：

原代码：
```javascript
<p class="campaign-copy">${esc(d.concept)}</p>
```
替换为：
```javascript
${campaignMarkup(d.concept)}
```

原代码：
```javascript
<p class="campaign-copy">${esc(d[k])}</p>
```
替换为：
```javascript
${campaignMarkup(d[k])}
```

3. 在style.css末尾加入：

```css
.campaign-prose { margin:16px 0 24px; }
.campaign-prose p { margin:0 0 16px; font-size:16px; line-height:1.85; font-weight:400; color:#424245; overflow-wrap:anywhere; }
.campaign-prose p:last-child { margin-bottom:0; }
.campaign-prose strong { font-weight:650; color:#1d1d1f; }
```

此渲染器只先转义HTML，再显示Markdown加粗与换行，不执行AI输出的HTML，不检查措辞，不改写正文。复制按钮仍复制服务端原始文案，不增加任何过滤。不要把段数、字数、加粗情况作为拦截条件。

4. 给index.html中app.js和style.css引用更新版本号，例如?v=20261103-campaign-v2，保留原有相对路径、type="module"及gw-config/cloud-adapter的加载顺序。运行node --check app.js后重新发布。

5. 在真实托管页面重新生成一个活动，检查活动方案、朋友圈和博主正文能显示自然分段与加粗。旧的已保存方案不自动重写；新版后端已更新生成缓存版本，相同主题再次生成也会使用新提示词。不得修改旧账单、删除旧方案或创建新后台。交付实际发布链接与变更文件清单。
