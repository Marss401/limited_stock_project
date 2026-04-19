"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const logger_1 = __importDefault(require("../utils/logger"));
function errorHandler(err, req, res, _next) {
    logger_1.default.error("Error:", {
        message: err instanceof Error ? err.message : "Unknown error",
        path: req.path,
        method: req.method,
    });
    // Validation errors (bad input)
    if (err instanceof zod_1.ZodError) {
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
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
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
        err.message.includes("no longer active"))) {
        return res.status(409).json({
            success: false,
            error: err.message,
        });
    }
    // Catch-all
    return res.status(500).json({
        success: false,
        error: "Internal server error",
    });
}
