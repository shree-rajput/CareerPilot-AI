import { useState, useEffect } from 'react';

export function useTimer(enabled = true) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [enabled]);

  const formattedTime = (() => {
    const m = Math.floor(elapsedSeconds / 60).toString().padStart(2, "0");
    const s = (elapsedSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  })();

  return { elapsedSeconds, formattedTime };
}
