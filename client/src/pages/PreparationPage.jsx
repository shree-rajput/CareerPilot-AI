import React, { useEffect, useState } from "react";
import { BookOpen, Sparkles, CheckCircle2, Circle, Clock, Target, Archive } from "lucide-react";
import { preparationApi } from "../api/career";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
import { Badge } from "../components/ui/Badge";

export function PreparationPage() {
  const [activePlan, setActivePlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ targetRole: "", generatedFor: "General" });

  useEffect(() => {
    loadActivePlan();
  }, []);

  async function loadActivePlan() {
    setLoading(true);
    try {
      const res = await preparationApi.getActivePlan();
      setActivePlan(res.data || res || null);
    } catch (err) {
      if (err.response?.status === 404) {
        setActivePlan(null); // No active plan is fine
      } else {
        console.error("Failed to load active plan", err);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate(e) {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await preparationApi.generateDailyPlan(form);
      setActivePlan(res.data || res);
    } catch (err) {
      alert("Failed to generate plan.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleArchive() {
    if (!window.confirm("Archive this plan? You will be able to generate a new one.")) return;
    try {
      await preparationApi.archivePlan(activePlan._id);
      setActivePlan(null);
    } catch (err) {
      alert("Failed to archive plan.");
    }
  }

  async function toggleStatus(itemId, currentStatus) {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    try {
      // Optimistic update
      setActivePlan(prev => {
        const newItems = prev.actionItems.map(item => 
          item._id === itemId ? { ...item, status: newStatus } : item
        );
        return { ...prev, actionItems: newItems };
      });
      await preparationApi.updateActionItemStatus(activePlan._id, itemId, newStatus);
    } catch (err) {
      alert("Failed to update status.");
      loadActivePlan(); // revert
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-text tracking-tight">Daily Preparation</h1>
          <p className="text-text-secondary text-sm mt-1">Get AI-driven daily action items based on your skill gaps.</p>
        </div>
        {activePlan && (
          <Button variant="outline" onClick={handleArchive}>
            <Archive size={16} className="mr-2" /> Archive Plan
          </Button>
        )}
      </div>

      {!activePlan ? (
        <Card className="border-primary/20 bg-primary/5 mt-8 max-w-2xl mx-auto w-full">
          <CardContent className="p-8 flex flex-col items-center text-center">
            <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
              <Sparkles size={32} />
            </div>
            <h2 className="text-2xl font-bold text-text mb-2">Create Your Daily Plan</h2>
            <p className="text-text-secondary mb-8">
              Tell us what you're targeting and our AI will look at your skills, jobs, and projects to generate a personalized checklist for today.
            </p>
            
            <form onSubmit={handleGenerate} className="w-full flex flex-col gap-5 text-left">
              <Input 
                label="Target Role" 
                required 
                placeholder="e.g. Senior Frontend Engineer"
                value={form.targetRole} 
                onChange={e => setForm({ ...form, targetRole: e.target.value })} 
              />
              
              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-gray-700">Focus Area</label>
                <select 
                  value={form.generatedFor} 
                  onChange={e => setForm({ ...form, generatedFor: e.target.value })}
                  className="bg-bg-secondary border border-border rounded-lg p-2.5 text-text focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all text-sm"
                >
                  <option value="General">General Skill Building</option>
                  <option value="Interview">Upcoming Interview</option>
                  <option value="OA">Online Assessment (OA)</option>
                </select>
              </div>
              
              <Button type="submit" disabled={generating} className="w-full mt-2" size="lg">
                {generating ? (
                  <><Spinner size="sm" className="mr-2" /> Generating AI Plan...</>
                ) : (
                  <><Sparkles size={18} className="mr-2" /> Generate Plan</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="primary">{activePlan.generatedFor}</Badge>
            <span className="text-sm font-bold text-text-secondary">
              Target: <span className="text-text">{activePlan.targetRole}</span>
            </span>
            <span className="text-sm font-medium text-text-secondary ml-auto">
              {activePlan.actionItems.filter(i => i.status === 'completed').length} / {activePlan.actionItems.length} completed
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {activePlan.actionItems.map(item => (
              <Card 
                key={item._id} 
                className={`transition-all duration-200 ${item.status === 'completed' ? 'opacity-60 bg-bg-secondary' : 'bg-surface hover:shadow-md border-border'}`}
              >
                <CardContent className="p-5 flex items-start gap-4">
                  <button 
                    onClick={() => toggleStatus(item._id, item.status)}
                    className="mt-1 flex-shrink-0 text-text-secondary hover:text-primary transition-colors focus:outline-none"
                  >
                    {item.status === 'completed' ? (
                      <CheckCircle2 size={24} className="text-success" />
                    ) : (
                      <Circle size={24} />
                    )}
                  </button>
                  
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <h3 className={`font-bold text-lg ${item.status === 'completed' ? 'text-text-secondary line-through' : 'text-text'}`}>
                        {item.title}
                      </h3>
                      <div className="flex gap-2 shrink-0">
                        <Badge variant={item.priority === 'HIGH' ? 'danger' : item.priority === 'MEDIUM' ? 'warning' : 'secondary'}>
                          {item.priority}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock size={10} /> {item.estimatedTimeMinutes}m
                        </Badge>
                      </div>
                    </div>
                    <p className={`text-sm ${item.status === 'completed' ? 'text-text-secondary/70' : 'text-text-secondary'}`}>
                      {item.reason}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
