import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createPeerInterviewRoom,
  joinPeerInterviewRoom,
} from "../api/peerInterview";

export default function PeerInterviewSetupPage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("create");

  const [roomId, setRoomId] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  async function handleCreateRoom() {
    try {
      setLoading(true);
      setError("");

      const data = await createPeerInterviewRoom();

      const newRoomId =
        data?.roomId || data?.room?.roomId || data?.data?.roomId;

      if (!newRoomId) {
        throw new Error("Room created but room ID was not returned");
      }

      navigate(`/peer-interview/${newRoomId}`);
    } catch (err) {
      console.error("Create peer interview failed:", err);

      setError(
        err?.response?.data?.message ||
          err.message ||
          "Unable to create interview room",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinRoom() {
    const trimmedRoomId = roomId.trim();

    if (!trimmedRoomId) {
      setError("Please enter a room ID");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await joinPeerInterviewRoom(trimmedRoomId);

      const joinedRoomId =
        data?.roomId ||
        data?.room?.roomId ||
        data?.data?.roomId ||
        trimmedRoomId;

      navigate(`/peer-interview/${joinedRoomId}`);
    } catch (err) {
      console.error("Join peer interview failed:", err);

      setError(err?.response?.data?.message || "Unable to join interview room");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-xl">
        <h1 className="text-3xl font-bold">Peer Interview</h1>

        <p className="mt-2 text-gray-500">
          Practice with another interviewer in a real-time video interview.
        </p>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={() => {
              setMode("create");
              setError("");
            }}
            className={
              mode === "create"
                ? "rounded-lg bg-black px-4 py-2 text-white"
                : "rounded-lg border px-4 py-2"
            }
          >
            Create Interview
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("join");
              setError("");
            }}
            className={
              mode === "join"
                ? "rounded-lg bg-black px-4 py-2 text-white"
                : "rounded-lg border px-4 py-2"
            }
          >
            Join Interview
          </button>
        </div>

        {mode === "create" && (
          <div className="mt-8 rounded-xl border p-6">
            <h2 className="text-xl font-semibold">Create a peer interview</h2>

            <p className="mt-2 text-gray-500">
              Create a room and invite another CareerPilot user.
            </p>

            <button
              type="button"
              disabled={loading}
              onClick={handleCreateRoom}
              className="mt-6 rounded-lg bg-blue-600 px-5 py-3 text-white disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Interview Room"}
            </button>
          </div>
        )}

        {mode === "join" && (
          <div className="mt-8 rounded-xl border p-6">
            <h2 className="text-xl font-semibold">Join a peer interview</h2>

            <input
              value={roomId}
              onChange={(event) => setRoomId(event.target.value)}
              placeholder="Enter room ID"
              className="mt-5 w-full rounded-lg border px-4 py-3"
            />

            <button
              type="button"
              disabled={loading}
              onClick={handleJoinRoom}
              className="mt-4 rounded-lg bg-blue-600 px-5 py-3 text-white disabled:opacity-50"
            >
              {loading ? "Joining..." : "Join Interview"}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
