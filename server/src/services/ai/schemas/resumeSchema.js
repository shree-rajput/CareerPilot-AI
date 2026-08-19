import { z } from "zod";

const educationItemSchema = z.object({
  institution: z.string().default(""),
  degree: z.string().default(""),
  branch: z.string().default(""),
  startYear: z.string().default(""),
  endYear: z.string().default(""),
  gpa: z.string().default("")
});

const experienceItemSchema = z.object({
  company: z.string().default(""),
  role: z.string().default(""),
  startDate: z.string().default(""),
  endDate: z.string().default(""),
  description: z.string().default("")
});

const projectItemSchema = z.object({
  name: z.string().default(""),
  description: z.string().default(""),
  technologies: z.array(z.string()).default([]),
  link: z.string().default("")
});

const certificationItemSchema = z.object({
  name: z.string().default(""),
  issuer: z.string().default(""),
  date: z.string().default("")
});

export const resumeStructureSchema = z.object({
  summary: z.string().default(""),
  skills: z.array(z.string()).default([]),
  education: z.array(educationItemSchema).default([]),
  experience: z.array(experienceItemSchema).default([]),
  projects: z.array(projectItemSchema).default([]),
  certifications: z.array(certificationItemSchema).default([]),
  achievements: z.array(z.string()).default([])
});
