import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, farmsTable } from "@workspace/db";
import {
  CreateFarmBody,
  CreateFarmResponse,
  DeleteFarmParams,
  GetFarmParams,
  GetFarmResponse,
  ListFarmsResponse,
  UpdateFarmBody,
  UpdateFarmParams,
  UpdateFarmResponse,
} from "@workspace/api-zod";
import { requireUser } from "../lib/auth";

const router: IRouter = Router();
router.use("/farms", requireUser);

function presentFarm(farm: typeof farmsTable.$inferSelect) {
  return {
    id: farm.id,
    name: farm.name,
    location: farm.location,
    areaHectares: Number(farm.areaHectares),
    primaryCrop: farm.primaryCrop,
    soilType: farm.soilType,
    irrigation: farm.irrigation,
    createdAt: farm.createdAt.toISOString(),
  };
}

router.get("/farms", async (req, res): Promise<void> => {
  const farms = await db.select().from(farmsTable).where(eq(farmsTable.userId, req.currentUser!.id)).orderBy(desc(farmsTable.createdAt));
  res.json(ListFarmsResponse.parse(farms.map(presentFarm)));
});

router.post("/farms", async (req, res): Promise<void> => {
  const parsed = CreateFarmBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [farm] = await db.insert(farmsTable).values({ ...parsed.data, userId: req.currentUser!.id, areaHectares: String(parsed.data.areaHectares) }).returning();
  res.status(201).json(CreateFarmResponse.parse(presentFarm(farm)));
});

router.get("/farms/:id", async (req, res): Promise<void> => {
  const params = GetFarmParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [farm] = await db.select().from(farmsTable).where(and(eq(farmsTable.id, params.data.id), eq(farmsTable.userId, req.currentUser!.id))).limit(1);
  if (!farm) {
    res.status(404).json({ error: "Farm not found." });
    return;
  }
  res.json(GetFarmResponse.parse(presentFarm(farm)));
});

router.patch("/farms/:id", async (req, res): Promise<void> => {
  const params = UpdateFarmParams.safeParse(req.params);
  const body = UpdateFarmBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const values: {
    name?: string;
    location?: string;
    areaHectares?: string;
    primaryCrop?: string;
    soilType?: string;
    irrigation?: string;
  } = {
    ...(body.data.name === undefined ? {} : { name: body.data.name }),
    ...(body.data.location === undefined ? {} : { location: body.data.location }),
    ...(body.data.areaHectares === undefined ? {} : { areaHectares: String(body.data.areaHectares) }),
    ...(body.data.primaryCrop === undefined ? {} : { primaryCrop: body.data.primaryCrop }),
    ...(body.data.soilType === undefined ? {} : { soilType: body.data.soilType }),
    ...(body.data.irrigation === undefined ? {} : { irrigation: body.data.irrigation }),
  };
  const [farm] = await db.update(farmsTable).set(values).where(and(eq(farmsTable.id, params.data.id), eq(farmsTable.userId, req.currentUser!.id))).returning();
  if (!farm) {
    res.status(404).json({ error: "Farm not found." });
    return;
  }
  res.json(UpdateFarmResponse.parse(presentFarm(farm)));
});

router.delete("/farms/:id", async (req, res): Promise<void> => {
  const params = DeleteFarmParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(farmsTable).where(and(eq(farmsTable.id, params.data.id), eq(farmsTable.userId, req.currentUser!.id)));
  res.status(204).send();
});

export default router;