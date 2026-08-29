import http from "./axios.js";

export const getMyProfile = async () => {
  const response = await http.get("/auth/me");
  return response.data;
};

/**
 * Onboards the current user as a mentor.
 * @param {Object} data - Mentor profile parameters
 */
export const onboardMentor = async (data) => {
  const response = await http.post("/mentors/onboard", data);
  return response.data;
};

/**
 * Gets all approved mentors.
 */
export const getMentors = async () => {
  const response = await http.get("/mentors");
  return response.data;
};

/**
 * Runs the hybrid Deterministic + AI Match Engine.
 */
export const matchMentors = async () => {
  const response = await http.get("/mentors/match");
  return response.data;
};

/**
 * Books/requests a session with a mentor.
 * @param {Object} data - Booking detail (mentorId, topic, description, duration, scheduledAt)
 */
export const bookSession = async (data) => {
  const response = await http.post("/mentors/sessions", data);
  return response.data;
};

/**
 * Fetches sessions for student or mentor.
 * @param {string} role - 'student' or 'mentor'
 */
export const getSessions = async (role = "student") => {
  const response = await http.get(`/mentors/sessions?role=${role}`);
  return response.data;
};

/**
 * Responds to a slot booking request (mentor accepting/cancelling).
 * @param {string} sessionId - Session ID
 * @param {Object} data - Response parameters (status: 'scheduled'/'cancelled', meetingUrl)
 */
export const respondToSession = async (sessionId, data) => {
  const response = await http.patch(`/mentors/sessions/${sessionId}/respond`, data);
  return response.data;
};

/**
 * Completes a mentorship session (mentor logging feedback/notes/actions).
 * @param {string} sessionId - Session ID
 * @param {Object} data - Feedback parameters (mentorFeedback, rawNotes, actionItems)
 */
export const completeSession = async (sessionId, data) => {
  const response = await http.post(`/mentors/sessions/${sessionId}/complete`, data);
  return response.data;
};

/**
 * Rates a completed session.
 * @param {string} sessionId - Session ID
 * @param {Object} data - Rating parameters (rating, review)
 */
export const rateSession = async (sessionId, data) => {
  const response = await http.post(`/mentors/sessions/${sessionId}/rate`, data);
  return response.data;
};
