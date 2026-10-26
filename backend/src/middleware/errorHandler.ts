import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { HttpError } from "../lib/errors";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Validation failed" });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = Array.isArray(err.meta?.target) ? (err.meta.target as string[]) : [];
      if (target.includes("serial_number")) {
        return res.status(409).json({ error: "That serial number is already in use by another customer" });
      }
      if (target.includes("login_phone")) {
        return res.status(409).json({ error: "That phone number is already in use for login" });
      }
      if (target.includes("phone")) {
        return res.status(409).json({ error: "A record with that phone number already exists" });
      }
      return res.status(409).json({ error: "A record with these unique fields already exists" });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Record not found" });
    }
  }

  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}
