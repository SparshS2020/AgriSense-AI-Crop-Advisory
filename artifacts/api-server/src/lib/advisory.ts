import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const generatedAdvisorySchema = z.object({
  confidence: z.number().min(0).max(100),
  summary: z.string(),
  recommendations: z.array(
    z.object({
      title: z.string(),
      detail: z.string(),
      timing: z.string(),
      priority: z.enum(["high", "medium", "low"]),
    }),
  ).min(1).max(5),
  weatherNote: z.string(),
  riskNote: z.string(),
});

type AdvisoryContext = {
  farmName: string;
  crop: string;
  location: string;
  soilType: string;
  irrigation: string;
  cropStage: string;
  soilMoisture: number;
  recentRainfallMm: number;
  temperatureC: number;
  pestPressure: string;
  budget: string;
  riskTolerance: string;
  notes?: string | null;
};

function fallbackAdvice(context: AdvisoryContext) {
  const moisture = context.soilMoisture < 35
    ? "Irrigate in a short, measured cycle early in the morning and reassess soil moisture after 24 hours."
    : "Hold irrigation for now and check moisture below the surface before the next cycle.";
  return {
    confidence: 78,
    summary: `For ${context.crop} at the ${context.cropStage} stage, prioritize steady moisture and a preventive field walk before adding inputs.`,
    recommendations: [
      { title: "Tune irrigation", detail: moisture, timing: "Next 24 hours", priority: "high" as const },
      { title: "Scout before spraying", detail: `Inspect five plants in each field zone for ${context.pestPressure === "high" ? "active pest clusters and leaf damage" : "early signs of pest pressure"}.`, timing: "Within 48 hours", priority: "medium" as const },
      { title: "Protect soil balance", detail: `Use a light, crop-appropriate nutrient application suited to ${context.soilType} and your ${context.budget.toLowerCase()} budget.`, timing: "This week", priority: "low" as const },
    ],
    weatherNote: `At ${context.temperatureC}°C with ${context.recentRainfallMm} mm of recent rain, avoid stacking irrigation with rainfall.`,
    riskNote: context.riskTolerance === "conservative"
      ? "A conservative plan is recommended: validate field conditions before making a full-rate input decision."
      : "Keep monitoring the field after each change so the next decision is based on observed response.",
  };
}

export async function generateAdvisory(context: AdvisoryContext) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallbackAdvice(context);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [{ text: `You are a careful crop advisor. Return only valid JSON matching this shape:
{"confidence":number,"summary":string,"recommendations":[{"title":string,"detail":string,"timing":string,"priority":"high"|"medium"|"low"}],"weatherNote":string,"riskNote":string}
Use practical, conservative language. Never recommend unsafe pesticide use or claim certainty. Context:
Farm: ${context.farmName}; location: ${context.location}; crop: ${context.crop}; soil: ${context.soilType}; irrigation: ${context.irrigation}; stage: ${context.cropStage}; soil moisture: ${context.soilMoisture}%; recent rainfall: ${context.recentRainfallMm} mm; temperature: ${context.temperatureC} C; pest pressure: ${context.pestPressure}; budget: ${context.budget}; risk tolerance: ${context.riskTolerance}; notes: ${context.notes ?? "none"}` }],
      }],
      config: { responseMimeType: "application/json", maxOutputTokens: 8192 },
    });
    const parsed = generatedAdvisorySchema.safeParse(JSON.parse(response.text ?? ""));
    return parsed.success ? parsed.data : fallbackAdvice(context);
  } catch {
    return fallbackAdvice(context);
  }
}