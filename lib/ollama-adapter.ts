import { qwenStatusSchema } from "./office.ts";

export type OllamaAdapter = {
  status: () => ReturnType<typeof qwenStatusSchema.parse>;
  infer: (request: {
    role: string;
    instructions: string;
    input: string;
    signal?: AbortSignal;
  }) => Promise<string>;
};

type OllamaConfig = {
  baseUrl?: string;
  model?: string;
};

function modelScore(name: string) {
  const normalized = name.toLowerCase();
  if (!/(qwen|qwq)/.test(normalized)) return -1;
  const match = normalized.match(/(\d+(?:\.\d+)?)b/);
  const parameters = match ? Number(match[1]) : 0;
  const quality =
    normalized.includes("thinking") || normalized.includes("coder") ? 2 : 0;
  return parameters * 10 + quality;
}

export function chooseBestQwenModel(models: string[]) {
  return (
    [...models]
      .filter((model) => modelScore(model) >= 0)
      .sort(
        (left, right) =>
          modelScore(right) - modelScore(left) || right.localeCompare(left),
      )[0] || ""
  );
}

export function createOllamaAdapter(config: OllamaConfig = {}): OllamaAdapter {
  const baseUrl = (config.baseUrl || "http://127.0.0.1:11434")
    .trim()
    .replace(/\/+$/, "");
  let model = config.model?.trim() || "";
  let lastError = "";
  const status = () =>
    qwenStatusSchema.parse({
      mode: "local_configurable",
      status: model ? (lastError ? "degraded" : "ready") : "not_configured",
      model,
      endpointConfigured: Boolean(model),
      ...(lastError ? { lastError } : {}),
    });
  return {
    status,
    async infer({ role, instructions, input, signal }) {
      if (!model) {
        const tagsResponse = await fetch(`${baseUrl}/api/tags`, { signal });
        if (!tagsResponse.ok) {
          lastError = `Ollama returned HTTP ${tagsResponse.status} while discovering models`;
          throw Error(lastError);
        }
        const tags = (await tagsResponse.json()) as {
          models?: Array<{ name?: unknown }>;
        };
        model = chooseBestQwenModel(
          (tags.models || []).flatMap((item) =>
            typeof item.name === "string" ? [item.name] : [],
          ),
        );
        if (!model) {
          lastError = "No installed Qwen model was found in Ollama";
          throw Error(lastError);
        }
      }
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
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
            : "Ollama request failed";
        throw error;
      });
      if (!response.ok) {
        lastError = `Ollama returned HTTP ${response.status}`;
        throw Error(lastError);
      }
      const data = (await response.json()) as {
        message?: { content?: unknown };
      };
      if (
        typeof data.message?.content !== "string" ||
        !data.message.content.trim()
      ) {
        lastError = "Ollama returned no text";
        throw Error(lastError);
      }
      lastError = "";
      return data.message.content;
    },
  };
}
