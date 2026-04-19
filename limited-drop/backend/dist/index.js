"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const node_cron_1 = __importDefault(require("node-cron"));
const dotenv_1 = __importDefault(require("dotenv"));
const routes_1 = __importDefault(require("./routes"));
const errorHandler_1 = require("./middleware/errorHandler");
const requestLogger_1 = require("./middleware/requestLogger");
const reservation_service_1 = require("./services/reservation.service");
const logger_1 = __importDefault(require("./utils/logger"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// ── Security Middleware ──
app.use((0, helmet_1.default)()); // Sets secure HTTP headers
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
}));
app.use((0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window per IP
    message: { error: "Too many requests, slow down." },
}));
// ── Body Parsing ──
app.use(express_1.default.json());
// ── Logging Middleware ──
app.use(requestLogger_1.requestLogger);
// ── Routes ──
app.use("/api", routes_1.default);
// ── Error Handler (MUST be last middleware) ──
app.use(errorHandler_1.errorHandler);
// ── Cron Job: Expire reservations every minute ──
node_cron_1.default.schedule("* * * * *", async () => {
    try {
        const count = await (0, reservation_service_1.expireReservations)();
        if (count > 0) {
            logger_1.default.info(`Expired ${count} reservations`);
        }
    }
    catch (error) {
        logger_1.default.error("Cron job failed:", error);
    }
});
// ── Start Server ──
app.listen(PORT, () => {
    logger_1.default.info(`Server running on port ${PORT}`);
});
exports.default = app;
