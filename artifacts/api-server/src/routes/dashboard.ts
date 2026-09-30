import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, advisoriesTable, farmsTable } from "@workspace/db";
import { GetDashboardResponse } from "@workspace/api-zod";
import { requireUser } from "../lib/auth";

const router: IRouter = Router();
router.get("/dashboard", requireUser, async (req, res): Promise<void> => {
  const farms = await db.select().from(farmsTable).where(eq(farmsTable.userId, req.currentUser!.id)).orderBy(desc(farmsTable.createdAt));
  const rows = await db.select({ advisory: advisoriesTable, farm: farmsTable })
    .from(advisoriesTable)
    .innerJoin(farmsTable, eq(advisoriesTable.farmId, farmsTable.id))
    .where(eq(advisoriesTable.userId, req.currentUser!.id))
    .orderBy(desc(advisoriesTable.createdAt))
    .limit(5);
  const averageConfidence = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + Number(row.advisory.confidence), 0) / rows.length)
    : 0;
  const recentAdvisories = rows.map(({ advisory, farm }) => ({
    id: advisory.id,
    farmId: advisory.farmId,
    farmName: farm.name,
    crop: farm.primaryCrop,
    createdAt: advisory.createdAt.toISOString(),
    confidence: Number(advisory.confidence),
    status: advisory.status as "ready" | "processing" | "needs-review",
    summary: advisory.summary,
    recommendations: advisory.recommendations,
    weatherNote: advisory.weatherNote,
    riskNote: advisory.riskNote,
  }));
  const activeFarm = farms[0]
    ? { id: farms[0].id, name: farms[0].name, crop: farms[0].primaryCrop, location: farms[0].location }
    : null;
  const climateSignal = averageConfidence > 0
    ? { label: "Field signals are stable", detail: "Your latest reports have enough context for confident next steps.", tone: "positive" as const }
    : { label: "Start with a field profile", detail: "Add your first farm to unlock tailored crop guidance.", tone: "neutral" as const };
  res.json(GetDashboardResponse.parse({
    farmCount: farms.length,
    advisoryCount: rows.length,
    averageConfidence,
    activeFarm,
    recentAdvisories,
    climateSignal,
  }));
});

export default router;