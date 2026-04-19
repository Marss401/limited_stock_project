import prisma from "../config/database";
import {
  createReservation,
  completeCheckout,
  expireReservations,
} from "../services/reservation.service";

describe("Reservation Service", () => {
  let userId: string;
  let productId: string;

  beforeEach(async () => {
    // Clean slate before each test
    await prisma.inventoryLog.deleteMany();
    await prisma.order.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();

    const user = await prisma.user.create({ data: { email: "test@test.com" } });
    userId = user.id;

    const product = await prisma.product.create({
      data: { name: "Test Item", price: 10, totalStock: 5, available: 5 },
    });
    productId = product.id;
  });

  test("should create a reservation and decrease stock", async () => {
    const reservation = await createReservation(userId, productId, 2);
    expect(reservation.status).toBe("ACTIVE");

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    expect(product?.available).toBe(3); // 5 - 2 = 3
  });

  test("should reject reservation when stock is insufficient", async () => {
    await expect(createReservation(userId, productId, 99)).rejects.toThrow(
      "Not enough stock",
    );
  });

  test("should prevent duplicate reservations", async () => {
    await createReservation(userId, productId, 1);
    await expect(createReservation(userId, productId, 1)).rejects.toThrow(
      "already have an active reservation",
    );
  });

  test("should complete checkout", async () => {
    const reservation = await createReservation(userId, productId, 1);
    const order = await completeCheckout(reservation.id);
    expect(order.totalPrice).toBe(10);
  });

  test("should expire old reservations and restore stock", async () => {
    // Create reservation with past expiry
    const reservation = await createReservation(userId, productId, 2);
    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { expiresAt: new Date(Date.now() - 1000) }, // 1 second ago
    });

    const count = await expireReservations();
    expect(count).toBe(1);

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    expect(product?.available).toBe(5); // Stock restored

    // afterAll(async () => {
    //   await prisma.$disconnect(); // closes connection pool
    // });
  });
});
