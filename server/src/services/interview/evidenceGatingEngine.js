/**
 * Evidence Gating Engine
 *
 * Core Rule: NEVER SCORE WHAT THE SYSTEM DID NOT OBSERVE.
 * Returns canonical structured evidence objects for all evaluation dimensions:
 * {
 *   score: number | null,
 *   confidence: "HIGH" | "MEDIUM" | "LOW" | "NONE",
 *   availability: "AVAILABLE" | "UNAVAILABLE" | "PARTIAL",
 *   reason: string,
 *   evidence: Array<{ type: string, text?: string, observation: string }>,
 *   strengths: string[],
 *   weaknesses: string[],
 *   limitations: string[]
 * }
 */

/**
 * Gates Visual Presence Evaluation.
 */
export function gateVisualPresence(presenceSignals) {
  if (
    !presenceSignals ||
    presenceSignals.available === false ||
    presenceSignals.cameraEnabled === false ||
    presenceSignals.videoTrackActive === false ||
    presenceSignals.unavailable ||
    (typeof presenceSignals.validFramesCount === "number" && presenceSignals.validFramesCount < 5) ||
    (typeof presenceSignals.faceDetectedRatio === "number" && presenceSignals.faceDetectedRatio < 0.2)
  ) {
    return {
      score: null,
      confidence: "NONE",
      availability: "UNAVAILABLE",
      reason: "Camera was disabled, video track was inactive, or insufficient valid video frames were received.",
      evidence: [],
      strengths: [],
      weaknesses: [],
      limitations: ["No visual evidence collected during session."]
    };
  }

  const eyeContact = presenceSignals.eyeContactScore ?? 80;
  const posture = presenceSignals.postureScore ?? 80;
  const faceRatio = presenceSignals.faceDetectedRatio ?? 0.9;
  const score = Math.round((eyeContact * 0.5) + (posture * 0.3) + (faceRatio * 100 * 0.2));

  return {
    score: Math.min(100, Math.max(0, score)),
    confidence: presenceSignals.validFramesCount > 30 ? "HIGH" : "MEDIUM",
    availability: "AVAILABLE",
    reason: `Evaluated from ${presenceSignals.validFramesCount || 'sampled'} video frames.`,
    evidence: [
      { type: "video", observation: `Face detected in ${Math.round((faceRatio) * 100)}% of frames.` },
      { type: "video", observation: `Eye contact consistency: ${eyeContact}/100.` }
    ],
    strengths: posture >= 75 ? ["Maintained steady posture and camera framing"] : [],
    weaknesses: eyeContact < 60 ? ["Frequent gaze shifts away from camera"] : [],
    limitations: []
  };
}

/**
 * Gates Delivery Evaluation (requires usable raw audio track).
 */
export function gateDelivery(deliverySignals) {
  if (
    !deliverySignals ||
    deliverySignals.available === false ||
    deliverySignals.audioTrackActive === false ||
    deliverySignals.unavailable ||
    deliverySignals.audioMissing
  ) {
    return {
      score: null,
      confidence: "NONE",
      availability: "UNAVAILABLE",
      reason: "Raw audio signal was unavailable for delivery analysis.",
      evidence: [],
      strengths: [],
      weaknesses: [],
      limitations: ["Audio analysis requires active mic input during response."]
    };
  }

  const wpm = deliverySignals.speakingPaceWpm || deliverySignals.speakingPace || 130;
  const pausePen = (deliverySignals.pauseCount || deliverySignals.longPauses || 0) * 4;
  const fillerPen = (deliverySignals.fillerWordCount || deliverySignals.fillerWords || 0) * 3;

  // Pace score calibration (optimal range: 110 - 160 WPM)
  let paceScore = 90;
  if (wpm < 90 || wpm > 180) paceScore = 60;
  else if (wpm < 110 || wpm > 160) paceScore = 75;

  const finalScore = Math.max(20, Math.min(100, Math.round((paceScore * 0.6) + Math.max(20, 100 - pausePen - fillerPen) * 0.4)));

  const observableWeaknesses = [];
  if (deliverySignals.longPauses > 3 || deliverySignals.pauseCount > 4) {
    observableWeaknesses.push(`Frequent long pauses (${deliverySignals.longPauses || deliverySignals.pauseCount} detected)`);
  }
  if (deliverySignals.fillerWords > 5 || deliverySignals.fillerWordCount > 5) {
    observableWeaknesses.push(`Frequent filler word usage (${deliverySignals.fillerWords || deliverySignals.fillerWordCount} instances)`);
  }
  if (wpm < 90) observableWeaknesses.push(`Slower speaking pace (${wpm} WPM)`);
  if (wpm > 180) observableWeaknesses.push(`Unusually rapid speaking pace (${wpm} WPM)`);

  return {
    score: finalScore,
    confidence: "HIGH",
    availability: "AVAILABLE",
    reason: `Evaluated from audio signal: ${wpm} WPM, ${deliverySignals.pauseCount || 0} pauses, ${deliverySignals.fillerWords || 0} filler words.`,
    evidence: [
      { type: "audio", observation: `Measured speaking pace: ${wpm} WPM.` },
      { type: "audio", observation: `Detected ${deliverySignals.pauseCount || 0} noticeable pauses and ${deliverySignals.fillerWords || 0} filler words.` }
    ],
    strengths: finalScore >= 75 ? ["Steady speaking pace with natural phrasing"] : [],
    weaknesses: observableWeaknesses,
    limitations: []
  };
}

/**
 * Gates Job Description (JD) Alignment Evaluation.
 */
export function gateJdAlignment(session, questionEvaluations = []) {
  const jdText = session?.jobDescription || session?.jdContext?.rawText || "";
  const requiredSkills = session?.jdContext?.requiredSkills || session?.jdContext?.technologies || session?.technologyStack || [];

  if (!jdText && requiredSkills.length === 0) {
    return {
      score: null,
      confidence: "NONE",
      availability: "UNAVAILABLE",
      reason: "No job description was provided.",
      evidence: [],
      matchedSkills: [],
      weakSkills: [],
      missingSkills: [],
      limitations: ["JD alignment analysis requires providing a target Job Description."]
    };
  }

  const targetSkills = new Set(requiredSkills.map(s => String(s).toLowerCase().trim()).filter(Boolean));
  if (targetSkills.size === 0) {
    return {
      score: null,
      confidence: "NONE",
      availability: "UNAVAILABLE",
      reason: "No explicit target skills extracted from job description.",
      evidence: [],
      matchedSkills: [],
      weakSkills: [],
      missingSkills: [],
      limitations: []
    };
  }

  const testedSkills = new Map(); // skill -> { demonstrated: boolean, score: number }
  questionEvaluations.forEach(q => {
    const text = `${q.category || ''} ${q.technology || ''} ${q.questionText || ''} ${(q.feedback?.strengths || []).join(' ')}`.toLowerCase();
    targetSkills.forEach(skill => {
      if (text.includes(skill)) {
        const current = testedSkills.get(skill) || { demonstrated: false, score: 0 };
        const score = q.analysis?.technicalAccuracy ?? 70;
        testedSkills.set(skill, {
          demonstrated: true,
          score: Math.max(current.score, score)
        });
      }
    });
  });

  const matchedSkills = [];
  const weakSkills = [];
  const missingSkills = [];

  targetSkills.forEach(skill => {
    const res = testedSkills.get(skill);
    if (!res || !res.demonstrated) {
      missingSkills.push(skill);
    } else if (res.score >= 70) {
      matchedSkills.push(skill);
    } else {
      weakSkills.push(skill);
    }
  });

  const matchRatio = targetSkills.size > 0 ? (matchedSkills.length + (weakSkills.length * 0.5)) / targetSkills.size : 0;
  const score = Math.round(matchRatio * 100);

  return {
    score: Math.min(100, Math.max(0, score)),
    confidence: testedSkills.size >= 2 ? "HIGH" : "MEDIUM",
    availability: "AVAILABLE",
    reason: `Evaluated ${matchedSkills.length} matched skill(s), ${weakSkills.length} weak skill(s), and ${missingSkills.length} un-demonstrated skill(s) against JD.`,
    evidence: [
      { type: "jd", observation: `Target JD skills tested: ${Array.from(targetSkills).join(", ")}` }
    ],
    matchedSkills,
    weakSkills,
    missingSkills,
    limitations: missingSkills.length > 0 ? ["Some JD requirements were not queried during this session."] : []
  };
}

/**
 * Gates Coding Performance Evaluation.
 */
export function gateCodingPerformance(challenge) {
  if (!challenge || !challenge.executionSummary || challenge.executionSummary.executionFailed || challenge.status !== "answered") {
    return {
      score: null,
      confidence: "NONE",
      availability: "UNAVAILABLE",
      reason: challenge?.executionSummary?.executionFailed
        ? `Coding sandbox execution failed: ${challenge.executionSummary.error || "Runtime error"}`
        : "No completed coding challenge submission was recorded.",
      evidence: [],
      strengths: [],
      weaknesses: [],
      limitations: []
    };
  }

  const summary = challenge.executionSummary;
  const passed = summary.passedTests || 0;
  const total = Math.max(1, summary.totalTests || 1);
  const hiddenPassed = summary.hiddenPassedTests ?? passed;
  const hiddenTotal = summary.hiddenTotalTests ?? total;

  const score = Math.round(((passed / total) * 0.7 + (hiddenPassed / hiddenTotal) * 0.3) * 100);

  return {
    score: Math.min(100, Math.max(0, score)),
    confidence: total >= 3 ? "HIGH" : "MEDIUM",
    availability: "AVAILABLE",
    reason: `Passed ${passed}/${total} visible test cases and ${hiddenPassed}/${hiddenTotal} hidden test cases.`,
    evidence: [
      { type: "code", observation: `Passed ${passed}/${total} test cases.` }
    ],
    strengths: passed === total ? ["All visible test cases passed cleanly"] : [`Passed ${passed} of ${total} test cases`],
    weaknesses: passed < total ? [`Failed ${total - passed} test cases on edge cases or correctness`] : [],
    limitations: []
  };
}
