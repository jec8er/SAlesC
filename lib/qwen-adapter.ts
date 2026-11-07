import type { EcomodaInference } from "./ecomoda-core.mjs";
import { qwenStatusSchema } from "./office.ts";

export type QwenAdapter = {
  status: () => ReturnType<typeof qwenStatusSchema.parse>;
  infer: EcomodaInference;
};

type QwenConfig = {
  endpoint?: string;
  model?: string;
  apiKey?: string;
};

export function createQwenAdapter(config: QwenConfig = {}): QwenAdapter {
  const endpoint = config.endpoint?.trim().replace(/\/+$/, "");
  const model = config.model?.trim() || "";
  let lastError = "";
  const status = () =>
    qwenStatusSchema.parse({
      mode: "local_configurable",
      status:
        endpoint && model
          ? lastError
            ? "degraded"
            : "ready"
          : "not_configured",
      model,
      endpointConfigured: Boolean(endpoint && model),
      ...(lastError ? { lastError } : {}),
    });
  return {
    status,
    async infer({ role, instructions, input, signal }) {
      if (!endpoint || !model)
        throw Error("Qwen local adapter is not configured");
      const response = await fetch(`${endpoint}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.apiKey
            ? { Authorization: `Bearer ${config.apiKey}` }
            : {}),
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          messages: [
            { role: "system", content: instructions },
            { role: "user", content: JSON.stringify({ role, input }) },
          ],
        }),
        signal,
      }).catch((error) => {
        lastError =
          error instanceof Error
            ? error.message.slice(0, 300)
            : "Qwen request failed";
        throw error;
      });
      if (!response.ok) {
        lastError = `Qwen adapter returned HTTP ${response.status}`;
        throw Error(lastError);
      }
      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: unknown } }>;
      };
      const output = data.choices?.[0]?.message?.content;
      if (typeof output !== "string" || !output.trim()) {
        lastError = "Qwen adapter returned no text";
        throw Error(lastError);
      }
      lastError = "";
      return output;
    },
  };
}
