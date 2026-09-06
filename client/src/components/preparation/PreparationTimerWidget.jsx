import React, { useEffect, useState, useRef } from "react";
import { Play, Pause, RotateCcw, CheckCircle, Clock, Plus, Zap } from "lucide-react";
import { preparationApi } from "../../api/career";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { toast } from "../../context/ToastContext";

export function PreparationTimerWidget({ activeTask, onTaskCompleted }) {
  const [skillName, setSkillName] = useState(activeTask?.skill || "General Practice");
  const [taskTitle, setTaskTitle] = useState(activeTask?.title || "Preparation Study Session");
  const [targetMinutes, setTargetMinutes] = useState(activeTask?.estimatedTimeMinutes || 25);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(true);

  const timerRef = useRef(null);

  useEffect(() => {
    if (activeTask) {
      setSkillName(activeTask.skill || "General Practice");
      setTaskTitle(activeTask.title || "Preparation Study Session");
      setTargetMinutes(activeTask.estimatedTimeMinutes || 25);
    }
  }, [activeTask]);

  useEffect(() => {
    // Initial fetch from backend / localStorage fallback
    loadSavedTimer();
  }, []);

  async function loadSavedTimer() {
    try {
      const res = await preparationApi.getTimer();
      const data = res.data || res;
      if (data && typeof data.elapsedSeconds === "number") {
        setElapsedSeconds(data.elapsedSeconds || 0);
        setIsRunning(Boolean(data.isRunning));
        setIsPaused(Boolean(data.isPaused));
        if (data.targetMinutes) setTargetMinutes(data.targetMinutes);
        if (data.skillName) setSkillName(data.skillName);
        if (data.taskTitle) setTaskTitle(data.taskTitle);
      }
    } catch (err) {
      // LocalStorage fallback
      const saved = localStorage.getItem("cp_prep_timer");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setElapsedSeconds(parsed.elapsedSeconds || 0);
          setIsPaused(parsed.isPaused ?? true);
          setIsRunning(parsed.isRunning ?? false);
        } catch (_) {}
      }
    }
  }

  useEffect(() => {
    if (isRunning && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          // Sync to localStorage immediately
          localStorage.setItem(
            "cp_prep_timer",
            JSON.stringify({ elapsedSeconds: next, isPaused: false, isRunning: true })
          );
          return next;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isRunning, isPaused]);

  // Periodic backend sync every 10 seconds
  useEffect(() => {
    if (!isRunning) return;
    const syncInterval = setInterval(() => {
      syncBackendTimer(elapsedSeconds, isPaused, isRunning);
    }, 10000);

    return () => clearInterval(syncInterval);
  }, [elapsedSeconds, isPaused, isRunning]);

  async function syncBackendTimer(seconds, paused, running) {
    try {
      await preparationApi.syncTimer({
        skillName,
        taskTitle,
        targetMinutes,
        elapsedSeconds: seconds,
        isPaused: paused,
        isRunning: running
      });
    } catch (_) {}
  }

  const handlePlayPause = () => {
    if (!isRunning) {
      setIsRunning(true);
      setIsPaused(false);
      syncBackendTimer(elapsedSeconds, false, true);
    } else {
      const nextPaused = !isPaused;
      setIsPaused(nextPaused);
      syncBackendTimer(elapsedSeconds, nextPaused, isRunning);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsPaused(true);
    setElapsedSeconds(0);
    localStorage.removeItem("cp_prep_timer");
    syncBackendTimer(0, true, false);
  };

  const handleAddMinutes = (mins) => {
    setTargetMinutes((prev) => prev + mins);
  };

  const handleComplete = async () => {
    setIsRunning(false);
    setIsPaused(true);
    setElapsedSeconds(0);
    localStorage.removeItem("cp_prep_timer");
    await syncBackendTimer(0, true, false);
    toast.success("Study session completed! Great focus effort.");
    if (onTaskCompleted) onTaskCompleted();
  };

  const totalTargetSeconds = Math.max(targetMinutes * 60, 60);
  const remainingSeconds = Math.max(totalTargetSeconds - elapsedSeconds, 0);
  const progressPercent = Math.min(Math.round((elapsedSeconds / totalTargetSeconds) * 100), 100);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-4 space-y-3 shadow-2xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-primary" />
          <h3 className="text-xs font-bold text-text m-0">Study Focus Timer</h3>
        </div>
        <Badge variant={isRunning && !isPaused ? "success" : "secondary"} size="xs">
          {isRunning && !isPaused ? "Active Focus" : isPaused ? "Paused" : "Idle"}
        </Badge>
      </div>

      <div className="text-center py-2">
        <div className="text-3xl font-extrabold font-mono tracking-wider text-text">
          {formatTime(remainingSeconds)}
        </div>
        <p className="text-[10px] text-text-muted mt-1 font-medium truncate max-w-full px-2">
          {taskTitle}
        </p>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-bg-secondary rounded-full overflow-hidden mt-3">
          <div
            className="h-full bg-primary transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <Button size="xs" variant="outline" onClick={() => handleAddMinutes(5)} title="Add 5 Minutes">
          <Plus size={12} /> 5m
        </Button>

        <Button
          size="xs"
          variant={isRunning && !isPaused ? "warning" : "primary"}
          onClick={handlePlayPause}
          className="px-4 font-bold"
        >
          {isRunning && !isPaused ? <Pause size={14} className="mr-1" /> : <Play size={14} className="mr-1" />}
          {isRunning && !isPaused ? "Pause" : "Start"}
        </Button>

        <Button size="xs" variant="secondary" onClick={handleReset} title="Reset Timer">
          <RotateCcw size={12} />
        </Button>

        <Button size="xs" variant="success" onClick={handleComplete} title="Mark Done">
          <CheckCircle size={12} />
        </Button>
      </div>
    </div>
  );
}
