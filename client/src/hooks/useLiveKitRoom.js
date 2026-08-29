import { useState, useEffect } from 'react';
import { getLiveKitToken } from '../api/peerInterview';

export function useLiveKitRoom(roomId, enabled = true) {
  const [liveKitData, setLiveKitData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function connectInterview() {
      try {
        setLoading(true);
        setError("");

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Room token request timed out after 10s")), 10000)
        );

        const data = await Promise.race([getLiveKitToken(roomId), timeoutPromise]);
        console.log("LIVEKIT DATA RECEIVED:", data);

        if (mounted) {
          setLiveKitData(data);
        }
      } catch (err) {
        console.error("LiveKit connection failed:", err);
        if (mounted) {
          setError(err?.response?.data?.message || err?.message || "Unable to join interview room");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (roomId && enabled) {
      connectInterview();
    }

    return () => {
      mounted = false;
    };
  }, [roomId, enabled]);

  return { liveKitData, loading, error };
}
