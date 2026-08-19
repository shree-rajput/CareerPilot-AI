import { Save } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";

function csvToArray(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function arrayToCsv(value = []) {
  return value.join(", ");
}

export function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const initialForm = useMemo(
    () => ({
      name: user?.name || "",
      phone: user?.phone || "",
      institution: user?.education?.institution || "",
      degree: user?.education?.degree || "",
      branch: user?.education?.branch || "",
      graduationYear: user?.education?.graduationYear || "",
      experienceLevel: user?.experienceLevel || "student",
      targetRoles: arrayToCsv(user?.targetRoles),
      preferredLocations: arrayToCsv(user?.preferredLocations),
      technicalSkills: arrayToCsv(user?.technicalSkills),
      primaryTechStack: arrayToCsv(user?.primaryTechStack),
      defaultDifficulty: user?.interviewPreferences?.defaultDifficulty || "medium",
      defaultInterviewType: user?.interviewPreferences?.defaultInterviewType || "mixed"
    }),
    [user]
  );
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      await updateProfile({
        name: form.name,
        phone: form.phone,
        education: {
          institution: form.institution,
          degree: form.degree,
          branch: form.branch,
          graduationYear: form.graduationYear ? Number(form.graduationYear) : undefined
        },
        experienceLevel: form.experienceLevel,
        targetRoles: csvToArray(form.targetRoles),
        preferredLocations: csvToArray(form.preferredLocations),
        technicalSkills: csvToArray(form.technicalSkills),
        primaryTechStack: csvToArray(form.primaryTechStack),
        interviewPreferences: {
          defaultDifficulty: form.defaultDifficulty,
          defaultInterviewType: form.defaultInterviewType
        }
      });
      setMessage("Profile saved.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save profile.");
    }
  }

  return (
    <section className="settings-page">
      <form className="settings-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <h2>Profile</h2>
          <div className="form-grid">
            <label>
              Name
              <input name="name" onChange={updateField} required value={form.name} />
            </label>
            <label>
              Phone
              <input name="phone" onChange={updateField} value={form.phone} />
            </label>
            <label>
              Institution
              <input name="institution" onChange={updateField} value={form.institution} />
            </label>
            <label>
              Degree
              <input name="degree" onChange={updateField} value={form.degree} />
            </label>
            <label>
              Branch
              <input name="branch" onChange={updateField} value={form.branch} />
            </label>
            <label>
              Graduation year
              <input
                max="2100"
                min="1950"
                name="graduationYear"
                onChange={updateField}
                type="number"
                value={form.graduationYear}
              />
            </label>
          </div>
        </div>

        <div className="form-section">
          <h2>Career Targets</h2>
          <div className="form-grid">
            <label>
              Experience level
              <select name="experienceLevel" onChange={updateField} value={form.experienceLevel}>
                <option value="student">Student</option>
                <option value="fresher">Fresher</option>
                <option value="intern">Intern</option>
                <option value="junior">Junior</option>
              </select>
            </label>
            <label>
              Target roles
              <input name="targetRoles" onChange={updateField} value={form.targetRoles} />
            </label>
            <label>
              Preferred locations
              <input
                name="preferredLocations"
                onChange={updateField}
                value={form.preferredLocations}
              />
            </label>
            <label>
              Technical skills
              <input name="technicalSkills" onChange={updateField} value={form.technicalSkills} />
            </label>
            <label>
              Primary tech stack
              <input name="primaryTechStack" onChange={updateField} value={form.primaryTechStack} />
            </label>
          </div>
        </div>

        <div className="form-section">
          <h2>Interview Defaults</h2>
          <div className="form-grid">
            <label>
              Difficulty
              <select name="defaultDifficulty" onChange={updateField} value={form.defaultDifficulty}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <label>
              Type
              <select
                name="defaultInterviewType"
                onChange={updateField}
                value={form.defaultInterviewType}
              >
                <option value="technical">Technical</option>
                <option value="hr">HR</option>
                <option value="project">Project</option>
                <option value="mixed">Mixed</option>
              </select>
            </label>
          </div>
        </div>

        {message && <div className="success-banner">{message}</div>}
        {error && <div className="error-banner">{error}</div>}

        <button className="primary-button compact" type="submit">
          <Save size={18} aria-hidden="true" />
          <span>Save profile</span>
        </button>
      </form>
    </section>
  );
}
