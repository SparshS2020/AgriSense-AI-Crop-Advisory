import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import farmsRouter from "./farms";
import advisoriesRouter from "./advisories";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(dashboardRouter);
router.use(farmsRouter);
router.use(advisoriesRouter);

export default router;
