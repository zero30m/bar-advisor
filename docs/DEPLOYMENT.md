# 部署步骤

## 1. 原样本地部署（macOS / Linux）

准备 Git 与 Node.js 24 LTS；Node 必须支持内置 `node:sqlite`（项目最低 22.13）。不需要 npm install，也没有前端构建步骤。

```sh
git clone https://github.com/zero30m/bar-advisor.git
cd bar-advisor
mkdir -p private
cp knowledge/knowledge.txt private/knowledge.txt
cp .env.example .env
chmod 600 .env
```

编辑 `.env` 的 `CHATANYWHERE_API_KEY`，其余值可以保留。随后：

```sh
npm run check
npm start
```

打开 http://127.0.0.1:4317/ 。保持终端运行。Windows PowerShell 可用 `Copy-Item` 替代 `cp`，无需执行 `chmod`。

新安装没有历史账单或营销记录。服务器启动后会自动拉取热点；账单保存后会生成复盘。资料已预提取，不需要安装 Python；只有重新导入 DOCX 或运行哈希校验才需要 Python 3。

## 2. 常驻 Linux 服务器 + SSH 隧道

此方式不改应用源码或视觉，不公开无鉴权接口。

将仓库克隆至部署用户有权限的目录，例如 `/home/bar/bar-advisor`，完成上述 `.env` 和资料复制。创建 `/etc/systemd/system/bar-advisor.service`（替换用户与真实 Node 路径）：

```ini
[Unit]
Description=Bar Advisor
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=bar
WorkingDirectory=/home/bar/bar-advisor
ExecStart=/usr/bin/node --env-file=.env server.mjs
Restart=on-failure
RestartSec=5
UMask=0077
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

先用 `command -v node` 确认路径（nvm 安装通常不在 `/usr/bin/node`）。然后：

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now bar-advisor
sudo systemctl status bar-advisor
```

在你的电脑运行：

```sh
ssh -N -L 4317:127.0.0.1:4317 bar@你的服务器地址
```

保持 SSH 连接，用本机浏览器打开 http://127.0.0.1:4317/ 。若本机端口占用，将隧道左侧端口改为 4318，然后浏览 http://127.0.0.1:4318/ 。不要开放服务器的 4317 端口。

## 3. 公网域名部署的限制

公开 GitHub 仓库不等于网站已公开部署。当前版本限制回环 Host/Origin，且没有账号系统。不能直接部署到 GitHub Pages；静态托管无法执行 Node、SQLite 和后台任务。

若需要任意手机通过域名登录，后续必须增加或配置认证网关、HTTPS、准确的 Host/Origin 允许列表、持久存储和备份。现有代码不能直接放到普通反向代理后就宣称安全可用。本仓库不提供未经验证的公网部署捷径。

## 4. 数据、计划任务与更新

- 数据库：`private/bar.sqlite`（WAL 模式）。密钥：`.env`。资料运行副本：`private/knowledge.txt`。
- 备份：停止服务后复制整个 `private/`，再恢复服务。不要运行时只复制数据库主文件。
- 后台任务依赖进程常驻，关闭浏览器不影响；电脑关机/休眠或进程退出会停止，重启后补跑。
- 更新：先备份，再 `git pull --ff-only`，按需复制新的资料文本，重启服务。
- 本地测试：`npm test` 使用临时数据库，不修改真实账本。
- 更换密钥或模型：编辑 `.env` 后重启，不修改前端。
