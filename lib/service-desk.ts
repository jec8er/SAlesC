import { z } from "zod";

const id = z.string().uuid();
const short = z.string().trim().min(1).max(180);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(value + "T12:00:00Z");
    return (
      Number.isFinite(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Use a real calendar date");

export const inquiryInput = z
  .object({
    id,
    customer: short,
    contact: z.string().trim().max(254),
    request: z.string().trim().min(1).max(2000),
    source: z.enum(["referral", "email", "phone", "website", "other"]),
  })
  .strict();

export const serviceAction = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("status"),
      revision: z.number().int().nonnegative(),
      status: z.enum(["new", "contacted", "won", "lost"]),
    })
    .strict(),
  z
    .object({
      action: z.literal("quote"),
      revision: z.number().int().nonnegative(),
      quoteId: id,
      scope: z.string().trim().min(1).max(2000),
      amountCents: z.number().int().min(0).max(100000000),
      pricingNotes: z.string().trim().min(1).max(500),
    })
    .strict(),
  z
    .object({
      action: z.literal("approve-quote"),
      revision: z.number().int().nonnegative(),
      quoteId: id,
    })
    .strict(),
  z
    .object({
      action: z.literal("follow-up"),
      revision: z.number().int().nonnegative(),
      taskId: id,
      title: z.string().trim().min(1).max(400),
      due: date,
    })
    .strict(),
  z
    .object({
      action: z.literal("complete-follow-up"),
      revision: z.number().int().nonnegative(),
      taskId: id,
    })
    .strict(),
]);

export type ServiceAction = z.infer<typeof serviceAction>;
export type Inquiry = z.infer<typeof inquiryInput> & {
  revision: number;
  status: "new" | "contacted" | "won" | "lost";
  createdAt: string;
  updatedAt: string;
  quotes: {
    id: string;
    scope: string;
    amountCents: number;
    pricingNotes: string;
    createdAt: string;
    approvedAt: string | null;
  }[];
  followUps: {
    id: string;
    title: string;
    due: string;
    completedAt: string | null;
  }[];
  events: { action: string; at: string }[];
};

export function newInquiry(
  input: z.infer<typeof inquiryInput>,
  at: string,
): Inquiry {
  return {
    ...input,
    revision: 0,
    status: "new",
    createdAt: at,
    updatedAt: at,
    quotes: [],
    followUps: [],
    events: [{ action: "inquiry-created", at }],
  };
}

export function updateInquiry(
  current: Inquiry,
  action: ServiceAction,
  at: string,
): Inquiry {
  if (current.revision !== action.revision)
    throw Error("This inquiry changed. Reload before saving again.");
  const next = structuredClone(current);
  if (next.events.length >= 1000)
    throw Error(
      "Inquiry history limit reached. Export the record before continuing.",
    );
  if (action.action === "status") next.status = action.status;
  if (action.action === "quote") {
    if (next.quotes.length >= 20) throw Error("Quote version limit reached.");
    if (next.quotes.some((quote) => quote.id === action.quoteId))
      throw Error("This quote already exists.");
    next.quotes.push({
      id: action.quoteId,
      scope: action.scope,
      amountCents: action.amountCents,
      pricingNotes: action.pricingNotes,
      createdAt: at,
      approvedAt: null,
    });
  }
  if (action.action === "approve-quote") {
    const quote = next.quotes.at(-1);
    if (!quote || quote.id !== action.quoteId)
      throw Error("Only the current quote can be approved.");
    if (quote.approvedAt) throw Error("This quote was already approved.");
    quote.approvedAt = at;
  }
  if (action.action === "follow-up") {
    if (next.followUps.length >= 100) throw Error("Follow-up limit reached.");
    if (next.followUps.some((task) => task.id === action.taskId))
      throw Error("This follow-up already exists.");
    next.followUps.push({
      id: action.taskId,
      title: action.title,
      due: action.due,
      completedAt: null,
    });
  }
  if (action.action === "complete-follow-up") {
    const task = next.followUps.find((item) => item.id === action.taskId);
    if (!task || task.completedAt)
      throw Error("This follow-up is missing or already completed.");
    task.completedAt = at;
  }
  next.revision++;
  next.updatedAt = at;
  next.events.push({ action: action.action, at });
  return next;
}

export function quoteText(inquiry: Inquiry) {
  const quote = inquiry.quotes.at(-1);
  if (!quote) throw Error("No quote is available to export.");
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(quote.amountCents / 100);
  return `ORBIT — SERVICE QUOTE DRAFT\nCustomer: ${inquiry.customer}\nQuote version: ${inquiry.quotes.length}\nQuote ID: ${quote.id}\nCreated: ${quote.createdAt}\nStatus: ${quote.approvedAt ? "Owner-approved draft; customer acceptance not recorded" : "DRAFT — owner review required"}\n\nPROPOSED SCOPE\n${quote.scope}\n\nPROPOSED AMOUNT\n${amount}\n\nPRICE, TAX AND FEE TERMS\n${quote.pricingNotes}\n\nThis document is a draft, not an invoice or proof of payment. It has not been sent by ORBIT. Final scope, schedule, operator identity, contractual terms and customer acceptance must be confirmed separately.\n`;
}
