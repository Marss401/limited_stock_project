// src/hooks/useCountdown.ts
import { useState, useEffect } from "react";

export function useCountdown(expiresAt: Date | null, onExpire?: () => void) {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  useEffect(() => {
    if (!expiresAt) return;

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.floor((expiresAt.getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        setSecondsLeft(0);
        if (onExpire) onExpire();
        clearInterval(interval);
      }

      // if (remaining <= 0 && onExpire) {
      // 	onExpire();
      // }
    };

    tick(); // Run immediately
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return {
    secondsLeft,
    display: `${minutes}:${seconds.toString().padStart(2, "0")}`,
    isExpired: secondsLeft <= 0,
  };
}
