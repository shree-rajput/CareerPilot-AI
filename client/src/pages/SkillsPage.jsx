import React, { useState, useEffect } from "react";
import { skillApi } from "../api/career";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Spinner } from "../components/ui/Spinner";
import { BrainCircuit, Target, TrendingUp, Plus } from "lucide-react";

export function SkillsPage() {
  const [skills, setSkills] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Update form
  const [newSkillName, setNewSkillName] = useState("");
  const [updating, setUpdating] = useState(false);

  // Gaps form
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
      // Parse comma separated list into {skillName, importance: 'HIGH'}
      const targets = targetSkillsInput.split(",").map(s => ({
        skillName: s.trim(),
        importance: "HIGH" // Defaulting all to HIGH for this simple UI
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
        <Spinner size="lg" />
        <p className="mt-4 text-text-secondary">Loading skills...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-extrabold text-text tracking-tight">Skills Matrix</h1>
        <p className="text-text-secondary text-sm mt-1">Track your proficiencies and identify skill gaps for target roles.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: My Skills */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="shadow-sm border-border">
            <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-1.5 rounded-md text-primary">
                  <BrainCircuit size={18} />
                </div>
                <CardTitle className="text-lg m-0">My Proficiencies</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {skills.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  No skills tracked yet. Add some to get started!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {skills.map(skill => (
                    <div key={skill._id} className="p-4 border border-border rounded-xl bg-surface">
                      <div className="flex justify-between items-center mb-3">
                        <strong className="text-text font-bold">{skill.canonicalName}</strong>
                        <Badge variant="secondary" className="text-xs">
                          {skill.proficiency}%
                        </Badge>
                      </div>
                      {/* Progress Bar */}
                      <div className="h-2 w-full bg-bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-500" 
                          style={{ width: `${skill.proficiency}%` }}
                        />
                      </div>
                      <p className="text-xs text-text-secondary mt-2 text-right">
                        Confidence: {skill.confidence}%
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Actions */}
        <div className="flex flex-col gap-6">
          
          {/* Add/Update Skill */}
          <Card className="shadow-sm border-border">
            <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6">
              <div className="flex items-center gap-3">
                <div className="bg-success-bg border border-success/20 p-1.5 rounded-md text-success">
                  <TrendingUp size={18} />
                </div>
                <CardTitle className="text-lg m-0">Log Learning</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleUpdateSkill} className="flex flex-col gap-4">
                <Input
                  label="Skill Name"
                  placeholder="e.g. React, Python"
                  value={newSkillName}
                  onChange={e => setNewSkillName(e.target.value)}
                  required
                />
                <Button type="submit" isLoading={updating} className="w-full">
                  <Plus size={16} className="mr-2" />
                  Boost Proficiency
                </Button>
                <p className="text-xs text-text-secondary text-center mt-1">
                  Adds +10 points to proficiency & confidence.
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Gap Analysis */}
          <Card className="shadow-sm border-border">
            <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6">
              <div className="flex items-center gap-3">
                <div className="bg-warning-bg border border-warning/20 p-1.5 rounded-md text-warning">
                  <Target size={18} />
                </div>
                <CardTitle className="text-lg m-0">Gap Analysis</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleCalculateGaps} className="flex flex-col gap-4 mb-6">
                <Input
                  label="Target Skills (comma separated)"
                  placeholder="e.g. Docker, AWS, GraphQL"
                  value={targetSkillsInput}
                  onChange={e => setTargetSkillsInput(e.target.value)}
                  required
                />
                <Button type="submit" variant="secondary" isLoading={analyzing} className="w-full">
                  Analyze Gaps
                </Button>
              </form>

              {gaps.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h4 className="text-sm font-bold text-text mb-1">Identified Gaps</h4>
                  {gaps.map((gap, i) => (
                    <div key={i} className="p-3 border border-border rounded-lg bg-surface text-sm">
                      <div className="flex justify-between items-center mb-2">
                        <strong className="text-danger">{gap.skillName}</strong>
                        <span className="text-xs bg-bg-secondary px-2 py-1 rounded-md font-medium text-text-secondary">
                          {gap.importance} Priority
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-text-secondary mt-1">
                        <span>Current: {gap.currentProficiency}%</span>
                        <span>Target: {gap.targetProficiency}%</span>
                      </div>
                      {/* Gap visualization */}
                      <div className="h-1.5 w-full bg-bg-secondary rounded-full overflow-hidden mt-2 flex">
                        <div className="h-full bg-success" style={{ width: `${(gap.currentProficiency / gap.targetProficiency) * 100}%` }} />
                        <div className="h-full bg-danger/20" style={{ flex: 1 }} />
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
