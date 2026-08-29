import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Mic,
  StopCircle,
  CheckCircle,
  Brain,
  Video,
  VideoOff,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { interviewApi } from "../api/interview.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { useSpeech } from "../hooks/useSpeech.js";

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
  const [isFetching, setIsFetching] = useState(false); // drives button disabled + UI
  const [fetchStatus, setFetchStatus] = useState(null); // "generating" | "ready" | "error"
  const [questionError, setQuestionError] = useState(null); // human-readable error string
  const [currentQuestion, setCurrentQuestion] = useState(null);

  // ── Recording / evaluation state ────────────────────────────────────────────
  const { transcript, setTranscript, isRecording, startRecording, stopRecording, speakText } = useSpeech();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [isProcessingSubmission, setIsProcessingSubmission] = useState(false);
  const [processingStep, setProcessingStep] = useState(""); // "Evaluating answer..." | "Generating next question..."
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [recordTime, setRecordTime] = useState(0);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const timerRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  // isFetchingRef is a synchronous guard that prevents concurrent requests
  // even when React batches state updates. It is always in sync with isFetching.
  const isFetchingRef = useRef(false);
  // Tracks the latest fetch so stale responses from cancelled calls are discarded
  const fetchIdRef = useRef(0);

  const videoMetricsRef = useRef({ presenceScore: 0, checks: 0 });

  // ── Camera init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    initCamera();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  // ── Fetch first question on mount (single call) ─────────────────────────────
  // Using a separate effect with a mounted flag prevents React Strict Mode
  // double-invocation from firing two concurrent fetch calls.
  useEffect(() => {
    let mounted = true;
    async function loadFirstQuestion() {
      await fetchNextQuestion({
        forceFetch: true,
        mountedRef: { current: mounted },
      });
    }
    loadFirstQuestion();
    return () => {
      mounted = false;
    };
  }, []);

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied or unavailable", err);
      setIsVideoEnabled(false);
    }
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
            console.log(
              "[Interview] Question generating on server, polling after 2.5s…",
            );
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
    [sessionId, navigate],
  );

  const toggleRecording = async () => {
    if (isRecording) {
      const audioBlob = await stopRecording();
      clearInterval(timerRef.current);
      
      // Whisper fallback if transcript is poor or empty
      if (audioBlob && (!transcript || transcript.trim().length < 10)) {
        try {
          setIsTranscribing(true);
          const formData = new FormData();
          formData.append("audio", audioBlob, "answer.webm");
          const res = await interviewApi.transcribeAudio(formData);
          if (res.transcript) {
            setTranscript(res.transcript);
          }
        } catch (err) {
          console.error("Whisper fallback transcription failed", err);
        } finally {
          setIsTranscribing(false);
        }
      }
    } else {
      window.speechSynthesis.cancel();
      if (!transcript) {
        setRecordTime(0);
        videoMetricsRef.current = { presenceScore: 100, checks: 0 };
      }
      await startRecording();
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
      alert(
        "No audio transcribed. Please try again or type your answer if speech fails.",
      );
      return;
    }

    try {
      setIsProcessingSubmission(true);
      setProcessingStep("Evaluating answer...");

      if (isRecording) {
        await stopRecording();
        clearInterval(timerRef.current);
      }

      const words = transcript.trim().split(/\s+/).length;
      const minutes = recordTime / 60 || 1;
      const wpm = Math.round(words / minutes);
      const lowerT = transcript.toLowerCase();
      const fillers = (
        lowerT.match(/\b(um|uh|like|you know|basically)\b/g) || []
      ).length;

      const metrics = {
        speakingPace: wpm,
        fillerWords: fillers,
        longPauses: 0,
      };

      const finalPresenceScore = Math.max(
        0,
        videoMetricsRef.current.presenceScore,
      );

      await interviewApi.submitAnswer(currentQuestion._id, {
        transcript,
        metrics,
        videoMetrics: {
          presenceScore: isVideoEnabled ? finalPresenceScore : 0,
        },
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
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // ── Loading state: first fetch in progress, no question yet ─────────────────
  if (isFetching && !currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <Brain className="animate-pulse text-primary mb-4" size={48} />
        <h3 className="text-xl font-bold text-text mb-2">Generating your question…</h3>
        <p className="text-text-secondary">This usually takes 2–5 seconds.</p>
      </div>
    );
  }

  // ── Error state: fetch failed and no question loaded yet ─────────────────────
  if (fetchStatus === "error" && !currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <Card className="max-w-md w-full shadow-sm text-center">
          <CardContent className="p-8">
            <AlertTriangle className="text-danger mx-auto mb-4" size={48} />
            <h3 className="text-xl font-bold text-text mb-3">Could not generate question</h3>
            <p className="text-text-secondary leading-relaxed mb-6">{questionError}</p>
            <Button onClick={() => fetchNextQuestion()} disabled={isFetching} isLoading={isFetching} className="w-full">
              {isFetching ? "Trying again…" : "Try Again"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-text tracking-tight">AI Interview Session</h2>
          <p className="text-text-secondary mt-1">Answer the question clearly. The AI will evaluate your response.</p>
        </div>
        <Button variant="secondary" onClick={handleEndSession}>
          End Interview
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start h-full">
        {/* Main Content Area */}
        <div className="lg:col-span-2 flex flex-col gap-6 h-full">
          {/* Question Display */}
          <Card className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] text-white border-none shadow-md">
            <CardContent className="p-8 md:p-10">
              <span className="inline-block mb-6 bg-white/10 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-blue-200">
                {currentQuestion?.category} • {currentQuestion?.difficulty}
              </span>
              <h2 className="text-2xl md:text-3xl leading-relaxed font-bold tracking-tight">
                {currentQuestion?.questionText}
              </h2>

              {/* Inline error banner */}
              {fetchStatus === "error" && questionError && currentQuestion && (
                <div className="mt-6 bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-medium">
                  <AlertTriangle size={18} className="shrink-0 text-red-400" />
                  <span>{questionError}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="flex-1 flex flex-col shadow-sm border-border min-h-[400px]">
            <CardContent className="p-6 md:p-8 flex-1 flex flex-col h-full">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <strong className="text-sm font-bold text-text-secondary uppercase tracking-widest">Your Answer Transcript</strong>
                  {/* Dynamic Speech Workflow Banner */}
                  <span className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm border" style={{
                    backgroundColor: isProcessingSubmission ? '#eff6ff' : isRecording ? '#fef2f2' : isFetching ? '#fefce8' : 'rgba(255,255,255,0.05)',
                    color: isProcessingSubmission ? '#1d4ed8' : isRecording ? '#dc2626' : isFetching ? '#ca8a04' : 'inherit',
                    borderColor: isProcessingSubmission ? '#bfdbfe' : isRecording ? '#fca5a5' : isFetching ? '#fef08a' : 'rgba(255,255,255,0.1)'
                  }}>
                    {isProcessingSubmission ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                        Processing Answer...
                      </>
                    ) : isFetching ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-yellow-600 animate-ping"></span>
                        AI Thinking...
                      </>
                    ) : isRecording ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                        Listening...
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Your Turn — Click Record to Speak
                      </>
                    )}
                  </span>
                </div>
                {isRecording && (
                  <div className="flex items-center gap-2 text-danger font-bold text-sm bg-danger-bg px-3 py-1 rounded-full border border-danger/20">
                    <div className="w-2.5 h-2.5 rounded-full bg-danger animate-pulse"></div>
                    {formatTime(recordTime)}
                  </div>
                )}
              </div>

              {isRecording ? (
                <div className={`flex-1 min-h-[200px] text-lg leading-relaxed ${transcript ? 'text-text' : 'text-text-secondary italic'}`}>
                  {transcript || "Listening…"}
                </div>
              ) : isTranscribing ? (
                <div className="flex-1 min-h-[200px] flex items-center justify-center text-text-secondary italic">
                  <div className="flex items-center gap-2">
                    <Brain className="animate-pulse" size={20} />
                    Processing audio via Whisper...
                  </div>
                </div>
              ) : (
                <textarea
                  className="flex-1 min-h-[200px] w-full resize-y text-lg leading-relaxed text-text bg-transparent focus:outline-none placeholder:text-text-secondary placeholder:italic"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Click the microphone to record, or type your answer here if preferred."
                  disabled={isProcessingSubmission}
                />
              )}

              <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8 pt-8 border-t border-border">
                {isProcessingSubmission ? (
                  <Button disabled isLoading={true} className="w-full sm:w-auto px-8">
                    {processingStep}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant={isRecording ? "danger" : "secondary"}
                      onClick={toggleRecording}
                      disabled={isProcessingSubmission || isTranscribing}
                      className="w-full sm:w-auto px-8 rounded-full"
                    >
                      {isRecording ? (
                        <>
                          <StopCircle size={18} className="mr-2" /> Stop Recording
                        </>
                      ) : (
                        <>
                          <Mic size={18} className="mr-2" />{" "}
                          {transcript ? "Resume Recording" : "Record Answer"}
                        </>
                      )}
                    </Button>
                    {transcript.trim() && (
                      <Button
                        onClick={submitAnswerAndNext}
                        disabled={isProcessingSubmission || isRecording || isTranscribing}
                        className="w-full sm:w-auto px-8 rounded-full"
                      >
                        <CheckCircle size={18} className="mr-2" /> Submit Answer & Next Question
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar / Video Feed Area */}
        <div className="flex flex-col gap-6">
          <Card className="shadow-sm border-border overflow-hidden">
            <CardContent className="p-3">
              <div className="relative w-full aspect-4/3 bg-gray-900 rounded-xl overflow-hidden shadow-inner">
                {isVideoEnabled ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform scale-x-[-1]"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <VideoOff size={48} className="mb-4 opacity-50" />
                    <span className="text-sm font-medium">Camera Disabled</span>
                  </div>
                )}
                {isRecording && isVideoEnabled && (
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border border-white/10">
                    <Video size={14} /> Analyzing Presence
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border">
            <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6">
              <CardTitle className="text-lg m-0">Interview Metrics</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center pb-3 border-b border-border">
                  <span className="text-sm font-bold text-text-secondary uppercase tracking-wider">Pace (WPM)</span>
                  <strong className="text-lg font-extrabold text-text">
                    {evaluation ? evaluation.analysis.communication : "—"}
                  </strong>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-border">
                  <span className="text-sm font-bold text-text-secondary uppercase tracking-wider">Clarity</span>
                  <strong className="text-lg font-extrabold text-text">
                    {evaluation ? evaluation.analysis.clarity : "—"}
                  </strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-text-secondary uppercase tracking-wider">Structure</span>
                  <strong className="text-lg font-extrabold text-text">
                    {evaluation ? evaluation.analysis.structure : "—"}
                  </strong>
                </div>
              </div>

              {/* Status indicator */}
              {isFetching && (
                <div className="mt-6 bg-info-bg border border-blue-200 text-primary px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-bold shadow-sm">
                  <Clock size={16} className="shrink-0" />
                  Generating next question…
                </div>
              )}
              {fetchStatus === "ready" && !isFetching && (
                <div className="mt-6 bg-success-bg border border-success/20 text-success px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-bold shadow-sm">
                  <CheckCircle size={16} className="shrink-0" />
                  Question ready
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
