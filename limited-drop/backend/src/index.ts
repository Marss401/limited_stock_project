import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cron from "node-cron";
import dotenv from "dotenv";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";
import { expireReservations } from "./services/reservation.service";
import logger from "./utils/logger";
 
dotenv.config();
 
const app = express();
const PORT = process.env.PORT || 3001;
 
// ── Security Middleware ──
app.use(helmet());  // Sets secure HTTP headers
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true,
}));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // 100 requests per window per IP
  message: { error: "Too many requests, slow down." },
}));
 
// ── Body Parsing ──
app.use(express.json());
 
// ── Logging Middleware ──
app.use(requestLogger);
 
// ── Routes ──
app.use("/api", routes);
 
// ── Error Handler (MUST be last middleware) ──
app.use(errorHandler);
 
// ── Cron Job: Expire reservations every minute ──
cron.schedule("* * * * *", async () => {
  try {
	const count = await expireReservations();
	if (count > 0) {
  	logger.info(`Expired ${count} reservations`);
	}
  } catch (error) {
    logger.error("Cron job failed:", error);
  }
});
 
// ── Start Server ──
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
 
export default app;
