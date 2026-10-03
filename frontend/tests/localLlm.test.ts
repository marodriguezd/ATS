import { describe, expect, it } from "vitest";
import { DEFAULT_LOCAL_MODEL_ID, LOCAL_MODELS, getLocalModel } from "../src/lib/localLlm/registry";
import {
  buildAssistantPrompt,
  buildBulletPrompt,
  buildSummaryPrompt,
  extractJsonObject,
  introducesHallucinatedMetric,
} from "../src/lib/localLlm/prompts";

describe("local LLM registry", () => {
  it("defaults to Qwen3-1.7B", () => {
    expect(DEFAULT_LOCAL_MODEL_ID).toBe("qwen3-1.7b");
    expect(getLocalModel(null).id).toBe("qwen3-1.7b");
    expect(getLocalModel("unknown-id").id).toBe("qwen3-1.7b");
  });

  it("all models stay within the 3B cap with HF origin", () => {
    expect(LOCAL_MODELS.length).toBeGreaterThanOrEqual(3);
    for (const m of LOCAL_MODELS) {
      expect(m.hfRepo).toContain("/");
      expect(m.webllmId).toBeTruthy();
      expect(m.sizeBytes).toBeLessThan(2.2 * 1024 * 1024 * 1024);
    }
  });
});

describe("local LLM prompts + validators", () => {
  it("bullet prompt carries factuality rules and JSON contract", () => {
    const p = buildBulletPrompt("Built REST endpoints with Python.", "Backend", ["Python"]);
    expect(p).toContain("STRICT FACTUALITY RULES");
    expect(p).toContain("improved_star");
    expect(p).toContain("Built REST endpoints");
  });

  it("summary and assistant prompts are grounded", () => {
    expect(buildSummaryPrompt("Dev with Python.", "Python role", ["Python"])).toContain("tailored_summary");
    const a = buildAssistantPrompt("¿Qué mejoro?", "Backend dev Python.", "Python role", "overall 70");
    expect(a).toContain("CV excerpt");
    expect(a).toContain("FACTUALITY");
  });

  it("extracts JSON from chatty small-model replies", () => {
    const raw = 'Sure! Here it is:\n{"tailored_summary": "Hi", "keywords_included": []} thanks';
    expect(extractJsonObject(raw)).toMatchObject({ tailored_summary: "Hi" });
    expect(extractJsonObject("no json here")).toBeNull();
  });

  it("rejects hallucinated metrics like the backend validator", () => {
    expect(introducesHallucinatedMetric("Did x.", "Did x, improving efficiency by 25%")).toBe(true);
    expect(introducesHallucinatedMetric("Improved latency by 20%.", "Improved latency by 20%.")).toBe(false);
    expect(introducesHallucinatedMetric("Did x.", "Did x better.")).toBe(false);
  });
});
