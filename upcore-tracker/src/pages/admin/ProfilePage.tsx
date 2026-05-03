import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getApiUrl } from "@/api";
import { getStoredToken } from "@/lib/auth-utils";
import {
  UserCircle, Camera, Tag, Save, Check, AlertCircle, Loader2, ExternalLink,
  Lock, Eye, EyeOff, ShieldCheck,
} from "lucide-react";

export default function ProfilePage() {
  const { admin, updateProfile } = useAuth();

  const [displayName, setDisplayName]     = useState(admin?.displayName ?? "");
  const [profilePicUrl, setProfilePicUrl] = useState(admin?.profilePicUrl ?? "");
  const [playerTag, setPlayerTag]         = useState(admin?.playerTag ?? "");

  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [imgErr, setImgErr]   = useState(false);

  const [currentPass, setCurrentPass]   = useState("");
  const [newPass, setNewPass]           = useState("");
  const [confirmPass, setConfirmPass]   = useState("");
  const [showCurrent, setShowCurrent]   = useState(false);
  const [showNew, setShowNew]           = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [pwSaving, setPwSaving]         = useState(false);
  const [pwSaved, setPwSaved]           = useState(false);
  const [pwError, setPwError]           = useState<string | null>(null);

  const handleChangePassword = async () => {
    setPwError(null);
    if (newPass !== confirmPass) { setPwError("New passwords do not match"); return; }
    if (newPass.length < 6) { setPwError("New password must be at least 6 characters"); return; }
    setPwSaving(true);
    try {
      const res = await fetch(getApiUrl("/api/auth/change-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getStoredToken()}` },
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setPwSaved(true);
      setCurrentPass(""); setNewPass(""); setConfirmPass("");
      setTimeout(() => setPwSaved(false), 3000);
    } catch (e) {
      setPwError(e instanceof Error ? e.message : "Failed to change password");
    } finally {
      setPwSaving(false);
    }
  };

  // Sync when admin changes (e.g. fresh login)
  useEffect(() => {
    setDisplayName(admin?.displayName ?? "");
    setProfilePicUrl(admin?.profilePicUrl ?? "");
    setPlayerTag(admin?.playerTag ?? "");
  }, [admin?.email]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateProfile({
        displayName:   displayName.trim()   || undefined,
        profilePicUrl: profilePicUrl.trim() || undefined,
        playerTag:     playerTag.trim()     || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const initial = (admin?.displayName || admin?.name || "A")[0].toUpperCase();

  const picIsValid = profilePicUrl.trim().startsWith("http") && !imgErr;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="font-display text-xl font-black tracking-wider uppercase text-white flex items-center gap-2">
          <UserCircle className="w-5 h-5 text-primary" />
          My Profile
        </h2>
        <p className="text-xs font-mono text-muted-foreground mt-1">
          Set your display name, profile picture, and Brawl Stars tag. These appear in audit logs.
        </p>
      </div>

      {/* Avatar preview */}
      <div className="flex items-center gap-5 p-5 rounded-xl border border-border bg-card">
        <div className="relative shrink-0">
          {picIsValid ? (
            <img
              src={profilePicUrl.trim()}
              alt="Profile"
              onError={() => setImgErr(true)}
              onLoad={() => setImgErr(false)}
              className="w-20 h-20 rounded-full object-cover border-2 border-primary/30"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 border-2 border-primary/30 flex items-center justify-center">
              <span className="font-display text-3xl font-black text-primary">{initial}</span>
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center">
            <Camera className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>
        <div>
          <div className="font-display text-base font-bold text-white">
            {displayName.trim() || admin?.name}
          </div>
          <div className="text-xs font-mono text-primary/70 mt-0.5">{admin?.email}</div>
          {playerTag.trim() && (
            <div className="text-xs font-mono text-muted-foreground mt-1">
              🏆 {playerTag.trim().startsWith("#") ? playerTag.trim() : `#${playerTag.trim()}`}
            </div>
          )}
        </div>
      </div>

      {/* Form fields */}
      <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border/50">

        {/* Display name */}
        <div className="p-4">
          <label className="block text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">
            Display Name <span className="text-muted-foreground/50 normal-case">(optional)</span>
          </label>
          <input
            type="text"
            placeholder={admin?.name}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted-foreground/50 font-mono focus:outline-none focus:border-primary/50 transition-colors"
          />
          <p className="text-[11px] font-mono text-muted-foreground/60 mt-1.5">
            Shown in audit logs instead of your system name. Defaults to "{admin?.name}".
          </p>
        </div>

        {/* Profile picture URL */}
        <div className="p-4">
          <label className="block text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">
            Profile Picture URL <span className="text-muted-foreground/50 normal-case">(optional)</span>
          </label>
          <input
            type="url"
            placeholder="https://example.com/your-photo.png"
            value={profilePicUrl}
            onChange={(e) => { setProfilePicUrl(e.target.value); setImgErr(false); }}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted-foreground/50 font-mono focus:outline-none focus:border-primary/50 transition-colors"
          />
          {profilePicUrl.trim() && !picIsValid && !imgErr && (
            <p className="text-[11px] font-mono text-amber-400 mt-1.5">Must be a valid https:// URL</p>
          )}
          {imgErr && (
            <p className="text-[11px] font-mono text-red-400 mt-1.5">Image could not be loaded — check the URL</p>
          )}
          {!profilePicUrl.trim() && (
            <p className="text-[11px] font-mono text-muted-foreground/60 mt-1.5">
              Paste a direct link to an image (Discord avatar, Google photo, etc.)
            </p>
          )}
        </div>

        {/* Player tag */}
        <div className="p-4">
          <label className="block text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">
            Brawl Stars Player Tag <span className="text-muted-foreground/50 normal-case">(optional)</span>
          </label>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1 bg-background border border-border rounded-lg px-3 py-2.5 focus-within:border-primary/50 transition-colors">
              <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="#XXXXXX"
                value={playerTag}
                onChange={(e) => setPlayerTag(e.target.value)}
                maxLength={15}
                className="bg-transparent text-sm text-white placeholder-muted-foreground/50 font-mono focus:outline-none w-full"
              />
            </div>
            {playerTag.trim() && (
              <a
                href={`https://www.brawlify.com/stats/profile/${playerTag.trim().replace(/^#/, "%23")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-lg border border-border text-muted-foreground hover:text-white hover:border-primary/30 transition-colors"
                title="View on Brawlify"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
          <p className="text-[11px] font-mono text-muted-foreground/60 mt-1.5">
            Your Brawl Stars player tag. Stored for reference only.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="text-xs font-mono">{error}</p>
        </div>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-background font-mono text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : saved ? (
          <Check className="w-4 h-4" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
      </button>

      {/* Info card */}
      <div className="p-4 rounded-xl border border-border bg-card/50 text-xs font-mono text-muted-foreground space-y-1">
        <p className="text-white/60 font-bold uppercase tracking-wider text-[10px] mb-2">How it works</p>
        <p>• Your display name and profile picture appear in the Audit Logs next to your actions.</p>
        <p>• These changes are applied immediately — no need to log out and back in.</p>
        <p>• Your player tag is stored for reference only and is not used for any tracking.</p>
      </div>

      {/* ── Change Password ── */}
      <div>
        <h2 className="font-display text-xl font-black tracking-wider uppercase text-white flex items-center gap-2 mt-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          Change Password
        </h2>
        <p className="text-xs font-mono text-muted-foreground mt-1">
          Update your login password. You must enter your current password to confirm.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border/50">
        {/* Current password */}
        <div className="p-4">
          <label className="block text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">
            Current Password
          </label>
          <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2.5 focus-within:border-primary/50 transition-colors">
            <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              type={showCurrent ? "text" : "password"}
              placeholder="••••••••"
              value={currentPass}
              onChange={e => setCurrentPass(e.target.value)}
              className="bg-transparent text-sm text-white placeholder-muted-foreground/50 font-mono focus:outline-none w-full"
            />
            <button type="button" onClick={() => setShowCurrent(v => !v)} className="text-muted-foreground hover:text-white transition-colors shrink-0">
              {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* New password */}
        <div className="p-4">
          <label className="block text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">
            New Password
          </label>
          <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2.5 focus-within:border-primary/50 transition-colors">
            <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              type={showNew ? "text" : "password"}
              placeholder="Min. 6 characters"
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              className="bg-transparent text-sm text-white placeholder-muted-foreground/50 font-mono focus:outline-none w-full"
            />
            <button type="button" onClick={() => setShowNew(v => !v)} className="text-muted-foreground hover:text-white transition-colors shrink-0">
              {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Confirm new password */}
        <div className="p-4">
          <label className="block text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">
            Confirm New Password
          </label>
          <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2.5 focus-within:border-primary/50 transition-colors">
            <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Repeat new password"
              value={confirmPass}
              onChange={e => setConfirmPass(e.target.value)}
              className="bg-transparent text-sm text-white placeholder-muted-foreground/50 font-mono focus:outline-none w-full"
            />
            <button type="button" onClick={() => setShowConfirm(v => !v)} className="text-muted-foreground hover:text-white transition-colors shrink-0">
              {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {pwError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="text-xs font-mono">{pwError}</p>
        </div>
      )}

      <button
        onClick={handleChangePassword}
        disabled={pwSaving || !currentPass || !newPass || !confirmPass}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-background font-mono text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : pwSaved ? <Check className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
        {pwSaving ? "Updating…" : pwSaved ? "Password Updated!" : "Update Password"}
      </button>
    </div>
  );
}
