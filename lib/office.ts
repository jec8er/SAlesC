import { z } from "zod";

const text = z.string().trim().min(1).max(240);
const timestamp = z.string().datetime();

export const officeAgentIds = [
  "research",
  "audience",
  "trend",
  "script",
  "creative",
  "editor",
  "brand",
  "seo",
  "localization",
  "factchecker",
  "legal",
  "producer",
  "publisher",
  "community",
  "analytics",
  "growth",
  "monetization",
  "auditor",
] as const;

export type OfficeAgentId = (typeof officeAgentIds)[number];

export const officeAgentSchema = z
  .object({
    id: z.enum(officeAgentIds),
    name: text,
    specialty: text,
    state: z.enum(["idle", "working", "waiting", "blocked"]),
  })
  .strict();

export const officeStageSchema = z.enum([
  "intake",
  "research",
  "creation",
  "review",
  "distribution",
  "analysis",
  "revenue_review",
]);
export type OfficeStage = z.infer<typeof officeStageSchema>;

export const officeConnectorSchema = z
  .object({
    id: z.enum(["qwen", "tiktok", "youtube", "analytics", "revenue"]),
    label: text,
    status: z.enum(["not_configured", "ready", "degraded", "blocked"]),
    capabilities: z.array(text).max(12),
    detail: z.string().trim().min(1).max(300),
    checkedAt: timestamp.optional(),
  })
  .strict();

export const officeHandoffSchema = z
  .object({
    id: text,
    sequence: z.number().int().min(1).max(1000),
    from: z.enum(officeAgentIds),
    to: z.enum(officeAgentIds),
    stage: officeStageSchema,
    status: z.enum(["pending", "completed", "blocked"]),
    note: z.string().trim().min(1).max(600),
    evidenceRefs: z.array(text).max(30),
    createdAt: timestamp,
  })
  .strict();

export const verifiedRevenueSchema = z
  .object({
    id: text,
    platform: z.enum(["tiktok", "youtube"]),
    amount: z.number().finite().positive().max(100000000),
    currency: z.enum(["USD", "COP"]),
    source: z.enum(["platform_payout", "payment_processor", "bank_statement"]),
    externalReference: text,
    verifiedAt: timestamp,
    verifiedBy: z.enum(["owner", "connector"]),
  })
  .strict();

export const officeRewardSchema = z
  .object({
    id: text,
    revenueId: text,
    amount: z.number().finite().positive().max(100000000),
    currency: z.enum(["USD", "COP"]),
    status: z.enum(["eligible", "paid", "revoked"]),
    createdAt: timestamp,
  })
  .strict();

export const qwenStatusSchema = z
  .object({
    mode: z.literal("local_configurable"),
    status: z.enum(["not_configured", "ready", "degraded"]),
    model: z.string().trim().max(120),
    endpointConfigured: z.boolean(),
    lastError: z.string().trim().max(300).optional(),
  })
  .strict();

export const orbitLinkSchema = z
  .object({
    missionId: text.optional(),
    status: z.enum(["not_linked", "linked", "blocked"]),
    detail: text,
    linkedAt: timestamp.optional(),
  })
  .strict();

const defaultAgents: ReadonlyArray<[OfficeAgentId, string, string]> = [
  ["research", "Research", "Evidence and source collection"],
  ["audience", "Audience", "Audience needs and content fit"],
  ["trend", "Trend", "Trend signals from supplied evidence"],
  ["script", "Script", "Narrative and short-form structure"],
  ["creative", "Creative", "Hooks, concepts, and visual direction"],
  ["editor", "Editor", "Pacing, clarity, and cut notes"],
  ["brand", "Brand", "Voice and visual consistency"],
  ["seo", "Search", "Titles, descriptions, and keywords"],
  ["localization", "Localization", "Language and cultural adaptation"],
  ["factchecker", "Fact check", "Claims and source verification"],
  ["legal", "Policy", "Rights, disclosures, and platform policy"],
  ["producer", "Producer", "Briefs, assets, and production readiness"],
  ["publisher", "Publisher", "Platform publishing handoff"],
  ["community", "Community", "Comments and audience feedback"],
  ["analytics", "Analytics", "Observed platform performance"],
  ["growth", "Growth", "Evidence-based iteration proposals"],
  ["monetization", "Monetization", "Revenue pathways and attribution"],
  ["auditor", "Auditor", "Independent evidence trail"],
];

export const officeWorkspaceSchema = z
  .object({
    channel: z.literal("tiktok_youtube"),
    currentStage: officeStageSchema,
    orbit: orbitLinkSchema.optional(),
    agents: z.array(officeAgentSchema).length(18),
    connectors: z.array(officeConnectorSchema).length(5),
    handoffs: z.array(officeHandoffSchema).max(5000),
    verifiedRevenue: z.array(verifiedRevenueSchema).max(1000),
    rewards: z.array(officeRewardSchema).max(1000),
    qwen: qwenStatusSchema,
  })
  .strict()
  .superRefine((office, context) => {
    if (
      new Set(office.agents.map((agent) => agent.id)).size !==
      office.agents.length
    )
      context.addIssue({
        code: "custom",
        message: "Office agents must have unique identifiers",
        path: ["agents"],
      });
    for (const revenue of office.verifiedRevenue) {
      const allocated = office.rewards
        .filter(
          (reward) =>
            reward.revenueId === revenue.id && reward.status !== "revoked",
        )
        .reduce((total, reward) => total + reward.amount, 0);
      if (allocated > revenue.amount)
        context.addIssue({
          code: "custom",
          message: "Total rewards must be covered by verified revenue",
          path: ["rewards"],
        });
    }
    const revenueIds = new Set(office.verifiedRevenue.map((item) => item.id));
    if (office.rewards.some((reward) => !revenueIds.has(reward.revenueId)))
      context.addIssue({
        code: "custom",
        message: "Rewards require verified revenue evidence",
        path: ["rewards"],
      });
    if (
      office.rewards.some(
        (reward) =>
          reward.status !== "revoked" &&
          !office.verifiedRevenue.some(
            (revenue) =>
              revenue.id === reward.revenueId &&
              revenue.currency === reward.currency &&
              revenue.amount >= reward.amount,
          ),
      )
    )
      context.addIssue({
        code: "custom",
        message: "Reward amount must be covered by verified revenue",
        path: ["rewards"],
      });
  });

export type OfficeWorkspace = z.infer<typeof officeWorkspaceSchema>;
export type OfficeConnector = z.infer<typeof officeConnectorSchema>;

export const emptyOfficeWorkspace = (): OfficeWorkspace => ({
  channel: "tiktok_youtube",
  currentStage: "intake",
  orbit: {
    status: "not_linked",
    detail: "Link an audit-passed ORBIT mission before content creation.",
  },
  agents: defaultAgents.map(([id, name, specialty]) => ({
    id,
    name,
    specialty,
    state: "idle" as const,
  })),
  connectors: [
    {
      id: "qwen",
      label: "Qwen local adapter",
      status: "not_configured",
      capabilities: ["agent proposals"],
      detail: "Configure a local Qwen-compatible endpoint to enable proposals.",
    },
    {
      id: "tiktok",
      label: "TikTok",
      status: "not_configured",
      capabilities: ["publishing"],
      detail: "No TikTok publishing adapter is configured.",
    },
    {
      id: "youtube",
      label: "YouTube",
      status: "not_configured",
      capabilities: ["publishing"],
      detail: "No YouTube publishing adapter is configured.",
    },
    {
      id: "analytics",
      label: "Platform analytics",
      status: "not_configured",
      capabilities: ["observed metrics"],
      detail: "Connect a read-only analytics adapter to observe real results.",
    },
    {
      id: "revenue",
      label: "Revenue evidence",
      status: "not_configured",
      capabilities: ["verified payouts"],
      detail: "Rewards remain unavailable until payout evidence is verified.",
    },
  ],
  handoffs: [],
  verifiedRevenue: [],
  rewards: [],
  qwen: {
    mode: "local_configurable",
    status: "not_configured",
    model: "",
    endpointConfigured: false,
  },
});

const stageConnector: Partial<Record<OfficeStage, OfficeConnector["id"]>> = {
  distribution: "tiktok",
  analysis: "analytics",
  revenue_review: "revenue",
};

const orbitRequiredFrom: OfficeStage = "creation";

export function requiredConnector(stage: OfficeStage) {
  return stageConnector[stage] || null;
}

export function advanceOfficeStage(
  office: OfficeWorkspace,
  now: string,
): { office: OfficeWorkspace; blocked: string | null } {
  const stages = officeStageSchema.options;
  const index = stages.indexOf(office.currentStage);
  if (index === stages.length - 1)
    return {
      office,
      blocked: "The office is already at the final review stage.",
    };
  const nextStage = stages[index + 1];
  const required = requiredConnector(nextStage);
  const requiredConnectors =
    nextStage === "distribution"
      ? office.connectors.filter(
          (item) => item.id === "tiktok" || item.id === "youtube",
        )
      : required
        ? office.connectors.filter((item) => item.id === required)
        : [];
  const connector = requiredConnectors.find((item) => item.status !== "ready");
  if (connector)
    return {
      office,
      blocked: `${connector.label} is ${connector.status}; configure a real adapter before advancing.`,
    };
  if (
    stages.indexOf(nextStage) >= stages.indexOf(orbitRequiredFrom) &&
    office.orbit?.status !== "linked"
  )
    return {
      office,
      blocked:
        "An audit-passed ORBIT mission must be linked before the office can enter content creation.",
    };
  const next = structuredClone(office);
  next.currentStage = nextStage;
  next.handoffs.push({
    id: crypto.randomUUID(),
    sequence: next.handoffs.length + 1,
    from: "auditor",
    to: nextStage === "revenue_review" ? "monetization" : "auditor",
    stage: nextStage,
    status: "completed",
    note: `Stage advanced to ${nextStage} after connector and evidence checks.`,
    evidenceRefs: [],
    createdAt: now,
  });
  return { office: next, blocked: null };
}

export function createVerifiedReward(
  office: OfficeWorkspace,
  revenueId: string,
  amount: number,
  now: string,
) {
  const revenue = office.verifiedRevenue.find((item) => item.id === revenueId);
  if (!revenue) throw Error("Verified revenue evidence is required");
  const allocated = office.rewards
    .filter(
      (reward) => reward.revenueId === revenueId && reward.status !== "revoked",
    )
    .reduce((total, reward) => total + reward.amount, 0);
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > revenue.amount - allocated
  )
    throw Error("Reward must be positive and covered by verified revenue");
  return officeRewardSchema.parse({
    id: crypto.randomUUID(),
    revenueId,
    amount,
    currency: revenue.currency,
    status: "eligible",
    createdAt: now,
  });
}
