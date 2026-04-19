import { Request, Response } from "express";
import prisma from "../config/database";

// GET /products
export async function listProducts(req: Request, res: Response) {
  const products = await prisma.product.findMany();
  res.json(products);
}

// GET /products/:id
export async function getProduct(req: Request, res: Response) {
  const { id } = req.params;
  
    if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid product ID" });
    }

  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  res.json(product);
}