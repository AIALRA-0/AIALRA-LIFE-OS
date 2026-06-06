# 当前生产部署说明

这份说明用来回答三个问题：为什么 GitHub 可以推、为什么现在用 nginx、为什么现在可以不用 Supabase。

## 1. GitHub

这台机器可以用 HTTPS 凭据推送 GitHub，不一定需要 SSH key。

之前没有推送成功，不是因为代码不能推，而是因为当前 Life OS 目录原本放在 Codex 外层工作目录下面，还没有被初始化成一个独立仓库，也没有设置 `origin`。

正确做法是：

1. 在 Life OS 目录里初始化独立 Git 仓库。
2. 设置远程仓库为 `https://github.com/AIALRA-0/AIALRA-LIFE-OS.git`。
3. 确认 `.env`、`.env.production` 等真实密钥文件不会提交。
4. 提交代码并推送到 GitHub。

## 2. 为什么现在用 nginx 反代

现在 `lifeos.aialra.online` 已经跑在本机服务器上，所以 nginx 反代是最直接的方式。

当前链路是：

用户访问 `https://lifeos.aialra.online`

nginx 接收请求

nginx 转发到本机 Next.js 服务

Next.js 读取本机数据库并返回页面

这样做的优点：

- 不依赖 Vercel 账号。
- 不需要把域名切到 Vercel。
- 数据和服务都在自己的机器上。
- 出问题时可以直接看 systemd、nginx、PostgreSQL 日志。
- 适合私人单用户系统。

Vercel 仍然可以保留为可选方案，因为它适合 GitHub 自动部署和托管前端，但不是当前必须使用的部署方式。

## 3. 为什么现在可以不用 Supabase

Supabase 的作用是提供托管版的：

- 登录系统
- PostgreSQL 数据库
- 文件存储
- 后续 pgvector / 向量检索能力

但第一版 Life OS 是私人单用户系统，而且已经有自己的服务器，所以本机 PostgreSQL 更直接。

当前选择是：

- 数据库：本机 PostgreSQL
- 登录：本地登录兜底
- 文件上传：第一版先记录 artifact URL，后续再接真实上传
- AI：有 `OPENAI_API_KEY` 时调用 OpenAI，没有 key 时使用兜底计划

也就是说，Supabase 不是第一版运行的必要条件。它是后续需要多人账号、云端文件存储、外部托管数据库、向量检索时的升级选项。

## 4. 当前结论

当前生产版推荐：

- GitHub：保存代码
- nginx：对外提供网站
- 本机 PostgreSQL：保存 Life OS 数据
- systemd：保证 Next.js 服务常驻
- certbot：管理 HTTPS 证书
- Supabase：暂时可选
- Vercel：暂时可选

这个方案更适合当前的私人 Life OS 第一版。
