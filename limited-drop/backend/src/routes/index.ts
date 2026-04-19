import { Router } from "express";
import * as reservationController from "../controllers/reservation.controller";
import * as productController from "../controllers/product.controller";
 
const router = Router();
 
// Product routes
router.get("/products", productController.listProducts);
router.get("/products/:id", productController.getProduct);
 
// Reservation routes
router.post("/reserve", reservationController.reserve);
router.post("/checkout", reservationController.checkout);
 
// Health check
router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
 
// Metrics (simple)
router.get("/metrics", async (req, res) => {
  // Add basic metrics here
  res.json({
	uptime: process.uptime(),
	memoryUsage: process.memoryUsage(),
	timestamp: new Date().toISOString(),
  });
});
 
export default router;
