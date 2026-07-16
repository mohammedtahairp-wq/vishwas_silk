import "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: "admin" | "rider" | "customer";
        linkedId: string | null;
      };
    }
  }
}
