# 08 Body Routes Patch v1 全量端到端补丁计划

## 目标

这是对 `07 LifeOS Cognitive Route Engine v1` 的补丁。

只补全两个 Body 相关路线：

1. `Body Activation Route`
2. `Movement Training Route`

不重做原系统，不改技术主线，不改 AI Systems route，不改 Business route，不改 Art route。

目标是让 LifeOS 中：

- `03:30-04:00` 不再只是泛泛的“身体激活”，而是 `Spine-Hip-Shoulder-Neck Activation Route`。
- `07:00-08:00` 不再只是泛泛的“运动训练”，而是 `Aerobic-Calisthenics-Coordination Route`。
- 两个时间片都有确定性技术路线、阶段、证据节点、打卡字段和安全降级规则。

## 执行依赖

本补丁依赖 `07-cognitive-route-engine-v1-e2e-plan.md` 中的基础模型：

- `CognitiveRoute`
- `RouteStage`
- `RouteWeek`
- `FixedTimeSlotTemplate`
- `RouteEvidenceNode`
- `PlanBlock` route 绑定字段

如果 07 尚未执行：

1. 先执行 07 的阶段 0-4，至少完成 schema、seed、`/routes`、`/routes/current`。
2. 再执行本补丁。

如果 07 已执行：

1. 不重做 07。
2. 只追加 Body routes seed、body check-in fields、UI patch、repair rule patch。

## 阶段 0：补丁前审计

### 检查项

1. `git status --short`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test`
5. `npx prisma migrate status`
6. 确认 07 已存在模型：
   - `CognitiveRoute`
   - `RouteStage`
   - `FixedTimeSlotTemplate`
   - `RouteEvidenceNode`
7. 确认线上服务：
   - `systemctl is-active aialra-lifeos.service`
   - `curl -I https://lifeos.aialra.online/routes/current`

### 网页测试

1. 登录线上 LifeOS。
2. 打开 `/routes/current`。
3. 确认已有 Body 区域或可扩展区域。
4. 打开 `/plan/today`。
5. 确认存在或可生成：
   - `03:30-04:00`
   - `07:00-08:00`

### 阻断条件

- `/routes/current` 不存在时，先完成 07 主计划。
- `/plan/today` 不能显示计划时，先修复当前计划链路。

## 阶段 1：Schema 补丁

### 方案 A：复用 07 模型，新增 body check-in 字段

优先复用：

- `CognitiveRoute`
- `RouteStage`
- `RouteEvidenceNode`
- `PlanBlock`
- `ExecutionLog`

### 建议新增模型：`BodyCheckin`

如果不想把 `ExecutionLog` 继续膨胀，新增：

字段：

- `id`
- `executionLogId`
- `userId`
- `planBlockId`
- `checkinType`: `BODY_ACTIVATION | MOVEMENT_TRAINING | DIET`
- `painBefore Int?`
- `painAfter Int?`
- `stiffnessBefore Int?`
- `stiffnessAfter Int?`
- `hipTightness Int?`
- `neckShoulderTension Int?`
- `lumbarSignal Int?`
- `activationCompleted Boolean?`
- `trainingType String?`
- `durationMinutes Int?`
- `distanceOrSteps String?`
- `setsCompleted Json?`
- `rpe Int?`
- `fatigueAfter Int?`
- `zone2Completed Boolean?`
- `strengthCompleted Boolean?`
- `mobilityCompleted Boolean?`
- `evidenceText String?`
- `evidenceUrl String?`
- `createdAt`
- `updatedAt`

关系：

- belongs to `ExecutionLog`
- belongs to `UserProfile`
- optional belongs to `PlanBlock`

### 方案 B：直接扩展 `ExecutionLog`

如果追求最小改动，可以新增 nullable 字段：

Body Activation:

- `painBefore Int?`
- `painAfter Int?`
- `stiffnessBefore Int?`
- `stiffnessAfter Int?`
- `hipTightness Int?`
- `neckShoulderTension Int?`
- `lumbarSignal Int?`
- `activationCompleted Boolean?`
- `evidenceText String?`
- `evidenceUrl String?`

Movement Training:

- `trainingType String?`
- `durationMinutes Int?`
- `distanceOrSteps String?`
- `setsCompleted Json?`
- `rpe Int?`
- `fatigueAfter Int?`
- `zone2Completed Boolean?`
- `strengthCompleted Boolean?`
- `mobilityCompleted Boolean?`

### 推荐

采用方案 A：新增 `BodyCheckin`。

理由：

- 不污染所有普通打卡。
- Body 数据后续会增长，单表更清晰。
- 方便做 pain/fatigue 自动降级统计。

### 命令

1. `npx prisma format`
2. `npx prisma migrate dev --name body_routes_patch_v1`
3. `npm run typecheck`

### 网页测试

迁移后立刻测试旧页面：

1. `/plan/today` 旧打卡弹窗仍可打开。
2. 普通 block 打卡仍可保存。
3. `/review/daily` 仍可生成日结。

## 阶段 2：Body Activation Route Seed

### 新增或更新文件

- `seed/body-routes.seed.json`
- `scripts/import-body-routes.ts`
- 可选：集成进 `scripts/import-cognitive-routes.ts`

### Route

路线名称：

- `Body Activation Route`

副标题：

- `Spine-Hip-Shoulder-Neck Activation Route`

中文含义：

- 脊柱-髋-肩颈激活路线

固定时间片：

- `03:30-04:00`

slotType：

- `ANCHOR` 或 `BODY_ACTIVATION`

protected：

- `true`

flexible：

- `false`

目的：

每天进入 `04:00-07:00` 技术认知主线前，完成腰臀肩颈身体启动，降低久坐、腰臀僵硬、肩颈紧张对认知主线的干扰。

### 每日结构

| Time | Segment |
|---|---|
| 03:30-03:35 | Breathing / Brace Reset |
| 03:35-03:40 | Neck / Shoulder Reset |
| 03:40-03:47 | Spine / Hip Mobility |
| 03:47-03:55 | Glute / Core Activation |
| 03:55-04:00 | Gait Reset |

### 每日动作库

Breathing / Brace Reset:

- 90/90 breathing
- neutral spine breathing
- brace reset

Neck / Shoulder Reset:

- chin tuck
- neck CARs
- scapular retraction
- wall slide

Spine / Hip Mobility:

- cat-cow
- kneeling back extension
- 90/90 hip switch
- hip flexor pulse

Glute / Core Activation:

- glute bridge
- dead bug
- bird dog
- short lever side plank

Gait Reset:

- ankle circles
- standing march
- 3-minute easy walk

### RouteStage Seed

Stage BA1:

- weeks: 1-4
- name: `Pain-control baseline`
- objective: 建立每日腰臀肩颈扫描与低强度动作习惯
- completionStandard: 连续 20 天完成激活；pain_after 不高于 pain_before；能记录 neck/hip/lumbar 信号

Stage BA2:

- weeks: 5-8
- name: `Spine-hip stability`
- objective: 稳定臀桥、dead bug、bird dog、side plank
- completionStandard: 每个核心动作能以低疼痛、稳定呼吸完成基础组数

Stage BA3:

- weeks: 9-12
- name: `Shoulder-neck integration`
- objective: 加入肩胛、颈椎、胸椎控制
- completionStandard: 肩颈紧张可被 1-5 分稳定记录，训练前后有改善趋势

Stage BA4:

- weeks: 13-16
- name: `Dynamic mobility`
- objective: 让髋、踝、胸椎动作更流畅，为跑步和舞蹈做准备
- completionStandard: 早晨身体启动后能无明显僵硬进入主线深工

Stage BA5:

- weeks: 17-20
- name: `Running and dance support`
- objective: 激活路线直接服务跑步和舞蹈协调
- completionStandard: 跑步日前激活完成率达到 90%，舞蹈前髋肩状态稳定

Stage BA6:

- weeks: 21-24
- name: `Maintenance protocol`
- objective: 固化为终身 30 分钟晨间身体启动协议
- completionStandard: 用户能在不依赖临时决策的情况下完成 03:30-04:00 身体启动

### Skill / Evidence Nodes

在 Body domain 下新增或更新：

- Body
  - Spine-Hip-Shoulder-Neck Activation
    - Breathing / Brace Reset
    - Neck / Scapular Reset
    - Spine / Hip Mobility
    - Glute Activation
    - Core Anti-extension
    - Morning Gait Reset

每个 Evidence Node 必须有：

- `currentLevel`
- `nextGate`
- `requiredArtifact`
- `confidence`
- `lastEvidenceAt`

requiredArtifact 示例：

- 7-day activation completion log
- pain_before / pain_after trend
- weekly 30-second form check video
- morning stiffness score trend

### Seed 验收

1. Body Activation Route 存在。
2. BA1-BA6 共 6 个 RouteStage 存在。
3. `03:30-04:00` FixedTimeSlotTemplate 绑定到 Body Activation。
4. Body evidence nodes 出现在 `/skills` 或 `/routes/current` Body 区。

### 网页测试

1. 打开 `/routes/current`。
2. 看到 Body Activation Route 当前阶段。
3. 看到今日身体激活动作序列。
4. 打开 `/plan/today`。
5. 03:30-04:00 block 显示：
   - Body Activation Route
   - 当前阶段
   - 今日动作序列
   - quick check-in: completed / pain_before / pain_after

## 阶段 3：Movement Training Route Seed

### Route

路线名称：

- `Movement Training Route`

副标题：

- `Aerobic-Calisthenics-Coordination Route`

中文含义：

- 心肺-街健-协调性路线

固定时间片：

- `07:00-08:00`

slotType：

- `ANCHOR` 或 `MOVEMENT_TRAINING`

protected：

- `true`

flexible：

- `true`

目的：

建立长期减脂、心肺、无器械力量、核心稳定、跑步基础、舞蹈协调支持。训练不依赖健身房和器械。

### Weekly Movement Template

Monday:

- theme: Zone 2 run-walk / track
- structure:
  - 10 min warm-up walk
  - 30 min run-walk interval
  - 10 min cool-down walk
  - 10 min hip/calf/glute release

Tuesday:

- theme: Bodyweight Strength A
- structure:
  - bodyweight squat
  - incline push-up
  - glute bridge
  - dead bug
  - calf raise
  - front plank or short side plank

Wednesday:

- theme: Recovery aerobic + mobility
- structure:
  - 45 min brisk walk
  - 15 min hip/ankle/thoracic/shoulder mobility

Thursday:

- theme: Bodyweight Strength B
- structure:
  - reverse lunge
  - hip hinge / good morning
  - scapular push-up
  - prone Y-T-W
  - bird dog
  - side plank

Friday:

- theme: Running technique / light intervals
- structure:
  - 10 min warm-up walk
  - 20 min run-walk
  - 10 min cadence / gait practice
  - 10 min cool-down walk
  - 10 min stretch

Saturday:

- theme: Long walk / hike / optional climbing
- structure:
  - 60-120 min low intensity walk or hike
  - optional light mobility

Sunday:

- theme: Recovery / assessment
- structure:
  - 30-45 min easy walk
  - 10 min activation
  - weight / waist / pain / fatigue review

### RouteStage Seed

Stage MT1:

- weeks: 1-4
- name: `Adaptation Base`
- objective: 每天动起来，建立跑走和街健基础，不追求强度
- completionStandard: 每周完成 5 天训练；无连续疼痛升级；跑走间歇可完成

Stage MT2:

- weeks: 5-8
- name: `Capacity Build`
- objective: 增加跑走总量和街健动作稳定性
- completionStandard: 每周累计 150 分钟以上中等强度活动；完成 2 次力量训练

Stage MT3:

- weeks: 9-12
- name: `Strength + Aerobic Base`
- objective: 俯卧撑、深蹲、弓步、核心进入可量化
- completionStandard: 能记录固定动作组数和 RPE，动作稳定无明显疼痛

Stage MT4:

- weeks: 13-16
- name: `Fat-loss Volume`
- objective: 提高总步数、总训练分钟、稳定体重下降
- completionStandard: 每周运动总分钟稳定，体重/腰围趋势可追踪

Stage MT5:

- weeks: 17-20
- name: `Coordination Integration`
- objective: 加入舞蹈支持、轻敏捷、脚步协调
- completionStandard: 跑步、舞蹈、灵活性之间不互相拖累

Stage MT6:

- weeks: 21-24
- name: `Athletic Maintenance`
- objective: 固化长期可维持的运动系统
- completionStandard: 用户能按周模板稳定训练，并根据 pain/fatigue 自动降级

### Skill / Evidence Nodes

在 Body domain 下新增或更新：

- Body
  - Movement Training
    - Aerobic Base
    - Run-Walk Progression
    - Bodyweight Strength
    - Core Stability
    - Hip / Ankle Mobility
    - Dance Coordination Support
    - Body Composition Control

Evidence Node requiredArtifact 示例：

- weekly training completion
- run-walk interval log
- bodyweight strength set log
- pain_before / pain_after trend
- weight / waist trend
- weekly form check video

### 网页测试

1. 打开 `/routes/current`。
2. 看到 Movement Training Route 当前阶段。
3. 看到今日训练主题。
4. 看到今日训练结构。
5. 打开 `/plan/today`。
6. 07:00-08:00 block 显示：
   - Movement Training Route
   - 今日训练主题
   - 今日训练结构
   - quick check-in: completed / RPE / pain_before / pain_after / fatigue_after

## 阶段 4：Body Check-in UI

### 修改文件

- `components/checkin-dialog.tsx`
- `components/plan-block-card.tsx`
- `components/today-timeline.tsx`
- 可新增：
  - `components/body-activation-checkin.tsx`
  - `components/movement-training-checkin.tsx`
  - `components/body-route-badge.tsx`

### 03:30-04:00 quick check-in

字段：

- completed
- painBefore
- painAfter
- stiffnessBefore
- stiffnessAfter
- hipTightness
- neckShoulderTension
- lumbarSignal
- activationCompleted
- evidenceText
- evidenceUrl

UI 原则：

- 默认只显示 3 个字段：
  - completed
  - painBefore
  - painAfter
- 展开后显示全部字段。
- 不强迫输入 artifact。

### 07:00-08:00 quick check-in

字段：

- completed
- trainingType
- durationMinutes
- distanceOrSteps
- setsCompleted
- rpe
- painBefore
- painAfter
- fatigueAfter
- zone2Completed
- strengthCompleted
- mobilityCompleted
- evidenceText
- evidenceUrl

UI 原则：

- 默认只显示：
  - completed
  - RPE
  - painBefore
  - painAfter
  - fatigueAfter
- 展开后显示训练结构与 sets。

### API 修改

修改：

- `app/api/plan/block/[id]/checkin/route.ts`

新增：

- `app/api/body-checkin/route.ts` 或在 checkin route 中事务写入 `BodyCheckin`

事务规则：

1. 写 `ExecutionLog`。
2. 如果 block 为 Body Activation 或 Movement Training，写 `BodyCheckin`。
3. 更新 `PlanBlock.status`。
4. 如果有 evidenceText/evidenceUrl，后续日结可生成 `RouteEvidenceNode` 更新。

### 网页测试

1. 打开 `/plan/today`。
2. 点击 03:30-04:00 block。
3. 输入 painBefore=3、painAfter=2、completed=true。
4. 保存。
5. 刷新页面，状态变为完成。
6. 点击 07:00-08:00 block。
7. 输入 RPE=3、painBefore=2、painAfter=2、fatigueAfter=2。
8. 保存。
9. 生成日结。
10. 打开 `/skills`，确认 Body evidence count 或 lastEvidenceAt 有变化。

## 阶段 5：安全与自动降级规则

### 新增文件

- `lib/body/safety-rules.ts`
- `lib/body/movement-template.ts`
- `lib/body/activation-template.ts`
- `lib/body/repair-body-plan.ts`

### 规则

1. `painBefore >= 4` 或 `painAfter >= 4`：
   - 当天 Movement Training 自动降级为 `Recovery Walk + Body Activation Extension`。
2. `painAfter - painBefore >= 2`：
   - 第二天 Movement Training 自动降级一级。
3. `fatigueAfter >= 4` 连续两天：
   - 第三天 Movement Training 改为 `45 min brisk walk + mobility`。
4. 出现 sharp pain / radiating pain / numbness / weakness：
   - UI 显示 stop warning。
   - 建议停止训练并联系 doctor / physical therapist。
5. 前 4 周不安排：
   - sprint
   - jump
   - HIIT
   - max effort
6. 每周只允许增加一个训练变量：
   - duration
   - reps
   - sets
   - intensity
   - exercise difficulty

### 集成位置

- plan repair logic
- check-in response
- `/routes/current` Body safety status
- `/plan/today` 07:00-08:00 block display

### 网页测试

1. 对 07:00-08:00 block 打卡 painBefore=4。
2. 页面返回 warning。
3. Repair 后当天 Movement Training 显示 Recovery Walk。
4. 对 painBefore=1、painAfter=4 打卡。
5. 次日计划显示自动降级。
6. 连续两天 fatigueAfter=4。
7. 第三天显示 brisk walk + mobility。
8. 输入 sharp pain 文本，UI 显示 stop warning。

## 阶段 6：`/routes/current` Body 区域

### 修改文件

- `app/routes/current/page.tsx`
- `components/current-route-board.tsx`
- 新增：
  - `components/body-routes-panel.tsx`
  - `components/body-safety-status.tsx`

### 显示内容

Body 部分必须显示：

- Body Activation Route 当前阶段
- Movement Training Route 当前阶段
- 今日身体激活动作
- 今日运动训练主题
- 今日安全规则状态

### 网页测试

1. 打开 `/routes/current`。
2. Body panel 中出现两个路线：
   - Body Activation Route
   - Movement Training Route
3. Body Activation 显示 BA 当前阶段。
4. Movement Training 显示 MT 当前阶段。
5. 今日动作序列与今日训练结构可见。
6. 若最近 pain/fatigue 有风险，显示安全状态。

## 阶段 7：`/plan/today` Body block 展示

### 修改内容

03:30-04:00 block 显示：

- Body Activation Route
- 当前阶段
- 今日动作序列
- quick check-in: completed / pain_before / pain_after

07:00-08:00 block 显示：

- Movement Training Route
- 今日训练主题
- 今日训练结构
- quick check-in: completed / RPE / pain_before / pain_after / fatigue_after

### UI 验收

- 不能变成大段说明文。
- 卡片内展示摘要，详情放弹窗。
- 移动端不溢出。
- 完成后状态颜色明确。

### 网页测试

1. 桌面 1440px 截图。
2. 移动端 390px 截图。
3. 打开两个 body block 弹窗。
4. 关闭弹窗无状态丢失。
5. 快速打卡不超过 3 次点击。

## 阶段 8：Diet Seed 补丁

### 更新内容

更新 Body / Diet Route 默认饮食结构：

- romaine lettuce
- boiled eggs
- chicken thigh or beef patty
- bread as main carb
- Greek yogurt + chia seeds + frozen blueberries + small amount of nuts
- boiled broccoli
- fish oil
- magnesium
- creatine
- One A Day
- vitamin C
- vitamin D

### Diet check-in fields

保持：

- `protein_ok`
- `vegetable_ok`
- `fruit_ok`
- `carb_ok`
- `supplements_taken`
- `overeating_or_not`

### 网页测试

1. `/routes/current` Body/Diet 区显示 frozen blueberries、boiled broccoli、nuts。
2. `/plan/today` 09:00 第一餐显示 diet structure。
3. `/plan/today` 16:00 第二餐显示 diet structure。
4. 如 CourseSlot 冲突第二餐，第二餐可移动但不消失。

## 阶段 9：证据树与日结集成

### 修改文件

- `lib/skills/recompute.ts`
- `app/api/review/daily/route.ts`
- `lib/review/prompt.ts`
- `components/skill-tree-panel.tsx` 或 `components/evidence-tree-panel.tsx`

### 逻辑

1. Body Activation 打卡生成或更新对应 `RouteEvidenceNode`：
   - Breathing / Brace Reset
   - Neck / Scapular Reset
   - Spine / Hip Mobility
   - Glute Activation
   - Core Anti-extension
   - Morning Gait Reset
2. Movement Training 打卡生成或更新：
   - Aerobic Base
   - Run-Walk Progression
   - Bodyweight Strength
   - Core Stability
   - Hip / Ankle Mobility
   - Dance Coordination Support
   - Body Composition Control
3. `confidence` 根据证据质量更新：
   - completed + painAfter <= painBefore：加分
   - artifact/video：加分
   - painAfter 明显增加：不加分或降级提醒

### 网页测试

1. 完成 Body Activation 打卡。
2. 完成 Movement Training 打卡。
3. 生成日结。
4. 打开 `/skills`。
5. Body domain 下两个 track 出现。
6. evidence_count、confidence、lastEvidenceAt 更新。

## 阶段 10：端到端部署与审计

### 本地质量

必须通过：

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. `npm run build`
5. `npx prisma migrate status`

### Seed 验收

1. Body Activation Route 成功写入。
2. Movement Training Route 成功写入。
3. 24 周 Body route stages 成功写入：
   - BA1-BA6
   - MT1-MT6
4. Body Activation skill/evidence nodes 成功写入。
5. Movement Training skill/evidence nodes 成功写入。
6. Diet seed 更新成功。

### 真实网页 E2E

必须使用浏览器执行：

1. 登录线上或本地 LifeOS。
2. `/routes/current`：
   - Body Activation Route 可见。
   - Movement Training Route 可见。
   - 今日身体动作序列可见。
   - 今日运动训练主题可见。
   - 安全规则状态可见。
3. `/plan/new`：
   - 生成今日计划。
4. `/plan/today`：
   - 03:30-04:00 显示激活动作。
   - 07:00-08:00 显示训练主题。
5. 打卡 03:30 block：
   - painBefore / painAfter 保存。
6. 打卡 07:00 block：
   - RPE / painBefore / painAfter / fatigueAfter 保存。
7. Repair test：
   - painBefore >= 4 后，训练自动降级。
8. `/review/daily`：
   - 生成日结。
9. `/skills`：
   - Body Activation 与 Movement Training track 出现。
   - evidence 更新。
10. `/agents`：
   - 相关 plan/review/repair AgentRun 可审计。

### 部署

1. `npm run build`
2. `systemctl restart aialra-lifeos.service`
3. `systemctl is-active aialra-lifeos.service`
4. `curl -I https://lifeos.aialra.online/routes/current`
5. 浏览器重复关键 E2E。

### 安全审计

1. 不提交真实 `.env`。
2. 不提交用户密码。
3. 不提交 API key。
4. 只提交 seed 数据、schema、代码、计划文档。
5. Git 扫描：
   - OpenAI key 前缀
   - OpenAI 环境变量赋值
   - DeepSeek 环境变量赋值
   - Supabase service role 环境变量赋值
   - 数据库密码

### 完成报告

输出：

- 修改文件
- migration 名称
- seed 数量
- Body Activation stages 数量
- Movement Training stages 数量
- 新增 check-in 字段
- 网页测试步骤和结果
- lint/typecheck/test/build 结果
- 线上部署结果
- 已知问题

## 回滚策略

1. 如果 Body seed 有问题：
   - 停用 Body routes，不删除旧数据。
2. 如果 check-in UI 有问题：
   - 保留普通 `CheckinDialog` fallback。
3. 如果 repair logic 有问题：
   - 关闭自动降级，只显示 warning。
4. 如果线上部署失败：
   - 回到上一稳定 commit。
   - 重新 build/restart。

## 最终验收标准

必须全部通过：

1. Prisma migration 成功。
2. seed 成功写入 Body Activation Route。
3. seed 成功写入 Movement Training Route。
4. seed 成功写入 24 周 Body route stages。
5. `/routes/current` 能显示两个 Body route。
6. `/plan/today` 03:30-04:00 显示身体激活动作序列。
7. `/plan/today` 07:00-08:00 显示当天训练主题。
8. 打卡支持 painBefore / painAfter / rpe / fatigueAfter。
9. repair logic 能根据 pain/fatigue 自动降级运动训练。
10. 技能树 Body domain 出现 Body Activation 与 Movement Training 两条 track。
11. 饮食结构更新为包含 frozen blueberries、boiled broccoli、nuts。
12. `npm run lint` 通过。
13. `npm run typecheck` 通过。
14. 输出完成报告，列出修改文件、migration、seed 数量、测试结果和已知问题。

## 执行顺序

本补丁必须在 `07 Cognitive Route Engine v1` 后执行：

1. 先执行 07 阶段 0-10。
2. 确认 `/routes`、`/routes/current`、route seed、plan route binding 已可用。
3. 再执行本补丁阶段 0-10。
4. 本补丁不得回头修改 Chip/EDA、AI Systems、Business、Art routes。
