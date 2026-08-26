import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createPeerInterviewRoom,
  joinPeerInterviewRoom,
} from "../api/peerInterview";
import { Video, Users, ArrowRight, Plus, KeyRound, Loader2, AlertCircle } from "lucide-react";

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
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center pt-20 px-4 font-sans relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-2xl relative z-10">
        <div className="text-center mb-12">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/5 mb-6 shadow-[0_0_30px_rgba(59,130,246,0.15)] transform transition-transform hover:scale-105 duration-300">
            <Users className="h-10 w-10 text-blue-400" />
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-gray-400 mb-4 drop-shadow-sm">
            Peer Interview
          </h1>
          <p className="text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">
            Practice mock interviews with another person in a real-time, interactive coding environment with high quality audio and video.
          </p>
        </div>

        <div className="bg-[#111111]/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(59,130,246,0.1)]">
          <div className="flex border-b border-white/10 bg-black/20">
            <button
              onClick={() => {
                setMode("create");
                setError("");
              }}
              className={`flex-1 py-5 px-6 text-sm font-medium transition-all duration-300 relative overflow-hidden ${
                mode === "create" 
                  ? "text-blue-400 bg-blue-500/5" 
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center justify-center gap-2 relative z-10">
                <Plus className={`h-4 w-4 transition-transform duration-300 ${mode === "create" ? "scale-110" : ""}`} />
                Create New Room
              </div>
              {mode === "create" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-cyan-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]" />
              )}
            </button>
            <button
              onClick={() => {
                setMode("join");
                setError("");
              }}
              className={`flex-1 py-5 px-6 text-sm font-medium transition-all duration-300 relative overflow-hidden ${
                mode === "join" 
                  ? "text-blue-400 bg-blue-500/5" 
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center justify-center gap-2 relative z-10">
                <KeyRound className={`h-4 w-4 transition-transform duration-300 ${mode === "join" ? "scale-110" : ""}`} />
                Join Existing
              </div>
              {mode === "join" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-cyan-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]" />
              )}
            </button>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-500/10 p-4 border border-red-500/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)] animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {mode === "create" ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Host an AI-Assisted Interview</h2>
                  <p className="text-gray-400 text-sm">
                    Configure the interview parameters. An AI plan will be generated to assist you.
                  </p>
                </div>
                
                <div className="space-y-5">
                  <div className="group">
                    <label className="block text-sm font-medium text-gray-300 mb-1.5 transition-colors group-focus-within:text-blue-400">Target Role</label>
                    <input
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      className="block w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-300 hover:border-white/20"
                    />
                  </div>
                  <div className="group">
                    <label className="block text-sm font-medium text-gray-300 mb-1.5 transition-colors group-focus-within:text-blue-400">Technology Stack</label>
                    <input
                      type="text"
                      value={technologyStack}
                      onChange={(e) => setTechnologyStack(e.target.value)}
                      placeholder="e.g. React, Node.js, Python"
                      className="block w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-300 hover:border-white/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="group">
                      <label className="block text-sm font-medium text-gray-300 mb-1.5 transition-colors group-focus-within:text-blue-400">Interview Type</label>
                      <select
                        value={interviewType}
                        onChange={(e) => setInterviewType(e.target.value)}
                        className="block w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-300 hover:border-white/20 appearance-none cursor-pointer"
                      >
                        <option value="mixed">Mixed</option>
                        <option value="technical">Technical Focus</option>
                        <option value="hr">Behavioral/HR</option>
                        <option value="project">Project Deep Dive</option>
                      </select>
                    </div>
                    <div className="group">
                      <label className="block text-sm font-medium text-gray-300 mb-1.5 transition-colors group-focus-within:text-blue-400">Difficulty</label>
                      <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className="block w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-300 hover:border-white/20 appearance-none cursor-pointer"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>
                  <div className="group">
                    <label className="block text-sm font-medium text-gray-300 mb-1.5 transition-colors group-focus-within:text-blue-400">Duration (minutes)</label>
                    <input
                      type="number"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="block w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-300 hover:border-white/20"
                    />
                  </div>
                </div>

                <div className="bg-blue-500/5 rounded-2xl p-4 border border-blue-500/10 flex items-center gap-4 mt-2">
                  <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <Video className="h-5 w-5 text-blue-400 animate-pulse" />
                  </div>
                  <div className="text-sm text-blue-200/70">
                    Camera and microphone permissions will be requested on the next screen.
                  </div>
                </div>

                <button
                  disabled={loading}
                  onClick={handleCreateRoom}
                  className="w-full relative group overflow-hidden flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-4 px-4 text-sm font-bold text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#111111] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                  <div className="relative flex items-center gap-2">
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Creating Workspace...
                      </>
                    ) : (
                      <>
                        Start Interview Workspace
                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </div>
                </button>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Join an Interview</h2>
                  <p className="text-gray-400 text-sm">
                    Enter the room ID provided by your host to join the session.
                  </p>
                </div>

                <div className="group">
                  <label htmlFor="roomId" className="block text-sm font-medium text-gray-300 mb-1.5 transition-colors group-focus-within:text-blue-400">
                    Room ID
                  </label>
                  <input
                    id="roomId"
                    type="text"
                    value={roomId}
                    onChange={(event) => setRoomId(event.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                    placeholder="e.g. 64a7c9f..."
                    className="block w-full rounded-xl border border-white/10 bg-black/50 px-4 py-4 text-lg tracking-wider text-white placeholder-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-300 hover:border-white/20"
                  />
                </div>

                <button
                  disabled={loading || !roomId.trim()}
                  onClick={handleJoinRoom}
                  className="w-full relative group overflow-hidden flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-4 px-4 text-sm font-bold text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#111111] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                  <div className="relative flex items-center gap-2">
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        Join Interview Room
                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
