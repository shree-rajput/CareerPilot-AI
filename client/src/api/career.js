import { http } from "./http";

// --- Jobs API ---
export const jobApi = {
  getJobs: (params) => http.get("/jobs", { params }).then((res) => res.data),
  getJobById: (id) => http.get(`/jobs/${id}`).then((res) => res.data),
  createJob: (data) => http.post("/jobs", data).then((res) => res.data),
  updateJob: (id, data) => http.patch(`/jobs/${id}`, data).then((res) => res.data),
  deactivateJob: (id) => http.delete(`/jobs/${id}`).then((res) => res.data),
  // New AI-powered endpoints
  saveJob: (id) => http.post(`/jobs/${id}/save`).then((res) => res.data),
  matchJob: (id) => http.post(`/jobs/${id}/match`).then((res) => res.data),
  shouldApply: (id) => http.post(`/jobs/${id}/should-apply`).then((res) => res.data),
};


// --- Skills API ---
export const skillApi = {
  getUserSkills: () => http.get("/skills").then((res) => res.data),
  updateUserSkill: (data) => http.post("/skills/update", data).then((res) => res.data),
  calculateGaps: (targetSkills) => http.post("/skills/gaps", { targetSkills }).then((res) => res.data),
  normalizeSkill: (skillName) => http.post("/skills/normalize", { skillName }).then((res) => res.data),
};

// --- Projects API ---
export const projectApi = {
  getProjects: () => http.get("/projects").then((res) => res.data),
  getProjectById: (id) => http.get(`/projects/${id}`).then((res) => res.data),
  createProject: (data) => http.post("/projects", data).then((res) => res.data),
  generateInterviewKit: (id) => http.post(`/projects/${id}/interview-kit`).then((res) => res.data),
};

// --- Preparation API ---
export const preparationApi = {
  getDashboard: () => http.get("/preparation/dashboard").then((res) => res.data),
  updateSkillStatus: (skillName, status) => http.patch(`/preparation/skills/${encodeURIComponent(skillName)}/status`, { status }).then((res) => res.data),
  toggleActionPlanStep: (skillName, stepNumber, completed) => http.patch(`/preparation/skills/${encodeURIComponent(skillName)}/step`, { stepNumber, completed }).then((res) => res.data),
  getSkillAssessment: (skillName) => http.get(`/preparation/skills/${encodeURIComponent(skillName)}/assessment`).then((res) => res.data),
  submitSkillVerification: (skillName, answers) => http.post(`/preparation/skills/${encodeURIComponent(skillName)}/verify`, { answers }).then((res) => res.data),
  getActivePlan: () => http.get("/preparation/active").then((res) => res.data),
  generateDailyPlan: (data) => http.post("/preparation", data).then((res) => res.data),
  archivePlan: (id) => http.patch(`/preparation/${id}/archive`).then((res) => res.data),
  updateActionItemStatus: (id, itemId, status) => http.patch(`/preparation/${id}/items/${itemId}/status`, { status }).then((res) => res.data),
};


// --- Copilot API ---
export const copilotApi = {
  getConversations: () => http.get("/copilot/conversations").then((res) => res.data),
  getConversation: (id) => http.get(`/copilot/conversations/${id}`).then((res) => res.data),
  createConversation: (title) => http.post("/copilot/conversations", { title }).then((res) => res.data),
  renameConversation: (id, title) => http.patch(`/copilot/conversations/${id}`, { title }).then((res) => res.data),
  deleteConversation: (id) => http.delete(`/copilot/conversations/${id}`).then((res) => res.data),
  sendMessage: (id, query) => http.post(`/copilot/conversations/${id}/messages`, { query }).then((res) => res.data),
  shareConversation: (id) => http.post(`/copilot/conversations/${id}/share`).then((res) => res.data),
  getSharedConversation: (token) => http.get(`/copilot/shared/${token}`).then((res) => res.data),
};

// --- Readiness & Next Best Actions API ---
export const readinessApi = {
  getReadiness: () => http.get("/profile/readiness").then((res) => res.data),
  getActions: () => http.get("/profile/actions").then((res) => res.data),
  dismissAction: (actionId) => http.post(`/profile/actions/${actionId}/dismiss`).then((res) => res.data),
  snoozeAction: (actionId, hours) => http.post(`/profile/actions/${actionId}/snooze`, { hours }).then((res) => res.data),
};

