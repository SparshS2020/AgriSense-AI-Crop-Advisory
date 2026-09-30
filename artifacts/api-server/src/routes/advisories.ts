import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, advisoriesTable, farmsTable } from "@workspace/db";
import {
  CreateAdvisoryBody,
  CreateAdvisoryResponse,
  GetAdvisoryParams,
  GetAdvisoryResponse,
  ListAdvisoriesQueryParams,
  ListAdvisoriesResponse,
  RegenerateAdvisoryParams,
  RegenerateAdvisoryResponse,
} from "@workspace/api-zod";
import { requireUser } from "../lib/auth";
import { generateAdvisory } from "../lib/advisory";
import { advisoryRateLimit } from "../middlewares/rate-limit";

const router: IRouter = Router();
router.use("/advisories", requireUser);

type Recommendation = {
  title: string;
  detail: string;
  timing: string;
  priority: "high" | "medium" | "low";
};

function presentAdvisory(
  advisory: typeof advisoriesTable.$inferSelect,
  farm: typeof farmsTable.$inferSelect,
) {
  return {
    id: advisory.id,
    farmId: advisory.farmId,
    farmName: farm.name,
    crop: farm.primaryCrop,
    createdAt: advisory.createdAt.toISOString(),
    confidence: Number(advisory.confidence),
    status: advisory.status as "ready" | "processing" | "needs-review",
    summary: advisory.summary,
    recommendations: advisory.recommendations as Recommendation[],
    weatherNote: advisory.weatherNote,
    riskNote: advisory.riskNote,
  };
}

async function getFarm(userId: string, farmId: string) {
  const [farm] = await db.select().from(farmsTable).where(and(eq(farmsTable.id, farmId), eq(farmsTable.userId, userId))).limit(1);
  return farm;
}

async function createReport(userId: string, input: {
  farmId: string;
  cropStage: string;
  soilMoisture: number;
  recentRainfallMm: number;
  temperatureC: number;
  pestPressure: string;
  budget: string;
  riskTolerance: string;
  notes?: string | null;
}) {
  const farm = await getFarm(userId, input.farmId);
  if (!farm) return null;
  const generated = await generateAdvisory({
    farmName: farm.name,
    crop: farm.primaryCrop,
    location: farm.location,
    soilType: farm.soilType,
    irrigation: farm.irrigation,
    ...input,
  });
  const [advisory] = await db.insert(advisoriesTable).values({
    ...input,
    userId,
    confidence: String(generated.confidence),
    status: "ready",
    summary: generated.summary,
    recommendations: generated.recommendations,
    weatherNote: generated.weatherNote,
    riskNote: generated.riskNote,
    soilMoisture: String(input.soilMoisture),
    recentRainfallMm: String(input.recentRainfallMm),
    temperatureC: String(input.temperatureC),
  }).returning();
  return { advisory, farm };
}

router.get("/advisories", async (req, res): Promise<void> => {
  const query = ListAdvisoriesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const rows = await db.select({ advisory: advisoriesTable, farm: farmsTable })
    .from(advisoriesTable)
    .innerJoin(farmsTable, eq(advisoriesTable.farmId, farmsTable.id))
    .where(and(
      eq(advisoriesTable.userId, req.currentUser!.id),
      query.data.farmId ? eq(advisoriesTable.farmId, query.data.farmId) : undefined,
    ))
    .orderBy(desc(advisoriesTable.createdAt))
    .limit(query.data.limit ?? 10);
  res.json(ListAdvisoriesResponse.parse(rows.map((row) => presentAdvisory(row.advisory, row.farm))));
});

router.post("/advisories", advisoryRateLimit, async (req, res): Promise<void> => {
  const body = CreateAdvisoryBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const report = await createReport(req.currentUser!.id, body.data);
  if (!report) {
    res.status(404).json({ error: "Farm not found." });
    return;
  }
  res.status(201).json(CreateAdvisoryResponse.parse(presentAdvisory(report.advisory, report.farm)));
});

router.get("/advisories/:id", async (req, res): Promise<void> => {
  const params = GetAdvisoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.select({ advisory: advisoriesTable, farm: farmsTable })
    .from(advisoriesTable)
    .innerJoin(farmsTable, eq(advisoriesTable.farmId, farmsTable.id))
    .where(and(eq(advisoriesTable.id, params.data.id), eq(advisoriesTable.userId, req.currentUser!.id)))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Advisory not found." });
    return;
  }
  res.json(GetAdvisoryResponse.parse(presentAdvisory(row.advisory, row.farm)));
});

router.post("/advisories/:id/regenerate", advisoryRateLimit, async (req, res): Promise<void> => {
  const params = RegenerateAdvisoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [existing] = await db.select().from(advisoriesTable)
    .where(and(eq(advisoriesTable.id, params.data.id), eq(advisoriesTable.userId, req.currentUser!.id)))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Advisory not found." });
    return;
  }
  const report = await createReport(req.currentUser!.id, {
    farmId: existing.farmId,
    cropStage: existing.cropStage,
    soilMoisture: Number(existing.soilMoisture),
    recentRainfallMm: Number(existing.recentRainfallMm),
    temperatureC: Number(existing.temperatureC),
    pestPressure: existing.pestPressure,
    budget: existing.budget,
    riskTolerance: existing.riskTolerance,
    notes: existing.notes,
  });
  if (!report) {
    res.status(404).json({ error: "Farm not found." });
    return;
  }
  res.status(201).json(RegenerateAdvisoryResponse.parse(presentAdvisory(report.advisory, report.farm)));
});

export default router;