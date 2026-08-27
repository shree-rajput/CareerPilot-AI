import {
  BarChart3,
  BriefcaseBusiness,
  FileText,
  LayoutDashboard,
  Mic,
  Settings,
  Users,
  Target,
  Award,
  BookOpen,
  FolderGit2
} from "lucide-react";

export const FEATURE_STATUS = {
  WORKING: "WORKING",
  PHASE_3: "PHASE_3",
  PHASE_4: "PHASE_4"
};

export const FEATURES = [
  { 
    id: "dashboard",
    to: "/dashboard", 
    label: "Dashboard", 
    icon: LayoutDashboard,
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
    id: "resume",
    to: "/resume", 
    label: "Resume", 
    icon: FileText,
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
    id: "skills",
    to: "/skills", 
    label: "Skills Matrix", 
    icon: Award,
    status: FEATURE_STATUS.WORKING
  },
  { 
    id: "preparation",
    to: "/preparation", 
    label: "Preparation", 
    icon: BookOpen,
    status: FEATURE_STATUS.WORKING
  },
  { 
    id: "projects",
    to: "/projects", 
    label: "Projects", 
    icon: FolderGit2,
    status: FEATURE_STATUS.WORKING
  },
  { 
    id: "solo-interview",
    to: "/interview", 
    label: "Solo Interview", 
    icon: Mic,
    status: FEATURE_STATUS.WORKING 
  },
  { 
    id: "peer-interview",
    to: "/peer-interview", 
    label: "Peer Interview", 
    icon: Users,
    status: FEATURE_STATUS.WORKING 
  },
  { 
    id: "analytics",
    to: "/analytics", 
    label: "Analytics", 
    icon: BarChart3,
    status: FEATURE_STATUS.WORKING 
  },
  { 
    id: "settings",
    to: "/settings", 
    label: "Settings", 
    icon: Settings,
    status: FEATURE_STATUS.WORKING 
  },
];
