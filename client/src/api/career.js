import { http } from "./http";

// --- Jobs API ---
export const jobApi = {
  getJobs: (params) => http.get("/jobs", { params }).then((res) => res.data),
  getJobById: (id) => http.get(`/jobs/${id}`).then((res) => res.data),
  createJob: (data) => http.post("/jobs", data).then((res) => res.data),
  updateJob: (id, data) => http.patch(`/jobs/${id}`, data).then((res) => res.data),
  deactivateJob: (id) => http.delete(`/jobs/${id}`).then((res) => res.data),
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
  getActivePlan: () => http.get("/preparation/active").then((res) => res.data),
  generateDailyPlan: (data) => http.post("/preparation", data).then((res) => res.data),
  archivePlan: (id) => http.patch(`/preparation/${id}/archive`).then((res) => res.data),
  updateActionItemStatus: (id, itemId, status) => http.patch(`/preparation/${id}/items/${itemId}/status`, { status }).then((res) => res.data),
};

// --- Copilot API ---
export const copilotApi = {
  ask: (query) => http.post("/copilot/ask", { query }).then((res) => res.data),
};

// --- Readiness & Next Best Actions API ---
export const readinessApi = {
  getReadiness: () => http.get("/profile/readiness").then((res) => res.data),
  getActions: () => http.get("/profile/actions").then((res) => res.data),
  dismissAction: (actionId) => http.post(`/profile/actions/${actionId}/dismiss`).then((res) => res.data),
  snoozeAction: (actionId, hours) => http.post(`/profile/actions/${actionId}/snooze`, { hours }).then((res) => res.data),
};

