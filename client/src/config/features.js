import {
  BarChart3,
  BriefcaseBusiness,
  FileText,
  LayoutDashboard,
  Mic,
  Settings,
  Target,
  Award,
  BookOpen,
  FolderGit2,
  GraduationCap,
  Code2,
  Inbox
} from "lucide-react";

export const FEATURE_STATUS = {
  WORKING: "WORKING",
  PHASE_3: "PHASE_3",
  PHASE_4: "PHASE_4"
};

export const NAVIGATION_CATEGORIES = [
  {
    category: "Command Center",
    items: [
      {
        id: "dashboard",
        to: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        status: FEATURE_STATUS.WORKING
      }
    ]
  },
  {
    category: "Career",
    items: [
      {
        id: "job-inbox",
        to: "/jobs/inbox",
        label: "Job Inbox",
        icon: Inbox,
        status: FEATURE_STATUS.WORKING
      },
      {
        id: "resume",
        to: "/resume",
        label: "Resume Intelligence",
        icon: FileText,
        status: FEATURE_STATUS.WORKING
      },
      {
        id: "jobs",
        to: "/jobs",
        label: "Job Board",
        icon: Target,
        status: FEATURE_STATUS.WORKING
      },
      {
        id: "applications",
        to: "/applications",
        label: "Applications",
        icon: BriefcaseBusiness,
        status: FEATURE_STATUS.WORKING
      },
      {
        id: "projects",
        to: "/projects",
        label: "Projects",
        icon: FolderGit2,
        status: FEATURE_STATUS.WORKING
      }
    ]
  },
  {
    category: "Preparation",
    items: [
      {
        id: "preparation",
        to: "/preparation",
        label: "Preparation Plan",
        icon: BookOpen,
        status: FEATURE_STATUS.WORKING
      },
      {
        id: "tech-discussion",
        to: "/tech-discussion",
        label: "Tech Discussion Room",
        icon: Code2,
        status: FEATURE_STATUS.WORKING
      },
      {
        id: "solo-interview",
        to: "/interview",
        label: "AI Interviewer",
        icon: Mic,
        status: FEATURE_STATUS.WORKING
      }
    ]
  },
  {
    category: "Growth & Network",
    items: [
      {
        id: "mentorship",
        to: "/mentorship",
        label: "Mentor Connect",
        icon: GraduationCap,
        status: FEATURE_STATUS.WORKING
      },
      {
        id: "analytics",
        to: "/analytics",
        label: "Analytics",
        icon: BarChart3,
        status: FEATURE_STATUS.WORKING
      }
    ]
  },
  {
    category: "System",
    items: [
      {
        id: "settings",
        to: "/settings",
        label: "Settings",
        icon: Settings,
        status: FEATURE_STATUS.WORKING
      }
    ]
  }
];

// Flat array fallback for search & quick lookups
export const FEATURES = NAVIGATION_CATEGORIES.flatMap(cat => cat.items);
