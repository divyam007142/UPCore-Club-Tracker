import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clubsRouter from "./clubs";
import logsRouter from "./logs";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/clubs", clubsRouter);
router.use("/logs", logsRouter);

export default router;
