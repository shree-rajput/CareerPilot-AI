import React from "react";

export default function ResumePreview({ data }) {
  if (!data) return <div className="text-white">No preview available</div>;

  return (
    <div className="bg-white text-black p-10 mx-auto max-w-[800px] min-h-[1056px] shadow-2xl rounded-sm font-serif">
      <header className="text-center mb-6 border-b-2 border-black pb-4">
        <h1 className="text-3xl font-bold uppercase tracking-wider mb-2">{data.basics?.name || "Your Name"}</h1>
        <div className="text-sm flex justify-center gap-4 text-gray-600">
          {data.basics?.email && <span>{data.basics.email}</span>}
          {data.basics?.phone && <span>{data.basics.phone}</span>}
          {data.basics?.location && <span>{data.basics.location}</span>}
        </div>
      </header>

      {data.summary && (
        <section className="mb-6">
          <h2 className="text-lg font-bold uppercase border-b border-gray-300 mb-2 pb-1">Professional Summary</h2>
          <p className="text-sm leading-relaxed">{data.summary}</p>
        </section>
      )}

      {data.experience && data.experience.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-bold uppercase border-b border-gray-300 mb-3 pb-1">Experience</h2>
          <div className="space-y-4">
            {data.experience.map((exp, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="text-md font-bold">{exp.role}</h3>
                  <span className="text-sm font-semibold">{exp.startDate} - {exp.endDate || "Present"}</span>
                </div>
                <div className="text-sm italic mb-2">{exp.company}</div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{exp.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.education && data.education.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-bold uppercase border-b border-gray-300 mb-3 pb-1">Education</h2>
          <div className="space-y-3">
            {data.education.map((edu, idx) => (
              <div key={idx} className="flex justify-between items-baseline">
                <div>
                  <h3 className="text-md font-bold">{edu.institution}</h3>
                  <div className="text-sm">{edu.degree} {edu.branch ? `in ${edu.branch}` : ""}</div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold">{edu.startYear} - {edu.endYear}</span>
                  {edu.gpa && <div className="text-sm">GPA: {edu.gpa}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.projects && data.projects.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-bold uppercase border-b border-gray-300 mb-3 pb-1">Projects</h2>
          <div className="space-y-4">
            {data.projects.map((proj, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="text-md font-bold">{proj.name}</h3>
                  {proj.link && (
                    <a href={proj.link} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 hover:underline">
                      Link
                    </a>
                  )}
                </div>
                {proj.technologies && (
                  <div className="text-sm italic mb-2 text-gray-600">Technologies: {proj.technologies}</div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{proj.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.skills && data.skills.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-bold uppercase border-b border-gray-300 mb-2 pb-1">Skills</h2>
          <p className="text-sm leading-relaxed">
            {data.skills.join(" • ")}
          </p>
        </section>
      )}
    </div>
  );
}
