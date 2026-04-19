"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
// Singleton pattern: only ONE PrismaClient instance for the whole app
// Why? Each PrismaClient creates a connection pool to the database.
// Multiple pools = wasted resources + potential connection limits.
const prisma = new client_1.PrismaClient({
    log: ["query", "error", "warn"], // See every DB query in your console
});
exports.default = prisma;
