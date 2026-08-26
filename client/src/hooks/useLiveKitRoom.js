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

        const data = await getLiveKitToken(roomId);
        console.log("LIVEKIT DATA RECEIVED:", data);

        if (mounted) {
          setLiveKitData(data);
        }
      } catch (err) {
        console.error("LiveKit connection failed:", err);
        if (mounted) {
          setError(err?.response?.data?.message || err?.message || "Unable to join interview");
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
