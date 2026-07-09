"use client";

import {
  CreateMLCEngine,
  type MLCEngineInterface,
  type InitProgressReport,
} from "@mlc-ai/web-llm";

// 3B quantized: good balance of quality vs. download size (~1.8GB, cached after first load).
// Swap to "Qwen2.5-1.5B-Instruct-q4f16_1-MLC" for low-RAM machines.
export const MODEL_ID = "Llama-3.2-3B-Instruct-q4f16_1-MLC";

let enginePromise: Promise<MLCEngineInterface> | null = null;

export function getEngine(
  onProgress?: (report: InitProgressReport) => void
): Promise<MLCEngineInterface> {
  if (!enginePromise) {
    enginePromise = CreateMLCEngine(MODEL_ID, {
      initProgressCallback: (report) => onProgress?.(report),
    });
  }
  return enginePromise;
}

export async function generateJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  onProgress?: (report: InitProgressReport) => void
): Promise<T> {
  const engine = await getEngine(onProgress);
  const reply = await engine.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 1200,
    response_format: { type: "json_object" },
  });
  const raw = reply.choices[0]?.message?.content ?? "{}";
  // Strip accidental code fences before parsing
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean) as T;
}
