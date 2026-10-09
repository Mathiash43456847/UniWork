/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  Check,
  X,
  Lock,
  AlarmClockCheck,
  Award,
  Users,
  Search,
  Sparkles,
  Flame,
  AlertCircle,
  MoreVertical,
  Globe,
  Copy,
  Plus,
  Pin,
  Trash2,
  Edit3,
  Share2,
  ArrowLeft,
  ExternalLink,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import { Task, Tag } from '../types';
import { StudentProfileView, PeerProfile as ExternalPeerProfile } from './StudentProfileView';

interface FocusRoomViewProps {
  task?: Task | null;
  allTasks?: Task[];
  tags: Tag[];
  userId?: string;
  onCompleteTask: (
    task: Task | null,
    timeDeltaMinutes: number,
    resolution: 'keep' | 'push' | 'shorten' | 'pull' | 'keep_original'
  ) => void;
  onEndIncomplete: () => void;
  onTimerRunningChange?: (running: boolean) => void;
  onSelectPeerProfile?: (peer: PeerProfile) => void;
  onSetSidebarCollapsed?: (collapsed: boolean) => void;
}

export interface PeerProfile {
  id: string;
  name: string;
  avatarUrl: string;
  points: number;
  status: 'studying';
  timeLeftMinutes: number;
  studyDurationFormatted: string;
  isFixedTest?: boolean;
}

export interface FocusRoomItem {
  code: string;
  name: string;
  isGlobal: boolean;
  creatorUserId: string;
  peerCount: number;
}

export const FocusRoomView: React.FC<FocusRoomViewProps> = ({
  task,
  allTasks = [],
  tags,
  userId = 'usr-mathias-cheow-primary',
  onCompleteTask,
  onEndIncomplete,
  onTimerRunningChange,
  onSetSidebarCollapsed,
}) => {
  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Active Focus Rooms List
  const [rooms, setRooms] = useState<FocusRoomItem[]>([]);
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [roomSearchQuery, setRoomSearchQuery] = useState<string>('');

  // Automatically draw in / collapse sidebar inside focus room, draw out / expand on main hub
  useEffect(() => {
    if (onSetSidebarCollapsed) {
      if (activeRoomCode) {
        onSetSidebarCollapsed(true);
      } else {
        onSetSidebarCollapsed(false);
      }
    }
  }, [activeRoomCode, onSetSidebarCollapsed]);

  // Pinning System States
  const [pinnedInRoom, setPinnedInRoom] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('uniwork_pinned_in_room');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [pinnedGlobal, setPinnedGlobal] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('uniwork_pinned_global');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Share Modal & Room Modals
  const [shareModalRoom, setShareModalRoom] = useState<FocusRoomItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoomNameInput, setNewRoomNameInput] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);

  const [renameModalRoom, setRenameModalRoom] = useState<FocusRoomItem | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [isRenamingRoom, setIsRenamingRoom] = useState(false);

  // 3-Dot Menus Open State
  const [activeRoomMenuCode, setActiveRoomMenuCode] = useState<string | null>(null);
  const [activePeerMenuId, setActivePeerMenuId] = useState<string | null>(null);
  const [isRoomDropdownOpen, setIsRoomDropdownOpen] = useState(false);

  // Direct Link Join Confirmation Modal
  const [unjoinedLinkRoom, setUnjoinedLinkRoom] = useState<FocusRoomItem | null>(null);
  const [invalidLinkCode, setInvalidLinkCode] = useState<string | null>(null);

  // Server-restored session state from PostgreSQL
  const [serverSession, setServerSession] = useState<{
    id: string;
    taskId: string;
    startTimeMs: number;
    plannedDurationSec: number;
    isRunning: boolean;
    pausedElapsedSec: number;
    lastUpdatedMs: number;
  } | null>(null);

  // Compute effective active task
  const effectiveTask = useMemo(() => {
    if (task) return task;
    if (serverSession) {
      const matched = allTasks.find((t) => t.id === serverSession.taskId);
      if (matched) return matched;
      return {
        id: serverSession.taskId,
        title: serverSession.taskId === 'open' ? '' : 'Active Focus Task',
        status: 'in-progress' as const,
      };
    }
    return null;
  }, [task, serverSession, allTasks]);

  const isLockMode = !effectiveTask;

  // Active Task Duration Setup
  const plannedDurationSec = useMemo(() => {
    if (serverSession?.plannedDurationSec) {
      return serverSession.plannedDurationSec;
    }
    if (!effectiveTask) return 25 * 60;
    if (effectiveTask.startTime && effectiveTask.endTime) {
      const [sh, sm] = effectiveTask.startTime.split(':').map(Number);
      const [eh, em] = effectiveTask.endTime.split(':').map(Number);
      const diffSec = (eh * 60 + em - (sh * 60 + sm)) * 60;
      return Math.max(5 * 60, diffSec);
    }
    return 25 * 60;
  }, [effectiveTask, serverSession]);

  const [secondsRemaining, setSecondsRemaining] = useState<number>(plannedDurationSec);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [sessionCumulativeSeconds, setSessionCumulativeSeconds] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // User Avatar & Name State
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('uniwork_user_name') || 'Student';
  });
  const [userAvatar, setUserAvatar] = useState<{ avatarUrl: string; style: string; seed: string }>({
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=student&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf',
    style: 'adventurer',
    seed: 'student',
  });
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState<boolean>(false);
  const [selectedAvatarStyle, setSelectedAvatarStyle] = useState<string>('adventurer');
  const [tempNameInput, setTempNameInput] = useState<string>(userName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSavingName, setIsSavingName] = useState<boolean>(false);

  // User Points State
  const [userStats, setUserStats] = useState<{ rollingAverage: number; totalLifetimeSessions: number; todayPoints: number }>({
    rollingAverage: 0,
    totalLifetimeSessions: 0,
    todayPoints: 0,
  });

  // Global & Room Peers
  const [peers, setPeers] = useState<PeerProfile[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<PeerProfile | null>(null);

  // Fetch User Rooms
  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch(`/api/focus/rooms?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.rooms)) {
        setRooms(data.rooms);
      }
    } catch {
      // fallback
    }
  }, [userId]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Filtered Rooms for Search
  const filteredRooms = useMemo(() => {
    if (!roomSearchQuery.trim()) return rooms;
    const q = roomSearchQuery.toLowerCase().trim();
    return rooms.filter((r) => r.name.toLowerCase().includes(q) || r.code.includes(q));
  }, [rooms, roomSearchQuery]);

  // URL Parsing & Route Matching
  useEffect(() => {
    const parseUrlRoute = async () => {
      const pathname = window.location.pathname;
      const matchPeer = pathname.match(/^\/focus\/([0-9a-zA-Z]+)\/(.+)$/i);
      const matchRoom = pathname.match(/^\/focus\/([0-9a-zA-Z]+)$/i);

      if (matchPeer) {
        const code = matchPeer[1];
        const studentName = decodeURIComponent(matchPeer[2]).trim();
        setActiveRoomCode(code);

        const existing = peers.find((p) => p.name.toLowerCase() === studentName.toLowerCase());
        if (existing) {
          setSelectedPeer(existing);
        } else {
          setSelectedPeer({
            id: `peer-${studentName}`,
            name: studentName,
            avatarUrl: `https://api.dicebear.com/7.x/micah/svg?seed=${encodeURIComponent(studentName)}`,
            points: 120,
            status: 'studying',
            timeLeftMinutes: 45,
            studyDurationFormatted: '1h 00m',
          });
        }
      } else if (matchRoom) {
        const code = matchRoom[1];
        setSelectedPeer(null);

        const isJoined = rooms.some((r) => r.code === code);
        if (!isJoined && rooms.length > 0) {
          try {
            const valRes = await fetch(`/api/focus/rooms/validate?code=${encodeURIComponent(code)}`);
            const valData = await valRes.json();
            if (valData.success && valData.exists && valData.room) {
              setUnjoinedLinkRoom({
                code: valData.room.code,
                name: valData.room.name,
                isGlobal: valData.room.isGlobal,
                creatorUserId: 'system',
                peerCount: 1,
              });
              setInvalidLinkCode(null);
            } else {
              setInvalidLinkCode(code);
              setUnjoinedLinkRoom(null);
            }
          } catch {
            setInvalidLinkCode(code);
          }
        } else {
          setActiveRoomCode(code);
          setUnjoinedLinkRoom(null);
          setInvalidLinkCode(null);
        }
      } else {
        setActiveRoomCode(null);
        setSelectedPeer(null);
        setUnjoinedLinkRoom(null);
        setInvalidLinkCode(null);
      }
    };

    parseUrlRoute();
    window.addEventListener('popstate', parseUrlRoute);
    return () => window.removeEventListener('popstate', parseUrlRoute);
  }, [peers, rooms]);

  // Fetch Peers for current Active Room
  const fetchPeers = useCallback(() => {
    if (!activeRoomCode) return;
    fetch(`/api/focus/room/peers?roomCode=${encodeURIComponent(activeRoomCode)}&userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.peers)) {
          setPeers(d.peers);
        }
      })
      .catch(() => {});
  }, [activeRoomCode, userId]);

  useEffect(() => {
    fetchPeers();
    const interval = setInterval(fetchPeers, 8000);
    return () => clearInterval(interval);
  }, [fetchPeers]);

  // Presence Heartbeat every 15s for active room
  useEffect(() => {
    if (!isRunning || isLockMode || !activeRoomCode) return;

    const sendHeartbeat = () => {
      const leftMins = Math.max(0, Math.ceil(secondsRemaining / 60));
      fetch('/api/focus/presence/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          userName,
          avatarUrl: userAvatar.avatarUrl,
          points: userStats.rollingAverage,
          timeLeftMinutes: leftMins,
          elapsedSeconds,
          roomCode: activeRoomCode,
        }),
      }).catch(() => {});
    };

    sendHeartbeat();
    const hbInterval = setInterval(sendHeartbeat, 15000);
    return () => clearInterval(hbInterval);
  }, [isRunning, isLockMode, userId, userName, userAvatar.avatarUrl, userStats.rollingAverage, secondsRemaining, elapsedSeconds, activeRoomCode]);

  // Timer Tick
  useEffect(() => {
    if (!isRunning || isLockMode) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
      setElapsedSeconds((prev) => prev + 1);
      setSessionCumulativeSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isLockMode]);

  useEffect(() => {
    if (onTimerRunningChange) {
      onTimerRunningChange(isRunning);
    }
  }, [isRunning, onTimerRunningChange]);

  // Fetch Stats & Avatar
  useEffect(() => {
    fetch(`/api/user/avatar?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.avatarUrl) {
          setUserAvatar({ avatarUrl: d.avatarUrl, style: d.style || 'adventurer', seed: d.seed || 'student' });
        }
      })
      .catch(() => {});

    fetch(`/api/focus/points/stats?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setUserStats({
            rollingAverage: d.rollingAverage,
            totalLifetimeSessions: d.totalLifetimeSessions,
            todayPoints: d.todayPoints,
          });
        }
      })
      .catch(() => {});
  }, [userId]);

  // Navigation Handlers
  const handleOpenRoom = (roomCode: string) => {
    setActiveRoomCode(roomCode);
    setIsRoomDropdownOpen(false);
    try {
      const targetPath = `/focus/${roomCode}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState({}, '', targetPath);
      }
    } catch {
      // fallback
    }
  };

  const handleReturnToHub = () => {
    setActiveRoomCode(null);
    setSelectedPeer(null);
    setIsRoomDropdownOpen(false);
    try {
      if (window.location.pathname !== '/focus') {
        window.history.pushState({}, '', '/focus');
      }
    } catch {
      // fallback
    }
  };

  const handleOpenPeerProfile = (peer: PeerProfile) => {
    setSelectedPeer(peer);
    try {
      const currentCode = activeRoomCode || '000000';
      const targetPath = `/focus/${currentCode}/${encodeURIComponent(peer.name)}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ peerName: peer.name }, '', targetPath);
      }
    } catch {
      // fallback
    }
  };

  const handleClosePeerProfile = () => {
    setSelectedPeer(null);
    try {
      const currentCode = activeRoomCode || '000000';
      const targetPath = `/focus/${currentCode}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState({}, '', targetPath);
      }
    } catch {
      // fallback
    }
  };

  // Create Room Handler
  const handleCreateRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingRoom) return;

    setIsCreatingRoom(true);
    try {
      const res = await fetch('/api/focus/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name: newRoomNameInput.trim() }),
      });
      const data = await res.json();
      if (data.success && data.room) {
        showToast(`Created focus room "${data.room.name}"!`);
        setIsCreateModalOpen(false);
        setNewRoomNameInput('');
        await fetchRooms();
        handleOpenRoom(data.room.code);
      }
    } catch {
      showToast('Failed to create focus room.');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Join Room Handler
  const handleJoinRoomSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const codeToJoin = joinCodeInput.trim();

    if (!codeToJoin) {
      setJoinError('Please enter a 6-digit focus room code.');
      return;
    }

    setIsJoiningRoom(true);
    setJoinError(null);

    try {
      const res = await fetch('/api/focus/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, roomCode: codeToJoin }),
      });
      const data = await res.json();

      if (!data.success) {
        setJoinError(data.error || 'Invalid room code. Please check the 6-digit code and try again.');
        setIsJoiningRoom(false);
        return;
      }

      if (data.room) {
        showToast(`Joined focus room "${data.room.name}"!`);
        setJoinCodeInput('');
        setJoinError(null);
        setIsJoinModalOpen(false);
        await fetchRooms();
        handleOpenRoom(data.room.code);
      }
    } catch {
      setJoinError('Invalid room code. Please check the 6-digit code and try again.');
    } finally {
      setIsJoiningRoom(false);
    }
  };

  // Direct Link Join Handler
  const handleConfirmLinkJoin = async () => {
    if (!unjoinedLinkRoom) return;
    try {
      await fetch('/api/focus/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, roomCode: unjoinedLinkRoom.code }),
      });
      showToast(`Joined focus room "${unjoinedLinkRoom.name}"!`);
      const code = unjoinedLinkRoom.code;
      setUnjoinedLinkRoom(null);
      await fetchRooms();
      handleOpenRoom(code);
    } catch {
      showToast('Failed to join room.');
    }
  };

  // Leave / Delete Room Handler
  const handleDeleteRoom = async (code: string) => {
    if (code === '000000') return;
    try {
      await fetch(`/api/focus/rooms/${encodeURIComponent(code)}?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });
      showToast('Focus room removed.');
      await fetchRooms();
      if (activeRoomCode === code) {
        handleReturnToHub();
      }
    } catch {
      showToast('Failed to leave room.');
    }
  };

  // Rename Room Handler
  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameModalRoom || isRenamingRoom) return;

    setIsRenamingRoom(true);
    try {
      const res = await fetch('/api/focus/rooms/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, roomCode: renameModalRoom.code, newName: renameInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Focus room renamed!');
        setRenameModalRoom(null);
        setRenameInput('');
        await fetchRooms();
      }
    } catch {
      showToast('Failed to rename room.');
    } finally {
      setIsRenamingRoom(false);
    }
  };

  // Toggle Student Pinning Handler
  const handleTogglePinPeer = (peerId: string, scope: 'room' | 'global') => {
    const currentCode = activeRoomCode || '000000';

    if (scope === 'global') {
      setPinnedGlobal((prev) => {
        const isAlready = prev.includes(peerId);
        const updated = isAlready ? prev.filter((id) => id !== peerId) : [...prev, peerId];
        localStorage.setItem('uniwork_pinned_global', JSON.stringify(updated));
        showToast(isAlready ? 'Unpinned globally' : 'Pinned globally across all rooms');
        return updated;
      });
    } else {
      setPinnedInRoom((prev) => {
        const roomPins = prev[currentCode] || [];
        const isAlready = roomPins.includes(peerId);
        const updatedRoomPins = isAlready ? roomPins.filter((id) => id !== peerId) : [...roomPins, peerId];
        const updated = { ...prev, [currentCode]: updatedRoomPins };
        localStorage.setItem('uniwork_pinned_in_room', JSON.stringify(updated));
        showToast(isAlready ? 'Unpinned in this room' : 'Pinned in this focus room');
        return updated;
      });
    }
    setActivePeerMenuId(null);
  };

  // Copy Code to Clipboard
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast(`Code ${code} copied to clipboard!`);
  };

  // Copy Direct Link to Clipboard
  const handleCopyLink = (code: string) => {
    const link = `${window.location.origin}/focus/${code}`;
    navigator.clipboard.writeText(link);
    showToast('Direct room link copied to clipboard!');
  };

  // Start Open Focus Session
  const handleStartOpenFocus = async () => {
    const planned = 25 * 60;
    const now = Date.now();
    const newSess = {
      id: `open_${now}`,
      taskId: 'open',
      startTimeMs: now,
      plannedDurationSec: planned,
      isRunning: true,
      pausedElapsedSec: 0,
      lastUpdatedMs: now,
    };
    setServerSession(newSess);
    setIsRunning(true);
    setSecondsRemaining(planned);
    setElapsedSeconds(0);
    setSessionCumulativeSeconds(0);

    try {
      await fetch('/api/focus/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          taskId: 'open',
          plannedDurationSec: planned,
        }),
      });
    } catch {
      // ignore
    }
  };

  // Toggle Play / Pause
  const handleTogglePlayPause = async () => {
    if (isLockMode) {
      await handleStartOpenFocus();
      return;
    }

    const nextState = !isRunning;
    setIsRunning(nextState);

    try {
      await fetch('/api/focus/session/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          taskId: effectiveTask?.id || 'open',
          isRunning: nextState,
          elapsedSec: elapsedSeconds,
        }),
      });
    } catch {
      // ignore
    }
  };

  // Complete Task
  const handleCompleteCurrentTask = () => {
    const timeDeltaMinutes = Math.round(elapsedSeconds / 60);
    onCompleteTask(effectiveTask, timeDeltaMinutes, 'keep_original');
    setServerSession(null);
    setIsRunning(false);
  };

  // End as Incomplete
  const handleEndIncompleteSession = () => {
    onEndIncomplete();
    setServerSession(null);
    setIsRunning(false);
  };

  // Save User Name
  const handleSaveUserName = async (e: React.FormEvent) => {
    e.preventDefault();
    const newName = tempNameInput.trim();
    if (!newName) {
      setNameError('Name cannot be empty.');
      return;
    }

    setIsSavingName(true);
    setNameError(null);

    try {
      const valRes = await fetch('/api/user/name/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userName: newName }),
      });
      const valData = await valRes.json();
      if (!valData.success) {
        setNameError(valData.error || 'Name is already taken. Choose another.');
        setIsSavingName(false);
        return;
      }
    } catch {
      // ignore
    }

    setIsSavingName(false);
    const avatarUrl = `https://api.dicebear.com/7.x/${selectedAvatarStyle}/svg?seed=${encodeURIComponent(newName)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
    setUserAvatar({ avatarUrl, style: selectedAvatarStyle, seed: newName });
    setUserName(newName);
    localStorage.setItem('uniwork_user_name', newName);
    setIsAvatarModalOpen(false);
  };

  // Sorted Peers with Pinned Priority
  const sortedPeers = useMemo(() => {
    const currentCode = activeRoomCode || '000000';
    const roomPins = pinnedInRoom[currentCode] || [];

    return [...peers].sort((a, b) => {
      const aPinned = roomPins.includes(a.id) || pinnedGlobal.includes(a.id);
      const bPinned = roomPins.includes(b.id) || pinnedGlobal.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });
  }, [peers, activeRoomCode, pinnedInRoom, pinnedGlobal]);

  const activeRoomObj = useMemo(() => {
    return rooms.find((r) => r.code === activeRoomCode) || {
      code: activeRoomCode || '000000',
      name: activeRoomCode === '000000' ? 'Global Focus Room' : 'Focus Room',
      isGlobal: activeRoomCode === '000000',
      creatorUserId: 'system',
      peerCount: peers.length + 1,
    };
  }, [rooms, activeRoomCode, peers.length]);

  // Render Full Page Student Profile View
  if (selectedPeer) {
    return (
      <StudentProfileView
        peer={selectedPeer}
        currentUserId={userId}
        onBack={handleClosePeerProfile}
      />
    );
  }

  return (
    <div
      className="flex-1 flex flex-col h-full bg-white dark:bg-[#070A11] text-slate-800 dark:text-[#F4F4F5] overflow-y-auto select-none font-sans transition-colors duration-200"
      id="uniwork-focus-room"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#0066FF] text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-xl flex items-center gap-2 animate-bounce">
          <Award className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER BAR */}
      <div className="h-16 px-6 md:px-10 flex items-center justify-between flex-shrink-0 bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 select-none">
        <div className="flex items-center gap-3">
          {activeRoomCode ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleReturnToHub}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-[#0066FF] dark:hover:text-[#60A5FA] transition cursor-pointer px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>All Focus Rooms</span>
              </button>

              {/* Room Selector Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsRoomDropdownOpen(!isRoomDropdownOpen)}
                  className="flex items-center gap-1.5 text-base font-bold text-slate-900 dark:text-white hover:text-[#0066FF] transition cursor-pointer"
                >
                  <span>{activeRoomObj.name}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {isRoomDropdownOpen && (
                  <div
                    className="absolute left-0 top-9 z-[100] w-60 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 text-xs animate-in fade-in zoom-in-95 max-h-64 overflow-y-auto"
                    onClick={() => setIsRoomDropdownOpen(false)}
                  >
                    {rooms.map((rm) => (
                      <button
                        key={rm.code}
                        type="button"
                        onClick={() => handleOpenRoom(rm.code)}
                        className={`w-full px-4 py-2.5 text-left font-medium flex items-center justify-between transition ${
                          rm.code === activeRoomCode
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-[#0066FF] dark:text-[#60A5FA] font-bold'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate pr-2">{rm.name}</span>
                        <span className="text-[10px] font-mono font-medium text-slate-400">
                          {rm.peerCount} studying
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Restored Icon & Focus Rooms Title */
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <AlarmClockCheck className="w-6 h-6 text-[#0066FF] dark:text-[#60A5FA]" />
              <span>Focus Rooms</span>
            </h1>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
            {userStats.rollingAverage} pts total
          </span>

          {activeRoomCode && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveRoomMenuCode(activeRoomMenuCode === activeRoomCode ? null : activeRoomCode)}
                className="w-9 h-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 transition cursor-pointer"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {activeRoomMenuCode === activeRoomCode && (
                <div
                  className="absolute right-0 top-11 z-[100] w-48 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 text-xs animate-in fade-in zoom-in-95"
                  onClick={() => setActiveRoomMenuCode(null)}
                >
                  <button
                    type="button"
                    onClick={() => setShareModalRoom(activeRoomObj)}
                    className="w-full px-4 py-2.5 text-left font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4 text-[#0066FF]" />
                    <span>Share Room</span>
                  </button>

                  {!activeRoomObj.isGlobal && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setRenameModalRoom(activeRoomObj);
                          setRenameInput(activeRoomObj.name);
                        }}
                        className="w-full px-4 py-2.5 text-left font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                      >
                        <Edit3 className="w-4 h-4 text-slate-500" />
                        <span>Rename Room</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteRoom(activeRoomObj.code)}
                        className="w-full px-4 py-2.5 text-left font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Leave Room</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* BODY CONTENT AREA */}
      {!activeRoomCode ? (
        /* MAIN FOCUS ROOM HUB PAGE (/focus) */
        <div className="flex-1 px-6 md:px-10 py-8 w-full flex flex-col justify-between">
          <div>
            {/* SEARCH BAR DIRECTLY ABOVE LIST ROWS */}
            <div className="relative w-full mb-4">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={roomSearchQuery}
                onChange={(e) => setRoomSearchQuery(e.target.value)}
                placeholder="Search focus rooms..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0066FF]"
              />
            </div>

            {/* CONNECTED LIST ROWS */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-visible divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-[#0B101D] shadow-2xs">
              {filteredRooms.map((rm) => (
                <div
                  key={rm.code}
                  className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group relative cursor-pointer"
                  onClick={() => handleOpenRoom(rm.code)}
                >
                  {/* Left: Name and '· X studying' right beside it */}
                  <div className="flex items-center gap-2.5 min-w-0 pr-4">
                    <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#0066FF] dark:group-hover:text-[#60A5FA] transition truncate">
                      {rm.name}
                    </span>
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 flex-shrink-0">
                      · {rm.peerCount} studying
                    </span>
                  </div>

                  {/* Right: 3-Dot Options Menu */}
                  <div className="flex items-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveRoomMenuCode(activeRoomMenuCode === rm.code ? null : rm.code);
                        }}
                        className="w-8 h-8 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeRoomMenuCode === rm.code && (
                        <div
                          className="absolute right-0 top-9 z-[100] w-48 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 text-xs animate-in fade-in zoom-in-95"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveRoomMenuCode(null);
                              setShareModalRoom(rm);
                            }}
                            className="w-full px-4 py-2.5 text-left font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                          >
                            <Share2 className="w-4 h-4 text-[#0066FF]" />
                            <span>Share Room</span>
                          </button>

                          {!rm.isGlobal && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveRoomMenuCode(null);
                                  setRenameModalRoom(rm);
                                  setRenameInput(rm.name);
                                }}
                                className="w-full px-4 py-2.5 text-left font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                              >
                                <Edit3 className="w-4 h-4 text-slate-500" />
                                <span>Rename Room</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveRoomMenuCode(null);
                                  handleDeleteRoom(rm.code);
                                }}
                                className="w-full px-4 py-2.5 text-left font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Leave Room</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FADED HOVER-TEXT BUTTONS FOR JOIN & CREATE (NO CARDS) */}
          <div className="mt-8 pt-6 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setIsJoinModalOpen(true)}
              className="text-xs font-semibold text-slate-400 hover:text-[#0066FF] dark:text-slate-500 dark:hover:text-[#60A5FA] transition cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Join Focus Room</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="text-xs font-semibold text-slate-400 hover:text-[#0066FF] dark:text-slate-500 dark:hover:text-[#60A5FA] transition cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Focus Room</span>
            </button>
          </div>
        </div>
      ) : (
        /* INSIDE SPECIFIC FOCUS ROOM PAGE (/focus/:roomCode) */
        <div className="flex-1 px-6 md:px-10 py-6 w-full flex flex-col divide-y divide-slate-200/80 dark:divide-slate-800">
          
          {/* TOP HALF: FOCUS TIMER DASHBOARD */}
          <div className="pb-6">
            {isLockMode ? (
              <div className="py-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                      Focus Timer
                    </span>
                    <div className="text-3xl font-mono font-bold text-slate-300 dark:text-slate-600 tracking-tight">
                      00:00:00
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handleStartOpenFocus}
                    className="px-4 py-2.5 rounded-xl bg-[#0066FF] hover:bg-blue-600 active:scale-95 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer flex-shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start Focus</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-2">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  
                  {/* Left Column: Clock & Play/Pause */}
                  <div className="md:col-span-5 flex items-center justify-between pr-2">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">
                        Focus Timer
                      </span>

                      <div className="flex items-center gap-3.5">
                        <span className="text-5xl sm:text-6xl md:text-6xl font-bold tracking-tight font-mono tabular-nums text-slate-900 dark:text-white select-all leading-none">
                          {Math.floor(elapsedSeconds / 3600) > 0
                            ? `${Math.floor(elapsedSeconds / 3600)}:${String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, '0')}:${String(elapsedSeconds % 60).padStart(2, '0')}`
                            : `${String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:${String(elapsedSeconds % 60).padStart(2, '0')}`}
                        </span>

                        <button
                          type="button"
                          onClick={handleTogglePlayPause}
                          className={`w-12 h-12 rounded-full text-white flex items-center justify-center transition cursor-pointer shadow-md flex-shrink-0 active:scale-95 ${
                            elapsedSeconds > plannedDurationSec
                              ? 'bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-500/30'
                              : isRunning
                              ? 'bg-[#0066FF] hover:bg-blue-600 ring-4 ring-blue-500/20'
                              : 'bg-emerald-600 hover:bg-emerald-500 ring-4 ring-emerald-500/20'
                          }`}
                          title={
                            elapsedSeconds > plannedDurationSec
                              ? 'Overtime - Pause or Resume Timer'
                              : isRunning
                              ? 'Pause Timer'
                              : 'Resume Timer'
                          }
                        >
                          {isRunning ? (
                            <Pause className="w-5 h-5 fill-current" />
                          ) : (
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Dedicated Time Left Card */}
                  <div className="md:col-span-7 bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 md:p-5 shadow-xs">
                    <div className="flex items-center justify-between mb-2 text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate pr-2 max-w-[260px]">
                        Task: {effectiveTask?.title && effectiveTask.title !== 'open' && effectiveTask.title !== 'Focus Session'
                          ? effectiveTask.title
                          : 'Active Focus Session'}
                      </span>
                      {elapsedSeconds > plannedDurationSec ? (
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400 flex-shrink-0 animate-pulse">
                          +{Math.floor((elapsedSeconds - plannedDurationSec) / 60)}m overtime
                        </span>
                      ) : (
                        <span className="font-mono font-bold text-[#0066FF] dark:text-[#60A5FA] flex-shrink-0">
                          {Math.max(0, Math.ceil((plannedDurationSec - elapsedSeconds) / 60))}m left
                        </span>
                      )}
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-200/80 dark:bg-slate-800/80 overflow-hidden relative">
                      {elapsedSeconds > plannedDurationSec ? (
                        <div className="h-full w-full bg-rose-600 dark:bg-rose-500 rounded-full transition-all duration-300 relative shadow-sm" />
                      ) : (
                        <div
                          className="h-full bg-gradient-to-r from-[#0066FF] via-blue-500 to-[#38BDF8] rounded-full transition-all duration-300 relative"
                          style={{
                            width: `${Math.min(100, Math.max(0, (elapsedSeconds / plannedDurationSec) * 100))}%`,
                          }}
                        />
                      )}
                    </div>

                    <div className="mt-3.5 flex items-center justify-between pt-0.5">
                      <button
                        type="button"
                        onClick={handleCompleteCurrentTask}
                        className="px-4 py-2 rounded-xl bg-[#0066FF] hover:bg-blue-600 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5px]" />
                        <span>Complete Task</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleEndIncompleteSession}
                        className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition cursor-pointer bg-transparent"
                      >
                        End as Incomplete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM HALF: FOCUS ROOM STUDENT GRID */}
          <div className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0066FF] dark:text-[#60A5FA]" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                  {activeRoomObj.name} Students
                </h2>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  · {peers.length + 1} studying now
                </span>
              </div>
            </div>

            {/* Student Presence Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-x-4 gap-y-6">
              {/* YOU Card (Removed YOU prefix) */}
              <button
                type="button"
                onClick={() => {
                  setTempNameInput(userName);
                  setIsAvatarModalOpen(true);
                }}
                className="flex flex-col items-center group cursor-pointer select-none"
              >
                <div className="relative w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-[#0066FF] via-blue-400 to-sky-300 shadow-md group-hover:scale-105 transition">
                  <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-slate-900 border-2 border-white dark:border-slate-900">
                    <img
                      src={userAvatar.avatarUrl}
                      alt={userName}
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                </div>

                <div className="mt-2 text-center max-w-[90px]">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                    {userName}
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-[#0066FF] dark:text-[#60A5FA] block mt-0.5">
                    {userStats.rollingAverage} pts
                  </span>
                </div>
              </button>

              {/* PEERS CARDS WITH 3-DOT MENU & PINNING */}
              {sortedPeers.map((peer) => {
                const isPinnedThis = (pinnedInRoom[activeRoomCode || '000000'] || []).includes(peer.id);
                const isPinnedGlob = pinnedGlobal.includes(peer.id);
                const isPinned = isPinnedThis || isPinnedGlob;

                return (
                  <div key={peer.id} className="relative flex flex-col items-center group select-none">
                    <div
                      onClick={() => handleOpenPeerProfile(peer)}
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <div className="relative w-16 h-16 rounded-full p-0.5 bg-slate-200 dark:bg-slate-800 shadow-xs group-hover:scale-105 transition">
                        <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-slate-900 border-2 border-white dark:border-slate-900">
                          <img
                            src={peer.avatarUrl}
                            alt={peer.name}
                            className="w-full h-full object-cover rounded-full"
                          />
                        </div>

                        {isPinned && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#0066FF] text-white flex items-center justify-center shadow-xs text-[10px]">
                            <Pin className="w-3 h-3 fill-current" />
                          </span>
                        )}
                      </div>

                      <div className="mt-2 text-center max-w-[90px]">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                          {peer.name}
                        </span>
                        <span className="text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400 block mt-0.5">
                          {peer.points} pts
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePeerMenuId(activePeerMenuId === peer.id ? null : peer.id);
                      }}
                      className="absolute top-0 right-0 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center text-slate-500 hover:text-slate-900 transition cursor-pointer"
                    >
                      <MoreVertical className="w-3 h-3" />
                    </button>

                    {activePeerMenuId === peer.id && (
                      <div
                        className="absolute top-7 right-0 z-[100] w-52 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 text-[11px] animate-in fade-in zoom-in-95"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => handleTogglePinPeer(peer.id, 'room')}
                          className="w-full px-3.5 py-2 text-left font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                        >
                          <Pin className="w-3.5 h-3.5 text-[#0066FF]" />
                          <span>{isPinnedThis ? 'Unpin in this focus room' : 'Pin profile in this focus room'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTogglePinPeer(peer.id, 'global')}
                          className="w-full px-3.5 py-2 text-left font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800"
                        >
                          <Pin className="w-3.5 h-3.5 text-indigo-500 fill-current" />
                          <span>{isPinnedGlob ? 'Unpin globally' : 'Pin account on all focus rooms'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SHARE ROOM POP-UP MODAL */}
      {shareModalRoom && (
        <div
          onClick={() => setShareModalRoom(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {shareModalRoom.name}
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Share this focus room with classmates or followers
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShareModalRoom(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-6">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">
                Room Code
              </span>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-1 justify-center">
                  {shareModalRoom.code.split('').map((digit, idx) => (
                    <div
                      key={idx}
                      className="w-10 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xl font-bold flex items-center justify-center shadow-2xs"
                    >
                      {digit}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyCode(shareModalRoom.code)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#0066FF] hover:bg-blue-600 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs flex-shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">
                Direct Room Link
              </span>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/focus/${shareModalRoom.code}`}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 focus:outline-hidden truncate"
                />
                <button
                  type="button"
                  onClick={() => handleCopyLink(shareModalRoom.code)}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer flex-shrink-0 flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JOIN ROOM POP-UP MODAL */}
      {isJoinModalOpen && (
        <div
          onClick={() => {
            setIsJoinModalOpen(false);
            setJoinError(null);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Join Focus Room
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsJoinModalOpen(false);
                  setJoinError(null);
                }}
                className="w-7 h-7 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleJoinRoomSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">
                  6-Digit Room Code
                </label>

                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    value={joinCodeInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setJoinCodeInput(val);
                      setJoinError(null);
                    }}
                    placeholder="Paste or type 6-digit code"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-lg font-mono font-bold tracking-widest text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0066FF]"
                  />
                </div>

                {joinError && (
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block mt-2 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{joinError}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsJoinModalOpen(false);
                    setJoinError(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isJoiningRoom || joinCodeInput.length !== 6}
                  className="flex-1 py-2.5 rounded-xl bg-[#0066FF] hover:bg-blue-600 disabled:opacity-40 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  {isJoiningRoom ? 'Joining...' : 'Join Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ROOM MODAL */}
      {isCreateModalOpen && (
        <div
          onClick={() => setIsCreateModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Create Focus Room
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Enter a name for your focus room. A unique 6-digit code will be generated automatically.
            </p>

            <form onSubmit={handleCreateRoomSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                  Room Name
                </label>
                <input
                  type="text"
                  value={newRoomNameInput}
                  onChange={(e) => setNewRoomNameInput(e.target.value)}
                  placeholder="e.g. CS101 Study Group, Lofi Chill Stream"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0066FF]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingRoom}
                  className="flex-1 py-2.5 rounded-xl bg-[#0066FF] hover:bg-blue-600 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  {isCreatingRoom ? 'Creating...' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENAME ROOM MODAL */}
      {renameModalRoom && (
        <div
          onClick={() => setRenameModalRoom(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Rename Focus Room
            </h3>

            <form onSubmit={handleRenameSubmit} className="space-y-4 mt-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                  New Room Name
                </label>
                <input
                  type="text"
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0066FF]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRenameModalRoom(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRenamingRoom}
                  className="flex-1 py-2.5 rounded-xl bg-[#0066FF] hover:bg-blue-600 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  {isRenamingRoom ? 'Saving...' : 'Save Name'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIRECT LINK JOIN PROMPT MODAL */}
      {unjoinedLinkRoom && (
        <div
          onClick={() => setUnjoinedLinkRoom(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl"
          >
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/50 text-[#0066FF] dark:text-[#60A5FA] flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Join Focus Room?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
              You were invited to join <strong className="text-slate-800 dark:text-slate-200">"{unjoinedLinkRoom.name}"</strong> (Code: #{unjoinedLinkRoom.code}).
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleReturnToHub}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={handleConfirmLinkJoin}
                className="flex-1 py-2.5 rounded-xl bg-[#0066FF] hover:bg-blue-600 text-white text-xs font-bold transition cursor-pointer shadow-xs"
              >
                Join Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INVALID DIRECT LINK CODE MODAL */}
      {invalidLinkCode && (
        <div
          onClick={() => setInvalidLinkCode(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl"
          >
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Invalid Room Code
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
              The focus room with code <strong className="text-rose-600 font-mono">#{invalidLinkCode}</strong> does not exist or has been removed.
            </p>

            <button
              type="button"
              onClick={handleReturnToHub}
              className="w-full py-2.5 rounded-xl bg-[#0066FF] hover:bg-blue-600 text-white text-xs font-bold transition cursor-pointer shadow-xs"
            >
              Go to Focus Rooms Directory
            </button>
          </div>
        </div>
      )}

      {/* AVATAR EDIT MODAL */}
      {isAvatarModalOpen && (
        <div
          onClick={() => setIsAvatarModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Edit Your Student Profile
            </h3>

            <form onSubmit={handleSaveUserName} className="space-y-4 mt-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={tempNameInput}
                  onChange={(e) => {
                    setTempNameInput(e.target.value);
                    setNameError(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0066FF]"
                />
                {nameError && (
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block mt-1.5">
                    {nameError}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingName}
                  className="flex-1 py-2.5 rounded-xl bg-[#0066FF] hover:bg-blue-600 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  {isSavingName ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
