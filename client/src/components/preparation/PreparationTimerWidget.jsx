import React, { useEffect, useState } from "react";
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
  const [serverState, setServerState] = useState(null);

  useEffect(() => {
    if (activeTask && (!serverState || !serverState.startedAt)) {
      setSkillName(activeTask.skill || "General Practice");
      setTaskTitle(activeTask.title || "Preparation Study Session");
      setTargetMinutes(activeTask.estimatedTimeMinutes || 25);
    }
  }, [activeTask, serverState]);

  useEffect(() => {
    loadSavedTimer();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") loadSavedTimer();
    };
    window.addEventListener("visibilitychange", handleVisibilityChange);
    return () => window.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  async function loadSavedTimer() {
    try {
      const res = await preparationApi.getTimer();
      const data = res.data || res;
      setServerState(data);
      if (data && data.durationSeconds) {
        setTargetMinutes(Math.floor(data.durationSeconds / 60));
      }
      if (data && data.skillName) setSkillName(data.skillName);
      if (data && data.taskTitle) setTaskTitle(data.taskTitle);
    } catch (err) {
      console.error("Failed to load timer", err);
    }
  }

  useEffect(() => {
    let intervalId;
    const tick = () => {
      if (!serverState) {
        setElapsedSeconds(0);
        return;
      }
      if (serverState.status === "active" && serverState.startedAt) {
        const now = Date.now();
        const start = new Date(serverState.startedAt).getTime();
        const elapsed = Math.floor((now - start) / 1000) - (serverState.accumulatedPausedSeconds || 0);
        setElapsedSeconds(Math.max(0, elapsed));
      } else if (serverState.startedAt) {
        const end = serverState.pausedAt ? new Date(serverState.pausedAt).getTime() : 
                    serverState.completedAt ? new Date(serverState.completedAt).getTime() : Date.now();
        const start = new Date(serverState.startedAt).getTime();
        let staticElapsed = Math.floor((end - start) / 1000) - (serverState.accumulatedPausedSeconds || 0);
        
        if (serverState.status === "completed") {
           staticElapsed = serverState.durationSeconds;
        }
        
        setElapsedSeconds(Math.max(0, staticElapsed));
      } else {
        setElapsedSeconds(0);
      }
    };

    tick();
    intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [serverState]);

  const handlePlayPause = async () => {
    try {
      if (!serverState || serverState.status === "paused" || serverState.status === "cancelled") {
        if (!serverState?.startedAt) {
          const res = await preparationApi.startTimer({
            skillName,
            taskTitle,
            durationSeconds: targetMinutes * 60
          });
          setServerState(res.data || res);
        } else {
          const res = await preparationApi.resumeTimer();
          setServerState(res.data || res);
        }
      } else if (serverState.status === "active") {
        const res = await preparationApi.pauseTimer();
        setServerState(res.data || res);
      }
    } catch (err) {
      toast.error("Failed to update timer");
    }
  };

  const handleReset = async () => {
    try {
      const res = await preparationApi.resetTimer();
      setServerState(res.data || res);
      setElapsedSeconds(0);
    } catch (err) {
      toast.error("Failed to reset timer");
    }
  };

  const handleAddMinutes = async (mins) => {
    try {
      setTargetMinutes(prev => prev + mins);
      if (serverState && serverState.startedAt) {
        const res = await preparationApi.addTimerMinutes({ minutes: mins });
        setServerState(res.data || res);
      }
    } catch (err) {
      toast.error("Failed to add time");
    }
  };

  const handleComplete = async () => {
    try {
      const res = await preparationApi.completeTimer();
      setServerState(res.data || res);
      toast.success("Study session completed! Great focus effort.");
      if (onTaskCompleted) onTaskCompleted();
    } catch (err) {
      toast.error("Failed to complete timer");
    }
  };

  const totalTargetSeconds = Math.max(targetMinutes * 60, 60);
  const remainingSeconds = Math.max(totalTargetSeconds - elapsedSeconds, 0);
  const progressPercent = Math.min(Math.round((elapsedSeconds / totalTargetSeconds) * 100), 100);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const status = serverState?.status || "paused";
  const hasStarted = Boolean(serverState?.startedAt);
  const isActive = status === "active";
  const isPaused = status === "paused" && hasStarted;
  const isIdle = status === "paused" && !hasStarted;
  const isCompleted = status === "completed";

  return (
    <div className="bg-surface border border-border rounded-xl p-4 space-y-3 shadow-2xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-primary" />
          <h3 className="text-xs font-bold text-text m-0">Study Focus Timer</h3>
        </div>
        <Badge variant={isActive ? "success" : isCompleted ? "primary" : "secondary"} size="xs">
          {isActive ? "Active Focus" : isPaused ? "Paused" : isCompleted ? "Completed" : "Idle"}
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
        <Button size="xs" variant="outline" onClick={() => handleAddMinutes(5)} title="Add 5 Minutes" disabled={isCompleted}>
          <Plus size={12} /> 5m
        </Button>

        <Button
          size="xs"
          variant={isActive ? "warning" : "primary"}
          onClick={handlePlayPause}
          className="px-4 font-bold"
          disabled={isCompleted}
        >
          {isActive ? <Pause size={14} className="mr-1" /> : <Play size={14} className="mr-1" />}
          {isActive ? "Pause" : "Start"}
        </Button>

        <Button size="xs" variant="secondary" onClick={handleReset} title="Reset Timer">
          <RotateCcw size={12} />
        </Button>

        <Button size="xs" variant="success" onClick={handleComplete} title="Mark Done" disabled={isCompleted || isIdle}>
          <CheckCircle size={12} />
        </Button>
      </div>
    </div>
  );
}
