import { useState, useEffect } from 'react';
import { getCodingQuestion } from '../api/peerInterview';

export function useCodingQuestion(roomId, enabled = true) {
  const [codingQuestion, setCodingQuestion] = useState(null);
  const [codingLoading, setCodingLoading] = useState(true);
  const [codingError, setCodingError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchQuestion = async () => {
      try {
        setCodingLoading(true);
        setCodingError(null);

        const question = await getCodingQuestion(roomId);

        if (mounted) {
          setCodingQuestion(question);
        }
      } catch (err) {
        console.error("Failed to load coding question:", err);
        if (mounted) {
          setCodingError(
            err?.response?.data?.message || err?.message || "Failed to load coding question."
          );
        }
      } finally {
        if (mounted) {
          setCodingLoading(false);
        }
      }
    };

    if (roomId && enabled) {
      fetchQuestion();
    }

    return () => {
      mounted = false;
    };
  }, [roomId, enabled]);

  return { codingQuestion, codingLoading, codingError };
}
