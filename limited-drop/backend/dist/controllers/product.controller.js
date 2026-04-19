"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProducts = listProducts;
exports.getProduct = getProduct;
const database_1 = __importDefault(require("../config/database"));
// GET /products
async function listProducts(req, res) {
    const products = await database_1.default.product.findMany();
    res.json(products);
}
// GET /products/:id
async function getProduct(req, res) {
    const { id } = req.params;
    if (typeof id !== "string") {
        return res.status(400).json({ error: "Invalid product ID" });
    }
    const product = await database_1.default.product.findUnique({
        where: { id },
    });
    if (!product) {
        return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
}
