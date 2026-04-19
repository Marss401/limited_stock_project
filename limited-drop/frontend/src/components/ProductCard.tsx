// src/components/ProductCard.tsx
import { useState } from "react";
import { reserveProduct, checkoutReservation } from "../api/products";
import { useCountdown } from "../hooks/useCountdown";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  available: number;
  totalStock: number;
}

interface Reservation {
  id: string;
  expiresAt: string;
}

export function ProductCard({
  product,
  userId,
  onStockChange,
}: {
  product: Product;
  userId: string;
  onStockChange: () => void;
}) {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchased, setPurchased] = useState(false);

  const handleExpire = () => {
    setReservation(null);
    setError("Reservation expired! Stock has been released.");
    onStockChange(); // Refresh stock
  };

  const { display, isExpired } = useCountdown(
    reservation ? new Date(reservation.expiresAt) : null,
    handleExpire,
  );

  const handleReserve = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reserveProduct(product.id, userId, 1);
      setReservation(res.data.data);
      onStockChange();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!reservation) return;
    setLoading(true);
    setError(null);
    try {
      await checkoutReservation(reservation.id);
      setPurchased(true);
      setReservation(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  const isSoldOut = product.available <= 0;

  return (
    <div className="product-card">
      <h2>{product.name}</h2>
      <p>{product.description}</p>
      <p className="price">${product.price.toFixed(2)}</p>
      <p className="stock">
        {product.available} / {product.totalStock} remaining
      </p>

      {error && <p className="error">{error}</p>}

      {purchased ? (
        <p className="success">Purchase complete!</p>
      ) : reservation && !isExpired ? (
        <div className="reservation-active">
          <p className="timer">Time left: {display}</p>
          <button onClick={handleCheckout} disabled={loading}>
            {loading ? "Processing..." : "Complete Purchase"}
          </button>
        </div>
      ) : (
        <button onClick={handleReserve} disabled={loading || isSoldOut}>
          {loading ? "Reserving..." : isSoldOut ? "Sold Out" : "Reserve Now"}
        </button>
      )}
    </div>
  );
}
