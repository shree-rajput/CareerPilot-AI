import { User } from "../models/User.js";
import { MentorStudentAssignment } from "../models/MentorStudentAssignment.js";
import { MentorFeedback } from "../models/MentorFeedback.js";
import { Application } from "../models/Application.js";
import { InterviewSession } from "../models/InterviewSession.js";
import { AppError } from "../utils/errors.js";

// Helper to check if a mentor is explicitly assigned to a student
const verifyAssignment = async (mentorId, studentId) => {
  const assignment = await MentorStudentAssignment.findOne({
    mentorId,
    studentId,
    status: "active"
  });
  if (!assignment) {
    throw new AppError("You are not authorized to view this student.", 403, "NOT_ASSIGNED");
  }
};

export const getDashboardStats = async (req, res, next) => {
  try {
    const mentorId = req.user._id;

    // Get all active mentees
    const assignments = await MentorStudentAssignment.find({ mentorId, status: "active" }).select("studentId");
    const studentIds = assignments.map(a => a.studentId);

    // Get basic stats
    const totalMentees = studentIds.length;
    
    // Recent applications across all mentees (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentApplications = await Application.countDocuments({
      userId: { $in: studentIds },
      createdAt: { $gte: sevenDaysAgo }
    });

    const upcomingInterviews = await InterviewSession.countDocuments({
      userId: { $in: studentIds },
      scheduledAt: { $gte: new Date() }
    });

    res.status(200).json({
      success: true,
      data: {
        totalMentees,
        recentApplications,
        upcomingInterviews
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAssignedStudents = async (req, res, next) => {
  try {
    const mentorId = req.user._id;
    
    const assignments = await MentorStudentAssignment.find({ mentorId, status: "active" })
      .populate("studentId", "name email avatar readinessScore targetRoles targetCompanies")
      .lean();

    const students = assignments.map(a => {
      // Safely handle cases where studentId might be null if user was deleted
      if (!a.studentId) return null;
      return {
        id: a.studentId._id,
        name: a.studentId.name,
        email: a.studentId.email,
        avatar: a.studentId.avatar,
        readinessScore: a.studentId.readinessScore || 0,
        targetRole: a.studentId.targetRoles?.[0]?.title || "N/A",
        assignedAt: a.assignedAt
      };
    }).filter(Boolean);

    res.status(200).json({
      success: true,
      data: students
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentDetail = async (req, res, next) => {
  try {
    const mentorId = req.user._id;
    const { studentId } = req.params;

    await verifyAssignment(mentorId, studentId);

    const student = await User.findById(studentId)
      .select("name email avatar targetRoles targetCompanies preferredLocations placementDeadline readinessScore readinessBreakdown technicalSkills")
      .lean();

    if (!student) {
      throw new AppError("Student not found", 404);
    }

    // Don't leak internal properties
    const safeStudentData = {
      id: student._id,
      name: student.name,
      email: student.email,
      avatar: student.avatar,
      targetRoles: student.targetRoles,
      targetCompanies: student.targetCompanies,
      preferredLocations: student.preferredLocations,
      placementDeadline: student.placementDeadline,
      readinessScore: student.readinessScore,
      readinessBreakdown: student.readinessBreakdown,
      technicalSkills: student.technicalSkills
    };

    res.status(200).json({
      success: true,
      data: safeStudentData
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentApplications = async (req, res, next) => {
  try {
    const mentorId = req.user._id;
    const { studentId } = req.params;

    await verifyAssignment(mentorId, studentId);

    const applications = await Application.find({ userId: studentId })
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: applications
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentInterviews = async (req, res, next) => {
  try {
    const mentorId = req.user._id;
    const { studentId } = req.params;

    await verifyAssignment(mentorId, studentId);

    const interviews = await InterviewSession.find({ userId: studentId })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: interviews
    });
  } catch (error) {
    next(error);
  }
};

export const createFeedback = async (req, res, next) => {
  try {
    const mentorId = req.user._id;
    const { studentId } = req.params;
    const { category, content } = req.body;

    if (!category || !content) {
      throw new AppError("Category and content are required.", 400);
    }

    await verifyAssignment(mentorId, studentId);

    const feedback = await MentorFeedback.create({
      mentorId,
      studentId,
      category,
      content
    });

    res.status(201).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentFeedback = async (req, res, next) => {
  try {
    const mentorId = req.user._id;
    const { studentId } = req.params;

    await verifyAssignment(mentorId, studentId);

    const feedback = await MentorFeedback.find({ studentId })
      .populate("mentorId", "name avatar")
      .sort({ createdAt: -1 })
      .lean();

    const formattedFeedback = feedback.map(f => ({
      id: f._id,
      category: f.category,
      content: f.content,
      createdAt: f.createdAt,
      mentorName: f.mentorId?.name || "Unknown Mentor",
      mentorAvatar: f.mentorId?.avatar
    }));

    res.status(200).json({
      success: true,
      data: formattedFeedback
    });
  } catch (error) {
    next(error);
  }
};

export const getAllFeedback = async (req, res, next) => {
  try {
    const mentorId = req.user._id;

    const feedback = await MentorFeedback.find({ mentorId })
      .populate("studentId", "name avatar targetRoles")
      .sort({ createdAt: -1 })
      .lean();

    const formattedFeedback = feedback.map(f => ({
      id: f._id,
      category: f.category,
      content: f.content,
      createdAt: f.createdAt,
      studentId: f.studentId?._id,
      studentName: f.studentId?.name || "Unknown Student",
      studentAvatar: f.studentId?.avatar,
      studentTargetRole: f.studentId?.targetRoles?.[0]?.title || "Not set"
    }));

    res.status(200).json({
      success: true,
      data: formattedFeedback
    });
  } catch (error) {
    next(error);
  }
};
