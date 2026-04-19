"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationSchema = exports.checkoutSchema = exports.reserveSchema = void 0;
const zod_1 = require("zod");
exports.reserveSchema = zod_1.z.object({
    productId: zod_1.z.string().uuid("Product ID must be a valid UUID"),
    quantity: zod_1.z.number().int().positive().max(5, "Max 5 per reservation"),
    userId: zod_1.z.string().uuid("User ID must be a valid UUID"),
});
exports.checkoutSchema = zod_1.z.object({
    reservationId: zod_1.z.string().uuid("Reservation ID must be a valid UUID"),
});
// Query params for listing with pagination
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
    sortBy: zod_1.z.enum(["createdAt", "price", "name", "available"]).default("createdAt"),
    sortOrder: zod_1.z.enum(["asc", "desc"]).default("desc"),
});
