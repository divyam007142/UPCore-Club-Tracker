import React, { useState } from "react";
import {
  useGetTrackedClubs,
  useAddTrackedClub,
  useRemoveTrackedClub,
  useToggleClubLogging,
} from "../api";
import { getGetTrackedClubsQueryKey } from "../api";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Plus, Trash2, ToggleLeft, ToggleRight, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

let toastId = 0;

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = (message: string, type: Toast["type"] = "success") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const remove = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return { toasts, add, remove };
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.22 }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border shadow-xl font-mono text-sm max-w-xs
              ${t.type === "success" ? "bg-emerald-950 border-emerald-500/40 text-emerald-300" : ""}
              ${t.type === "error" ? "bg-red-950 border-red-500/40 text-red-300" : ""}
              ${t.type === "info" ? "bg-sky-950 border-sky-500/40 text-sky-300" : ""}
            `}
          >
            {t.type === "success" && <CheckCircle className="w-4 h-4 shrink-0" />}
            {t.type === "error" && <XCircle className="w-4 h-4 shrink-0" />}
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => onRemove(t.id)}
              className="opacity-60 hover:opacity-100 transition-opacity ml-1"
            >
              ×
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: clubs, isLoading } = useGetTrackedClubs();
  const addClub = useAddTrackedClub();
  const removeClub = useRemoveTrackedClub();
  const toggleLogging = useToggleClubLogging();
  const { toasts, add: addToast, remove: removeToast } = useToasts();

  const [newTag, setNewTag] = useState("");
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState("");
  const [tagError, setTagError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loadingToggle, setLoadingToggle] = useState<string | null>(null);

  const TAG_REGEX = /^#[0-9A-Z]{4,12}$/;

  const validateTag = (raw: string): string | null => {
    const t = raw.trim().toUpperCase();
    if (!t) return "Club tag is required.";
    if (!t.startsWith("#")) return "Club tag must start with # (e.g. #2VR8RJL8U).";
    if (t.length < 5) return "Club tag is too short — must have at least 4 characters after #.";
    if (!TAG_REGEX.test(t)) return "Club tag may only contain letters and numbers after # (e.g. #2VR8RJL8U).";
    return null;
  };

  const handleTagChange = (value: string) => {
    const upper = value.toUpperCase();
    setNewTag(upper);
    if (tagError) setTagError(validateTag(upper) ?? "");
  };

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetTrackedClubsQueryKey() });

  const handleAdd = async () => {
    const tagValidation = validateTag(newTag);
    if (tagValidation) {
      setTagError(tagValidation);
      return;
    }
    if (!newName.trim()) {
      setAddError("Club name is required.");
      return;
    }
    setTagError("");
    setAddError("");
    try {
      await addClub.mutateAsync({ data: { tag: newTag.trim().toUpperCase(), name: newName.trim() } });
      const name = newName.trim();
      setNewTag("");
      setNewName("");
      await invalidate();
      addToast(`"${name}" added to tracked clubs.`, "success");
    } catch (e: unknown) {
      const msg = (e as { data?: { error?: string } })?.data?.error ?? "Failed to add club.";
      setAddError(msg);
      addToast(msg, "error");
    }
  };

  const handleRemove = async (tag: string, name: string) => {
    try {
      await removeClub.mutateAsync({ tag });
      setConfirmDelete(null);
      await invalidate();
      addToast(`"${name}" removed from tracking.`, "info");
    } catch {
      addToast("Failed to remove club.", "error");
    }
  };

  const handleToggle = async (tag: string, name: string, current: boolean) => {
    setLoadingToggle(tag);
    try {
      await toggleLogging.mutateAsync({ tag, data: { loggingEnabled: !current } });
      await invalidate();
      addToast(
        !current
          ? `Logging enabled for "${name}".`
          : `Logging disabled for "${name}".`,
        "success"
      );
    } catch {
      addToast("Failed to update logging setting.", "error");
    } finally {
      setLoadingToggle(null);
    }
  };

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wider uppercase text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            System Settings
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-mono">
            Manage tracked clubs and logging configuration
          </p>
        </div>

        {/* Add Club */}
        <div className="bg-card border border-white/10 rounded-xl p-5 space-y-4">
          <h2 className="font-display font-semibold text-white tracking-wider uppercase text-sm flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            Add Club
          </h2>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[160px] flex flex-col gap-1">
              <input
                type="text"
                placeholder="Club Tag (#2VR8RJL8U)"
                value={newTag}
                onChange={(e) => handleTagChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleAdd()}
                className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none font-mono transition-colors
                  ${tagError ? "border-red-500/60 focus:border-red-400/70" : "border-white/15 focus:border-primary/50"}`}
              />
              {tagError && (
                <p className="text-red-400 text-xs font-mono flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 shrink-0" /> {tagError}
                </p>
              )}
            </div>
            <input
              type="text"
              placeholder="Club Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleAdd()}
              className="flex-1 min-w-[160px] bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-colors"
            />
            <button
              onClick={handleAdd}
              disabled={addClub.isPending}
              className="px-5 py-2 bg-primary/15 border border-primary/40 text-primary rounded-lg text-sm font-mono font-semibold hover:bg-primary/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addClub.isPending ? "Adding…" : "Add Club"}
            </button>
          </div>
          {addError && (
            <p className="text-red-400 text-xs font-mono flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 shrink-0" /> {addError}
            </p>
          )}
        </div>

        {/* Club List */}
        <div className="space-y-2">
          <h2 className="font-display font-semibold text-white tracking-wider uppercase text-sm mb-3 flex items-center gap-2">
            Tracked Clubs
            <span className="text-xs font-mono text-slate-400 normal-case tracking-normal">({clubs?.length ?? "—"})</span>
          </h2>

          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-md" />
              ))
            : clubs?.map((club, i) => (
              <motion.div
                key={club.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center justify-between gap-3 p-4 bg-card border border-white/10 rounded-xl hover:border-white/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white text-sm">{club.name}</span>
                    <span className="text-xs font-mono text-primary/80">{club.tag}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border
                      ${club.loggingEnabled
                        ? "bg-emerald-400/12 text-emerald-300 border-emerald-400/30"
                        : "bg-white/5 text-slate-500 border-white/10"
                      }`}>
                      {club.loggingEnabled ? "● LOGGING ON" : "○ LOGGING OFF"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Toggle */}
                  <button
                    onClick={() => void handleToggle(club.tag, club.name, club.loggingEnabled)}
                    disabled={loadingToggle === club.tag}
                    className="p-1.5 rounded-lg hover:bg-white/8 transition-colors disabled:opacity-50"
                    title={club.loggingEnabled ? "Disable logging" : "Enable logging"}
                  >
                    {club.loggingEnabled
                      ? <ToggleRight className="w-7 h-7 text-primary" />
                      : <ToggleLeft className="w-7 h-7 text-slate-500" />
                    }
                  </button>

                  {/* Remove */}
                  {confirmDelete === club.tag ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-red-400 font-mono">Remove?</span>
                      <button
                        onClick={() => void handleRemove(club.tag, club.name)}
                        className="text-xs font-mono px-2.5 py-1 bg-red-500/12 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors font-semibold"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs font-mono px-2.5 py-1 border border-white/15 text-slate-400 rounded-lg hover:text-white transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(club.tag)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors group"
                      title="Remove club"
                    >
                      <Trash2 className="w-4 h-4 text-slate-500 group-hover:text-red-400 transition-colors" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
        </div>

        {/* Info note */}
        <div className="bg-white/4 border border-white/8 rounded-xl px-5 py-4">
          <p className="text-[11px] font-mono text-slate-500 leading-relaxed">
            Clubs are polled every 5 minutes. Turning off logging stops recording member activity for that club but does not remove historical logs.
            Remove a club entirely to stop tracking it.
          </p>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}
