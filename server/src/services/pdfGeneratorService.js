import PDFDocument from "pdfkit";

/**
 * Generate a lightweight ATS-friendly PDF buffer from structured JSON resume data.
 * Dynamic Spacing: Automatically adapts line gaps, section margins, and padding based on
 * total content density to ensure shorter fresher resumes fill the page naturally.
 *
 * @param {Object} structuredData Structured JSON resume object
 * @param {String} templateId Template style identifier ("classic", "modern", "minimal", "executive")
 * @returns {Promise<Buffer>} PDF file buffer
 */
export function generatePdfBuffer(structuredData = {}, templateId = "classic") {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        margin: 40,
        info: {
          Title: structuredData?.personal?.fullName ? `${structuredData.personal.fullName} - Resume` : "Resume",
          Author: structuredData?.personal?.fullName || "Candidate",
        },
      });

      const buffers = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      const personal = structuredData.personal || {};
      const summary = structuredData.summary || "";
      const experience = structuredData.experience || [];
      const education = structuredData.education || [];
      const projects = structuredData.projects || [];
      const skills = structuredData.skills || [];
      const certifications = structuredData.certifications || [];
      const coursework = structuredData.coursework || [];
      const extracurriculars = structuredData.extracurriculars || [];
      const achievements = structuredData.achievements || [];

      // Calculate total item density
      const totalItemsCount =
        experience.length +
        education.length +
        projects.length +
        certifications.length +
        extracurriculars.length +
        achievements.length;

      // Dynamic Content Spacing multiplier
      // If resume is short (e.g. fresher with <= 4 items), expand line gaps and section margins
      const isShortResume = totalItemsCount <= 4;
      const baseLineGap = isShortResume ? 3 : 1.5;
      const baseMoveDown = isShortResume ? 0.6 : 0.4;

      // Header Colors
      const isModern = templateId === "modern";
      const isExecutive = templateId === "executive";
      const primaryColor = isModern ? "#2563eb" : isExecutive ? "#0f172a" : "#1e293b";

      // 1. Header Contact Info
      doc
        .fillColor(primaryColor)
        .fontSize(21)
        .font("Helvetica-Bold")
        .text(personal.fullName || structuredData.name || "Candidate Name", { align: "center" });

      doc.moveDown(0.2);

      const contactDetails = [
        personal.email || structuredData.email,
        personal.phone || structuredData.phone,
        personal.location || structuredData.location,
        personal.linkedinUrl,
        personal.githubUrl,
        personal.portfolioUrl,
      ]
        .filter(Boolean)
        .join(" | ");

      if (contactDetails) {
        doc
          .fillColor("#475569")
          .fontSize(9.5)
          .font("Helvetica")
          .text(contactDetails, { align: "center" });
      }

      doc.moveDown(0.8);

      // Section divider line
      doc
        .strokeColor("#cbd5e1")
        .lineWidth(1)
        .moveTo(40, doc.y)
        .lineTo(572, doc.y)
        .stroke();

      doc.moveDown(baseMoveDown);

      // Helper for Section Titles
      const renderSectionHeader = (title) => {
        doc.moveDown(baseMoveDown);
        doc
          .fillColor(primaryColor)
          .fontSize(12)
          .font("Helvetica-Bold")
          .text(title.toUpperCase(), { underline: false });

        doc
          .strokeColor("#e2e8f0")
          .lineWidth(0.5)
          .moveTo(40, doc.y + 2)
          .lineTo(572, doc.y + 2)
          .stroke();

        doc.moveDown(baseMoveDown);
      };

      // 2. Summary
      if (summary.trim()) {
        renderSectionHeader("Professional Summary");
        doc
          .fillColor("#1e293b")
          .fontSize(9.5)
          .font("Helvetica")
          .text(summary, { lineGap: baseLineGap });
      }

      // 3. Experience
      if (experience.length > 0) {
        renderSectionHeader("Work Experience");
        experience.forEach((exp) => {
          doc
            .fillColor("#0f172a")
            .fontSize(10.5)
            .font("Helvetica-Bold")
            .text(exp.role || "Role", { continued: true })
            .fillColor("#64748b")
            .fontSize(9)
            .font("Helvetica")
            .text(`  |  ${exp.company || "Company"}`, { continued: true })
            .text(`  (${exp.startDate || ""} - ${exp.endDate || (exp.current ? "Present" : "")})`, { align: "right" });

          if (exp.bullets && exp.bullets.length > 0) {
            doc.moveDown(0.2);
            exp.bullets.forEach((bullet) => {
              if (bullet.trim()) {
                doc
                  .fillColor("#334155")
                  .fontSize(9)
                  .font("Helvetica")
                  .text(`•  ${bullet.trim()}`, { indent: 10, lineGap: baseLineGap });
              }
            });
          }
          doc.moveDown(baseMoveDown);
        });
      }

      // 4. Education
      if (education.length > 0) {
        renderSectionHeader("Education");
        education.forEach((edu) => {
          doc
            .fillColor("#0f172a")
            .fontSize(10)
            .font("Helvetica-Bold")
            .text(edu.degree ? `${edu.degree} ${edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ""}` : edu.institution || "Education", { continued: true })
            .fillColor("#64748b")
            .fontSize(9)
            .font("Helvetica")
            .text(`  |  ${edu.institution || ""}`, { continued: true })
            .text(`  (${edu.startDate || edu.startYear || ""} - ${edu.endDate || edu.endYear || ""})`, { align: "right" });

          if (edu.gpa) {
            doc.fillColor("#475569").fontSize(8.5).font("Helvetica").text(`GPA: ${edu.gpa}`, { indent: 10 });
          }

          doc.moveDown(0.3);
        });
      }

      // 5. Coursework (if present)
      if (coursework.length > 0) {
        renderSectionHeader("Relevant Coursework");
        doc
          .fillColor("#334155")
          .fontSize(9)
          .font("Helvetica")
          .text(coursework.join("  •  "), { lineGap: baseLineGap });
      }

      // 6. Projects
      if (projects.length > 0) {
        renderSectionHeader("Key Projects");
        projects.forEach((proj) => {
          doc
            .fillColor("#0f172a")
            .fontSize(10)
            .font("Helvetica-Bold")
            .text(proj.title || proj.name || "Project", { continued: true });

          const techList = proj.techStack || (Array.isArray(proj.technologies) ? proj.technologies : []);
          if (techList.length > 0) {
            doc
              .fillColor("#2563eb")
              .fontSize(8.5)
              .font("Helvetica")
              .text(`  [${techList.join(", ")}]`);
          } else {
            doc.text("");
          }

          if (proj.description) {
            doc
              .fillColor("#334155")
              .fontSize(9)
              .font("Helvetica")
              .text(proj.description, { lineGap: baseLineGap });
          }

          if (proj.bullets && proj.bullets.length > 0) {
            proj.bullets.forEach((bullet) => {
              if (bullet.trim()) {
                doc
                  .fillColor("#334155")
                  .fontSize(9)
                  .font("Helvetica")
                  .text(`•  ${bullet.trim()}`, { indent: 10, lineGap: baseLineGap });
              }
            });
          }
          doc.moveDown(baseMoveDown);
        });
      }

      // 7. Skills
      if (skills.length > 0) {
        renderSectionHeader("Skills & Technical Proficiencies");
        if (Array.isArray(skills) && typeof skills[0] === "string") {
          doc.fillColor("#334155").fontSize(9).font("Helvetica").text(skills.join("  •  "));
        } else {
          skills.forEach((skillGroup) => {
            const category = skillGroup.category || "Technical Skills";
            const items = Array.isArray(skillGroup.items) ? skillGroup.items.join(", ") : "";
            if (items) {
              doc
                .fillColor("#0f172a")
                .fontSize(9)
                .font("Helvetica-Bold")
                .text(`${category}: `, { continued: true })
                .fillColor("#334155")
                .font("Helvetica")
                .text(items);
            }
          });
        }
      }

      // 8. Extracurriculars & Leadership
      if (extracurriculars.length > 0) {
        renderSectionHeader("Extracurriculars & Leadership");
        extracurriculars.forEach((extra) => {
          doc
            .fillColor("#0f172a")
            .fontSize(9.5)
            .font("Helvetica-Bold")
            .text(extra.role || "Role", { continued: true })
            .fillColor("#64748b")
            .font("Helvetica")
            .text(` - ${extra.organization || ""}`);
          if (extra.description) {
            doc.fillColor("#334155").fontSize(9).text(extra.description, { indent: 10, lineGap: 1 });
          }
        });
      }

      // 9. Achievements & Honors
      if (achievements.length > 0) {
        renderSectionHeader("Achievements & Honors");
        achievements.forEach((ach) => {
          doc
            .fillColor("#0f172a")
            .fontSize(9.5)
            .font("Helvetica-Bold")
            .text(ach.title || "Achievement", { continued: true })
            .fillColor("#64748b")
            .font("Helvetica")
            .text(` - ${ach.issuer || ""} (${ach.date || ""})`);
        });
      }

      // 10. Certifications
      if (certifications.length > 0) {
        renderSectionHeader("Certifications");
        certifications.forEach((cert) => {
          const certName = typeof cert === "string" ? cert : cert.name;
          doc
            .fillColor("#0f172a")
            .fontSize(9)
            .font("Helvetica-Bold")
            .text(certName || "Certification", { continued: true })
            .fillColor("#64748b")
            .font("Helvetica")
            .text(` - ${cert.issuer || ""} (${cert.date || ""})`);
        });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
