// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from "express";
import { Prisma } from "../generated/prisma/client";
import { ZodError } from "zod";
import logger from "../utils/logger";
 
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error("Error:", {
	message: err instanceof Error ? err.message : "Unknown error",
	path: req.path,
	method: req.method,
  });
 
  // Validation errors (bad input)
  if (err instanceof ZodError) {
	return res.status(400).json({
  	success: false,
  	error: "Validation failed",
  	details: err.issues.map(e => ({
    	field: e.path.join("."),
    	message: e.message,
  	})),
	});
  }
 
  // Prisma-specific errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
	if (err.code === "P2025") {
  	return res.status(404).json({
    	success: false,
    	error: "Resource not found",
  	});
	}
  }
 
  // Business logic errors (our custom throws)
  if (err instanceof Error && (err.message.includes("Not enough stock") ||
      err.message.includes("already have an active") ||
      err.message.includes("expired") ||
      err.message.includes("no longer active")) ){
	return res.status(409).json({
  	success: false,
  	error: err.message,
	});
  }
 
  // Catch-all
  return res.status(500).json({
	success: false,
	error: err.message || "Internal Server Error",
  });
}
