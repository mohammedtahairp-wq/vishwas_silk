import express from "express";
import cors from "cors";
import compression from "compression";
import { authRouter } from "./modules/auth/auth.routes";
import { adminRouter } from "./modules/admin/admin.routes";
import { riderRouter } from "./modules/rider/rider.routes";
import { customerRouter } from "./modules/customer/customer.routes";
import { sharedProductsRouter } from "./modules/shared/products.routes";
import { errorHandler } from "./middleware/errorHandler";

export const app = express();

app.use(cors());
app.use(compression());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/rider", riderRouter);
app.use("/api/customer", customerRouter);
app.use("/api/products", sharedProductsRouter);

app.use(errorHandler);
