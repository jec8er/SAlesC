import { randomBytes } from "node:crypto";
import Stripe from "stripe";

export const billingPlans = {
  observer: { name: "Observer", monthlyUsd: 29 },
  operator: { name: "Operator", monthlyUsd: 99 },
  desk: { name: "Desk", monthlyUsd: 299 },
} as const;

export type BillingPlan = keyof typeof billingPlans;
export type BillingStatus = "active" | "delinquent" | "canceled" | "pending";

export type BillingUpdate = {
  eventId: string;
  customerId: string;
  subscriptionId: string;
  email: string;
  plan: BillingPlan;
  status: BillingStatus;
};

export interface BillingGateway {
  createCheckout(plan: BillingPlan, origin: string): Promise<{ url: string }>;
  parseWebhook(
    payload: Buffer,
    signature: string,
  ): Promise<BillingUpdate | null>;
}

type StripeBillingConfig = {
  restrictedKey: string;
  webhookSecret: string;
  prices: Record<BillingPlan, string>;
};

const alphabet = "abcdefghijklmnopqrstuvwxyz";
function integrationIdentifier() {
  const bytes = randomBytes(8);
  return `orbit_beta_${Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("")}`;
}

export function createStripeBillingGateway(
  config: StripeBillingConfig,
): BillingGateway {
  if (!/^rk_(test|live)_/.test(config.restrictedKey))
    throw Error("STRIPE_RESTRICTED_KEY must be a restricted Stripe key");
  if (!/^whsec_/.test(config.webhookSecret))
    throw Error("STRIPE_WEBHOOK_SECRET is invalid");
  for (const price of Object.values(config.prices))
    if (!/^price_/.test(price))
      throw Error("Every Stripe plan needs a Price ID");

  const stripe = new Stripe(config.restrictedKey, {
    apiVersion: "2026-08-26.dahlia",
  });
  const planByPrice = new Map(
    Object.entries(config.prices).map(([plan, price]) => [
      price,
      plan as BillingPlan,
    ]),
  );

  async function subscriptionUpdate(
    eventId: string,
    subscriptionId: string,
    fallbackEmail = "",
  ): Promise<BillingUpdate | null> {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price.id;
    const plan = priceId ? planByPrice.get(priceId) : undefined;
    if (!plan) return null;
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;
    let email = fallbackEmail;
    if (!email) {
      const customer = await stripe.customers.retrieve(customerId);
      if (!("deleted" in customer)) email = customer.email || "";
    }
    const status: BillingStatus = ["active", "trialing"].includes(
      subscription.status,
    )
      ? "active"
      : ["canceled", "incomplete_expired"].includes(subscription.status)
        ? "canceled"
        : "delinquent";
    return {
      eventId,
      customerId,
      subscriptionId,
      email,
      plan,
      status,
    };
  }

  return {
    async createCheckout(plan, origin) {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: config.prices[plan], quantity: 1 }],
        success_url: `${origin}/pricing?checkout=success`,
        cancel_url: `${origin}/pricing?checkout=canceled`,
        integration_identifier: integrationIdentifier(),
        allow_promotion_codes: true,
      });
      if (!session.url) throw Error("Stripe did not return a Checkout URL");
      return { url: session.url };
    },
    async parseWebhook(payload, signature) {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        config.webhookSecret,
      );
      if (
        event.type === "checkout.session.completed" ||
        event.type === "checkout.session.async_payment_succeeded" ||
        event.type === "checkout.session.async_payment_failed"
      ) {
        const session = event.data.object;
        if (session.payment_status === "unpaid" || !session.subscription)
          return null;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
        return subscriptionUpdate(
          event.id,
          subscriptionId,
          session.customer_details?.email || "",
        );
      }
      if (event.type.startsWith("customer.subscription.")) {
        const subscription = event.data.object as Stripe.Subscription;
        return subscriptionUpdate(event.id, subscription.id);
      }
      if (
        event.type === "invoice.paid" ||
        event.type === "invoice.payment_failed"
      ) {
        const relation = event.data.object.parent?.subscription_details;
        const subscription = relation?.subscription;
        if (!subscription) return null;
        const expanded = subscription as { id?: unknown };
        const id =
          typeof subscription === "string"
            ? subscription
            : typeof expanded.id === "string"
              ? expanded.id
              : "";
        if (!id) return null;
        return subscriptionUpdate(event.id, id);
      }
      return null;
    },
  };
}
