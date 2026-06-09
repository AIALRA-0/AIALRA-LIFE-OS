# 06 手动提示包文件化与 DeepSeek 全链路测试计划

## 目标

把 Life OS 第一阶段的每日 Agent 核心打稳：系统生成可上传到 ChatGPT Pro 的上下文文件包，用户把模型返回 JSON 导入系统；同时提供 DeepSeek 端到端测试脚本，用真实模型输出验证生成质量、导入校验、今日计划、打卡和日结链路。

## 执行步骤

1. 审计现有手动计划闭环
   - 确认 `/api/plan/prompt-package` 当前只返回完整提示词。
   - 确认 `/api/plan/import-json` 已有 schema 校验与 Life OS 规则校验。
   - 确认本机可用 DeepSeek 密钥只从环境或 secrets 文件读取，不输出值。

2. 文件化提示包
   - 在 `lib/plan/manual-prompt.ts` 增加 `uploadFiles`。
   - 生成 `lifeos-daily-context.json`，包含个人背景、长期规划、今日输入、系统上下文快照。
   - 生成 `lifeos-daily-plan-schema.json`，包含 daily plan JSON schema。
   - 生成 `lifeos-planner-rules.md`，包含中文计划规则、领域覆盖、rescue plan 规则。
   - 保留完整提示词作为兜底复制方案。

3. 前端两步工作流升级
   - 在 `/plan/new` 的表单组件展示上传文件清单。
   - 每个文件提供“复制内容”和“下载文件”。
   - 提供“复制开场消息”，用于 ChatGPT Pro 文件上传后直接粘贴。
   - 保留“复制完整提示包”作为无法上传文件时的兜底。

4. DeepSeek 端到端测试脚本
   - 新增 `scripts/deepseek-e2e.ts`。
   - 脚本从当前环境、项目 `.env`、生产 `.env.production`、系统 secrets 文件中寻找 DeepSeek key。
   - 使用真实网站登录，生成提示包，调用 DeepSeek JSON 模式，导入 JSON，读取今日计划，执行首块打卡，生成日结。
   - 使用远未来测试日期并在结束后清理测试数据，避免污染日常记录。
   - 输出测试报告，不输出任何密钥。

5. 质量验证
   - 跑 `npm run lint`。
   - 跑 `npm run typecheck`。
   - 跑 `npm run test`。
   - 跑 `npm run build`。
   - 在有可用 DeepSeek key 时跑 `npm run test:deepseek`。
   - 做 Git 敏感信息扫描，确认没有提交账号、密码、API key。

6. 上线与推送
   - 推送到 GitHub。
   - 重启本机生产服务。
   - 对线上 `/plan/new` 做可访问性 smoke check。

## 验收标准

- 提示包包含所需上传文件。
- ChatGPT Pro 工作流能使用“上传文件 + 开场消息”完成。
- DeepSeek 真实生成的 JSON 能被系统强校验。
- 导入后 `/plan/today` 能看到计划。
- 打卡后完成状态能更新。
- `/review/daily` 能生成日结。
- AgentRun 保留审计记录。
- GitHub 不包含任何真实密钥或账号密码。
