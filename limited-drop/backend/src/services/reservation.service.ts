import prisma from "../config/database";
import { ReservationStatus, InventoryAction } from "../generated/prisma/client";

const RESERVATION_TTL_MINUTES = parseInt (
    process.env.RESERVATION_TTL_MINUTES  || "5"
);

export async function createReservation ( //create a function that handles the reservations of the item with the userId, the productId and the quantity
    userId: string,
    productId: string,
    quantity: number
) {
    // Everything inside prisma.$transaction is atomic.
  // "Atomic" means: either ALL of it succeeds, or NONE of it happens.
  // Think of it like a bank transfer: you wouldn't want money to leave
  // Account A without arriving in Account B.
  return prisma.$transaction(async (tx) => {
    // STEP 1: Check if user already has an active reservation for this product.
	// This prevents duplicate reservations (someone spamming the button).
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
    // STEP 2: Lock the product row and check stock.
	// The FOR UPDATE lock prevents two people from reading "50 available"
	// at the same time and both thinking they can reserve.
	// One person gets the lock, the other waits.

    const product = await tx.$queryRaw<{id: string; available: number }[]>`
    SELECT id, available FROM "Product" WHERE id = ${productId} FOR UPDATE
    `;

    if (!product.length){
        throw new Error("Product not found.");
    }
    //when product available is less than the quantity 
    if (product[0].available < quantity){
        throw new Error ("Not enough stock available.");
    }

    // STEP 3: Decrease available stock.
    const updatedProduct = await tx.product.update({
        where: {id: productId},
        data: {available: { decrement: quantity}},
    });

    // STEP 4: Create the reservation with an expiration time.
    const expiresAt = new Date(
        Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000
    );
    const reservation = await tx.reservation.create({ //post method
        data: {
            userId,
            productId,
            quantity,
            expiresAt,
            status: ReservationStatus.ACTIVE,
        },
    });
    // STEP 5: Log the inventory change (audit trail).
    await tx.inventoryLog.create({ //psot method
        data: {
            productId,
            action: InventoryAction.RESERVED,
            quantityChange: -quantity, //e.g. -- decrease from the totalstock
            previousStock: product[0].available,
            newStock: updatedProduct.available,
            referenceId: reservation.id,
        },
    });
    return reservation;

  }, {
    // SERIALIZABLE = higest isolation level.
    // Prevent ALL race conditions, but is slower.
    isolationLevel: "Serializable",
    timeout: 10000, // 10 second timeout
  });
}

//CHECKOUT FUNCTION
export async function completeCheckout(reservationId: string){
    return prisma.$transaction(async (tx) => {
        //Find the reservation and make sure it's still valid
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
 
        // Mark reservation as completed
	    await tx.reservation.update({
  	    where: { id: reservationId },
  	    data: { status: ReservationStatus.COMPLETED },
	    });
 
	// Create the order
        const order = await tx.order.create({
        data: {
            userId: reservation.userId,
            reservationId: reservation.id,
            productId: reservation.productId,
            quantity: reservation.quantity,
            totalPrice: reservation.product.price * reservation.quantity,
        },
        });
 
        // Log it
        await tx.inventoryLog.create({
        data: {
            productId: reservation.productId,
            action: InventoryAction.PURCHASED,
            quantityChange: 0,  // Stock doesn't change - already reserved
            previousStock: reservation.product.available,
            newStock: reservation.product.available,
            referenceId: order.id,
        },
        });
	    return order;
    });
}

//EXPIRATION JOB
export async function expireReservations() {
  const now = new Date();
 
  // Find all reservations that should be expired
  const expired = await prisma.reservation.findMany({
	where: {
  	status: ReservationStatus.ACTIVE,
  	expiresAt: { lt: now },  // lt = "less than" (i.e., in the past)
	},
	include: { product: true },
  });
 
  for (const reservation of expired) {
	await prisma.$transaction(async (tx) => {
  	// Mark as expired
  	await tx.reservation.update({
    	where: { id: reservation.id },
    	data: { status: ReservationStatus.EXPIRED },
  	});
 
  	// GIVE STOCK BACK
  	const updatedProduct = await tx.product.update({
    	where: { id: reservation.productId },
    	data: { available: { increment: reservation.quantity } },
  	});
 
  	// Log the release
  	await tx.inventoryLog.create({
    	data: {
      	productId: reservation.productId,
      	action: InventoryAction.RELEASED,
      	quantityChange: reservation.quantity,
      	previousStock: updatedProduct.available - reservation.quantity,
      	newStock: updatedProduct.available,
      	referenceId: reservation.id,
 	     metadata: { reason: "Reservation expired" },
    	},
  	});
	});
  }
  return expired.length;
}
