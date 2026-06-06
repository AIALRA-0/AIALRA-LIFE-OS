const domainLabels: Record<string, string> = {
  startup: "启动",
  review: "复盘审计",
  chip_eda: "芯片/EDA",
  health: "身体训练",
  diet: "饮食",
  business: "商业金融表达",
  ai_agent: "AI Agent",
  music: "音乐制作",
  vocal: "声乐",
  dance: "舞蹈",
  external_feedback: "外部反馈",
  arts: "艺术训练",
  career: "职业",
  social: "社交表达",
  systems: "系统建设",
  technical: "技术主线"
};

const statusLabels: Record<string, string> = {
  COMPLETED: "完成",
  PARTIAL: "部分完成",
  MISSED: "未完成",
  SKIPPED: "跳过",
  RESCHEDULED: "改期",
  IN_PROGRESS: "进行中",
  PENDING: "待开始",
  ACTIVE: "运行中",
  DRAFT: "草稿",
  ARCHIVED: "已归档",
  REVIEW: "待复查",
  SEED: "种子数据",
  FAILED: "失败",
  RUNNING: "运行中"
};

const riskLabels: Record<string, string> = {
  normal: "正常",
  fatigue: "疲劳",
  recovery: "恢复日",
  high_urge: "高冲动风险",
  overloaded: "过载"
};

const runTypeLabels: Record<string, string> = {
  PlannerAgent: "计划 Agent",
  ResearchAgent: "研究 Agent",
  ReviewAgent: "复盘 Agent",
  SkillRecomputeAgent: "技能重算 Agent"
};

const resourceGroupLabels: Record<string, string> = {
  chipEda: "芯片/EDA",
  aiAgent: "AI Agent",
  business: "商业金融",
  arts: "艺术训练",
  infrastructure: "基础设施"
};

const slotStateLabels: Record<string, string> = {
  before_day: "今日计划未开始",
  before_start: "今日计划未开始",
  active: "当前时间块",
  after_day: "今日计划已结束",
  after_end: "今日计划已结束"
};

export function zhDomain(value: string) {
  return domainLabels[value] ?? value;
}

export function zhStatus(value: string) {
  return statusLabels[value] ?? value;
}

export function zhRisk(value: string) {
  return riskLabels[value] ?? value;
}

export function zhRunType(value: string) {
  return runTypeLabels[value] ?? value;
}

export function zhResourceGroup(value: string) {
  return resourceGroupLabels[value] ?? value;
}

export function zhSlotState(value: string) {
  return slotStateLabels[value] ?? value;
}
