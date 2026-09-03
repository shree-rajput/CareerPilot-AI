import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GitBranch, CornerDownRight, Clock, FileText, CheckCircle2 } from "lucide-react";
import { http } from "../../api/http";
import { Spinner } from "../ui/Spinner";

export function VersionTreeVisualizer({ currentResumeId }) {
  const navigate = useNavigate();
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVersionTree();
  }, [currentResumeId]);

  const fetchVersionTree = async () => {
    try {
      setLoading(true);
      const { data } = await http.get(`/resume/${currentResumeId}/version-tree`);
      setTreeData(data);
    } catch (err) {
      console.error("Failed to load version tree:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <Spinner size="sm" className="mx-auto text-primary" />
        <span className="text-xs text-text-secondary mt-2 block">Loading version tree lineage...</span>
      </div>
    );
  }

  if (!treeData || !treeData.tree) {
    return <div className="p-4 text-xs text-text-secondary">No version tree found.</div>;
  }

  const renderNode = (node, depth = 0) => {
    const isCurrent = node._id === currentResumeId;

    const sourceBadges = {
      upload: { label: "Upload", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
      tailor: { label: "Tailored", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
      restore: { label: "Restored", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
      draft: { label: "Draft", color: "bg-gray-500/10 text-gray-500 border-gray-500/20" },
    };

    const badge = sourceBadges[node.createdFrom] || sourceBadges.draft;

    return (
      <div key={node._id} className="flex flex-col gap-2 relative">
        <div
          onClick={() => !isCurrent && navigate(`/resume/studio/${node._id}`)}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
            isCurrent
              ? "bg-primary/10 border-primary ring-1 ring-primary shadow-sm"
              : "bg-surface border-border hover:border-primary/40 hover:bg-bg-secondary"
          }`}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          <div className="flex items-center gap-3">
            {depth > 0 && <CornerDownRight size={14} className="text-text-secondary shrink-0" />}
            <FileText size={16} className={isCurrent ? "text-primary" : "text-text-secondary"} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-text">{node.name}</span>
                <span className="text-[10px] font-extrabold text-text-secondary px-1.5 py-0.5 rounded bg-bg-secondary border border-border">
                  v{node.version}
                </span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${badge.color}`}>
                  {badge.label}
                </span>
                {isCurrent && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-success/15 text-success flex items-center gap-1">
                    <CheckCircle2 size={10} /> Active
                  </span>
                )}
              </div>
              <div className="text-[10px] text-text-secondary mt-0.5 flex items-center gap-1">
                <Clock size={10} /> {new Date(node.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {!isCurrent && (
            <button className="text-[11px] font-bold text-primary hover:underline bg-transparent border-0 cursor-pointer">
              Switch →
            </button>
          )}
        </div>

        {node.children && node.children.length > 0 && (
          <div className="space-y-2">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-6 shadow-lg max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <GitBranch size={18} className="text-primary" />
        <div>
          <h3 className="text-sm font-black text-text uppercase tracking-wider m-0">
            Tree-Based Version Lineage
          </h3>
          <p className="text-[11px] text-text-secondary m-0 mt-0.5">
            Every tailored resume creates a distinct child version node without overwriting parent history.
          </p>
        </div>
      </div>

      <div className="space-y-2">{renderNode(treeData.tree)}</div>
    </div>
  );
}
