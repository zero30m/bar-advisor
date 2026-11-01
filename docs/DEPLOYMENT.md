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

## 3. 独立公网 API（已部署版本）

公网接入文档：[REMOTE-API.md](REMOTE-API.md)。本地模式仍保留回环限制；远程模式额外启用 bearer 认证，只提供 API，不提供静态前端。

部署变量：`BAR_REMOTE_MODE=1`、随机高强度 `BAR_API_TOKEN`（至少40字符）、`HOST=127.0.0.1`、独立 `PORT`、持久 `DB_PATH`，以及原AI配置。仅绑定回环，通过HTTPS反向代理访问，代理Host必须设置为回环Host，转发Authorization。禁止将凭证加入公开仓库。

实际服务器使用独立用户 `bar-advisor`、`/opt/bar-advisor/app`、独立Node24运行时、`/etc/bar-advisor/service.env`、`/var/lib/bar-advisor/bar.sqlite`、端口4319。公网路径 `/bar-advisor-api/` 转发至 `http://127.0.0.1:4319/api/`。Nginx限速5请求/秒、突发20；API禁止CDN缓存。保持原有网站路由和系统Node不变。

服务：`bar-advisor.service`，开机启动、失败重启、内存上限384MB、CPU上限30%。数据库一致性备份由独立 `bar-advisor-backup.timer` 每日执行，保留最近7份于 `/var/backups/bar-advisor`（同机备份，不防整机丢失）。

设备激活机制已移除。接入方把后端令牌存入自己的服务端Secret，通过有访问控制的服务端代理调用。用户端无需激活码。

运维：`sudo systemctl status bar-advisor`；日志 `sudo journalctl -u bar-advisor`。更新只替换本应用代码并重启bar-advisor，禁止重启其他应用。停用时移除专属Nginx include并校验后平滑reload，停用本应用及备份timer即可；无需停止其他网站。

公网边缘HTTPS已验证。已有站点源站证书显示2026-06-15过期，本次没有修改旧证书；其续期应由原站点维护者单独处理，避免影响现有域名/CDN配置。

## 4. 数据、计划任务与更新

- 数据库：`private/bar.sqlite`（WAL 模式）。密钥：`.env`。资料运行副本：`private/knowledge.txt`。
- 备份：停止服务后复制整个 `private/`，再恢复服务。不要运行时只复制数据库主文件。
- 后台任务依赖进程常驻，关闭浏览器不影响；电脑关机/休眠或进程退出会停止，重启后补跑。
- 更新：先备份，再 `git pull --ff-only`，按需复制新的资料文本，重启服务。
- 本地测试：`npm test` 使用临时数据库，不修改真实账本。
- 更换密钥或模型：编辑 `.env` 后重启，不修改前端。

## 千问公开代理

用户已明确授权公开账本，部署 `bar-advisor-proxy.service`，回环8790，公网精确路径 `/bar-advisor-proxy`。配置见deploy/public-proxy.mjs、deploy/nginx-public-proxy.conf。使用与后端相同的服务端环境文件。无用户鉴权，所有访客共享账本和20次每日AI额度；底层API仍有服务端令牌。更换令牌需同时重启bar-advisor和bar-advisor-proxy。限速及CORS不代表身份验证。
