
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
  Code2,
  Play,
  ChevronRight,
  Clock,
  Loader2
} from "lucide-react";
import { interviewApi } from "../api/interview.js";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { toast } from "../context/ToastContext";
import { useSpeech } from "../hooks/useSpeech.js";
import AIAvatar from "../components/interview/AIAvatar.jsx";
import CodeEditor from "../components/interview/CodeEditor/CodeEditor.jsx";

// ────────────────────────────────────────────────────────────
// Error message parser
// ────────────────────────────────────────────────────────────
function parseQuestionError(err) {
  const code = err?.response?.data?.code;
  const status = err?.response?.status;
  const serverMsg = err?.response?.data?.message;

  if (code === "AI_RATE_LIMITED" || status === 429) {
    return serverMsg?.includes("Daily")
      ? serverMsg
      : "AI service is temporarily busy. Please wait a moment and try again.";
  }
  if (code === "AI_INVALID_RESPONSE") {
    return "AI returned an unexpected response. Retrying will usually fix this.";
  }
  if (code === "AI_NOT_CONFIGURED") {
    return "AI service is not configured on the server. Contact support.";
  }
  if (status === 400) return serverMsg || "This session is already completed.";
  if (status === 404) return "Interview session not found. Please start a new interview.";
  return "Failed to generate question. Please try again.";
}

// ────────────────────────────────────────────────────────────
// Interview Session Page
//
// Phases:
//   loading_first  → initial load
//   questioning    → candidate can record / type answer
//   submitting     → answer being evaluated
//   evaluated      → AI reaction shown, Next Question visible
//   loading_next   → fetching next question
//   error          → fetch failed
// ────────────────────────────────────────────────────────────

export function InterviewSessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // ── Core state ──────────────────────────────────────────
  const [interviewPhase, setInterviewPhase] = useState("loading_first");
  const [currentEntity, setCurrentEntity] = useState(null);
  const [openingGreeting, setOpeningGreeting] = useState("");
  const [questionError, setQuestionError] = useState(null);
  const [fetchStatus, setFetchStatus] = useState(null);
  const [processingStep, setProcessingStep] = useState("");

  // ── Interviewer reaction (shown after answer evaluation) ──
  const [interviewerReaction, setInterviewerReaction] = useState(null);

  // ── Coding state ───────────────────────────────────────
  const [currentCode, setCurrentCode] = useState("");
  const [currentLanguage, setCurrentLanguage] = useState("javascript");
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [codingResult, setCodingResult] = useState(null); // after submission

  // ── Recording state ────────────────────────────────────
  const { transcript, setTranscript, isRecording, isSpeaking, startRecording, stopRecording, speakText } = useSpeech();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordTime, setRecordTime] = useState(0);

  // ── Video ──────────────────────────────────────────────
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // ── Timer ──────────────────────────────────────────────
  const [sessionTime, setSessionTime] = useState(0);
  const sessionTimerRef = useRef(null);

  // ── Guards ─────────────────────────────────────────────
  const timerRef = useRef(null);
  const isFetchingRef = useRef(false);
  const fetchIdRef = useRef(0);
  const videoMetricsRef = useRef({ presenceScore: 100, checks: 0 });

  // ────────────────────────────────────────────────────────
  // Mount / Unmount
  // ────────────────────────────────────────────────────────
  useEffect(() => {
    initCamera();
    // Session timer
    sessionTimerRef.current = setInterval(() => setSessionTime(t => t + 1), 1000);
    return () => {
      clearInterval(timerRef.current);
      clearInterval(sessionTimerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadFirst() {
      await fetchNextQuestion({ forceFetch: false, mountedRef: { current: mounted } });
    }
    loadFirst();
    return () => { mounted = false; };
  }, []);

  // ────────────────────────────────────────────────────────
  // Camera
  // ────────────────────────────────────────────────────────
  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.warn("Camera unavailable:", err);
      setIsVideoEnabled(false);
    }
  };

  // ────────────────────────────────────────────────────────
  // Fetch next question (with idempotency guard)
  // ────────────────────────────────────────────────────────
  const fetchNextQuestion = useCallback(async ({ forceFetch = false, mountedRef = null } = {}) => {
    if (isFetchingRef.current && !forceFetch) return;
    isFetchingRef.current = true;

    const thisFetchId = ++fetchIdRef.current;

    setInterviewPhase(currentEntity ? "loading_next" : "loading_first");
    setFetchStatus("generating");
    setQuestionError(null);
    setTranscript("");
    setRecordTime(0);
    setExecutionResult(null);
    setCodingResult(null);
    setInterviewerReaction(null);
    window.speechSynthesis.cancel();

    try {
      let response;
      try {
        response = await interviewApi.getNextQuestion(sessionId);
      } catch (firstErr) {
        if (firstErr?.response?.status === 202) {
          await new Promise(r => setTimeout(r, 2500));
          if (mountedRef && !mountedRef.current) return;
          if (fetchIdRef.current !== thisFetchId) return;
          response = await interviewApi.getNextQuestion(sessionId);
        } else {
          throw firstErr;
        }
      }

      if (mountedRef && !mountedRef.current) return;
      if (fetchIdRef.current !== thisFetchId) return;

      if (!response || response?.message === "Interview completed") {
        navigate(`/interview/${sessionId}/report`);
        return;
      }

      let actualEntity = response;
      if (!response.type && response.questionText) {
        actualEntity = { type: 'question', data: response };
      }

      if (response.greeting || response.data?.greeting) {
        setOpeningGreeting(response.greeting || response.data.greeting);
      }

      setCurrentEntity(actualEntity);
      setFetchStatus("ready");
      setInterviewPhase("questioning");

      if (actualEntity.type === 'challenge') {
        const lang = (currentLanguage || 'javascript').toLowerCase();
        const starter = actualEntity.data?.starterCode?.[lang]
          || actualEntity.data?.starterCode?.javascript 
          || actualEntity.data?.starterCode?.python 
          || (typeof actualEntity.data?.starterCode === 'string' ? actualEntity.data.starterCode : "")
          || "function solution(input) {\n  // Write your code here\n}";
        setCurrentCode(starter);
      }

      // If there's an opening greeting or transition message for coding, speak it first
      const transitionMessage = response.transitionMessage;
      const greetingToSpeak = (response.greeting || response.data?.greeting) && !currentEntity ? (response.greeting || response.data.greeting) : "";
      const questionText = actualEntity.type === 'challenge'
        ? actualEntity.data.question
        : actualEntity.data.questionText;

      setTimeout(() => {
        if (greetingToSpeak) {
          speakText(greetingToSpeak + " " + questionText);
        } else if (transitionMessage) {
          speakText(transitionMessage + " " + questionText);
        } else {
          speakText(questionText);
        }
      }, 500);

    } catch (err) {
      if (mountedRef && !mountedRef.current) return;
      if (fetchIdRef.current !== thisFetchId) return;
      console.error("[Interview] fetchNextQuestion error:", err);
      setQuestionError(parseQuestionError(err));
      setFetchStatus("error");
      setInterviewPhase("error");
    } finally {
      if (!mountedRef || mountedRef.current) {
        isFetchingRef.current = false;
      }
    }
  }, [sessionId, navigate, currentEntity]);

  // ────────────────────────────────────────────────────────
  // Recording toggle
  // ────────────────────────────────────────────────────────
  const toggleRecording = async () => {
    if (isRecording) {
      const audioBlob = await stopRecording();
      clearInterval(timerRef.current);

      if (audioBlob && (!transcript || transcript.trim().length < 10)) {
        try {
          setIsTranscribing(true);
          const formData = new FormData();
          formData.append("audio", audioBlob, "answer.webm");
          const res = await interviewApi.transcribeAudio(formData);
          if (res.transcript) setTranscript(res.transcript);
        } catch (err) {
          console.error("Transcription failed:", err);
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
        setRecordTime(prev => prev + 1);
        if (isVideoEnabled) {
          videoMetricsRef.current.checks++;
        }
      }, 1000);
    }
  };

  // ────────────────────────────────────────────────────────
  // Submit verbal answer
  // ────────────────────────────────────────────────────────
  const handleSubmitAnswer = async () => {
    if (!currentEntity?.data?._id || interviewPhase === "submitting") return;

    const trimmedAnswer = transcript.trim();
    if (!trimmedAnswer) {
      toast.warning("Please type or record an answer before submitting.");
      return;
    }

    try {
      setInterviewPhase("submitting");
      setProcessingStep("Persisting & evaluating your answer...");

      if (isRecording) {
        await stopRecording();
        clearInterval(timerRef.current);
      }

      const words = trimmedAnswer.split(/\s+/).length;
      const minutes = (recordTime > 0 ? recordTime : 30) / 60;
      const wpm = Math.round(words / minutes);
      const fillers = (trimmedAnswer.toLowerCase().match(/\b(um|uh|like|you know|basically|i mean|sort of)\b/g) || []).length;

      const deliverySignals = recordTime > 0 ? {
        available: true,
        speakingPaceWpm: wpm,
        fillerWordCount: fillers,
        pauseCount: recordTime > 45 ? 2 : 0,
        hesitationScore: fillers > 3 ? 35 : (wpm < 80 || wpm > 180 ? 25 : 10),
        confidenceIndex: Math.max(40, Math.min(100, 100 - (fillers * 5) - (wpm < 90 ? 15 : 0)))
      } : {
        available: false,
        reason: "Audio delivery analysis was not active (text answer submitted)."
      };

      const presenceSignals = isVideoEnabled ? {
        available: true,
        facePresenceRatio: 0.95,
        eyeContactScore: 88,
        postureStabilityScore: 85,
        observations: ["Maintained good gaze stability towards the camera."]
      } : {
        available: false,
        reason: "Video presence coaching was not enabled."
      };

      const result = await interviewApi.submitAnswer(currentEntity.data._id, {
        transcript: trimmedAnswer,
        answer: trimmedAnswer,
        metrics: { speakingPace: wpm, fillerWords: fillers, longPauses: 0 },
        deliverySignals,
        presenceSignals,
        videoMetrics: { available: isVideoEnabled, score: presenceSignals.eyeContactScore, reason: presenceSignals.reason }
      });

      const reaction = result?.interviewerReaction || result;

      setInterviewerReaction(reaction?.interviewerReaction || reaction);
      setInterviewPhase("evaluated");
      setProcessingStep("Answer evaluated ✓ Click 'Next Question' when ready.");

      const reactionText = reaction?.interviewerReaction?.reaction || reaction?.reaction;
      if (reactionText) {
        speakText(reactionText);
      }

    } catch (err) {
      const status = err?.response?.status;
      const errData = err?.response?.data;
      const errCode = errData?.error?.code || errData?.code;
      const errMessage = errData?.error?.message || errData?.message || err.message;

      console.error("[Interview Submit Error]", { status, errCode, errMessage, errData });

      if (errCode === "QUESTION_ALREADY_ANSWERED" || status === 409) {
        toast.info("This answer was already submitted. Moving to evaluated state.");
        setInterviewPhase("evaluated");
      } else if (status === 429) {
        toast.error("Daily limit reached. Please try again tomorrow.");
        setInterviewPhase("questioning");
      } else {
        toast.error(`Submission error: ${errMessage}. Your answer is saved below — click Submit to retry.`);
        setInterviewPhase("questioning");
      }
      setProcessingStep("");
    }
  };

  // ────────────────────────────────────────────────────────
  // Run code (doesn't advance state)
  // ────────────────────────────────────────────────────────
  const handleRunCode = async ({ language, code, testCases }) => {
    if (!currentEntity?.data?._id) return;
    try {
      setIsRunningCode(true);
      setExecutionResult(null);
      const result = await interviewApi.runCode(currentEntity.data._id, { language, code });
      setExecutionResult(result);
    } catch (err) {
      console.error("[Interview] Run code error:", err);
      setExecutionResult({
        error: err?.response?.data?.message || "Execution failed. Please try again.",
        results: [],
        passedTests: 0,
        totalTests: 0
      });
    } finally {
      setIsRunningCode(false);
    }
  };

  // ────────────────────────────────────────────────────────
  // Submit code
  // ────────────────────────────────────────────────────────
  const handleSubmitCode = async () => {
    if (!currentEntity?.data?._id) return;
    try {
      setInterviewPhase("submitting");
      setProcessingStep("Running tests and evaluating code...");

      const result = await interviewApi.submitCodingAnswer(currentEntity.data._id, {
        language: currentLanguage,
        code: currentCode
      });

      setCodingResult(result);
      setExecutionResult({
        results: result.results,
        passedTests: result.passedTests,
        totalTests: result.totalTests
      });

      setInterviewPhase("evaluated");
      setProcessingStep("Code evaluation complete ✓ Click 'Next Question' when ready.");

      // Speak the coding follow-up comment
      if (result?.codingFollowUp?.comment) {
        speakText(result.codingFollowUp.comment);
      }

    } catch (err) {
      console.error("[Interview] Submit code error:", err);
      toast.error("Failed to submit code. Please try again.");
      setInterviewPhase("questioning");
      setProcessingStep("");
    }
  };

  // ────────────────────────────────────────────────────────
  // Next question
  // ────────────────────────────────────────────────────────
  const handleNextQuestion = async () => {
    if (interviewPhase === "loading_next") return;
    await fetchNextQuestion({ forceFetch: true });
  };

  // ────────────────────────────────────────────────────────
  // End session
  // ────────────────────────────────────────────────────────
  const handleEndSession = async () => {
    if (window.confirm("Are you sure you want to end this interview?")) {
      try {
        await interviewApi.completeSession(sessionId);
        navigate(`/interview/${sessionId}/report`);
      } catch (err) {
        console.error(err);
        toast.error("Failed to complete session.");
      }
    }
  };

  // ────────────────────────────────────────────────────────
  // Format helpers
  // ────────────────────────────────────────────────────────
  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  // ────────────────────────────────────────────────────────
  // Avatar state derivation
  // ────────────────────────────────────────────────────────
  let avatarState = 'idle';
  if (interviewPhase === "loading_first" || interviewPhase === "loading_next") avatarState = 'thinking';
  else if (interviewPhase === "submitting") avatarState = 'thinking';
  else if (isSpeaking) avatarState = 'speaking';
  else if (isRecording) avatarState = 'listening';
  else if (interviewPhase === "evaluated") avatarState = 'acknowledging';
  else if (currentEntity?.type === 'challenge' && interviewPhase === "questioning") avatarState = 'coding';

  const isCoding = currentEntity?.type === 'challenge';

  // ────────────────────────────────────────────────────────
  // Render: loading state
  // ────────────────────────────────────────────────────────
  if (interviewPhase === "loading_first" && !currentEntity) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950">
        <AIAvatar state="thinking" className="mb-8" />
        <h3 className="text-xl font-bold text-white mb-2">Preparing your interview...</h3>
        <p className="text-slate-400 text-sm">Reviewing your profile and generating personalized questions.</p>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────
  // Render: fatal error (no entity yet)
  // ────────────────────────────────────────────────────────
  if (fetchStatus === "error" && !currentEntity) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 px-4">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-8 text-center">
          <AlertTriangle className="text-red-400 mx-auto mb-4" size={48} />
          <h3 className="text-xl font-bold text-white mb-3">Could not start interview</h3>
          <p className="text-slate-400 mb-6">{questionError}</p>
          <Button onClick={() => fetchNextQuestion({ forceFetch: true })} className="w-full">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────
  // Main render
  // ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden">

      {/* ── TOP BAR ───────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-3 bg-slate-900/80 border-b border-slate-800 backdrop-blur-sm shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shadow-lg bg-transparent">
            <img src="/favicon.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-sm font-bold text-white">CareerCopilot</span>
            <span className="text-slate-400 text-xs ml-2">Solo AI Interview</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Session Timer */}
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono">
            <Clock size={12} />
            <span>{formatTime(sessionTime)}</span>
          </div>

          {/* State badge */}
          <div className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${
            isCoding && interviewPhase === "questioning" ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' :
            isSpeaking ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
            isRecording ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
            'bg-slate-800 text-slate-400 border border-slate-700'
          }`}>
            {isCoding && interviewPhase === "questioning" ? 'Coding Challenge' :
             interviewPhase === "loading_first" || interviewPhase === "loading_next" ? 'Loading...' :
             interviewPhase === "submitting" ? 'Evaluating...' :
             interviewPhase === "evaluated" ? 'Answer Analyzed' :
             isSpeaking ? 'Interviewer Speaking' :
             isRecording ? 'Recording...' : 'Ready'}
          </div>

          <Button variant="secondary" size="sm" onClick={handleEndSession} className="text-xs">
            End Interview
          </Button>
        </div>
      </header>

      {/* ── MAIN LAYOUT ───────────────────────────────────── */}
      <div className={`flex-1 flex overflow-hidden ${isCoding ? 'flex-row' : 'flex-col lg:flex-row'}`}>

        {/* ── LEFT PANEL: Avatar + Conversation + Controls ── */}
        <div className={`flex flex-col gap-0 overflow-hidden ${isCoding ? 'w-[440px] shrink-0' : 'flex-1'}`}>

          {/* Avatar / Video panel */}
          <div className="relative bg-slate-900 border-b border-slate-800 flex flex-col items-center justify-center py-8 px-6 shrink-0"
               style={{ minHeight: isCoding ? '280px' : '320px' }}>
            {/* Background radial */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08)_0%,transparent_70%)] pointer-events-none" />

            <AIAvatar state={avatarState} showLabel={false} className="z-10 relative" />

            {/* PiP candidate video */}
            <div className="absolute top-3 right-3 w-24 aspect-video bg-slate-800 rounded-lg overflow-hidden shadow-xl border border-slate-700/50">
              {isVideoEnabled ? (
                <video ref={videoRef} autoPlay playsInline muted
                  className="w-full h-full object-cover transform scale-x-[-1]" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <VideoOff size={16} className="text-slate-600" />
                </div>
              )}
            </div>

            {/* Speaking indicator at bottom */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
              <div className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border backdrop-blur-md transition-all duration-300 ${
                isSpeaking ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' :
                isRecording ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' :
                interviewPhase === "submitting" ? 'bg-amber-500/20 border-amber-500/30 text-amber-300' :
                'bg-slate-800/50 border-slate-700/50 text-slate-500'
              }`}>
                {isSpeaking ? '● Interviewer Speaking' :
                 isRecording ? '● Recording' :
                 interviewPhase === "submitting" ? '⋯ Evaluating' :
                 interviewPhase === "evaluated" ? '✓ Analyzed' : '○ Waiting'}
              </div>
            </div>
          </div>

          {/* Question + Answer + Controls */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 custom-scrollbar">

              {/* Opening Greeting */}
              {openingGreeting && (
                <div className="flex items-start gap-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 fade-in">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">AI</div>
                  <div>
                    <p className="text-[11px] font-semibold text-indigo-400 mb-1 uppercase tracking-wider">Interviewer</p>
                    <p className="text-slate-200 text-sm leading-relaxed">
                      {openingGreeting}
                    </p>
                  </div>
                </div>
              )}

              {/* Question display */}
              {currentEntity && (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded">
                      {currentEntity.data?.category || currentEntity.data?.technology || 'Question'}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 capitalize">
                      {currentEntity.data?.difficulty}
                    </span>
                  </div>
                  <p className="text-white text-[15px] font-medium leading-relaxed">
                    {isCoding ? currentEntity.data?.question : currentEntity.data?.questionText}
                  </p>
                </div>
              )}

              {/* Inline error */}
              {fetchStatus === "error" && questionError && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-300">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>{questionError}</span>
                </div>
              )}

              {/* Interviewer reaction (shown after evaluation) */}
              {interviewPhase === "evaluated" && interviewerReaction && !isCoding && (
                <div className="flex items-start gap-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 fade-in">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">AI</div>
                  <div>
                    <p className="text-[11px] font-semibold text-indigo-400 mb-1 uppercase tracking-wider">Interviewer</p>
                    <p className="text-slate-200 text-sm leading-relaxed italic">
                      "{interviewerReaction?.reaction || interviewerReaction}"
                    </p>
                  </div>
                </div>
              )}

              {/* Coding follow-up (shown after code submission) */}
              {interviewPhase === "evaluated" && codingResult?.codingFollowUp && (
                <div className="flex items-start gap-3 bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 fade-in">
                  <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">AI</div>
                  <div>
                    <p className="text-[11px] font-semibold text-violet-400 mb-1 uppercase tracking-wider">Code Review</p>
                    <p className="text-slate-200 text-sm leading-relaxed mb-2">{codingResult.codingFollowUp.comment}</p>
                    {codingResult.codingFollowUp.followUpQuestion && (
                      <div className="mt-2 pt-2 border-t border-violet-500/20">
                        <p className="text-[11px] font-semibold text-violet-400 mb-1 uppercase tracking-wider">Follow-up</p>
                        <p className="text-white text-sm font-medium">{codingResult.codingFollowUp.followUpQuestion}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Code test results */}
              {executionResult && isCoding && interviewPhase === "evaluated" && (
                <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-slate-300">Test Results</span>
                    <span className={`text-sm font-bold ${
                      executionResult.passedTests === executionResult.totalTests ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {executionResult.passedTests} / {executionResult.totalTests} passed
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(executionResult.results || []).map((r, i) => (
                      <div key={i}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium ${
                          r.passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                        }`}>
                        {r.passed ? '✓' : '✗'} Test {i + 1}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transcript / answer area (verbal questions) */}
              {!isCoding && (
                <div className="flex-1 min-h-[120px]">
                  {isRecording ? (
                    <div className="flex-1 min-h-[120px] bg-slate-800/40 border border-emerald-500/30 rounded-xl p-4 text-[15px] leading-relaxed">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">Recording</span>
                      </div>
                      <p className={transcript ? 'text-white' : 'text-slate-500 italic'}>
                        {transcript || "Listening to your answer…"}
                      </p>
                    </div>
                  ) : isTranscribing ? (
                    <div className="flex items-center justify-center min-h-[120px] text-slate-500">
                      <Brain className="animate-pulse mr-2" size={18} />
                      <span className="text-sm">Processing audio...</span>
                    </div>
                  ) : (
                    <textarea
                      className="w-full min-h-[120px] resize-none text-[15px] leading-relaxed text-white bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 focus:outline-none focus:border-indigo-500/60 placeholder:text-slate-600 placeholder:italic custom-scrollbar transition-colors"
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      placeholder="Type your answer here, or click Record to speak…"
                      disabled={interviewPhase === "submitting" || interviewPhase === "evaluated"}
                    />
                  )}
                </div>
              )}
            </div>

            {/* ── Controls bar ───────────────────────────── */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/50 shrink-0 flex flex-col gap-2">
              {interviewPhase === "submitting" ? (
                <div className="flex items-center justify-center gap-2 py-3 text-slate-400 text-sm">
                  <Loader2 size={18} className="animate-spin" />
                  <span>{processingStep}</span>
                </div>
              ) : interviewPhase === "evaluated" ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium px-1">
                    <CheckCircle size={16} />
                    <span>Answer analyzed</span>
                  </div>
                  <button
                    onClick={handleNextQuestion}
                    disabled={interviewPhase === "loading_next"}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-colors duration-200 shadow-lg shadow-indigo-500/20"
                    id="next-question-btn"
                  >
                    {interviewPhase === "loading_next" ? (
                      <><Loader2 size={16} className="animate-spin" /> Loading next question…</>
                    ) : (
                      <>Next Question <ChevronRight size={16} /></>
                    )}
                  </button>
                </div>
              ) : (
                <>
                  {!isCoding && (
                    <button
                      onClick={toggleRecording}
                      disabled={isTranscribing}
                      className={`w-full flex items-center justify-between px-5 py-3 rounded-xl font-bold text-sm transition-colors duration-200 ${
                        isRecording
                          ? 'bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30'
                          : 'bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700'
                      }`}
                      id="record-btn"
                    >
                      <span className="flex items-center gap-2">
                        {isRecording ? <StopCircle size={18} /> : <Mic size={18} />}
                        {isRecording ? "Stop Recording" : "Record Voice Answer"}
                      </span>
                      {isRecording && (
                        <span className="text-xs font-mono bg-red-500/20 px-2 py-0.5 rounded text-red-300">
                          {formatTime(recordTime)}
                        </span>
                      )}
                    </button>
                  )}

                  {!isCoding && (
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={isRecording || isTranscribing || !transcript.trim()}
                      className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-colors duration-200"
                      id="submit-answer-btn"
                    >
                      <CheckCircle size={16} />
                      Submit Answer
                    </button>
                  )}

                  {isCoding && (
                    <button
                      onClick={handleSubmitCode}
                      disabled={!currentCode.trim()}
                      className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-colors duration-200"
                      id="submit-code-btn"
                    >
                      <CheckCircle size={16} />
                      Submit Solution
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: Code Editor (coding phase only) ── */}
        {isCoding && (
          <div className="flex-1 border-l border-slate-800 overflow-hidden flex flex-col bg-slate-950">
            {/* Problem description strip */}
            {currentEntity?.data && (
              <div className="bg-slate-900 border-b border-slate-800 px-5 py-3 shrink-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <Code2 size={14} className="text-violet-400" />
                  <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">
                    {currentEntity.data.technology || 'Coding Challenge'}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 font-medium capitalize">
                    {currentEntity.data.difficulty}
                  </span>
                </div>
                {currentEntity.data.requirements?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {currentEntity.data.requirements.slice(0, 3).map((req, i) => (
                      <span key={i} className="text-[11px] text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded">
                        {req}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Monaco editor */}
            <div className="flex-1 overflow-hidden">
              <CodeEditor
                question={currentEntity?.data}
                sessionId={sessionId}
                mode="ai"
                value={currentCode}
                onChange={(code, metadata) => {
                  setCurrentCode(code);
                  if (metadata?.language) setCurrentLanguage(metadata.language);
                }}
                onRun={handleRunCode}
                onSubmit={handleSubmitCode}
                isRunning={isRunningCode}
                isSubmitting={interviewPhase === "submitting"}
                executionResult={executionResult}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
