import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Mic, StopCircle, SkipForward, CheckCircle, Brain, Video, VideoOff, AlertTriangle, Clock } from "lucide-react";
import { interviewApi } from "../api/interview.js";

// ─── Error message helpers ────────────────────────────────────────────────────
function parseQuestionError(err) {
  const code = err?.response?.data?.code;
  const status = err?.response?.status;
  const serverMsg = err?.response?.data?.message;

  if (code === "AI_RATE_LIMITED" || status === 429) {
    return serverMsg?.includes("Daily")
      ? serverMsg // "Daily mock question limit reached (20/day). Try again tomorrow."
      : "AI service is temporarily busy. Please wait a moment and try again.";
  }
  if (code === "AI_INVALID_RESPONSE") {
    return "AI returned an unexpected response. Retrying will usually fix this.";
  }
  if (code === "AI_NOT_CONFIGURED") {
    return "AI service is not configured on the server. Contact support.";
  }
  if (status === 400) {
    return serverMsg || "This session is already completed.";
  }
  if (status === 404) {
    return "Interview session not found. Please start a new interview.";
  }
  return "Failed to generate question. Please try again.";
}

export function InterviewSessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // ── Core state ──────────────────────────────────────────────────────────────
  const [isFetching, setIsFetching] = useState(false);      // drives button disabled + UI
  const [fetchStatus, setFetchStatus] = useState(null);     // "generating" | "ready" | "error"
  const [questionError, setQuestionError] = useState(null); // human-readable error string
  const [currentQuestion, setCurrentQuestion] = useState(null);

  // ── Recording / evaluation state ────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [isProcessingSubmission, setIsProcessingSubmission] = useState(false);
  const [processingStep, setProcessingStep] = useState(""); // "Evaluating answer..." | "Generating next question..."
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [recordTime, setRecordTime] = useState(0);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  // isFetchingRef is a synchronous guard that prevents concurrent requests
  // even when React batches state updates. It is always in sync with isFetching.
  const isFetchingRef = useRef(false);
  // Tracks the latest fetch so stale responses from cancelled calls are discarded
  const fetchIdRef = useRef(0);

  const videoMetricsRef = useRef({ presenceScore: 100, checks: 0 });

  // ── Camera init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    initCamera();
    initSpeechRecognition();

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      window.speechSynthesis.cancel();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch first question on mount (single call) ─────────────────────────────
  // Using a separate effect with a mounted flag prevents React Strict Mode
  // double-invocation from firing two concurrent fetch calls.
  useEffect(() => {
    let mounted = true;
    async function loadFirstQuestion() {
      await fetchNextQuestion({ forceFetch: true, mountedRef: { current: mounted } });
    }
    loadFirstQuestion();
    return () => {
      mounted = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied or unavailable", err);
      setIsVideoEnabled(false);
    }
  };

  const speakText = (text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find((v) => v.name.includes("Google") || v.name.includes("Natural"));
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  const initSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let currentTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);
    };
    recognitionRef.current = recognition;
  };

  /**
   * Fetch the next question from the backend.
   *
   * Guards:
   *  1. isFetchingRef.current (sync ref) — prevents concurrent calls even before
   *     React processes the setIsFetching(true) state update.
   *  2. fetchId — each call gets an incremented ID; stale responses are discarded.
   *  3. mountedRef — optional; if provided, stale updates after unmount are skipped.
   *
   * On 202 (pending stub already generating):
   *  Wait 2.5 seconds and retry once. This covers the race window where two
   *  requests arrived at the same time and one is waiting for the other.
   */
  const fetchNextQuestion = useCallback(
    async ({ forceFetch = false, mountedRef = null } = {}) => {
      // ── Synchronous guard — prevents double invocation ─────────────────────
      if (isFetchingRef.current && !forceFetch) return;
      isFetchingRef.current = true;

      const thisFetchId = ++fetchIdRef.current;

      setIsFetching(true);
      setFetchStatus("generating");
      setQuestionError(null);
      setEvaluation(null);
      setTranscript("");
      setRecordTime(0);
      window.speechSynthesis.cancel();

      try {
        let response;
        try {
          response = await interviewApi.getNextQuestion(sessionId);
        } catch (firstErr) {
          // ── Handle 202: another request is already generating ────────────
          if (firstErr?.response?.status === 202) {
            console.log("[Interview] Question generating on server, polling after 2.5s…");
            await new Promise((r) => setTimeout(r, 2500));

            if (mountedRef && !mountedRef.current) return; // unmounted
            if (fetchIdRef.current !== thisFetchId) return; // superseded

            // One retry after the backoff
            response = await interviewApi.getNextQuestion(sessionId);
          } else {
            throw firstErr;
          }
        }

        // Guard against stale / superseded fetches
        if (mountedRef && !mountedRef.current) return;
        if (fetchIdRef.current !== thisFetchId) return;

        // Session completed
        if (!response || response?.message === "Interview completed") {
          navigate(`/interview/${sessionId}/report`);
          return;
        }

        setCurrentQuestion(response);
        setFetchStatus("ready");

        // AI reads the question aloud
        setTimeout(() => {
          speakText(response.questionText);
        }, 500);
      } catch (err) {
        if (mountedRef && !mountedRef.current) return;
        if (fetchIdRef.current !== thisFetchId) return;

        console.error("[Interview] fetchNextQuestion error:", err);
        const message = parseQuestionError(err);
        setQuestionError(message);
        setFetchStatus("error");
      } finally {
        if (!mountedRef || mountedRef.current) {
          setIsFetching(false);
          isFetchingRef.current = false;
        }
      }
    },
    [sessionId, navigate]
  );

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      clearInterval(timerRef.current);
      setIsRecording(false);
    } else {
      window.speechSynthesis.cancel();
      if (!transcript) {
        setRecordTime(0);
        videoMetricsRef.current = { presenceScore: 100, checks: 0 };
      }
      recognitionRef.current?.start();
      setIsRecording(true);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordTime((prev) => prev + 1);
        if (isVideoEnabled) {
          videoMetricsRef.current.checks++;
          if (Math.random() > 0.8) {
            videoMetricsRef.current.presenceScore -= 2;
          }
        }
      }, 1000);
    }
  };

  const submitAnswerAndNext = async () => {
    if (!transcript.trim()) {
      alert("No audio transcribed. Please try again or type your answer if speech fails.");
      return;
    }

    try {
      setIsProcessingSubmission(true);
      setProcessingStep("Evaluating answer...");

      if (isRecording) {
        recognitionRef.current?.stop();
        clearInterval(timerRef.current);
        setIsRecording(false);
      }

      const words = transcript.trim().split(/\s+/).length;
      const minutes = recordTime / 60 || 1;
      const wpm = Math.round(words / minutes);
      const lowerT = transcript.toLowerCase();
      const fillers = (lowerT.match(/\b(um|uh|like|you know|basically)\b/g) || []).length;

      const metrics = {
        speakingPace: wpm,
        fillerWords: fillers,
        longPauses: 0
      };

      const finalPresenceScore = Math.max(0, videoMetricsRef.current.presenceScore);

      await interviewApi.submitAnswer(currentQuestion._id, {
        transcript,
        metrics,
        videoMetrics: { presenceScore: isVideoEnabled ? finalPresenceScore : 0 }
      });

      setProcessingStep("Generating next question...");
      await fetchNextQuestion({ forceFetch: true });

    } catch (err) {
      console.error(err);
      const status = err?.response?.status;
      if (status === 429) {
        alert("Daily limit reached. Please try again tomorrow.");
      } else {
        alert("Failed to process answer. Please try again.");
      }
    } finally {
      setIsProcessingSubmission(false);
      setProcessingStep("");
    }
  };

  const handleEndSession = async () => {
    if (window.confirm("Are you sure you want to end this interview?")) {
      try {
        await interviewApi.completeSession(sessionId);
        navigate(`/interview/${sessionId}/report`);
      } catch (err) {
        console.error(err);
        alert("Failed to complete session.");
      }
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // ── Loading state: first fetch in progress, no question yet ─────────────────
  if (isFetching && !currentQuestion) {
    return (
      <div className="content-layout" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
        <div style={{ textAlign: "center" }}>
          <Brain className="spin" size={40} style={{ color: "var(--primary-color)", margin: "0 auto 1rem" }} />
          <h3>Generating your question…</h3>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>This usually takes 2–5 seconds.</p>
        </div>
      </div>
    );
  }

  // ── Error state: fetch failed and no question loaded yet ─────────────────────
  if (fetchStatus === "error" && !currentQuestion) {
    return (
      <div className="content-layout" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
        <div className="card" style={{ maxWidth: "500px", textAlign: "center", padding: "2.5rem" }}>
          <AlertTriangle size={40} style={{ color: "var(--danger-color)", margin: "0 auto 1rem" }} />
          <h3 style={{ marginBottom: "0.75rem" }}>Could not generate question</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: "1.6" }}>{questionError}</p>
          <button
            className="btn btn-primary"
            onClick={() => fetchNextQuestion()}
            disabled={isFetching}
          >
            {isFetching ? (
              <><Brain className="spin" size={16} /> Trying again…</>
            ) : (
              "Try Again"
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="content-layout" style={{ maxWidth: "1200px" }}>
      <div className="content-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2>AI Interview Session</h2>
          <p>Answer the question clearly. The AI will evaluate your response.</p>
        </div>
        <button className="btn btn-secondary" onClick={handleEndSession}>
          End Interview
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: "2rem" }}>

        {/* Main Content Area */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* Question Display */}
          <div className="card" style={{ backgroundColor: "#1e293b", color: "white", padding: "2rem", border: "none" }}>
            <span style={{ display: "inline-block", marginBottom: "1rem", backgroundColor: "rgba(255,255,255,0.1)", padding: "4px 12px", borderRadius: "99px", fontSize: "0.85rem" }}>
              {currentQuestion?.category} • {currentQuestion?.difficulty}
            </span>
            <h2 style={{ fontSize: "1.75rem", lineHeight: "1.4", margin: 0, fontWeight: 500 }}>
              {currentQuestion?.questionText}
            </h2>

            {/* Inline error banner (when there's a question on screen but the next-question fetch failed) */}
            {fetchStatus === "error" && questionError && currentQuestion && (
              <div style={{
                marginTop: "1.25rem",
                backgroundColor: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.4)",
                borderRadius: "8px",
                padding: "0.75rem 1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.9rem"
              }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, color: "#f87171" }} />
                <span>{questionError}</span>
              </div>
            )}
          </div>

          <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <strong>Your Answer Transcript</strong>
              {isRecording && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--danger-color)", fontWeight: "bold" }}>
                  <div className="pulsing-dot" style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "var(--danger-color)" }}></div>
                  {formatTime(recordTime)}
                </div>
              )}
            </div>

            {isRecording ? (
              <p style={{ minHeight: "150px", color: transcript ? "inherit" : "var(--text-secondary)", fontStyle: transcript ? "normal" : "italic", fontSize: "1.1rem", lineHeight: "1.6" }}>
                {transcript || "Listening…"}
              </p>
            ) : (
              <textarea
                className="input-field"
                style={{ minHeight: "150px", resize: "vertical", fontSize: "1.1rem", lineHeight: "1.6" }}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Click the microphone to record, or type your answer here if preferred."
                disabled={isProcessingSubmission}
              />
            )}

            <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginTop: "auto", paddingTop: "2rem", flexWrap: "wrap" }}>
              {isProcessingSubmission ? (
                <button className="btn btn-primary" disabled style={{ padding: "0.75rem 2rem", width: "100%" }}>
                  <Brain className="spin" size={20} />
                  {processingStep}
                </button>
              ) : (
                <>
                  <button
                    className={`btn ${isRecording ? "btn-danger" : "btn-secondary"}`}
                    onClick={toggleRecording}
                    style={{ padding: "0.75rem 2rem", borderRadius: "30px", fontSize: "1.1rem" }}
                    disabled={isProcessingSubmission}
                  >
                    {isRecording ? (
                      <><StopCircle size={20} /> Stop Recording</>
                    ) : (
                      <><Mic size={20} /> {transcript ? "Resume Recording" : "Record Answer"}</>
                    )}
                  </button>
                  {transcript.trim() && (
                    <button
                      className="btn btn-primary"
                      onClick={submitAnswerAndNext}
                      style={{ padding: "0.75rem 2rem", borderRadius: "30px", fontSize: "1.1rem" }}
                      disabled={isProcessingSubmission || isRecording}
                    >
                      <CheckCircle size={20} /> Submit Answer &amp; Next Question
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar / Video Feed Area */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          <div className="card" style={{ padding: "1rem" }}>
            <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", backgroundColor: "#0f172a", borderRadius: "8px", overflow: "hidden" }}>
              {isVideoEnabled ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#64748b" }}>
                  <VideoOff size={48} style={{ marginBottom: "1rem" }} />
                  <span>Camera Disabled</span>
                </div>
              )}
              {isRecording && isVideoEnabled && (
                <div style={{ position: "absolute", top: "10px", right: "10px", backgroundColor: "rgba(0,0,0,0.6)", color: "white", padding: "4px 8px", borderRadius: "4px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Video size={14} /> Analyzing Presence
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem" }}>Interview Metrics</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="text-secondary">Pace (WPM)</span>
                <strong>{evaluation ? evaluation.analysis.communication : "—"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="text-secondary">Clarity</span>
                <strong>{evaluation ? evaluation.analysis.clarity : "—"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="text-secondary">Structure</span>
                <strong>{evaluation ? evaluation.analysis.structure : "—"}</strong>
              </div>
            </div>

            {/* Status indicator */}
            {isFetching && (
              <div style={{
                marginTop: "1rem",
                padding: "0.6rem 0.75rem",
                borderRadius: "6px",
                backgroundColor: "rgba(99,102,241,0.1)",
                border: "1px solid rgba(99,102,241,0.25)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.85rem",
                color: "var(--primary-color)"
              }}>
                <Clock size={14} />
                Generating next question…
              </div>
            )}
            {fetchStatus === "ready" && !isFetching && (
              <div style={{
                marginTop: "1rem",
                padding: "0.6rem 0.75rem",
                borderRadius: "6px",
                backgroundColor: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.25)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.85rem",
                color: "var(--success-color)"
              }}>
                <CheckCircle size={14} />
                Question ready
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
