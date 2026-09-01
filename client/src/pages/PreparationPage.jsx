import React, { useEffect, useState } from "react";
import { 
  Target, Sparkles, CheckCircle2, Clock, Award, ChevronDown, ChevronUp, 
  Play, BookOpen, Code, CheckSquare, RefreshCw, Briefcase, Zap, ArrowRight 
} from "lucide-react";
import { preparationApi } from "../api/career";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
import { Badge } from "../components/ui/Badge";
import { PreparationAssistant } from "../components/preparation/PreparationAssistant";
import { SkillVerificationModal } from "../components/preparation/SkillVerificationModal";

export function PreparationPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all"); // "all", "critical", "in_progress", "verified"
  const [expandedSkill, setExpandedSkill] = useState(null);

  // Skill verification modal state
  const [verifySkillName, setVerifySkillName] = useState(null);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const res = await preparationApi.getDashboard();
      const data = res.data || res;
      setDashboard(data);
    } catch (err) {
      console.error("Failed to load preparation dashboard", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadDashboard();
  }

  async function handleStatusChange(skillName, newStatus) {
    try {
      setDashboard(prev => {
        if (!prev) return prev;
        const newGaps = prev.skillGaps.map(g => 
          g.skill === skillName ? { ...g, status: newStatus } : g
        );
        return { ...prev, skillGaps: newGaps };
      });
      await preparationApi.updateSkillStatus(skillName, newStatus);
    } catch (err) {
      console.error("Failed to update status", err);
      loadDashboard();
    }
  }

  async function handleToggleStep(skillName, stepNumber, currentCompleted) {
    try {
      setDashboard(prev => {
        if (!prev) return prev;
        const newGaps = prev.skillGaps.map(g => {
          if (g.skill === skillName) {
            const newTasks = (g.actionPlan || []).map(t => 
              t.stepNumber === stepNumber ? { ...t, completed: !currentCompleted } : t
            );
            return { ...g, actionPlan: newTasks };
          }
          return g;
        });
        return { ...prev, skillGaps: newGaps };
      });
      await preparationApi.toggleActionPlanStep(skillName, stepNumber, !currentCompleted);
    } catch (err) {
      console.error("Failed to toggle step", err);
      loadDashboard();
    }
  }

  function handleOpenVerification(skillName) {
    setVerifySkillName(skillName);
    setIsVerifyOpen(true);
  }

  function handleVerificationSuccess() {
    loadDashboard();
  }

  if (loading && !dashboard) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  const gaps = dashboard?.skillGaps || [];
  const filteredGaps = gaps.filter(g => {
    if (filter === "critical") return (g.priority === "critical" || g.priority === "high") && g.status !== "VERIFIED";
    if (filter === "in_progress") return g.status === "IN_PROGRESS" || g.status === "PRACTICING";
    if (filter === "verified") return g.status === "VERIFIED";
    return true;
  });

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden animate-in fade-in bg-bg">
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col border-r border-border bg-bg overflow-y-auto custom-scrollbar">
        <div className="p-6 md:p-8 max-w-5xl mx-auto w-full flex flex-col gap-8">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-text tracking-tight flex items-center gap-2 m-0">
                <Target className="text-primary" size={30} /> Preparation Action Center
              </h1>
              <p className="text-text-secondary text-sm mt-1 m-0">
                Personalized skill-gap resolution roadmap for <strong className="text-text font-bold">{dashboard?.targetRole || "Software Engineer"}</strong>.
              </p>
            </div>
            <Button variant="outline" onClick={handleRefresh} isLoading={refreshing} size="sm">
              <RefreshCw size={14} className="mr-2" /> Refresh Roadmap
            </Button>
          </div>

          {/* High-Level Progress Dashboard Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Overall Preparation */}
            <div className="bg-surface border border-border p-5 rounded-2xl shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">Overall Preparation</span>
                <span className="text-xs font-black text-primary">{dashboard?.overallPreparationProgress || 0}%</span>
              </div>
              <strong className="text-2xl font-black text-text mb-3">
                {dashboard?.overallPreparationProgress || 0}% Ready
              </strong>
              <div className="h-2 w-full bg-border rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${dashboard?.overallPreparationProgress || 0}%` }} />
              </div>
            </div>

            {/* Critical Gaps */}
            <div className="bg-surface border border-border p-5 rounded-2xl shadow-xs flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-danger tracking-wider mb-1">Critical Gaps</span>
              <div className="flex items-baseline gap-2">
                <strong className="text-2xl font-black text-danger">{dashboard?.criticalGapsCount || 0}</strong>
                <span className="text-xs font-bold text-text-secondary">active gaps</span>
              </div>
              <p className="text-[10px] text-text-secondary m-0 mt-2">Requires priority practice</p>
            </div>

            {/* Verified Skills */}
            <div className="bg-surface border border-border p-5 rounded-2xl shadow-xs flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-success tracking-wider mb-1">Verified Skills</span>
              <div className="flex items-baseline gap-2">
                <strong className="text-2xl font-black text-success">{dashboard?.verifiedCount || 0}</strong>
                <span className="text-xs font-bold text-text-secondary">certified</span>
              </div>
              <p className="text-[10px] text-text-secondary m-0 mt-2">Gaps verified & closed</p>
            </div>

            {/* Remaining Effort */}
            <div className="bg-surface border border-border p-5 rounded-2xl shadow-xs flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-warning tracking-wider mb-1">Remaining Effort</span>
              <div className="flex items-baseline gap-2">
                <strong className="text-2xl font-black text-warning">{dashboard?.estimatedEffortRemainingHours || 0}h</strong>
                <span className="text-xs font-bold text-text-secondary">est. total</span>
              </div>
              <p className="text-[10px] text-text-secondary m-0 mt-2">Actionable study plan</p>
            </div>

          </div>

          {/* Today's Focus (60-90 min Action Checklist) */}
          <Card className="shadow-xs border-border border-l-4 border-l-primary bg-surface">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap size={20} className="text-primary" />
                  <h2 className="text-base font-extrabold text-text m-0">Today's Focus — Daily Action Plan</h2>
                </div>
                <span className="text-xs font-bold text-text-secondary bg-bg-secondary px-2.5 py-1 rounded-full border border-border">
                  ~90 min total
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(dashboard?.todaysFocus || []).map((item, idx) => (
                  <div key={idx} className="bg-bg-secondary border border-border p-4 rounded-xl flex flex-col justify-between gap-3 hover:border-primary/30 transition-colors">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {item.skill}
                        </span>
                        <span className="text-[10px] text-text-secondary font-bold flex items-center gap-1">
                          <Clock size={10} /> {item.estimatedTimeMinutes}m
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-text leading-snug m-0 line-clamp-2">
                        {item.title}
                      </h4>
                    </div>

                    <Button 
                      size="sm" 
                      onClick={() => handleOpenVerification(item.skill)}
                      className="w-full mt-1 text-xs"
                    >
                      <Award size={13} className="mr-1.5" /> Start / Verify Skill
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actionable Skill Gaps Section */}
          <div className="flex flex-col gap-4">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border pb-3">
              <div>
                <h2 className="text-lg font-extrabold text-text m-0">Skill Gaps & Action Plans</h2>
                <p className="text-xs text-text-secondary m-0 mt-0.5">Click any skill to view its 5-step action plan or launch verification.</p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-1 bg-surface border border-border p-1 rounded-xl">
                {[
                  { id: "all", label: "All Gaps" },
                  { id: "critical", label: "Critical" },
                  { id: "in_progress", label: "In Progress" },
                  { id: "verified", label: "Verified" }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filter === tab.id 
                        ? "bg-primary text-white shadow-xs" 
                        : "text-text-secondary hover:text-text hover:bg-bg-secondary"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredGaps.length === 0 ? (
              <Card className="border-border bg-surface text-center py-10">
                <CardContent>
                  <CheckCircle2 size={36} className="text-success mx-auto mb-3 opacity-80" />
                  <h3 className="text-base font-bold text-text mb-1">No Skill Gaps Found</h3>
                  <p className="text-xs text-text-secondary">All skills in this filter category have been verified or resolved!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredGaps.map((gap) => {
                  const isExpanded = expandedSkill === gap.skill;
                  const isVerified = gap.status === "VERIFIED";

                  return (
                    <Card key={gap.skill} className={`border transition-all shadow-xs ${
                      isVerified ? "bg-success/5 border-success/20" : "bg-surface border-border hover:border-primary/30"
                    }`}>
                      <CardContent className="p-5 flex flex-col gap-4">
                        
                        {/* Main Card Row */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                              isVerified ? "bg-success/10 text-success border border-success/20" : "bg-primary/10 text-primary border border-primary/20"
                            }`}>
                              {isVerified ? <CheckCircle2 size={20} /> : <Target size={20} />}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="text-base font-extrabold text-text m-0 truncate">
                                  {gap.skill}
                                </h3>
                                <Badge variant={
                                  gap.priority === "critical" ? "danger" : 
                                  gap.priority === "high" ? "warning" : "secondary"
                                }>
                                  {gap.priority.toUpperCase()}
                                </Badge>
                                {isVerified && (
                                  <Badge variant="success" className="flex items-center gap-1">
                                    <Award size={10} /> Verified {gap.verificationScore ? `(${gap.verificationScore}%)` : ""}
                                  </Badge>
                                )}
                              </div>

                              <p className="text-xs text-text-secondary m-0 leading-relaxed">
                                {gap.whyItMatters}
                              </p>

                              {/* Target Jobs chips */}
                              {gap.requiredByJobs && gap.requiredByJobs.length > 0 && (
                                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                  <span className="text-[10px] font-bold text-text-secondary uppercase flex items-center gap-1">
                                    <Briefcase size={10} /> Required by:
                                  </span>
                                  {gap.requiredByJobs.map((job, jIdx) => (
                                    <span key={jIdx} className="bg-bg-secondary border border-border px-2 py-0.5 rounded text-[10px] font-bold text-text">
                                      {job.company} ({job.role})
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action controls */}
                          <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                            
                            {/* Status Selector */}
                            <select
                              value={gap.status}
                              onChange={(e) => handleStatusChange(gap.skill, e.target.value)}
                              className="bg-bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-text outline-none cursor-pointer"
                            >
                              <option value="NOT_STARTED">Not Started</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="PRACTICING">Practicing</option>
                              <option value="READY_FOR_ASSESSMENT">Ready for Check</option>
                              <option value="VERIFIED">Verified</option>
                            </select>

                            <Button 
                              onClick={() => handleOpenVerification(gap.skill)} 
                              size="sm"
                              variant={isVerified ? "outline" : "default"}
                            >
                              <Award size={14} className="mr-1.5" />
                              {isVerified ? "Re-Test" : "Take Skill Check"}
                            </Button>

                            <button
                              onClick={() => setExpandedSkill(isExpanded ? null : gap.skill)}
                              className="p-1.5 text-text-secondary hover:text-text bg-bg-secondary hover:bg-border rounded-lg transition-colors cursor-pointer"
                              title="Toggle Action Plan"
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>

                        </div>

                        {/* Progress Bar */}
                        <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                          <span className="text-[10px] font-bold text-text-secondary uppercase shrink-0">Progress:</span>
                          <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${isVerified ? 'bg-success' : 'bg-primary'}`} 
                              style={{ width: `${gap.progressPercent || 0}%` }} 
                            />
                          </div>
                          <span className="text-xs font-bold text-text shrink-0">{gap.progressPercent || 0}%</span>
                        </div>

                        {/* Expanded Action Plan Drawer */}
                        {isExpanded && (
                          <div className="mt-3 bg-bg-secondary p-4 rounded-xl border border-border flex flex-col gap-3 animate-in fade-in">
                            <h4 className="text-xs font-extrabold text-text uppercase tracking-wider m-0 flex items-center justify-between">
                              <span>Action Plan — Step-by-Step Resolution</span>
                              <span className="text-[10px] text-text-secondary font-medium">No unverified external links</span>
                            </h4>

                            <div className="flex flex-col gap-2">
                              {(gap.actionPlan || []).map((step) => (
                                <div 
                                  key={step.stepNumber} 
                                  className={`p-3 rounded-lg border flex items-center justify-between gap-3 text-xs transition-colors ${
                                    step.completed ? 'bg-success/5 border-success/20 text-text-secondary' : 'bg-surface border-border text-text'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <input 
                                      type="checkbox"
                                      checked={step.completed}
                                      onChange={() => handleToggleStep(gap.skill, step.stepNumber, step.completed)}
                                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                                    />
                                    <span className={step.completed ? 'line-through opacity-70' : 'font-medium'}>
                                      Step {step.stepNumber}: {step.title}
                                    </span>
                                  </div>

                                  <Badge variant="outline" className="text-[10px] uppercase font-bold shrink-0">
                                    {step.taskType}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Right Sidebar: CareerCopilot Assistant */}
      <div className="w-80 border-l border-border bg-surface flex flex-col shrink-0">
        <PreparationAssistant activePlan={dashboard?.todaysFocus?.[0]} />
      </div>

      {/* Skill Check Verification Modal */}
      <SkillVerificationModal
        isOpen={isVerifyOpen}
        onClose={() => setIsVerifyOpen(false)}
        skillName={verifySkillName}
        onVerificationSuccess={handleVerificationSuccess}
      />

    </div>
  );
}
