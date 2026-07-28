import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { authRouter } from "./modules/auth/auth.routes";
import { adminRouter } from "./modules/admin/admin.routes";
import { riderRouter } from "./modules/rider/rider.routes";
import { customerRouter } from "./modules/customer/customer.routes";
import { sharedProductsRouter } from "./modules/shared/products.routes";
import { errorHandler } from "./middleware/errorHandler";

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://vishwas-silk-frontend.s3-website.ap-south-1.amazonaws.com",
  "https://3.110.170.133",
];

export const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: "10kb" }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again after 15 minutes." },
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", loginLimiter, authRouter);
app.use("/api/admin", apiLimiter, adminRouter);
app.use("/api/rider", apiLimiter, riderRouter);
app.use("/api/customer", apiLimiter, customerRouter);
app.use("/api/products", apiLimiter, sharedProductsRouter);

app.use(errorHandler);
