import { User } from "../../models/User.js";
import { Project } from "../../models/Project.js";
import { InterviewSession } from "../../models/InterviewSession.js";
import { Resume } from "../../models/Resume.js";
import { executeAiTask } from "../ai/orchestrator.js";

/**
 * Compiles background information about the candidate and invokes the AI 
 * orchestrator to build a brief.
 * 
 * @param {string} studentId - Candidate's User ID
 * @param {string} topic - Session booking topic
 * @param {string} description - Candidate's description/goal
 * @returns {Promise<string>} Markdown AI brief text
 */
export async function generatePreSessionBrief(studentId, topic, description) {
  try {
    const [student, projects, interviews, latestResume] = await Promise.all([
      User.findById(studentId).lean(),
      Project.find({ userId: studentId }).lean(),
      InterviewSession.find({ userId: studentId, status: "completed" }).lean(),
      Resume.findOne({ userId: studentId }).sort({ createdAt: -1 }).lean()
    ]);

    if (!student) {
      throw new Error("Student not found for pre-session brief");
    }

    // Map projects list
    const projectNames = projects.map(p => `${p.name} (${(p.technologies || []).join(", ")})`);

    // Map interview history
    let interviewScoreSum = 0;
    interviews.forEach(i => {
      interviewScoreSum += (i.overallScore <= 10 ? i.overallScore * 10 : i.overallScore);
    });
    const avgInterviewScore = interviews.length > 0 ? Math.round(interviewScoreSum / interviews.length) : 0;

    // Gather gaps / missing skills
    const gaps = latestResume && latestResume.missingSkills ? latestResume.missingSkills : [];
    const technicalSkills = student.technicalSkills || [];

    const briefText = await executeAiTask("GENERATE_PRE_SESSION_BRIEF", {
      candidateName: student.name,
      targetRoles: (student.targetRoles || []).map(r => r.title),
      targetCompanies: student.targetCompanies || [],
      technicalSkills: technicalSkills,
      weakSkills: gaps.slice(0, 5),
      projects: projectNames,
      interviewScore: avgInterviewScore,
      topic,
      description
    });

    return briefText;
  } catch (error) {
    console.error("[MentorInsightService] Failed to generate pre-session brief, falling back:", error);
    return `### Pre-Session Candidate Brief\n*Student requested a session to discuss **${topic}**.*\n\n* **Goal**: ${description || "No specific goal provided."}\n* **Target roles**: Not specified.`;
  }
}

/**
 * Summarizes the mentor's post-session feedback and converts notes to tasks.
 * 
 * @param {string} topic - Topic of discussion
 * @param {string} mentorFeedback - Structured summary notes
 * @param {string} rawNotes - Scribbled notes
 * @returns {Promise<Object>} Object containing { summary, actionItems }
 */
export async function generatePostSessionSummary(topic, mentorFeedback, rawNotes) {
  try {
    const aiResult = await executeAiTask("GENERATE_POST_SESSION_SUMMARY", {
      topic,
      mentorFeedback,
      rawNotes: rawNotes || "No raw scribble notes provided."
    });

    if (aiResult && aiResult.summary && Array.isArray(aiResult.actionItems)) {
      return {
        summary: aiResult.summary,
        actionItems: aiResult.actionItems
      };
    }
    throw new Error("Invalid AI response schema");
  } catch (error) {
    console.error("[MentorInsightService] Failed to generate post-session summary, using fallback:", error);
    // Fallback parser: split lines from notes to guess action items
    const fallbackActions = [];
    if (mentorFeedback) {
      mentorFeedback.split("\n").forEach(line => {
        const trimmed = line.trim();
        if (trimmed.toLowerCase().startsWith("todo:") || trimmed.toLowerCase().startsWith("- ") || trimmed.toLowerCase().startsWith("* ")) {
          fallbackActions.push(trimmed.replace(/^(\-|\*|todo:)\s*/i, ""));
        }
      });
    }
    if (fallbackActions.length === 0) {
      fallbackActions.push(`Follow up on the ${topic} discussion topics.`);
    }

    return {
      summary: `### Feedback Takeaways\n${mentorFeedback || "No session feedback details registered."}`,
      actionItems: fallbackActions
    };
  }
}
