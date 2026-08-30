import fs from 'fs';

const pagePath = "c:/Users/Lenovo/OneDrive/Desktop/CareerPilot AI/client/src/pages/InterviewSessionPage.jsx";

const pageContent = `
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
  Terminal,
  Play
} from "lucide-react";
import { interviewApi } from "../api/interview.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { useSpeech } from "../hooks/useSpeech.js";
import AIAvatar from "../components/interview/AIAvatar.jsx";
import CodeEditor from "../components/interview/CodeEditor/CodeEditor.jsx";

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

  const [isFetching, setIsFetching] = useState(false);
  const [fetchStatus, setFetchStatus] = useState(null);
  const [questionError, setQuestionError] = useState(null);
  const [currentEntity, setCurrentEntity] = useState(null); // { type: 'question' | 'challenge', data: object }

  const { transcript, setTranscript, isRecording, startRecording, stopRecording, speakText, isSpeaking } = useSpeech();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isProcessingSubmission, setIsProcessingSubmission] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [recordTime, setRecordTime] = useState(0);

  // Coding specific state
  const [currentCode, setCurrentCode] = useState("");
  const [currentLanguage, setCurrentLanguage] = useState("javascript");
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);

  const timerRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const isFetchingRef = useRef(false);
  const fetchIdRef = useRef(0);
  const videoMetricsRef = useRef({ presenceScore: 0, checks: 0 });

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

  const fetchNextQuestion = useCallback(
    async ({ forceFetch = false, mountedRef = null } = {}) => {
      if (isFetchingRef.current && !forceFetch) return;
      isFetchingRef.current = true;

      const thisFetchId = ++fetchIdRef.current;

      setIsFetching(true);
      setFetchStatus("generating");
      setQuestionError(null);
      setTranscript("");
      setRecordTime(0);
      setExecutionResult(null);
      window.speechSynthesis.cancel();

      try {
        let response;
        try {
          response = await interviewApi.getNextQuestion(sessionId);
        } catch (firstErr) {
          if (firstErr?.response?.status === 202) {
            await new Promise((r) => setTimeout(r, 2500));
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
          navigate(\`/interview/\${sessionId}/report\`);
          return;
        }

        // response.data could be a question or challenge
        const entity = response; // since backend returns { success: true, data: { type, data } }
        // Note: the original api returned res.data.data. So response is actually { type, data }.
        
        let actualEntity = response;
        // Backward compatibility if backend just returns the question directly
        if (!response.type && response.questionText) {
           actualEntity = { type: 'question', data: response };
        }

        setCurrentEntity(actualEntity);
        setFetchStatus("ready");

        const textToSpeak = actualEntity.type === 'challenge' ? actualEntity.data.question : actualEntity.data.questionText;

        setTimeout(() => {
          speakText(textToSpeak);
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
    try {
      setIsProcessingSubmission(true);
      setProcessingStep("Evaluating answer...");

      if (isRecording) {
        await stopRecording();
        clearInterval(timerRef.current);
      }

      if (currentEntity?.type === 'challenge') {
         // Submitting code answer
         await interviewApi.submitCodingAnswer(currentEntity.data._id || currentEntity.data.id, {
             language: currentLanguage,
             code: currentCode
         });
      } else {
         // Submitting voice answer
         if (!transcript.trim()) {
            alert("No audio transcribed. Please try again or type your answer.");
            setIsProcessingSubmission(false);
            return;
         }

         const words = transcript.trim().split(/\\s+/).length;
         const minutes = recordTime / 60 || 1;
         const wpm = Math.round(words / minutes);
         const lowerT = transcript.toLowerCase();
         const fillers = (
           lowerT.match(/\\b(um|uh|like|you know|basically)\\b/g) || []
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
   
         await interviewApi.submitAnswer(currentEntity.data._id, {
           transcript,
           metrics,
           videoMetrics: {
             presenceScore: isVideoEnabled ? finalPresenceScore : 0,
           },
         });
      }

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
        navigate(\`/interview/\${sessionId}/report\`);
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
    return \`\${m}:\${s}\`;
  };

  // Determine Avatar State
  let avatarState = 'idle';
  if (isFetching || isProcessingSubmission) avatarState = 'thinking';
  else if (isSpeaking) avatarState = 'speaking';
  else if (isRecording) avatarState = 'listening';

  if (isFetching && !currentEntity) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-bg">
        <AIAvatar state="thinking" className="mb-10 scale-150" />
        <h3 className="text-xl font-bold text-text mb-2">Preparing your interview...</h3>
        <p className="text-text-secondary">Please wait while the AI reviews your profile.</p>
      </div>
    );
  }

  if (fetchStatus === "error" && !currentEntity) {
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

  const isCoding = currentEntity?.type === 'challenge';

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 h-screen px-4 py-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg text-white font-bold">AI</div>
            <div>
            <h2 className="text-xl font-extrabold text-text tracking-tight">AI Interview Simulator</h2>
            <p className="text-text-secondary mt-0.5 text-sm">Professional Mode</p>
            </div>
        </div>
        <Button variant="secondary" onClick={handleEndSession}>
          End Interview
        </Button>
      </div>

      <div className={\`flex-1 flex gap-6 overflow-hidden \${isCoding ? 'flex-col lg:flex-row' : 'flex-col lg:flex-row'}\`}>
        
        {/* Left Side / Main Interface */}
        <div className={\`flex flex-col gap-6 h-full \${isCoding ? 'lg:w-[400px] shrink-0' : 'flex-1'}\`}>
          
          {/* Avatar & Video Container */}
          <div className="relative w-full aspect-[4/3] rounded-2xl bg-surface border border-border shadow-md overflow-hidden flex flex-col items-center justify-center">
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-bg/50"></div>
              
              <AIAvatar state={avatarState} className="z-10 mb-8 transform scale-125" />
              
              <div className="absolute bottom-6 z-10 flex flex-col items-center">
                  <span className="px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md text-white text-xs font-bold uppercase tracking-widest border border-white/10 shadow-xl">
                      {isFetching ? 'Processing...' : isProcessingSubmission ? 'Evaluating...' : isSpeaking ? 'Interviewer Speaking' : isRecording ? 'Listening to you...' : 'Waiting for answer'}
                  </span>
              </div>

              {/* PiP Candidate Video */}
              <div className="absolute top-4 right-4 w-32 aspect-video bg-gray-900 rounded-lg overflow-hidden shadow-2xl border border-white/20 z-20">
                {isVideoEnabled ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform scale-x-[-1]"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-800">
                    <VideoOff size={20} className="text-gray-500" />
                  </div>
                )}
              </div>
          </div>

          {/* Transcript / Answer Area */}
          <Card className="flex-1 flex flex-col shadow-sm border-border min-h-[300px]">
            <CardContent className="p-6 flex-1 flex flex-col h-full">
               <div className="mb-4">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded">
                      {currentEntity?.data?.category || currentEntity?.data?.technology} • {currentEntity?.data?.difficulty}
                  </span>
                  <h3 className="text-xl font-bold text-text mt-3 leading-snug">
                      {isCoding ? currentEntity?.data?.question : currentEntity?.data?.questionText}
                  </h3>
               </div>

              {fetchStatus === "error" && questionError && (
                <div className="mt-2 bg-danger-bg border border-danger/30 text-danger px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-medium">
                  <AlertTriangle size={18} className="shrink-0" />
                  <span>{questionError}</span>
                </div>
              )}

              <div className="flex-1 flex flex-col border-t border-border mt-4 pt-4 relative">
                {!isCoding ? (
                    <>
                        {isRecording ? (
                            <div className={\`flex-1 text-lg leading-relaxed \${transcript ? 'text-text' : 'text-text-secondary italic'}\`}>
                            {transcript || "Listening to your answer…"}
                            </div>
                        ) : isTranscribing ? (
                            <div className="flex-1 flex items-center justify-center text-text-secondary italic">
                            <Brain className="animate-pulse mr-2" size={20} />
                            Processing audio...
                            </div>
                        ) : (
                            <textarea
                            className="flex-1 w-full resize-none text-base leading-relaxed text-text bg-transparent focus:outline-none placeholder:text-text-secondary placeholder:italic custom-scrollbar"
                            value={transcript}
                            onChange={(e) => setTranscript(e.target.value)}
                            placeholder="Type your answer here, or click Record to speak."
                            disabled={isProcessingSubmission}
                            />
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex flex-col justify-center items-center text-center text-text-secondary opacity-70">
                        <Code2 size={48} className="mb-4 text-border" />
                        <p className="text-sm font-medium">Coding Environment Active</p>
                        <p className="text-xs mt-1">Use the editor on the right to complete the challenge.</p>
                    </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex flex-col gap-3 mt-4">
                {isProcessingSubmission ? (
                  <Button disabled isLoading={true} className="w-full">
                    {processingStep}
                  </Button>
                ) : (
                  <>
                    {!isCoding && (
                        <Button
                        variant={isRecording ? "danger" : "secondary"}
                        onClick={toggleRecording}
                        disabled={isProcessingSubmission || isTranscribing}
                        className="w-full rounded-xl py-6 flex justify-between px-6"
                        >
                        <span className="flex items-center font-bold">
                            {isRecording ? <StopCircle size={20} className="mr-3" /> : <Mic size={20} className="mr-3" />}
                            {isRecording ? "Finish Recording" : "Record Voice Answer"}
                        </span>
                        {isRecording && <span className="font-mono bg-black/20 px-2 py-0.5 rounded">{formatTime(recordTime)}</span>}
                        </Button>
                    )}
                    
                    <Button
                        onClick={submitAnswerAndNext}
                        disabled={isProcessingSubmission || isRecording || isTranscribing}
                        className="w-full rounded-xl py-6 bg-primary hover:bg-primary-hover text-white font-bold text-base"
                    >
                        <CheckCircle size={20} className="mr-2" /> 
                        {isCoding ? "Submit Code & Continue" : "Submit Answer & Continue"}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side / Code Editor (Only visible if isCoding) */}
        {isCoding && (
            <div className="flex-1 h-full rounded-2xl overflow-hidden border border-border shadow-xl bg-surface flex flex-col">
                <CodeEditor 
                   question={currentEntity?.data}
                   sessionId={sessionId}
                   mode="ai"
                   value={currentCode}
                   onChange={(code, metadata) => {
                       setCurrentCode(code);
                       if (metadata?.language) setCurrentLanguage(metadata.language);
                   }}
                   onRun={async () => {
                       // Optional: Add run logic if needed for AI interview, or just let them test locally in browser if supported, but typically we send to backend.
                       // For now, this invokes the UI run state if we add the API.
                       alert("Running code locally is available on Submit for AI Interviews in this version.");
                   }}
                   onSubmit={submitAnswerAndNext}
                   isSubmitting={isProcessingSubmission}
                />
            </div>
        )}
      </div>
    </div>
  );
}
`;

fs.writeFileSync(pagePath, pageContent, 'utf8');
console.log("Rewrote InterviewSessionPage successfully!");
