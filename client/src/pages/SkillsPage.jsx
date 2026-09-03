import React, { useState, useEffect } from "react";
import { skillApi } from "../api/career";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Spinner } from "../components/ui/Spinner";
import { BrainCircuit, Target, TrendingUp, Plus, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";

export function SkillsPage() {
  const [skills, setSkills] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [newSkillName, setNewSkillName] = useState("");
  const [updating, setUpdating] = useState(false);

  const [targetSkillsInput, setTargetSkillsInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      const res = await skillApi.getUserSkills();
      setSkills(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSkill = async (e) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    
    setUpdating(true);
    try {
      await skillApi.updateUserSkill({
        skillName: newSkillName,
        proficiencyDelta: 10,
        confidenceDelta: 10,
        source: "manual"
      });
      setNewSkillName("");
      await fetchSkills();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleCalculateGaps = async (e) => {
    e.preventDefault();
    if (!targetSkillsInput.trim()) return;

    setAnalyzing(true);
    try {
      const targets = targetSkillsInput.split(",").map(s => ({
        skillName: s.trim(),
        importance: "HIGH"
      })).filter(s => s.skillName);

      const res = await skillApi.calculateGaps(targets);
      setGaps(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Spinner size="md" />
        <p className="mt-2 text-xs font-semibold text-text-secondary">Loading Skills Matrix...</p>
      </div>
    );
  }

  const strongSkills = skills.filter(s => s.proficiency >= 75);
  const developingSkills = skills.filter(s => s.proficiency >= 40 && s.proficiency < 75);
  const unverifiedSkills = skills.filter(s => s.proficiency < 40 || !s.confidence || s.confidence < 40);

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-5 rounded-xl border border-border">
        <div>
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary-bg px-2 py-0.5 rounded border border-primary-border/40 mb-1 inline-block">
            Skills & Competencies
          </span>
          <h1 className="text-xl font-bold text-text m-0 tracking-tight">Skills Matrix</h1>
          <p className="text-xs text-text-secondary mt-0.5 m-0 font-medium">
            Categorized proficiencies, verified evidence, and gap resolution mapping.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Categorized Skills Hierarchy */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Strong Skills */}
          <Card>
            <CardHeader className="py-3 px-5">
              <CardTitle className="text-xs font-bold text-text flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-600" /> Strong Competencies ({strongSkills.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {strongSkills.length === 0 ? (
                <p className="text-xs text-text-muted italic m-0">No strong skills logged yet (75%+ proficiency).</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {strongSkills.map(skill => (
                    <div key={skill._id} className="p-3 border border-border rounded-lg bg-surface">
                      <div className="flex justify-between items-center mb-1.5">
                        <strong className="text-xs font-bold text-text">{skill.canonicalName}</strong>
                        <Badge variant="success" size="xs">{skill.proficiency}%</Badge>
                      </div>
                      <div className="h-1.5 w-full bg-bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${skill.proficiency}%` }} />
                      </div>
                      <p className="text-[10px] text-text-muted mt-1.5 m-0 font-mono text-right">
                        Confidence: {skill.confidence || 80}%
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Developing Skills */}
          <Card>
            <CardHeader className="py-3 px-5">
              <CardTitle className="text-xs font-bold text-text flex items-center gap-2">
                <TrendingUp size={15} className="text-amber-500" /> Developing Skills ({developingSkills.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {developingSkills.length === 0 ? (
                <p className="text-xs text-text-muted italic m-0">No skills currently in development (40%-74%).</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {developingSkills.map(skill => (
                    <div key={skill._id} className="p-3 border border-border rounded-lg bg-surface">
                      <div className="flex justify-between items-center mb-1.5">
                        <strong className="text-xs font-bold text-text">{skill.canonicalName}</strong>
                        <Badge variant="warning" size="xs">{skill.proficiency}%</Badge>
                      </div>
                      <div className="h-1.5 w-full bg-bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${skill.proficiency}%` }} />
                      </div>
                      <p className="text-[10px] text-text-muted mt-1.5 m-0 font-mono text-right">
                        Confidence: {skill.confidence || 50}%
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Unverified / Needs Check */}
          {unverifiedSkills.length > 0 && (
            <Card>
              <CardHeader className="py-3 px-5">
                <CardTitle className="text-xs font-bold text-text flex items-center gap-2">
                  <HelpCircle size={15} className="text-primary" /> Needs Verification ({unverifiedSkills.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {unverifiedSkills.map(skill => (
                    <div key={skill._id} className="p-3 border border-border rounded-lg bg-surface">
                      <div className="flex justify-between items-center mb-1.5">
                        <strong className="text-xs font-bold text-text">{skill.canonicalName}</strong>
                        <Badge variant="secondary" size="xs">{skill.proficiency}%</Badge>
                      </div>
                      <div className="h-1.5 w-full bg-bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-slate-400 rounded-full" style={{ width: `${skill.proficiency}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        </div>

        {/* Right Column: Skill Actions & Gap Analysis */}
        <div className="space-y-6">
          
          {/* Log Skill Progression */}
          <Card>
            <CardHeader className="py-3 px-5">
              <CardTitle className="text-xs font-bold text-text flex items-center gap-2">
                <Plus size={15} className="text-primary" /> Log Skill Practice
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleUpdateSkill} className="space-y-3">
                <Input
                  label="Skill Name"
                  placeholder="e.g. TypeScript, GraphQL"
                  value={newSkillName}
                  onChange={e => setNewSkillName(e.target.value)}
                  required
                />
                <Button type="submit" isLoading={updating} size="sm" className="w-full">
                  Boost Proficiency (+10%)
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Target Skill Gap Analysis */}
          <Card>
            <CardHeader className="py-3 px-5">
              <CardTitle className="text-xs font-bold text-text flex items-center gap-2">
                <Target size={15} className="text-primary" /> Target Role Gap Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleCalculateGaps} className="space-y-3 mb-4">
                <Input
                  label="Target Skills (comma separated)"
                  placeholder="e.g. Docker, AWS, Kubernetes"
                  value={targetSkillsInput}
                  onChange={e => setTargetSkillsInput(e.target.value)}
                  required
                />
                <Button type="submit" variant="secondary" size="sm" isLoading={analyzing} className="w-full">
                  Analyze Skill Gaps
                </Button>
              </form>

              {gaps.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-border">
                  <h4 className="text-xs font-bold text-text m-0">Target Gap Report</h4>
                  {gaps.map((gap, i) => (
                    <div key={i} className="p-2.5 border border-border rounded-lg bg-surface text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <strong className="text-rose-600 font-bold">{gap.skillName}</strong>
                        <Badge variant="danger" size="xs">{gap.importance}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-text-muted">
                        <span>Current: {gap.currentProficiency}%</span>
                        <span>Target: {gap.targetProficiency}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
