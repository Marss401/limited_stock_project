"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../config/database"));
const reservation_service_1 = require("../services/reservation.service");
describe("Reservation Service", () => {
    let userId;
    let productId;
    beforeEach(async () => {
        // Clean slate before each test
        await database_1.default.inventoryLog.deleteMany();
        await database_1.default.order.deleteMany();
        await database_1.default.reservation.deleteMany();
        await database_1.default.product.deleteMany();
        await database_1.default.user.deleteMany();
        const user = await database_1.default.user.create({ data: { email: "test@test.com" } });
        userId = user.id;
        const product = await database_1.default.product.create({
            data: { name: "Test Item", price: 10, totalStock: 5, available: 5 },
        });
        productId = product.id;
    });
    test("should create a reservation and decrease stock", async () => {
        const reservation = await (0, reservation_service_1.createReservation)(userId, productId, 2);
        expect(reservation.status).toBe("ACTIVE");
        const product = await database_1.default.product.findUnique({
            where: { id: productId },
        });
        expect(product?.available).toBe(3); // 5 - 2 = 3
    });
    test("should reject reservation when stock is insufficient", async () => {
        await expect((0, reservation_service_1.createReservation)(userId, productId, 99)).rejects.toThrow("Not enough stock");
    });
    test("should prevent duplicate reservations", async () => {
        await (0, reservation_service_1.createReservation)(userId, productId, 1);
        await expect((0, reservation_service_1.createReservation)(userId, productId, 1)).rejects.toThrow("already have an active reservation");
    });
    test("should complete checkout", async () => {
        const reservation = await (0, reservation_service_1.createReservation)(userId, productId, 1);
        const order = await (0, reservation_service_1.completeCheckout)(reservation.id);
        expect(order.totalPrice).toBe(10);
    });
    test("should expire old reservations and restore stock", async () => {
        // Create reservation with past expiry
        const reservation = await (0, reservation_service_1.createReservation)(userId, productId, 2);
        await database_1.default.reservation.update({
            where: { id: reservation.id },
            data: { expiresAt: new Date(Date.now() - 1000) }, // 1 second ago
        });
        const count = await (0, reservation_service_1.expireReservations)();
        expect(count).toBe(1);
        const product = await database_1.default.product.findUnique({
            where: { id: productId },
        });
        expect(product?.available).toBe(5); // Stock restored
        // afterAll(async () => {
        //   await prisma.$disconnect(); // closes connection pool
        // });
    });
});
