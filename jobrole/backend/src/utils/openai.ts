import { logger } from "./logger";

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";

function getModel(): string {
  return process.env.OLLAMA_MODEL || "llama3.2";
}

interface OllamaChatResponse {
  model: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export async function chatCompletion(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const model = getModel();
  const url = `${OLLAMA_BASE_URL}/api/chat`;

  logger.debug("Calling Ollama", { model, url });

  const body = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    stream: false,
    format: "json",
    options: {
      temperature: options?.temperature ?? 0.3,
      num_predict: options?.maxTokens ?? 4096,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown error");
    throw new Error(`Ollama request failed (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as OllamaChatResponse;
  const content = data.message?.content;

  if (!content) {
    throw new Error("Empty response from Ollama");
  }

  return content;
}

export function parseJsonResponse<T>(raw: string): T {
  let cleaned = raw.trim();

  // Strip markdown code fences if present
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  // Try direct parse first
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Local models often wrap JSON in conversational text.
    // Find the first { or [ and the last } or ] to extract the JSON object/array.
    const firstBrace = cleaned.indexOf("{");
    const firstBracket = cleaned.indexOf("[");
    let start = -1;
    let end = -1;

    if (firstBrace === -1 && firstBracket === -1) {
      throw new Error(`No JSON found in LLM response: ${cleaned.substring(0, 200)}`);
    }

    if (firstBracket === -1 || (firstBrace !== -1 && firstBrace < firstBracket)) {
      // Object
      start = firstBrace;
      end = cleaned.lastIndexOf("}");
    } else {
      // Array
      start = firstBracket;
      end = cleaned.lastIndexOf("]");
    }

    if (start === -1 || end === -1 || end <= start) {
      throw new Error(`Malformed JSON in LLM response: ${cleaned.substring(0, 200)}`);
    }

    const jsonStr = cleaned.substring(start, end + 1);
    try {
      return JSON.parse(jsonStr) as T;
    } catch (e) {
      logger.error("Failed to parse extracted JSON", { extracted: jsonStr.substring(0, 500) });
      throw new Error(`Invalid JSON from LLM: ${(e as Error).message}`);
    }
  }
}
