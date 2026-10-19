import React, { useState, useEffect } from 'react';
import { LogOut, LogIn, Sparkles, Shuffle, Check, User as UserIcon } from 'lucide-react';
import { User as UserType } from '../../types';

interface ProfileSectionProps {
  currentUser?: UserType | null;
  onSignOut?: () => void;
  onOpenSignIn?: () => void;
}

const ALL_SEEDS = [
  'Atlas', 'Pixel', 'Cyber', 'Astro', 'Ninja', 'Fox', 'Spark', 'Zen',
  'Echo', 'Nova', 'Leo', 'Sky', 'Luna', 'Kira', 'Orion', 'Pulse',
  'Vortex', 'Blaze', 'Comet', 'Titan', 'Shadow', 'Phoenix', 'Sol', 'Drift'
];

export const ProfileSection: React.FC<ProfileSectionProps> = ({
  currentUser,
  onSignOut,
  onOpenSignIn,
}) => {
  const [displayName, setDisplayName] = useState<string>(() => {
    return localStorage.getItem('uniwork_user_name') || 'Student';
  });
  const [nameSaveSuccess, setNameSaveSuccess] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Avatar state
  const [avatarData, setAvatarData] = useState<{ avatarUrl: string; style: string; seed: string }>({
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Atlas&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf',
    style: 'adventurer',
    seed: 'Atlas',
  });
  const [avatarSaveSuccess, setAvatarSaveSuccess] = useState(false);
  const [currentSeeds, setCurrentSeeds] = useState<string[]>(ALL_SEEDS.slice(0, 12));

  // Load avatar & name from server on mount
  useEffect(() => {
    const userId = currentUser?.id;
    if (userId) {
      fetch(`/api/user/avatar?userId=${encodeURIComponent(userId)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.avatarUrl) {
            setAvatarData({ avatarUrl: d.avatarUrl, style: d.style || 'adventurer', seed: d.seed || 'Atlas' });
          }
        })
        .catch(() => {});
    }
  }, [currentUser]);

  // Save display name to server & local storage
  const handleSaveDisplayName = (newName: string) => {
    const cleanName = newName.trim() || 'Student';
    setDisplayName(cleanName);
    localStorage.setItem('uniwork_user_name', cleanName);
    setNameSaveSuccess(true);
    setTimeout(() => setNameSaveSuccess(false), 2000);

    const userId = currentUser?.id;
    if (userId) {
      fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userName: cleanName }),
      }).catch(() => {});
    }
  };

  // Shuffle 12 seeds from library
  const handleShuffleSeeds = () => {
    const shuffled = [...ALL_SEEDS].sort(() => 0.5 - Math.random());
    setCurrentSeeds(shuffled.slice(0, 12));
  };

  // Select Avatar & Save to server
  const handleSelectAvatar = (seed: string) => {
    const style = 'adventurer';
    const avatarUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
    setAvatarData({ avatarUrl, style, seed });
    setAvatarSaveSuccess(true);
    setTimeout(() => setAvatarSaveSuccess(false), 2000);

    const userId = currentUser?.id;
    if (userId) {
      fetch('/api/user/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, avatarUrl, style, seed }),
      }).catch(() => {});
    }
  };

  return (
    <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
      {/* Header & Log Out */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="relative w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-[#0066FF] via-blue-400 to-sky-300 shadow-md shrink-0">
            <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-slate-900 border-2 border-white dark:border-slate-900">
              <img src={avatarData.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{displayName}</span>
              {(nameSaveSuccess || avatarSaveSuccess) && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1 animate-in fade-in">
                  <Check className="w-3 h-3" />
                  <span>Saved</span>
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              ID: {currentUser?.id || 'Guest Session'}
            </div>
          </div>
        </div>

        <div>
          {currentUser ? (
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-semibold text-xs transition flex items-center gap-2 cursor-pointer border border-rose-200/80 dark:border-rose-800/50"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenSignIn}
              className="px-4 py-2 rounded-xl bg-[#0066FF] hover:bg-blue-600 text-white font-semibold text-xs transition flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Display Name Input */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Display Name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          onBlur={() => handleSaveDisplayName(displayName)}
          placeholder="Enter your student name..."
          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:border-[#0066FF]"
        />
      </div>

      {/* Simplified 12-Avatar Grid with Shuffle */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Sparkles className="w-4 h-4 text-[#0066FF] dark:text-[#60A5FA]" />
            <span>Focus Room Avatar</span>
          </div>
          <button
            type="button"
            onClick={handleShuffleSeeds}
            className="text-xs font-semibold text-[#0066FF] dark:text-[#60A5FA] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Shuffle Choices</span>
          </button>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
          {currentSeeds.map((seed) => {
            const isCurrent = avatarData.seed === seed;
            const url = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

            return (
              <button
                key={seed}
                type="button"
                onClick={() => handleSelectAvatar(seed)}
                className={`flex flex-col items-center p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border transition cursor-pointer group hover:border-[#0066FF] relative ${
                  isCurrent
                    ? 'border-[#0066FF] ring-2 ring-[#0066FF]/20 bg-blue-50/50 dark:bg-blue-950/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-white dark:bg-slate-800 p-0.5 mb-1">
                  <img src={url} alt={seed} className="w-full h-full object-contain group-hover:scale-105 transition" />
                </div>
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[55px] capitalize">
                  {seed}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Log Out Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Log out of UniWork?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Are you sure you want to log out of this session?</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  if (onSignOut) onSignOut();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 dark:bg-rose-700 dark:hover:bg-rose-600 text-white font-bold text-xs transition cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
