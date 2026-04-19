// src/api/products.ts
import apiClient from "./client";
 
export const getProducts = (page = 1, limit = 20) =>
  apiClient.get(`/products?page=${page}&limit=${limit}`);
 
export const getProduct = (id: string) =>
  apiClient.get(`/products/${id}`);
 
export const reserveProduct = (productId: string, userId: string, quantity: number) =>
  apiClient.post("/reserve", { productId, userId, quantity });
 
export const checkoutReservation = (reservationId: string) =>
  apiClient.post("/checkout", { reservationId });