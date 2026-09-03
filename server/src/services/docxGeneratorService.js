import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";

/**
 * Generate a DOCX file buffer from structured JSON resume content.
 * @param {Object} structuredData Structured JSON resume object
 * @returns {Promise<Buffer>} DOCX file buffer
 */
export async function generateDocxBuffer(structuredData = {}) {
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

  const totalItemsCount =
    experience.length +
    education.length +
    projects.length +
    certifications.length +
    extracurriculars.length +
    achievements.length;

  const isShortResume = totalItemsCount <= 4;
  const spaceAfterParagraph = isShortResume ? 140 : 80;
  const spaceBeforeHeading = isShortResume ? 280 : 200;

  const children = [];

  // 1. Header Name
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: personal.fullName || structuredData.name || "Candidate Name",
          bold: true,
          size: 32, // 16pt
          color: "1E293B",
        }),
      ],
    })
  );

  // Contact line
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
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spaceAfter: 200,
        children: [
          new TextRun({
            text: contactDetails,
            size: 18, // 9pt
            color: "475569",
          }),
        ],
      })
    );
  }

  // Section Heading Helper
  const addSectionHeading = (title) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spaceBefore: spaceBeforeHeading,
        spaceAfter: 120,
        border: {
          bottom: { color: "CBD5E1", space: 1, style: BorderStyle.SINGLE, size: 6 },
        },
        children: [
          new TextRun({
            text: title.toUpperCase(),
            bold: true,
            size: 22, // 11pt
            color: "2563EB",
          }),
        ],
      })
    );
  };

  // 2. Summary
  if (summary.trim()) {
    addSectionHeading("Professional Summary");
    children.push(
      new Paragraph({
        spaceAfter: spaceAfterParagraph,
        children: [
          new TextRun({
            text: summary,
            size: 20, // 10pt
            color: "1E293B",
          }),
        ],
      })
    );
  }

  // 3. Experience
  if (experience.length > 0) {
    addSectionHeading("Work Experience");
    experience.forEach((exp) => {
      children.push(
        new Paragraph({
          spaceBefore: 120,
          children: [
            new TextRun({
              text: exp.role || "Role",
              bold: true,
              size: 21,
              color: "0F172A",
            }),
            new TextRun({
              text: ` | ${exp.company || "Company"}`,
              size: 20,
              color: "475569",
            }),
            new TextRun({
              text: ` (${exp.startDate || ""} - ${exp.endDate || (exp.current ? "Present" : "")})`,
              size: 18,
              color: "64748B",
            }),
          ],
        })
      );

      if (exp.bullets && exp.bullets.length > 0) {
        exp.bullets.forEach((bullet) => {
          if (bullet.trim()) {
            children.push(
              new Paragraph({
                bullet: { level: 0 },
                spaceAfter: 40,
                children: [
                  new TextRun({
                    text: bullet.trim(),
                    size: 19,
                    color: "334155",
                  }),
                ],
              })
            );
          }
        });
      }
    });
  }

  // 4. Education
  if (education.length > 0) {
    addSectionHeading("Education");
    education.forEach((edu) => {
      children.push(
        new Paragraph({
          spaceBefore: 100,
          spaceAfter: 80,
          children: [
            new TextRun({
              text: edu.degree ? `${edu.degree} ${edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ""}` : edu.institution || "Education",
              bold: true,
              size: 20,
              color: "0F172A",
            }),
            new TextRun({
              text: ` | ${edu.institution || ""}`,
              size: 19,
              color: "475569",
            }),
            new TextRun({
              text: ` (${edu.startDate || edu.startYear || ""} - ${edu.endDate || edu.endYear || ""})`,
              size: 18,
              color: "64748B",
            }),
          ],
        })
      );
    });
  }

  // 5. Coursework
  if (coursework.length > 0) {
    addSectionHeading("Relevant Coursework");
    children.push(
      new Paragraph({
        spaceAfter: spaceAfterParagraph,
        children: [
          new TextRun({
            text: coursework.join("  •  "),
            size: 19,
            color: "334155",
          }),
        ],
      })
    );
  }

  // 6. Projects
  if (projects.length > 0) {
    addSectionHeading("Projects");
    projects.forEach((proj) => {
      const techList = proj.techStack || (Array.isArray(proj.technologies) ? proj.technologies : []);
      children.push(
        new Paragraph({
          spaceBefore: 100,
          children: [
            new TextRun({
              text: proj.title || proj.name || "Project",
              bold: true,
              size: 20,
              color: "0F172A",
            }),
            techList.length
              ? new TextRun({
                  text: ` [${techList.join(", ")}]`,
                  size: 18,
                  color: "2563EB",
                })
              : new TextRun({ text: "" }),
          ],
        })
      );

      if (proj.description) {
        children.push(
          new Paragraph({
            spaceAfter: 60,
            children: [
              new TextRun({
                text: proj.description,
                size: 19,
                color: "334155",
              }),
            ],
          })
        );
      }

      if (proj.bullets && proj.bullets.length > 0) {
        proj.bullets.forEach((bullet) => {
          if (bullet.trim()) {
            children.push(
              new Paragraph({
                bullet: { level: 0 },
                spaceAfter: 40,
                children: [
                  new TextRun({
                    text: bullet.trim(),
                    size: 19,
                    color: "334155",
                  }),
                ],
              })
            );
          }
        });
      }
    });
  }

  // 7. Skills
  if (skills.length > 0) {
    addSectionHeading("Skills");
    if (Array.isArray(skills) && typeof skills[0] === "string") {
      children.push(
        new Paragraph({
          spaceAfter: spaceAfterParagraph,
          children: [
            new TextRun({
              text: skills.join("  •  "),
              size: 19,
              color: "334155",
            }),
          ],
        })
      );
    } else {
      skills.forEach((skillGroup) => {
        const category = skillGroup.category || "Technical Skills";
        const items = Array.isArray(skillGroup.items) ? skillGroup.items.join(", ") : "";
        if (items) {
          children.push(
            new Paragraph({
              spaceAfter: 60,
              children: [
                new TextRun({
                  text: `${category}: `,
                  bold: true,
                  size: 19,
                  color: "0F172A",
                }),
                new TextRun({
                  text: items,
                  size: 19,
                  color: "334155",
                }),
              ],
            })
          );
        }
      });
    }
  }

  // 8. Extracurriculars & Leadership
  if (extracurriculars.length > 0) {
    addSectionHeading("Extracurriculars & Leadership");
    extracurriculars.forEach((extra) => {
      children.push(
        new Paragraph({
          spaceAfter: 40,
          children: [
            new TextRun({
              text: extra.role || "Role",
              bold: true,
              size: 19,
              color: "0F172A",
            }),
            new TextRun({
              text: ` - ${extra.organization || ""}`,
              size: 19,
              color: "475569",
            }),
          ],
        })
      );
      if (extra.description) {
        children.push(
          new Paragraph({
            spaceAfter: 60,
            children: [
              new TextRun({
                text: extra.description,
                size: 18,
                color: "334155",
              }),
            ],
          })
        );
      }
    });
  }

  // 9. Achievements & Honors
  if (achievements.length > 0) {
    addSectionHeading("Achievements & Honors");
    achievements.forEach((ach) => {
      children.push(
        new Paragraph({
          spaceAfter: 60,
          children: [
            new TextRun({
              text: ach.title || "Achievement",
              bold: true,
              size: 19,
              color: "0F172A",
            }),
            new TextRun({
              text: ` - ${ach.issuer || ""} (${ach.date || ""})`,
              size: 19,
              color: "475569",
            }),
          ],
        })
      );
    });
  }

  // 10. Certifications
  if (certifications.length > 0) {
    addSectionHeading("Certifications");
    certifications.forEach((cert) => {
      const certName = typeof cert === "string" ? cert : cert.name;
      children.push(
        new Paragraph({
          spaceAfter: 60,
          children: [
            new TextRun({
              text: certName || "Certification",
              bold: true,
              size: 19,
              color: "0F172A",
            }),
            new TextRun({
              text: ` - ${cert.issuer || ""} (${cert.date || ""})`,
              size: 19,
              color: "475569",
            }),
          ],
        })
      );
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
