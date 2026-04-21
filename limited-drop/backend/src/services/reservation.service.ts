import prisma from "../config/database";
// Import the Prisma namespace to get the TransactionClient type
import { Prisma, ReservationStatus, InventoryAction } from "../generated/prisma/client";

const RESERVATION_TTL_MINUTES = parseInt(
    process.env.RESERVATION_TTL_MINUTES || "5"
);

export async function createReservation(
    userId: string,
    productId: string,
    quantity: number
) {
  // Explicitly type 'tx' as Prisma.TransactionClient to fix TS7006
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    
    // STEP 1: Check existing reservation
    const existingReservation = await tx.reservation.findFirst({
        where: {
            userId,
            productId,
            status: ReservationStatus.ACTIVE,
        },
    });
    
    if (existingReservation){
        throw new Error("You already have an active reservation for this product.");
    }

    // STEP 2: Lock the product row
    // Note: Using Prisma.sql template literal is safer with some setups
    const product = await tx.$queryRaw<{id: string; available: number }[]>`
      SELECT id, available FROM "Product" WHERE id = ${productId} FOR UPDATE
    `;

    if (!product || product.length === 0){
        throw new Error("Product not found.");
    }

    if (product[0].available < quantity){
        throw new Error ("Not enough stock available.");
    }

    // STEP 3: Decrease stock
    const updatedProduct = await tx.product.update({
        where: {id: productId},
        data: {available: { decrement: quantity}},
    });

    // STEP 4: Create reservation
    const expiresAt = new Date(
        Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000
    );
    
    const reservation = await tx.reservation.create({
        data: {
            userId,
            productId,
            quantity,
            expiresAt,
            status: ReservationStatus.ACTIVE,
        },
    });

    // STEP 5: Log inventory
    await tx.inventoryLog.create({
        data: {
            productId,
            action: InventoryAction.RESERVED,
            quantityChange: -quantity,
            previousStock: product[0].available,
            newStock: updatedProduct.available,
            referenceId: reservation.id,
        },
    });

    return reservation;

  }, {
    // Use the Prisma Enum for isolation level for better type safety
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    timeout: 10000,
  });
}

export async function completeCheckout(reservationId: string) {
    // Explicitly type 'tx'
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const reservation = await tx.reservation.findUnique({
            where: { id: reservationId },
            include: { product: true},
        });

        if (!reservation) throw new Error("Reservation not found.");

        if (reservation.status !== ReservationStatus.ACTIVE){
            throw new Error("Reservation is no longer active.");
        }

        if (new Date() > reservation.expiresAt) {
  	        throw new Error("Reservation has expired.");
	    }
 
	    await tx.reservation.update({
            where: { id: reservationId },
            data: { status: ReservationStatus.COMPLETED },
	    });
 
        const order = await tx.order.create({
            data: {
                userId: reservation.userId,
                reservationId: reservation.id,
                productId: reservation.productId,
                quantity: reservation.quantity,
                totalPrice: reservation.product.price * reservation.quantity,
            },
        });
 
        await tx.inventoryLog.create({
            data: {
                productId: reservation.productId,
                action: InventoryAction.PURCHASED,
                quantityChange: 0,
                previousStock: reservation.product.available,
                newStock: reservation.product.available,
                referenceId: order.id,
            },
        });

	    return order;
    });
}

export async function expireReservations() {
  const now = new Date();
 
  const expired = await prisma.reservation.findMany({
	where: {
        status: ReservationStatus.ACTIVE,
        expiresAt: { lt: now },
	},
	include: { product: true },
  });
 
  for (const reservation of expired) {
    // Explicitly type 'tx'
	await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.reservation.update({
            where: { id: reservation.id },
            data: { status: ReservationStatus.EXPIRED },
        });
 
        const updatedProduct = await tx.product.update({
            where: { id: reservation.productId },
            data: { available: { increment: reservation.quantity } },
        });
 
        await tx.inventoryLog.create({
            data: {
                productId: reservation.productId,
                action: InventoryAction.RELEASED,
                quantityChange: reservation.quantity,
                previousStock: updatedProduct.available - reservation.quantity,
                newStock: updatedProduct.available,
                referenceId: reservation.id,
                metadata: { reason: "Reservation expired" } as any, // Cast to any if json field
            },
        });
	});
  }
  return expired.length;
}