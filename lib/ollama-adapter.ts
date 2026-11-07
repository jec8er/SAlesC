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
  maxParameters?: number;
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

export function chooseBestQwenModel(models: string[], maxParameters = 8) {
  return (
    [...models]
      .filter((model) => {
        const match = model.toLowerCase().match(/(\d+(?:\.\d+)?)b/);
        return (
          modelScore(model) >= 0 &&
          Boolean(match) &&
          Number(match![1]) <= maxParameters
        );
      })
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
  let active = false;
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
      if (active)
        throw Error("Qwen is busy; retry after the active request finishes");
      active = true;
      const timeout = AbortSignal.timeout(120000);
      signal = signal ? AbortSignal.any([signal, timeout]) : timeout;
      try {
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
            config.maxParameters ?? 8,
          );
          if (!model) {
            lastError =
              "No installed Qwen model fits the automatic 8B limit; configure OLLAMA_MODEL explicitly for another model";
            throw Error(lastError);
          }
        }
        const response = await fetch(`${baseUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            stream: false,
            think: false,
            options: { num_predict: 512, num_ctx: 4096, num_thread: 2 },
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
          message?: { content?: unknown; thinking?: unknown };
        };
        const content =
          typeof data.message?.content === "string" ? data.message.content : "";
        if (!content || !content.trim()) {
          lastError = "Ollama returned no text";
          throw Error(lastError);
        }
        lastError = "";
        return content;
      } catch (error) {
        lastError =
          error instanceof Error
            ? error.message.slice(0, 300)
            : "Ollama request failed";
        throw error;
      } finally {
        active = false;
      }
    },
  };
}
