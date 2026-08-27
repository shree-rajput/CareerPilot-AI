import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createPeerInterviewRoom,
  joinPeerInterviewRoom,
} from "../api/peerInterview";
import { Video, Users, ArrowRight, Plus, KeyRound, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent } from "../components/ui/Card";

export default function PeerInterviewSetupPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("create");
  const [roomId, setRoomId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Setup form state
  const [targetRole, setTargetRole] = useState("Software Engineer");
  const [technologyStack, setTechnologyStack] = useState("JavaScript, React, Node.js");
  const [interviewType, setInterviewType] = useState("mixed");
  const [difficulty, setDifficulty] = useState("medium");
  const [durationMinutes, setDurationMinutes] = useState(45);

  async function handleCreateRoom() {
    try {
      setLoading(true);
      setError("");

      const params = {
        targetRole,
        technologyStack: technologyStack.split(",").map((s) => s.trim()).filter(Boolean),
        interviewType,
        difficulty,
        durationMinutes
      };

      const data = await createPeerInterviewRoom(params);
      const newRoomId = data?.roomId || data?.room?.roomId || data?.data?.roomId;

      if (!newRoomId) {
        throw new Error("Room created but room ID was not returned");
      }

      navigate(`/peer-interview/${newRoomId}`);
    } catch (err) {
      console.error("Create peer interview failed:", err);
      setError(
        err?.response?.data?.message || err.message || "Unable to create interview room",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinRoom() {
    const trimmedRoomId = roomId.trim();

    if (!trimmedRoomId) {
      setError("Please enter a valid room ID");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await joinPeerInterviewRoom(trimmedRoomId);
      const joinedRoomId = data?.roomId || data?.room?.roomId || data?.data?.roomId || trimmedRoomId;

      navigate(`/peer-interview/${joinedRoomId}`);
    } catch (err) {
      console.error("Join peer interview failed:", err);
      setError(err?.response?.data?.message || "Unable to join interview room");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col items-center pt-16 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-info-bg border border-blue-100 mb-6 shadow-sm">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-text mb-4">
            Peer Interview
          </h1>
          <p className="text-lg text-text-secondary max-w-xl mx-auto leading-relaxed">
            Practice mock interviews with another person in a real-time, interactive coding environment with high quality audio and video.
          </p>
        </div>

        <Card className="shadow-lg border-border">
          <div className="flex border-b border-border bg-bg-secondary">
            <button
              onClick={() => {
                setMode("create");
                setError("");
              }}
              className={`flex-1 py-4 px-6 text-sm font-semibold transition-all relative ${
                mode === "create" 
                  ? "text-primary bg-white" 
                  : "text-text-secondary hover:text-text hover:bg-white/50"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" />
                Create New Room
              </div>
              {mode === "create" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => {
                setMode("join");
                setError("");
              }}
              className={`flex-1 py-4 px-6 text-sm font-semibold transition-all relative ${
                mode === "join" 
                  ? "text-primary bg-white" 
                  : "text-text-secondary hover:text-text hover:bg-white/50"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <KeyRound className="h-4 w-4" />
                Join Existing
              </div>
              {mode === "join" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>

          <CardContent className="p-6 sm:p-8">
            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-lg bg-danger-bg p-4 border border-danger/20 text-danger">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            {mode === "create" ? (
              <div className="space-y-6 fade-in">
                <div>
                  <h2 className="text-xl font-bold text-text mb-1">Host an AI-Assisted Interview</h2>
                  <p className="text-text-secondary text-sm">
                    Configure the interview parameters. An AI plan will be generated to assist you.
                  </p>
                </div>
                
                <div className="space-y-5">
                  <Input
                    label="Target Role"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                  />
                  
                  <Input
                    label="Technology Stack"
                    placeholder="e.g. React, Node.js, Python"
                    value={technologyStack}
                    onChange={(e) => setTechnologyStack(e.target.value)}
                  />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Interview Type</label>
                      <select
                        value={interviewType}
                        onChange={(e) => setInterviewType(e.target.value)}
                        className="w-full bg-white border border-border rounded-lg min-h-[44px] px-3 py-2 text-text focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none transition-shadow appearance-none"
                      >
                        <option value="mixed">Mixed</option>
                        <option value="technical">Technical Focus</option>
                        <option value="hr">Behavioral/HR</option>
                        <option value="project">Project Deep Dive</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Difficulty</label>
                      <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className="w-full bg-white border border-border rounded-lg min-h-[44px] px-3 py-2 text-text focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none transition-shadow appearance-none"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>
                  
                  <Input
                    type="number"
                    label="Duration (minutes)"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  />
                </div>

                <div className="bg-info-bg rounded-xl p-4 border border-blue-200 flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                    <Video className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-sm text-blue-900 mt-1.5 font-medium">
                    Camera and microphone permissions will be requested on the next screen.
                  </div>
                </div>

                <Button
                  className="w-full h-12 text-base"
                  onClick={handleCreateRoom}
                  isLoading={loading}
                >
                  Start Interview Workspace
                  {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
                </Button>
              </div>
            ) : (
              <div className="space-y-6 fade-in">
                <div>
                  <h2 className="text-xl font-bold text-text mb-1">Join an Interview</h2>
                  <p className="text-text-secondary text-sm">
                    Enter the room ID provided by your host to join the session.
                  </p>
                </div>

                <Input
                  label="Room ID"
                  placeholder="e.g. 64a7c9f..."
                  value={roomId}
                  onChange={(event) => setRoomId(event.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                  className="text-lg tracking-wider font-mono"
                />

                <Button
                  className="w-full h-12 text-base"
                  onClick={handleJoinRoom}
                  isLoading={loading}
                  disabled={!roomId.trim()}
                >
                  Join Interview Room
                  {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
