import { z } from "zod";

export const reserveSchema = z.object({
  productId: z.string().uuid("Product ID must be a valid UUID"),
  quantity: z.number().int().positive().max(5, "Max 5 per reservation"),
  userId: z.string().uuid("User ID must be a valid UUID"),
});
 
export const checkoutSchema = z.object({
  reservationId: z.string().uuid("Reservation ID must be a valid UUID"),
});
 
// Query params for listing with pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(["createdAt", "price", "name", "available"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
 
export type ReserveInput = z.infer<typeof reserveSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
