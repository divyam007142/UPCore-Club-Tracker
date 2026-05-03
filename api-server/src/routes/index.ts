import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clubsRouter from "./clubs";
import logsRouter from "./logs";
import authRouter from "./auth";
import auditRouter from "./audit";
import playersRouter from "./players";
import contactRouter from "./contact";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/clubs", clubsRouter);
router.use("/logs", logsRouter);
router.use("/audit-logs", auditRouter);
router.use("/players", playersRouter);
router.use("/contact", contactRouter);

export default router;
