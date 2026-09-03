import React, { useState, useEffect } from "react";
import { X, Award, CheckCircle, AlertTriangle, Sparkles, ArrowRight, RefreshCw, BookOpen } from "lucide-react";
import { preparationApi } from "../../api/career";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";
import { toast } from "../../context/ToastContext";

export function SkillVerificationModal({ isOpen, onClose, skillName, onVerificationSuccess }) {
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState(null);
  const [answers, setAnswers] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (isOpen && skillName) {
      loadAssessment();
    }
  }, [isOpen, skillName]);

  async function loadAssessment() {
    setLoading(true);
    setResult(null);
    setAnswers({});
    setSelectedOptions({});
    try {
      const res = await preparationApi.getSkillAssessment(skillName);
      const data = res.data || res;
      setAssessment(data);
    } catch (err) {
      console.error("Failed to load skill assessment", err);
    } finally {
      setLoading(false);
    }
  }

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleOptionSelect = (questionId, optionIdx) => {
    setSelectedOptions(prev => ({
      ...prev,
      [questionId]: optionIdx
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payloadAnswers = (assessment?.questions || []).map(q => ({
        questionId: q.id,
        userAnswer: answers[q.id] || "",
        selectedOptionIndex: selectedOptions[q.id],
        correctAnswerIndex: q.correctAnswerIndex,
        explanation: q.explanation
      }));

      const res = await preparationApi.submitSkillVerification(skillName, payloadAnswers);
      const resData = res.data || res;
      setResult(resData);

      if (resData.verified && onVerificationSuccess) {
        onVerificationSuccess(resData);
      }
    } catch (err) {
      toast.error("Failed to submit assessment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-bg-secondary">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-xl text-primary border border-primary/20">
              <Award size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-text m-0 flex items-center gap-2">
                Skill Check Verification: <span className="text-primary">{skillName}</span>
              </h3>
              <p className="text-xs text-text-secondary m-0 mt-0.5 font-medium">
                Difficulty: <strong>{assessment?.difficulty || "Adaptive"}</strong> · Target Role: <strong>{assessment?.targetRole || "Software Engineer"}</strong>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-text-secondary hover:text-text hover:bg-surface rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-text-secondary">
              <Spinner size="lg" className="text-primary" />
              <span className="text-xs font-semibold">Generating adaptive {skillName} verification assessment...</span>
            </div>
          ) : result ? (
            <div className="flex flex-col gap-6 animate-in fade-in">
              <div className={`p-6 rounded-2xl border flex flex-col items-center text-center ${
                result.verified 
                  ? "bg-success-bg/30 border-success-border/50 text-success" 
                  : "bg-warning-bg/30 border-warning-border/50 text-warning"
              }`}>
                {result.verified ? (
                  <CheckCircle size={48} className="text-success mb-3" />
                ) : (
                  <AlertTriangle size={48} className="text-warning mb-3" />
                )}
                <h3 className="text-2xl font-black m-0 text-text">
                  Score: {result.score}%
                </h3>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase mt-2 ${
                  result.verified ? "bg-success text-white" : "bg-warning text-white"
                }`}>
                  {result.verified ? "✓ Skill Verified & Certified" : "Assessment Not Passed"}
                </span>
                <p className="text-xs text-text-secondary mt-3 max-w-md leading-relaxed font-medium">
                  {result.message}
                </p>
              </div>

              {result.feedback && result.feedback.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-secondary m-0">Evaluation Feedback</h4>
                  {result.feedback.map((fb, idx) => (
                    <div key={idx} className="bg-bg-secondary p-3 rounded-xl border border-border flex items-start justify-between gap-3 text-xs">
                      <div>
                        <span className="font-bold text-text block mb-0.5">Question {fb.questionId}</span>
                        <p className="text-text-secondary m-0 leading-relaxed">{fb.feedback}</p>
                      </div>
                      <span className={`font-mono font-extrabold shrink-0 px-2 py-0.5 rounded text-[10px] ${
                        fb.score > 0 ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'
                      }`}>
                        +{fb.score} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                {!result.verified && (
                  <Button variant="outline" onClick={loadAssessment}>
                    <RefreshCw size={14} className="mr-2" /> Retake Assessment
                  </Button>
                )}
                <Button onClick={onClose}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="bg-primary-bg/20 border border-primary-border/40 p-3.5 rounded-xl text-xs text-primary font-medium flex items-center gap-3">
                <Sparkles size={18} className="shrink-0" />
                <span>
                  Select the correct answer option or provide written technical reasoning. Passing threshold is 75%.
                </span>
              </div>

              {(assessment?.questions || []).map((q, index) => (
                <div key={q.id} className="bg-bg-secondary p-4.5 rounded-xl border border-border flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary bg-primary-bg px-2 py-0.5 rounded border border-primary-border/30">
                      Question {index + 1} of {assessment.totalQuestions} • {q.topic || q.type}
                    </span>
                    <span className="text-[10px] font-mono text-text-muted font-bold">{q.difficulty || "Intermediate"}</span>
                  </div>

                  <h4 className="text-xs font-bold text-text m-0 leading-relaxed">
                    {q.questionText}
                  </h4>

                  {/* Multiple Choice Options */}
                  {Array.isArray(q.options) && q.options.length > 0 && (
                    <div className="space-y-1.5 mt-1">
                      {q.options.map((opt, optIdx) => (
                        <label 
                          key={optIdx} 
                          className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                            selectedOptions[q.id] === optIdx
                              ? 'bg-primary-bg/20 border-primary text-text font-semibold'
                              : 'bg-surface border-border text-text-secondary hover:text-text hover:border-border-strong'
                          }`}
                        >
                          <input 
                            type="radio" 
                            name={`q_${q.id}`} 
                            checked={selectedOptions[q.id] === optIdx}
                            onChange={() => handleOptionSelect(q.id, optIdx)}
                            className="accent-primary mt-0.5"
                          />
                          <span className="leading-snug">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Custom Written Explanation (Optional / Alternative) */}
                  <div className="mt-1">
                    <textarea
                      rows={2}
                      placeholder="Or provide written technical reasoning / code solution (optional if option selected)..."
                      value={answers[q.id] || ""}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      className="w-full bg-surface border border-border rounded-lg p-2.5 text-xs text-text focus:outline-none focus:border-primary font-sans leading-relaxed"
                    />
                  </div>

                  {q.whyItMatters && (
                    <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-medium">
                      <BookOpen size={11} className="text-primary shrink-0" />
                      <span>{q.whyItMatters}</span>
                    </div>
                  )}
                </div>
              ))}

              <div className="flex justify-end items-center gap-3 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={submitting} className="px-6">
                  {!submitting && <ArrowRight size={16} className="mr-2" />} Submit Assessment
                </Button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
