import React from "react";
import { ExternalLink, Globe } from "lucide-react";

export default function ResumePreview({ data }) {
  if (!data) return <div className="text-white text-center p-8">No preview available</div>;

  const name = data.name || data.basics?.name || "Candidate Name";
  const email = data.email || data.basics?.email || "";
  const phone = data.phone || data.basics?.phone || "";
  const location = data.location || data.basics?.location || "";
  const links = data.links || data.basics?.links || [];

  const rawSkills = data.skills || [];
  const skillsList = rawSkills.map(s => {
    if (typeof s === "string") return s;
    return s.canonicalName || s.name || "";
  }).filter(Boolean);

  return (
    <div className="bg-white text-gray-900 p-8 md:p-12 mx-auto max-w-[850px] min-h-[1050px] shadow-2xl rounded-sm font-serif leading-normal border border-gray-200">
      
      {/* Header */}
      <header className="text-center border-b-2 border-gray-900 pb-5 mb-6">
        <h1 className="text-3xl font-bold uppercase tracking-wider text-gray-900 mb-2">{name}</h1>
        <div className="text-xs flex flex-wrap justify-center items-center gap-3 text-gray-600 font-sans font-medium">
          {email && <span>{email}</span>}
          {phone && <span>• {phone}</span>}
          {location && <span>• {location}</span>}
        </div>
        {links.length > 0 && (
          <div className="text-xs flex flex-wrap justify-center gap-3 text-primary mt-2 font-sans">
            {links.map((link, idx) => (
              <a key={idx} href={link.startsWith("http") ? link : `https://${link}`} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                <Globe size={11} /> {link.replace(/^https?:\/\//, "")}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* Summary */}
      {data.summary && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider border-b border-gray-300 mb-2 pb-1 text-gray-800 font-sans">Professional Summary</h2>
          <p className="text-xs leading-relaxed text-gray-700 text-justify">{data.summary}</p>
        </section>
      )}

      {/* Experience */}
      {data.experience && data.experience.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider border-b border-gray-300 mb-3 pb-1 text-gray-800 font-sans">Work Experience</h2>
          <div className="space-y-4">
            {data.experience.map((exp, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className="text-sm font-bold text-gray-900">{exp.role || "Role"}</h3>
                  <span className="text-xs font-semibold text-gray-600 font-sans">{exp.startDate || exp.duration || ""} {exp.endDate ? `- ${exp.endDate}` : ""}</span>
                </div>
                <div className="text-xs font-semibold text-gray-700 mb-1.5 italic">{exp.company}</div>
                <p className="text-xs leading-relaxed text-gray-700 whitespace-pre-line">{exp.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {data.projects && data.projects.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider border-b border-gray-300 mb-3 pb-1 text-gray-800 font-sans">Projects</h2>
          <div className="space-y-4">
            {data.projects.map((proj, idx) => {
              const techStr = Array.isArray(proj.technologies) 
                ? proj.technologies.join(", ") 
                : proj.technologies || "";
              
              return (
                <div key={idx}>
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      {proj.name}
                      {proj.role && <span className="text-xs font-normal text-gray-500 font-sans">({proj.role})</span>}
                    </h3>
                    {proj.link && (
                      <a href={proj.link} target="_blank" rel="noopener noreferrer" className="text-xs font-sans text-primary hover:underline flex items-center gap-1">
                        <ExternalLink size={10} /> View Project
                      </a>
                    )}
                  </div>
                  {techStr && (
                    <div className="text-xs font-sans text-gray-600 font-medium mb-1">
                      <span className="font-bold text-gray-800">Tech Stack:</span> {techStr}
                    </div>
                  )}
                  {proj.problemSolved && (
                    <div className="text-xs text-gray-700 mb-1">
                      <span className="font-bold font-sans text-gray-800">Problem Solved:</span> {proj.problemSolved}
                    </div>
                  )}
                  <p className="text-xs leading-relaxed text-gray-700 whitespace-pre-line">{proj.description}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Skills */}
      {skillsList.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider border-b border-gray-300 mb-2 pb-1 text-gray-800 font-sans">Skills & Competencies</h2>
          <p className="text-xs leading-relaxed text-gray-800 font-sans font-medium">
            {skillsList.join("  •  ")}
          </p>
        </section>
      )}

      {/* Education */}
      {data.education && data.education.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider border-b border-gray-300 mb-3 pb-1 text-gray-800 font-sans">Education</h2>
          <div className="space-y-3">
            {data.education.map((edu, idx) => (
              <div key={idx} className="flex justify-between items-baseline">
                <div>
                  <h3 className="text-xs font-bold text-gray-900">{edu.institution}</h3>
                  <div className="text-xs text-gray-700">{edu.degree} {edu.branch ? `in ${edu.branch}` : ""}</div>
                </div>
                <div className="text-right text-xs font-sans">
                  <span className="font-semibold text-gray-600">{edu.startYear} - {edu.endYear}</span>
                  {edu.gpa && <div className="text-gray-600">GPA: {edu.gpa}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certifications & Achievements */}
      {data.certifications && data.certifications.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider border-b border-gray-300 mb-2 pb-1 text-gray-800 font-sans">Certifications</h2>
          <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
            {data.certifications.map((c, idx) => (
              <li key={idx}>
                <span className="font-bold">{typeof c === 'string' ? c : c.name}</span>
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
