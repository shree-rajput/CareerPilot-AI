import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";
import api from "../../api/axios";
import { Check, X, ShieldAlert } from "lucide-react";

export function ProfileConfirmationModal({ isOpen, onClose, structuredData, onConfirmSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Extract skills and roles from structuredData
  const [skills, setSkills] = useState(structuredData?.skills || []);
  const [targetRoles, setTargetRoles] = useState(structuredData?.targetRoles || []);

  const handleRemoveSkill = (index) => {
    setSkills(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError("");
      
      await api.post("/profile/confirm-extracted", {
        skills,
        targetRoles
      });
      
      if (onConfirmSuccess) onConfirmSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to confirm profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-bg rounded-xl border border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <ShieldAlert className="text-primary" />
            AI Extracted Profile
          </DialogTitle>
          <p className="text-sm text-text-secondary">
            We extracted the following career details from your resume. Review and confirm to update your CareerCopilot profile.
          </p>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
          {error && <div className="text-danger text-sm">{error}</div>}
          
          <div>
            <h4 className="text-sm font-bold text-text mb-2">Target Roles</h4>
            {targetRoles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {targetRoles.map((role, idx) => (
                  <span key={idx} className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-xs font-bold">
                    {role}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-secondary italic">No target roles identified.</p>
            )}
          </div>

          <div>
            <h4 className="text-sm font-bold text-text mb-2">Technical Skills</h4>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, idx) => (
                  <div key={idx} className="bg-surface border border-border pl-3 pr-1 py-1 rounded-full flex items-center gap-2 text-xs font-bold text-text">
                    {skill.name || skill}
                    <button 
                      onClick={() => handleRemoveSkill(idx)}
                      className="text-text-secondary hover:text-danger hover:bg-danger-bg rounded-full p-1 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-secondary italic">No technical skills extracted.</p>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-4 px-4 pb-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={loading} className="flex items-center gap-2">
            {loading ? <Spinner size="sm" /> : <Check size={16} />}
            Confirm & Sync to Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
