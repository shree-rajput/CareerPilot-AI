import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Target, CheckCircle2, Clock, Award, ChevronDown, ChevronUp, 
  RefreshCw, Briefcase, Zap, Bot, BookOpen, Sparkles
} from "lucide-react";
import { preparationApi } from "../api/career";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
import { Badge } from "../components/ui/Badge";
import { PreparationAssistant } from "../components/preparation/PreparationAssistant";
import { SkillVerificationModal } from "../components/preparation/SkillVerificationModal";

export function PreparationPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [expandedSkill, setExpandedSkill] = useState(null);

  const [verifySkillName, setVerifySkillName] = useState(null);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);

  const handleDiscussInCopilot = (skillName, contextMsg) => {
    const roleStr = dashboard?.targetRole || "Software Engineer";
    const initialPrompt = `I need help mastering the skill "${skillName}" for my target role "${roleStr}". ${contextMsg || ''} Please break down the core concepts, common interview scenarios, debugging gotchas, and architectural trade-offs I should master.`;
    navigate('/copilot', { state: { initialPrompt, title: `Skill Study: ${skillName}` } });
  };

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
      <div className="flex justify-center items-center h-64">
        <Spinner size="md" />
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
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-bg">
      <div className="flex-1 flex flex-col border-r border-border overflow-y-auto">
        <div className="p-6 max-w-5xl mx-auto w-full space-y-6 pb-12">
          
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-5 rounded-xl border border-border">
            <div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary-bg px-2 py-0.5 rounded border border-primary-border/40 mb-1 inline-block">
                Skill Training Roadmap
              </span>
              <h1 className="text-xl font-bold text-text m-0 tracking-tight flex items-center gap-2">
                Preparation Plan
              </h1>
              <p className="text-xs text-text-secondary mt-0.5 m-0 font-medium">
                Goal: <strong className="text-text">{dashboard?.targetRole || "Software Engineer"}</strong> · Personalised gap resolution plan
              </p>
            </div>
            <Button variant="secondary" onClick={handleRefresh} isLoading={refreshing} size="sm">
              <RefreshCw size={14} /> Refresh Roadmap
            </Button>
          </div>

          {/* Metrics Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <Card className="p-4 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-text-muted">Readiness</span>
              <strong className="text-xl font-extrabold text-text mt-1">
                {dashboard?.overallPreparationProgress || 0}% Ready
              </strong>
              <div className="h-1.5 w-full bg-bg-secondary rounded-full overflow-hidden mt-2">
                <div className="h-full bg-primary rounded-full" style={{ width: `${dashboard?.overallPreparationProgress || 0}%` }} />
              </div>
            </Card>

            <Card className="p-4 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-danger">Critical Gaps</span>
              <strong className="text-xl font-extrabold text-danger mt-1">
                {dashboard?.criticalGapsCount || 0}
              </strong>
              <span className="text-[10px] text-text-muted mt-1 font-medium">Priority skill items</span>
            </Card>

            <Card className="p-4 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-success">Verified Skills</span>
              <strong className="text-xl font-extrabold text-success mt-1">
                {dashboard?.verifiedCount || 0}
              </strong>
              <span className="text-[10px] text-text-muted mt-1 font-medium">Assessment passed</span>
            </Card>

            <Card className="p-4 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-warning">Est. Remaining</span>
              <strong className="text-xl font-extrabold text-warning mt-1">
                {dashboard?.estimatedEffortRemainingHours || 0}h
              </strong>
              <span className="text-[10px] text-text-muted mt-1 font-medium">Action plan hours</span>
            </Card>
          </div>

          {/* Daily Action Plan Focus */}
          <Card className="border-primary-border/60 bg-primary-bg/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-primary" />
                  <h3 className="text-xs font-bold text-text m-0">Today's Recommended Actions</h3>
                </div>
                <span className="text-[10px] font-semibold text-text-muted bg-surface px-2 py-0.5 rounded border border-border">
                  ~90 min total
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(dashboard?.todaysFocus || []).map((item, idx) => (
                  <div key={idx} className="bg-surface border border-border p-3 rounded-lg flex flex-col justify-between gap-2 shadow-2xs">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="primary" size="xs">{item.skill}</Badge>
                        <span className="text-[10px] text-text-muted font-mono">{item.estimatedTimeMinutes}m</span>
                      </div>
                      <h4 className="text-xs font-semibold text-text leading-snug m-0 line-clamp-2">
                        {item.title}
                      </h4>
                    </div>

                    <Button 
                      size="xs" 
                      onClick={() => handleOpenVerification(item.skill)}
                      className="w-full mt-1"
                    >
                      <Award size={12} /> Verify Skill Check
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Skill Gaps List */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-1 border-b border-border">
              <h3 className="text-xs font-bold text-text m-0">Skill Gaps & Action Plans</h3>

              <div className="flex items-center gap-1 bg-bg-secondary p-0.5 rounded-lg border border-border">
                {[
                  { id: "all", label: "All" },
                  { id: "critical", label: "Critical" },
                  { id: "in_progress", label: "In Progress" },
                  { id: "verified", label: "Verified" }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                      filter === tab.id 
                        ? "bg-surface text-text shadow-2xs font-bold" 
                        : "text-text-secondary hover:text-text"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredGaps.length === 0 ? (
              <Card className="text-center py-8 text-text-secondary">
                <CheckCircle2 size={24} className="text-success mx-auto mb-2" />
                <p className="text-xs font-bold text-text m-0">No Skill Gaps Registered</p>
                <p className="text-[11px] text-text-muted mt-0.5">All skill items in this category are clear.</p>
              </Card>
            ) : (
              <div className="space-y-2.5">
                {filteredGaps.map((gap) => {
                  const isExpanded = expandedSkill === gap.skill;
                  const isVerified = gap.status === "VERIFIED";

                  return (
                    <Card key={gap.skill} className={`p-4 ${isVerified ? "bg-success-bg/20 border-success-border/40" : ""}`}>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="p-2 rounded-md bg-bg-secondary text-primary shrink-0 mt-0.5">
                            {isVerified ? <CheckCircle2 size={16} className="text-success" /> : <Target size={16} />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="text-xs font-bold text-text m-0 truncate">{gap.skill}</h4>
                              <Badge variant={gap.priority === "critical" ? "danger" : gap.priority === "high" ? "warning" : "secondary"} size="xs">
                                {gap.priority}
                              </Badge>
                              {isVerified && (
                                <Badge variant="success" size="xs">
                                  Verified {gap.verificationScore ? `(${gap.verificationScore}%)` : ""}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-text-secondary m-0 leading-relaxed font-medium">
                              {gap.whyItMatters}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => setExpandedSkill(isExpanded ? null : gap.skill)}
                          >
                            <BookOpen size={12} /> {isExpanded ? "Hide Steps" : "Start Learning"}
                          </Button>

                          <Button 
                            onClick={() => handleOpenVerification(gap.skill)} 
                            size="xs"
                            variant={isVerified ? "secondary" : "primary"}
                          >
                            <Award size={12} />
                            {isVerified ? "Re-Check Quiz" : "Practice Quiz"}
                          </Button>

                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleDiscussInCopilot(gap.skill, gap.whyItMatters)}
                          >
                            <Bot size={12} /> Discuss with Copilot
                          </Button>

                          <select
                            value={gap.status}
                            onChange={(e) => handleStatusChange(gap.skill, e.target.value)}
                            className="bg-surface border border-border rounded-lg px-2 py-1 text-[11px] font-semibold text-text outline-none cursor-pointer"
                          >
                            <option value="NOT_STARTED">Not Started</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="PRACTICING">Practicing</option>
                            <option value="VERIFIED">Verified</option>
                          </select>
                        </div>
                      </div>

                      {/* Action Plan steps */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-border space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">5-Step Resolution Steps</span>
                          <div className="space-y-1.5">
                            {(gap.actionPlan || []).map((step) => (
                              <div 
                                key={step.stepNumber} 
                                className="p-2 rounded bg-bg-secondary border border-border flex items-center justify-between text-xs"
                              >
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input 
                                    type="checkbox"
                                    checked={step.completed}
                                    onChange={() => handleToggleStep(gap.skill, step.stepNumber, step.completed)}
                                    className="accent-primary h-3.5 w-3.5"
                                  />
                                  <span className={step.completed ? 'line-through text-text-muted font-medium' : 'font-semibold text-text'}>
                                    Step {step.stepNumber}: {step.title}
                                  </span>
                                </label>
                                <Badge variant="outline" size="xs">{step.taskType}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      <div className="w-72 border-l border-border bg-surface shrink-0 hidden lg:block">
        <PreparationAssistant activePlan={dashboard?.todaysFocus?.[0]} />
      </div>

      <SkillVerificationModal
        isOpen={isVerifyOpen}
        onClose={() => setIsVerifyOpen(false)}
        skillName={verifySkillName}
        onVerificationSuccess={handleVerificationSuccess}
      />
    </div>
  );
}
