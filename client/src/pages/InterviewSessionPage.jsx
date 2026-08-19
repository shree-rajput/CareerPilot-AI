import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Mic, StopCircle, SkipForward, CheckCircle, Brain, AlertTriangle } from "lucide-react";
import { interviewApi } from "../api/interview.js";

export function InterviewSessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState(null);

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const [recordTime, setRecordTime] = useState(0);

  useEffect(() => {
    fetchNextQuestion();
    initSpeechRecognition();
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const initSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let currentTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
    };

    recognitionRef.current = recognition;
  };

  const fetchNextQuestion = async () => {
    try {
      setLoading(true);
      setEvaluation(null);
      setTranscript("");
      setRecordTime(0);
      const q = await interviewApi.getNextQuestion(sessionId);
      setCurrentQuestion(q);
    } catch (err) {
      console.error(err);
      alert("Failed to get next question.");
    } finally {
      setLoading(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      // Stop
      recognitionRef.current?.stop();
      clearInterval(timerRef.current);
      setIsRecording(false);
      submitAnswer();
    } else {
      // Start
      setTranscript("");
      setRecordTime(0);
      recognitionRef.current?.start();
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        setRecordTime(prev => prev + 1);
      }, 1000);
    }
  };

  const submitAnswer = async () => {
    if (!transcript.trim()) {
      alert("No audio transcribed. Please try again or type your answer if speech fails.");
      return;
    }

    try {
      setIsEvaluating(true);
      
      // Calculate simple metrics locally
      const words = transcript.trim().split(/\s+/).length;
      const minutes = recordTime / 60 || 1;
      const wpm = Math.round(words / minutes);
      
      // Basic filler word detection
      const lowerT = transcript.toLowerCase();
      const fillers = (lowerT.match(/\b(um|uh|like|you know|basically)\b/g) || []).length;

      const metrics = {
        speakingPace: wpm,
        fillerWords: fillers,
        longPauses: 0 // advanced processing needed for exact pauses, keeping 0 for now
      };

      const result = await interviewApi.submitAnswer(currentQuestion._id, {
        transcript,
        metrics
      });

      setEvaluation(result);
    } catch (err) {
      console.error(err);
      alert("Failed to evaluate answer.");
    } finally {
      setIsEvaluating(false);
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
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) {
    return (
      <div className="content-layout" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
        <div style={{ textAlign: "center" }}>
          <Brain className="spin" size={40} style={{ color: "var(--primary-color)", margin: "0 auto 1rem" }} />
          <h3>AI is generating your question...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="content-layout">
      <div className="content-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2>AI Interview Session</h2>
          <p>Answer the question clearly. The AI will evaluate your response.</p>
        </div>
        <button className="btn btn-secondary" onClick={handleEndSession}>
          End Interview
        </button>
      </div>

      {!evaluation ? (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <span className="eyebrow" style={{ display: "inline-block", marginBottom: "1rem" }}>
              {currentQuestion?.category} • {currentQuestion?.difficulty}
            </span>
            <h2 style={{ fontSize: "1.75rem", lineHeight: "1.4" }}>
              {currentQuestion?.questionText}
            </h2>
          </div>

          <div style={{ backgroundColor: "var(--bg-secondary)", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
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
              <p style={{ minHeight: "100px", color: transcript ? "inherit" : "var(--text-secondary)", fontStyle: transcript ? "normal" : "italic" }}>
                {transcript || "Listening..."}
              </p>
            ) : (
              <textarea 
                className="input-field" 
                style={{ minHeight: "150px", resize: "vertical" }}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Click the microphone to record, or type your answer here if preferred."
                disabled={isEvaluating}
              />
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
            {isEvaluating ? (
              <button className="btn btn-primary" disabled style={{ padding: "0.75rem 2rem" }}>
                <Brain className="spin" size={20} />
                Analyzing Answer...
              </button>
            ) : (
              <button 
                className={`btn ${isRecording ? 'btn-danger' : 'btn-primary'}`} 
                onClick={toggleRecording}
                style={{ padding: "0.75rem 2rem", borderRadius: "30px", fontSize: "1.1rem" }}
              >
                {isRecording ? (
                  <><StopCircle size={20} /> Stop & Submit</>
                ) : (
                  <><Mic size={20} /> Record Answer</>
                )}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="card" style={{ borderTop: "4px solid var(--primary-color)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
              <div>
                <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <CheckCircle size={22} color="var(--success-color)" />
                  Feedback
                </h3>
                <p className="text-secondary mt-1">Review your performance before the next question.</p>
              </div>
              <div className="score-badge" style={{ fontSize: "1.25rem", padding: "0.5rem 1rem" }}>
                {evaluation.analysis.technicalAccuracy} / 100
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
              <div style={{ backgroundColor: "rgba(34, 197, 94, 0.1)", padding: "1rem", borderRadius: "8px" }}>
                <h4 style={{ color: "var(--success-color)", marginBottom: "0.75rem" }}>What you did well</h4>
                <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "var(--text-color)" }}>
                  {evaluation.feedback.strengths.map((s, i) => <li key={i} style={{ marginBottom: "0.25rem" }}>{s}</li>)}
                </ul>
              </div>
              
              <div style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", padding: "1rem", borderRadius: "8px" }}>
                <h4 style={{ color: "var(--danger-color)", marginBottom: "0.75rem" }}>Areas to improve</h4>
                <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "var(--text-color)" }}>
                  {evaluation.feedback.weaknesses.map((w, i) => <li key={i} style={{ marginBottom: "0.25rem" }}>{w}</li>)}
                </ul>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1.5rem" }}>
              <h4 style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <Brain size={18} />
                AI Better Answer Coach
              </h4>
              <div style={{ backgroundColor: "var(--bg-secondary)", padding: "1.25rem", borderRadius: "8px", borderLeft: "3px solid var(--primary-color)" }}>
                <p style={{ fontStyle: "italic", marginBottom: "1rem", lineHeight: "1.6" }}>
                  "{evaluation.idealAnswer.text}"
                </p>
                <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  <strong>Why this works: </strong> {evaluation.idealAnswer.explanation}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
            <button className="btn btn-secondary" onClick={handleEndSession}>
              End Interview
            </button>
            <button className="btn btn-primary" onClick={fetchNextQuestion}>
              Next Question <SkipForward size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
