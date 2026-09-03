import React from "react";
import { ExternalLink, Globe } from "lucide-react";

export default function ResumePreview({ data, templateId = "classic" }) {
  if (!data) return <div className="text-white text-center p-8">No preview available</div>;

  const name = data.name || data.basics?.name || "Candidate Name";
  const email = data.email || data.basics?.email || "";
  const phone = data.phone || data.basics?.phone || "";
  const location = data.location || data.basics?.location || "";
  const links = data.links || data.basics?.links || [];

  const rawSkills = data.skills || [];
  const skillsList = rawSkills
    .map((s) => (typeof s === "string" ? s : s.canonicalName || s.name || ""))
    .filter(Boolean);

  const experience = data.experience || [];
  const education = data.education || [];
  const projects = data.projects || [];
  const certifications = data.certifications || [];
  const coursework = data.coursework || [];
  const extracurriculars = data.extracurriculars || [];
  const achievements = data.achievements || [];

  // Content density calculation
  const totalItemsCount =
    experience.length +
    education.length +
    projects.length +
    certifications.length +
    extracurriculars.length +
    achievements.length;

  const isShortContent = totalItemsCount <= 4;
  const sectionSpacingClass = isShortContent ? "mb-8 space-y-4" : "mb-5 space-y-2.5";

  // Template container styles
  const templateStyles = {
    classic: "font-serif bg-white text-gray-900 border-gray-200",
    modern: "font-sans bg-white text-slate-800 border-slate-200",
    minimal: "font-sans bg-white text-zinc-900 border-zinc-200 tracking-tight",
    executive: "font-serif bg-white text-slate-900 border-slate-300",
  };

  const containerClass = templateStyles[templateId] || templateStyles.classic;

  return (
    <div
      className={`p-8 md:p-12 mx-auto max-w-[850px] min-h-[1050px] shadow-2xl rounded-sm leading-normal border ${containerClass}`}
    >
      {/* HEADER SECTION */}
      {templateId === "modern" ? (
        <header className="border-b-4 border-blue-600 pb-5 mb-6">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-1">{name}</h1>
          <div className="text-xs flex flex-wrap gap-3 text-slate-600 font-medium">
            {email && <span className="text-blue-600 font-semibold">{email}</span>}
            {phone && <span>• {phone}</span>}
            {location && <span>• {location}</span>}
          </div>
          {links.length > 0 && (
            <div className="text-xs flex flex-wrap gap-3 text-blue-600 mt-2 font-medium">
              {links.map((link, idx) => (
                <a
                  key={idx}
                  href={link.startsWith("http") ? link : `https://${link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline flex items-center gap-1"
                >
                  <Globe size={11} /> {link.replace(/^https?:\/\//, "")}
                </a>
              ))}
            </div>
          )}
        </header>
      ) : templateId === "minimal" ? (
        <header className="pb-6 mb-6 border-b border-zinc-200">
          <h1 className="text-2xl font-light tracking-wide text-zinc-900 mb-2">{name}</h1>
          <div className="text-[11px] flex flex-wrap gap-4 text-zinc-500 font-normal">
            {email && <span>{email}</span>}
            {phone && <span>{phone}</span>}
            {location && <span>{location}</span>}
          </div>
        </header>
      ) : templateId === "executive" ? (
        <header className="bg-slate-900 text-white p-6 -mx-8 -mt-8 md:-mx-12 md:-mt-12 mb-6 rounded-t-sm">
          <h1 className="text-3xl font-bold uppercase tracking-wider text-white mb-2">{name}</h1>
          <div className="text-xs flex flex-wrap gap-3 text-slate-300 font-sans font-medium">
            {email && <span>{email}</span>}
            {phone && <span>• {phone}</span>}
            {location && <span>• {location}</span>}
          </div>
        </header>
      ) : (
        /* Classic Header */
        <header className="text-center border-b-2 border-gray-900 pb-5 mb-6">
          <h1 className="text-3xl font-bold uppercase tracking-wider text-gray-900 mb-2">{name}</h1>
          <div className="text-xs flex flex-wrap justify-center items-center gap-3 text-gray-600 font-sans font-medium">
            {email && <span>{email}</span>}
            {phone && <span>• {phone}</span>}
            {location && <span>• {location}</span>}
          </div>
          {links.length > 0 && (
            <div className="text-xs flex flex-wrap justify-center gap-3 text-blue-600 mt-2 font-sans">
              {links.map((link, idx) => (
                <a
                  key={idx}
                  href={link.startsWith("http") ? link : `https://${link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline flex items-center gap-1"
                >
                  <Globe size={11} /> {link.replace(/^https?:\/\//, "")}
                </a>
              ))}
            </div>
          )}
        </header>
      )}

      {/* SUMMARY */}
      {data.summary && (
        <section className={sectionSpacingClass}>
          <h2
            className={`text-xs font-bold uppercase tracking-wider mb-2 pb-1 ${
              templateId === "modern"
                ? "text-blue-700 border-b border-blue-200"
                : templateId === "minimal"
                ? "text-zinc-400 font-normal border-b border-zinc-100"
                : templateId === "executive"
                ? "text-slate-900 border-b-2 border-slate-900"
                : "text-gray-800 border-b border-gray-300"
            }`}
          >
            Professional Summary
          </h2>
          <p className="text-xs leading-relaxed text-slate-700 text-justify">{data.summary}</p>
        </section>
      )}

      {/* EXPERIENCE */}
      {experience.length > 0 && (
        <section className={sectionSpacingClass}>
          <h2
            className={`text-xs font-bold uppercase tracking-wider mb-3 pb-1 ${
              templateId === "modern"
                ? "text-blue-700 border-b border-blue-200"
                : templateId === "minimal"
                ? "text-zinc-400 font-normal border-b border-zinc-100"
                : templateId === "executive"
                ? "text-slate-900 border-b-2 border-slate-900"
                : "text-gray-800 border-b border-gray-300"
            }`}
          >
            Work Experience
          </h2>
          <div className="space-y-4">
            {experience.map((exp, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className="text-sm font-bold text-gray-900">{exp.role || "Role"}</h3>
                  <span className="text-xs font-semibold text-gray-600 font-sans">
                    {exp.startDate || exp.duration || ""} {exp.endDate ? `- ${exp.endDate}` : ""}
                  </span>
                </div>
                <div className="text-xs font-semibold text-gray-700 mb-1.5 italic">{exp.company}</div>
                <p className="text-xs leading-relaxed text-gray-700 whitespace-pre-line">{exp.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* EDUCATION */}
      {education.length > 0 && (
        <section className={sectionSpacingClass}>
          <h2
            className={`text-xs font-bold uppercase tracking-wider mb-3 pb-1 ${
              templateId === "modern"
                ? "text-blue-700 border-b border-blue-200"
                : templateId === "minimal"
                ? "text-zinc-400 font-normal border-b border-zinc-100"
                : templateId === "executive"
                ? "text-slate-900 border-b-2 border-slate-900"
                : "text-gray-800 border-b border-gray-300"
            }`}
          >
            Education
          </h2>
          <div className="space-y-3">
            {education.map((edu, idx) => (
              <div key={idx} className="flex justify-between items-baseline">
                <div>
                  <h3 className="text-xs font-bold text-gray-900">{edu.institution}</h3>
                  <div className="text-xs text-gray-700">
                    {edu.degree} {edu.branch || edu.fieldOfStudy ? `in ${edu.branch || edu.fieldOfStudy}` : ""}
                  </div>
                </div>
                <div className="text-right text-xs font-sans">
                  <span className="font-semibold text-gray-600">
                    {edu.startDate || edu.startYear} - {edu.endDate || edu.endYear}
                  </span>
                  {edu.gpa && <div className="text-gray-600">GPA: {edu.gpa}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* COURSEWORK (if present) */}
      {coursework.length > 0 && (
        <section className={sectionSpacingClass}>
          <h2
            className={`text-xs font-bold uppercase tracking-wider mb-2 pb-1 ${
              templateId === "modern"
                ? "text-blue-700 border-b border-blue-200"
                : templateId === "minimal"
                ? "text-zinc-400 font-normal border-b border-zinc-100"
                : templateId === "executive"
                ? "text-slate-900 border-b-2 border-slate-900"
                : "text-gray-800 border-b border-gray-300"
            }`}
          >
            Relevant Coursework
          </h2>
          <p className="text-xs leading-relaxed text-gray-800 font-sans font-medium">
            {coursework.join("  •  ")}
          </p>
        </section>
      )}

      {/* PROJECTS */}
      {projects.length > 0 && (
        <section className={sectionSpacingClass}>
          <h2
            className={`text-xs font-bold uppercase tracking-wider mb-3 pb-1 ${
              templateId === "modern"
                ? "text-blue-700 border-b border-blue-200"
                : templateId === "minimal"
                ? "text-zinc-400 font-normal border-b border-zinc-100"
                : templateId === "executive"
                ? "text-slate-900 border-b-2 border-slate-900"
                : "text-gray-800 border-b border-gray-300"
            }`}
          >
            Projects
          </h2>
          <div className="space-y-4">
            {projects.map((proj, idx) => {
              const techStr = Array.isArray(proj.technologies || proj.techStack)
                ? (proj.technologies || proj.techStack).join(", ")
                : proj.technologies || "";

              return (
                <div key={idx}>
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      {proj.name || proj.title}
                      {proj.role && (
                        <span className="text-xs font-normal text-gray-500 font-sans">({proj.role})</span>
                      )}
                    </h3>
                    {proj.link && (
                      <a
                        href={proj.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-sans text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink size={10} /> View Project
                      </a>
                    )}
                  </div>
                  {techStr && (
                    <div className="text-xs font-sans text-gray-600 font-medium mb-1">
                      <span className="font-bold text-gray-800">Tech Stack:</span> {techStr}
                    </div>
                  )}
                  <p className="text-xs leading-relaxed text-gray-700 whitespace-pre-line">{proj.description}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SKILLS */}
      {skillsList.length > 0 && (
        <section className={sectionSpacingClass}>
          <h2
            className={`text-xs font-bold uppercase tracking-wider mb-2 pb-1 ${
              templateId === "modern"
                ? "text-blue-700 border-b border-blue-200"
                : templateId === "minimal"
                ? "text-zinc-400 font-normal border-b border-zinc-100"
                : templateId === "executive"
                ? "text-slate-900 border-b-2 border-slate-900"
                : "text-gray-800 border-b border-gray-300"
            }`}
          >
            Skills & Competencies
          </h2>
          <p className="text-xs leading-relaxed text-gray-800 font-sans font-medium">
            {skillsList.join("  •  ")}
          </p>
        </section>
      )}

      {/* EXTRACURRICULARS & LEADERSHIP */}
      {extracurriculars.length > 0 && (
        <section className={sectionSpacingClass}>
          <h2
            className={`text-xs font-bold uppercase tracking-wider mb-2 pb-1 ${
              templateId === "modern"
                ? "text-blue-700 border-b border-blue-200"
                : templateId === "minimal"
                ? "text-zinc-400 font-normal border-b border-zinc-100"
                : templateId === "executive"
                ? "text-slate-900 border-b-2 border-slate-900"
                : "text-gray-800 border-b border-gray-300"
            }`}
          >
            Extracurriculars & Leadership
          </h2>
          <ul className="space-y-2 text-xs text-gray-700">
            {extracurriculars.map((extra, idx) => (
              <li key={idx}>
                <span className="font-bold">{extra.role}</span>
                {extra.organization && <span> — {extra.organization}</span>}
                {extra.description && <p className="text-[11px] text-gray-600 mt-0.5">{extra.description}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ACHIEVEMENTS & HONORS */}
      {achievements.length > 0 && (
        <section className={sectionSpacingClass}>
          <h2
            className={`text-xs font-bold uppercase tracking-wider mb-2 pb-1 ${
              templateId === "modern"
                ? "text-blue-700 border-b border-blue-200"
                : templateId === "minimal"
                ? "text-zinc-400 font-normal border-b border-zinc-100"
                : templateId === "executive"
                ? "text-slate-900 border-b-2 border-slate-900"
                : "text-gray-800 border-b border-gray-300"
            }`}
          >
            Achievements & Honors
          </h2>
          <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
            {achievements.map((ach, idx) => (
              <li key={idx}>
                <span className="font-bold">{ach.title}</span>
                {ach.issuer && <span> — {ach.issuer}</span>}
                {ach.date && <span className="text-gray-500"> ({ach.date})</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* CERTIFICATIONS */}
      {certifications.length > 0 && (
        <section className={sectionSpacingClass}>
          <h2
            className={`text-xs font-bold uppercase tracking-wider mb-2 pb-1 ${
              templateId === "modern"
                ? "text-blue-700 border-b border-blue-200"
                : templateId === "minimal"
                ? "text-zinc-400 font-normal border-b border-zinc-100"
                : templateId === "executive"
                ? "text-slate-900 border-b-2 border-slate-900"
                : "text-gray-800 border-b border-gray-300"
            }`}
          >
            Certifications
          </h2>
          <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
            {certifications.map((c, idx) => (
              <li key={idx}>
                <span className="font-bold">{typeof c === "string" ? c : c.name}</span>
                {c.issuer && <span> — {c.issuer}</span>}
                {c.date && <span className="text-gray-500"> ({c.date})</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
