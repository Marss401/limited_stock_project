import { Request, Response, NextFunction } from "express";
import { reserveSchema, checkoutSchema } from "../utils/validators";
import * as reservationService from "../services/reservation.service";
 
export async function reserve(req: Request, res: Response, next: NextFunction) {
  try {
	// Validate input (throws if invalid)
	const data = reserveSchema.parse(req.body);
 
	// Call the service
	const reservation = await reservationService.createReservation(
  	data.userId,
  	data.productId,
  	data.quantity
	);
 
	res.status(201).json({
  	success: true,
  	data: reservation,
  	message: "Reservation created. You have 5 minutes to complete checkout.",
	});
  } catch (error) {
	next(error);  // Pass to centralized error handler
  }
}
 
export async function checkout(req: Request, res: Response, next: NextFunction) {
  try {
	const data = checkoutSchema.parse(req.body);
	const order = await reservationService.completeCheckout(data.reservationId);
 
	res.status(200).json({
  	success: true,
  	data: order,
  	message: "Checkout completed successfully!",
	});
  } catch (error) {
	next(error);
  }
}
