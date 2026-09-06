import http from "./axios.js";

export const getMyProfile = async () => {
  const response = await http.get("/auth/me");
  return response.data;
};

// Mentor Application & Discovery
export const applyToBecomeMentor = async (data) => {
  const response = await http.post("/mentors/apply", data);
  return response.data;
};

export const onboardMentor = async (data) => {
  const response = await http.post("/mentors/onboard", data);
  return response.data;
};

export const discoverMentors = async (params = {}) => {
  const response = await http.get("/mentors/discover", { params });
  return response.data;
};

export const getMentors = async () => {
  const response = await http.get("/mentors/discover");
  return response.data;
};

export const getMentorProfileById = async (id) => {
  const response = await http.get(`/mentors/profile/${id}`);
  return response.data;
};

// Slots & Availability
export const getMentorSlots = async (mentorId, date, duration = 30) => {
  const response = await http.get(`/mentors/slots/${mentorId}?date=${date}&duration=${duration}`);
  return response.data;
};

export const getMentorAvailability = async (mentorId) => {
  const response = await http.get(mentorId ? `/mentors/availability/${mentorId}` : "/mentors/availability");
  return response.data;
};

export const configureMentorAvailability = async (data) => {
  const response = await http.post("/mentors/availability", data);
  return response.data;
};

// Session Bookings & Requests
export const bookSession = async (data) => {
  const response = await http.post("/mentors/sessions", data);
  return response.data;
};

export const getSessions = async (role = "student") => {
  const response = await http.get(`/mentors/sessions?role=${role}`);
  return response.data;
};

export const respondToSession = async (sessionId, data) => {
  const response = await http.patch(`/mentors/sessions/${sessionId}/respond`, data);
  return response.data;
};

export const completeSession = async (sessionId, data) => {
  const response = await http.post(`/mentors/sessions/${sessionId}/complete`, data);
  return response.data;
};

export const rateSession = async (sessionId, data) => {
  const response = await http.post(`/mentors/sessions/${sessionId}/rate`, data);
  return response.data;
};

// LiveKit WebRTC Token & Real-Time Messages
export const getLiveKitToken = async (sessionId) => {
  const response = await http.post(`/mentors/sessions/${sessionId}/livekit-token`);
  return response.data;
};

export const getMentorshipMessages = async (sessionId) => {
  const response = await http.get(`/mentors/sessions/${sessionId}/messages`);
  return response.data;
};

// Safety & Reporting
export const reportMentor = async (data) => {
  const response = await http.post("/mentors/report", data);
  return response.data;
};

// Admin Moderation API
export const getPendingMentorApplications = async () => {
  const response = await http.get("/admin/mentors/pending");
  return response.data;
};

export const reviewMentorApplication = async (applicationId, data) => {
  const response = await http.post(`/admin/mentors/applications/${applicationId}/review`, data);
  return response.data;
};

export const updateMentorVerification = async (mentorId, data) => {
  const response = await http.patch(`/admin/mentors/${mentorId}/verify`, data);
  return response.data;
};

export const suspendMentor = async (mentorId, data) => {
  const response = await http.post(`/admin/mentors/${mentorId}/suspend`, data);
  return response.data;
};

export const getMentorReports = async () => {
  const response = await http.get("/admin/mentors/reports");
  return response.data;
};

export const resolveMentorReport = async (reportId, data) => {
  const response = await http.patch(`/admin/mentors/reports/${reportId}`, data);
  return response.data;
};
