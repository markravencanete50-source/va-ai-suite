"use client";

import {
  CreateMLCEngine,
  prebuiltAppConfig,
  type AppConfig,
  type MLCEngineInterface,
  type InitProgressReport,
} from "@mlc-ai/web-llm";

// 3B quantized: good balance of quality vs. download size (~1.8GB, cached after first load).
// Swap to "Qwen2.5-1.5B-Instruct-q4f16_1-MLC" for low-RAM machines.
export const MODEL_ID = "Llama-3.2-3B-Instruct-q4f16_1-MLC";

// WebLLM's default config fetches the model's WASM library from raw.githubusercontent.com,
// which is not a real CDN and returns HTTP 429 (rate limited) under any real traffic.
// jsDelivr mirrors the exact same GitHub repo over a proper CDN with permissive CORS —
// so we rewrite every model_lib URL to go through it.
function jsdelivr(url: string): string {
  return url.replace(
    /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\//,
    "https://cdn.jsdelivr.net/gh/$1/$2@$3/"
  );
}

const APP_CONFIG: AppConfig = {
  ...prebuiltAppConfig,
  // IndexedDB backend: the default Cache Storage backend throws
  // "Failed to execute 'add' on 'Cache'" in Electron, private windows and
  // storage-partitioned browsers. IndexedDB works across all of them.
  cacheBackend: "indexeddb",
  model_list: prebuiltAppConfig.model_list.map((m) => ({
    ...m,
    model_lib: jsdelivr(m.model_lib),
  })),
};

let enginePromise: Promise<MLCEngineInterface> | null = null;

export function getEngine(
  onProgress?: (report: InitProgressReport) => void
): Promise<MLCEngineInterface> {
  if (!enginePromise) {
    enginePromise = CreateMLCEngine(MODEL_ID, {
      initProgressCallback: (report) => onProgress?.(report),
      appConfig: APP_CONFIG,
    });
  }
  return enginePromise;
}

/** True when this browser can actually run the model (WebGPU + a usable GPU adapter). */
export async function checkWebGPU(): Promise<{ ok: boolean; reason?: string }> {
  const gpu =
    typeof navigator !== "undefined"
      ? (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
      : undefined;
  if (!gpu) {
    return { ok: false, reason: "This browser has no WebGPU. Use Chrome or Edge on desktop." };
  }
  try {
    const adapter = await gpu.requestAdapter();
    if (!adapter) {
      return { ok: false, reason: "No compatible GPU found. Try Chrome/Edge on a desktop with a GPU." };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: `WebGPU check failed: ${String(e)}` };
  }
}

export async function generateJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  onProgress?: (report: InitProgressReport) => void,
  maxTokens = 1200
): Promise<T> {
  const gpu = await checkWebGPU();
  if (!gpu.ok) throw new Error(gpu.reason);

  const engine = await getEngine(onProgress);
  const reply = await engine.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
  });
  const raw = reply.choices[0]?.message?.content ?? "{}";
  // Strip accidental code fences before parsing
  const clean = raw.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean) as T;
  } catch {
    throw new Error("The model returned malformed output. Please try generating again.");
  }
}
