/**
 * Local LLM model registry (<=3B, Hugging Face origin).
 *
 * Default: Qwen3-1.7B — newest small multilingual model with a prebuilt
 * WebLLM (MLC) artifact, ES/EN support, ~1.1GB at Q4. Ideal for 4-8GB machines.
 */
export interface LocalModelCard {
  id: string;
  name: string;
  hfRepo: string;
  /** Prebuilt WebLLM / MLC model id (q4f16_1) for WebGPU inference. */
  webllmId: string;
  /** Optional ONNX fallback id for Transformers.js (WebGPU/WASM). */
  onnxId?: string;
  sizeLabel: string;
  sizeBytes: number;
  contextLength: number;
  description: string;
  needsShaderF16?: boolean;
}

export const DEFAULT_LOCAL_MODEL_ID = "qwen3-1.7b";

export const LOCAL_MODELS: LocalModelCard[] = [
  {
    id: "qwen3-1.7b",
    name: "Qwen3 1.7B (defecto)",
    hfRepo: "Qwen/Qwen3-1.7B",
    webllmId: "Qwen3-1.7B-q4f16_1-MLC",
    onnxId: "onnx-community/Qwen3-1.7B-ONNX",
    sizeLabel: "~1.1GB",
    sizeBytes: 1100 * 1024 * 1024,
    contextLength: 4096,
    description: "El más actual y equilibrado ≤3B para ES/EN. Recomendado.",
  },
  {
    id: "llama-3.2-3b",
    name: "Llama 3.2 3B",
    hfRepo: "meta-llama/Llama-3.2-3B-Instruct",
    webllmId: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
    onnxId: "onnx-community/Llama-3.2-3B-Instruct-ONNX",
    sizeLabel: "~1.76GB",
    sizeBytes: 1760 * 1024 * 1024,
    contextLength: 4096,
    description: "Máxima calidad ≤3B y mejor JSON/tool-use. Pesa más.",
  },
  {
    id: "qwen2.5-1.5b",
    name: "Qwen2.5 1.5B (ligero)",
    hfRepo: "Qwen/Qwen2.5-1.5B-Instruct",
    webllmId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    onnxId: "onnx-community/Qwen2.5-1.5B-Instruct",
    sizeLabel: "~868MB",
    sizeBytes: 868 * 1024 * 1024,
    contextLength: 4096,
    description: "Carga rápida para equipos justos o sin WebGPU.",
  },
  {
    id: "llama-3.2-1b",
    name: "Llama 3.2 1B (mínimo)",
    hfRepo: "meta-llama/Llama-3.2-1B-Instruct",
    webllmId: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    onnxId: "onnx-community/Llama-3.2-1B-Instruct-ONNX",
    sizeLabel: "~712MB",
    sizeBytes: 712 * 1024 * 1024,
    contextLength: 4096,
    description: "El más rápido de descargar. Calidad limitada a textos cortos.",
  },
];

export function getLocalModel(id?: string | null): LocalModelCard {
  if (!id) return LOCAL_MODELS[0];
  return LOCAL_MODELS.find((m) => m.id === id) ?? LOCAL_MODELS[0];
}

export const LOCAL_STORAGE_KEYS = {
  modelId: "ats_local_model_id",
  enabled: "ats_local_enabled",
} as const;
