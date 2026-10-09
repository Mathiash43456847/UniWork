/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Send, Image as ImageIcon, Plus, Search, User, Check, CheckCheck, X, ShieldCheck, ArrowLeft, Paperclip, ExternalLink, Download } from 'lucide-react';
import { encryptData, decryptData } from '../lib/encryption';

const CHAT_ENCRYPTION_SECRET = 'uniwork_admin_mesh_network_vault_key_2026';

export interface AdminAccount {
  id: string;
  name: string;
  updatedAt?: string;
}

export interface DecryptedMessage {
  id: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  receiverName: string;
  text: string;
  imageUrl?: string;
  createdAt: string;
  isRead: boolean;
}

interface AdminChatViewProps {
  currentUser: { id: string } | null;
  allowedAdminUserIds: string[];
  themeMode?: 'day' | 'night';
  onUnreadCountChange?: (count: number) => void;
  onOpenGeneral?: () => void;
  onSetSidebarCollapsed?: (collapsed: boolean) => void;
}

// Helper to render text with underlined, clickable URLs
function renderMessageTextWithLinks(text: string) {
  // Regex to detect http://, https://, and www. URLs
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      const href = part.startsWith('http://') || part.startsWith('https://') ? part : `https://${part}`;
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="underline underline-offset-2 hover:opacity-80 transition inline-flex items-center gap-0.5 font-medium break-all"
        >
          <span>{part}</span>
          <ExternalLink className="w-3.5 h-3.5 inline-block shrink-0 opacity-80" />
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export const AdminChatView: React.FC<AdminChatViewProps> = ({
  currentUser,
  allowedAdminUserIds,
  themeMode = 'day',
  onUnreadCountChange,
  onOpenGeneral,
  onSetSidebarCollapsed,
}) => {
  const currentUserId = currentUser?.id || 'usr_g_8cced70b14994d07';

  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);
  const [contacts, setContacts] = useState<AdminAccount[]>([]);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddContactOpen, setIsAddContactOpen] = useState<boolean>(false);

  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);

  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);

  const downloadImageAsPng = (imgUrl: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        try {
          const pngUrl = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.href = pngUrl;
          downloadLink.download = `uniwork_chat_${Date.now()}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        } catch {
          const downloadLink = document.createElement('a');
          downloadLink.href = imgUrl;
          downloadLink.download = `uniwork_chat_${Date.now()}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }
      }
    };
    img.src = imgUrl;
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatPaneRef = useRef<HTMLDivElement>(null);

  // 1. Fetch registered admin accounts from backend
  const fetchAdminAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/accounts');
      const data = await res.json();
      if (data.success && Array.isArray(data.accounts)) {
        setAdminAccounts(data.accounts);
      }
    } catch (err) {
      console.warn('Failed to load admin accounts:', err);
    }
  }, []);

  // 2. Load contacts from localStorage or initialize with registered accounts
  useEffect(() => {
    fetchAdminAccounts();
  }, [fetchAdminAccounts]);

  useEffect(() => {
    try {
      const savedContacts = localStorage.getItem(`uniwork_admin_contacts_${currentUserId}`);
      if (savedContacts) {
        const parsed = JSON.parse(savedContacts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setContacts(parsed);
          return;
        }
      }
    } catch {
      // ignore
    }

    // Default: populate other allowed admins
    if (adminAccounts.length > 0) {
      const others = adminAccounts.filter((a) => a.id !== currentUserId);
      setContacts(others);
    }
  }, [adminAccounts, currentUserId]);

  // Save contacts to localStorage whenever updated
  const saveContactsList = (newContacts: AdminAccount[]) => {
    setContacts(newContacts);
    try {
      localStorage.setItem(`uniwork_admin_contacts_${currentUserId}`, JSON.stringify(newContacts));
    } catch {
      // ignore
    }
  };

  // 3. Fetch unread counts
  const fetchUnreadCounts = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/messages/unread-count?userId=${encodeURIComponent(currentUserId)}`);
      const data = await res.json();
      if (data.success) {
        setUnreadMap(data.bySender || {});
        if (onUnreadCountChange) {
          onUnreadCountChange(data.count || 0);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch unread count:', err);
    }
  }, [currentUserId, onUnreadCountChange]);

  // 4. Fetch messages between current user and active contact
  const fetchMessages = useCallback(async () => {
    if (!activeContactId) {
      setMessages([]);
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/messages?userId=${encodeURIComponent(currentUserId)}&contactId=${encodeURIComponent(activeContactId)}`
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        // Decrypt each message client-side with AES-256
        const decryptedList = await Promise.all(
          data.messages.map(async (m: any) => {
            try {
              const rawDecrypted = await decryptData(m.encryptedPayload, CHAT_ENCRYPTION_SECRET);
              const payload = JSON.parse(rawDecrypted);
              return {
                id: m.id,
                senderId: m.senderId,
                receiverId: m.receiverId,
                senderName: payload.senderName || m.senderId,
                receiverName: payload.receiverName || m.receiverId,
                text: payload.text || '',
                imageUrl: payload.imageUrl || undefined,
                createdAt: m.createdAt,
                isRead: m.isRead,
              };
            } catch {
              return {
                id: m.id,
                senderId: m.senderId,
                receiverId: m.receiverId,
                senderName: m.senderId,
                receiverName: m.receiverId,
                text: '[Encrypted message cannot be decrypted]',
                createdAt: m.createdAt,
                isRead: m.isRead,
              };
            }
          })
        );

        setMessages(decryptedList);

        // Mark messages as read
        if (data.messages.some((m: any) => m.receiverId === currentUserId && !m.isRead)) {
          await fetch('/api/admin/messages/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, contactId: activeContactId }),
          });
          fetchUnreadCounts();
        }
      }
    } catch (err) {
      console.warn('Failed to fetch admin messages:', err);
    }
  }, [activeContactId, currentUserId, fetchUnreadCounts]);

  // Initial load and periodic refresh
  useEffect(() => {
    fetchMessages();
    fetchUnreadCounts();
  }, [fetchMessages, fetchUnreadCounts]);

  // SSE Stream Listener for instant real-time message sync
  useEffect(() => {
    let evtSource: EventSource | null = null;
    try {
      evtSource = new EventSource('/api/events-stream');
      evtSource.onmessage = () => {
        fetchMessages();
        fetchUnreadCounts();
        fetchAdminAccounts();
      };
    } catch {
      // fallback to interval
    }

    const interval = setInterval(() => {
      fetchMessages();
      fetchUnreadCounts();
    }, 4000);

    return () => {
      if (evtSource) evtSource.close();
      clearInterval(interval);
    };
  }, [fetchMessages, fetchUnreadCounts, fetchAdminAccounts]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingImage]);

  // Handle Drag & Drop Images into chat
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setPendingImage(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processImageFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processImageFile(e.target.files[0]);
    }
  };

  // Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputMessage.trim() && !pendingImage) || !activeContactId || isSending) return;

    setIsSending(true);

    const activeContact = adminAccounts.find((a) => a.id === activeContactId) || contacts.find((c) => c.id === activeContactId);
    const myAccount = adminAccounts.find((a) => a.id === currentUserId);

    const senderName = myAccount?.name || currentUserId;
    const receiverName = activeContact?.name || activeContactId;

    const payloadObject = {
      text: inputMessage.trim(),
      imageUrl: pendingImage || undefined,
      senderName,
      receiverName,
      timestamp: new Date().toISOString(),
    };

    try {
      // 1. Encrypt payload with AES-256
      const encryptedPayload = await encryptData(payloadObject, CHAT_ENCRYPTION_SECRET);

      // 2. Dispatch to server
      const res = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUserId,
          receiverId: activeContactId,
          encryptedPayload,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setInputMessage('');
        setPendingImage(null);
        fetchMessages();
      }
    } catch (err) {
      console.error('Failed to send encrypted message:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Add Contact by Admin Name
  const handleAddContact = (account: AdminAccount) => {
    if (!contacts.some((c) => c.id === account.id)) {
      const updated = [...contacts, account];
      saveContactsList(updated);
    }
    setActiveContactId(account.id);
    onSetSidebarCollapsed?.(true); // Collapse main sidebar
    setIsAddContactOpen(false);
  };

  // Filter contacts by search query
  const filteredContacts = contacts.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
  });

  // Accounts available to add (not yet in contact list and not self)
  const availableToAdd = adminAccounts.filter(
    (a) => a.id !== currentUserId && !contacts.some((c) => c.id === a.id)
  );

  const activeContact = adminAccounts.find((a) => a.id === activeContactId) || contacts.find((c) => c.id === activeContactId);

  return (
    <div
      className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#070A11] overflow-hidden select-none"
      id="admin-chat-view"
    >
      {/* Main Chat Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Admin Contacts Directory */}
        <div className={`${activeContactId ? 'hidden' : 'w-full md:w-85'} border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0B111E] flex flex-col shrink-0 h-full animate-fade-in`}>
          {/* Search & Add Contact Header */}
          <div className="p-4 border-b border-slate-150 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-sans">
                Admin Directory
              </span>
              <button
                type="button"
                onClick={() => setIsAddContactOpen(!isAddContactOpen)}
                className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[#0066FF] dark:text-[#60A5FA] text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                title="Add admin contact by name"
              >
                <Plus className="w-4 h-4 stroke-[2.5px]" />
                <span>Add Contact</span>
              </button>
            </div>

            {/* Contact Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search admins by name..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:bg-white dark:focus:bg-slate-800 focus:border-[#0066FF] focus:outline-hidden transition"
              />
            </div>
          </div>

          {/* Add Contact Dropdown Drawer */}
          {isAddContactOpen && (
            <div className="p-4 bg-blue-50/70 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/40 animate-fade-in space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Select Admin by Name:</span>
                <button
                  type="button"
                  onClick={() => setIsAddContactOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {availableToAdd.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic py-1">
                  All authorized admin accounts are already added to your contacts.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {availableToAdd.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleAddContact(acc)}
                      className="w-full text-left p-2.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 transition flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 group cursor-pointer"
                    >
                      <div className="truncate">
                        <span className="font-bold text-sm">{acc.name}</span>
                        <span className="block font-mono text-[11px] text-slate-400 dark:text-slate-400 group-hover:text-blue-100 truncate">
                          {acc.id}
                        </span>
                      </div>
                      <Plus className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-white" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {filteredContacts.length === 0 ? (
              <div className="text-center py-8 px-4 text-slate-400 dark:text-slate-500">
                <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold">No admin contacts found</p>
                <p className="text-xs mt-1">Click "Add Contact" above to start a conversation.</p>
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const isActive = contact.id === activeContactId;
                const unreadCount = unreadMap[contact.id] || 0;
                const isSuper = contact.id === 'usr_g_8cced70b14994d07';

                return (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => {
                      setActiveContactId(contact.id);
                      onSetSidebarCollapsed?.(true); // Collapse main sidebar
                    }}
                    className={`w-full text-left p-3.5 rounded-xl transition flex items-center justify-between cursor-pointer border ${
                      isActive
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/80 shadow-2xs'
                        : 'bg-transparent border-transparent hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-sm text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shrink-0 relative">
                        {contact.name.charAt(0).toUpperCase()}
                        {isSuper && (
                          <span
                            className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white dark:border-slate-900"
                            title="Super Admin"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm font-bold truncate ${isActive ? 'text-[#0066FF] dark:text-[#60A5FA]' : 'text-slate-900 dark:text-slate-100'}`}>
                            {contact.name}
                          </span>
                          {isSuper && (
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded shrink-0">
                              Super
                            </span>
                          )}
                        </div>
                        <span className="block font-mono text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                          {contact.id}
                        </span>
                      </div>
                    </div>

                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shrink-0 shadow-xs">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Conversation Thread */}
        <div
          ref={chatPaneRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`${activeContactId ? 'flex' : 'hidden'} flex-1 flex flex-col bg-slate-50/70 dark:bg-[#070A11] relative overflow-hidden h-full`}
        >
          {/* Drag & Drop Visual Overlay */}
          {isDraggingOver && (
            <div className="absolute inset-0 z-30 bg-[#0066FF]/10 dark:bg-[#0066FF]/20 border-2 border-dashed border-[#0066FF] backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center pointer-events-none">
              <div className="w-14 h-14 rounded-2xl bg-[#0066FF] text-white flex items-center justify-center shadow-lg mb-3 animate-bounce">
                <ImageIcon className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Drop image to attach to chat</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Image will be AES-256 encrypted before transmission</p>
            </div>
          )}

          {activeContact ? (
            <>
              {/* Conversation Top Header */}
              <div className="px-6 py-4 bg-white dark:bg-[#0F172A] border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-2xs">
                <div className="flex items-center gap-3.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveContactId(null);
                      onSetSidebarCollapsed?.(false); // Restore main sidebar when exiting
                    }}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition shrink-0 mr-1.5 cursor-pointer flex items-center justify-center shadow-2xs"
                    title="Exit chat to Directory"
                  >
                    <ArrowLeft className="w-4.5 h-4.5 stroke-[2.5px]" />
                  </button>

                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/50 flex items-center justify-center text-sm font-bold text-[#0066FF] dark:text-[#60A5FA]">
                    {activeContact.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">{activeContact.name}</h2>
                      {activeContact.id === 'usr_g_8cced70b14994d07' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                          Super Admin
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-xs text-slate-400 dark:text-slate-500 mt-0.5">{activeContact.id}</p>
                  </div>
                </div>

                <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>End-to-End Encrypted</span>
                </div>
              </div>

              {/* Messages Scroll View (High-Density WhatsApp Compact Style) */}
              <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 dark:text-slate-500">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-3">
                      <MessageSquare className="w-6 h-6 opacity-60" />
                    </div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No messages yet with {activeContact.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
                      Send a message or drag & drop an image to start a secure, encrypted admin conversation.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isMe = msg.senderId === currentUserId;
                    const prevMsg = index > 0 ? messages[index - 1] : null;
                    const isSameSender = prevMsg && prevMsg.senderId === msg.senderId;
                    const isCloseInTime = prevMsg && (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() < 5 * 60 * 1000);
                    const isGrouped = isSameSender && isCloseInTime;

                    const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isGrouped ? 'mt-1' : 'mt-3.5'}`}
                      >
                        {/* Show Overhead Sender Name ONLY for first message in a group if from other user */}
                        {!isGrouped && !isMe && (
                          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-1 mb-1">
                            {msg.senderName}
                          </div>
                        )}

                        {/* Message Bubble: Compact WhatsApp style with inline timestamp */}
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-1.5 md:py-2 text-xs md:text-sm leading-snug shadow-2xs break-words relative group ${
                            isMe
                              ? 'bg-[#0066FF] text-white rounded-tr-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-tl-xs'
                          }`}
                        >
                          {/* Attached Image if present */}
                          {msg.imageUrl && (
                            <div className="relative group/img cursor-pointer rounded-xl overflow-hidden mb-1 border border-black/10 dark:border-white/10">
                              <img
                                src={msg.imageUrl}
                                alt="Attachment"
                                onClick={() => setPreviewModalImage(msg.imageUrl || null)}
                                className="max-h-60 w-auto object-cover rounded-xl hover:opacity-95 transition"
                              />
                              {/* Hover Download Overlay */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadImageAsPng(msg.imageUrl!);
                                }}
                                className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-[#0066FF] text-white transition opacity-0 group-hover/img:opacity-100 cursor-pointer shadow-2xs flex items-center justify-center"
                                title="Download PNG"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Text with Inline Timestamp (WhatsApp style) */}
                          {msg.text && (
                            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 font-sans">
                              <span className="whitespace-pre-wrap flex-1 min-w-[60px]">
                                {renderMessageTextWithLinks(msg.text)}
                              </span>
                              <span
                                className={`text-[10px] font-mono select-none self-end ml-auto shrink-0 ${
                                  isMe ? 'text-blue-100/90' : 'text-slate-400 dark:text-slate-500'
                                }`}
                              >
                                {formattedTime}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Pending Attached Image Preview Bar */}
              {pendingImage && (
                <div className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={pendingImage}
                      alt="Pending attach"
                      className="w-14 h-14 object-cover rounded-lg border border-slate-300 dark:border-slate-600"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">Image attached</span>
                      <span className="text-[11px] text-slate-400">Ready to send (AES-256 encrypted)</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingImage(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                    title="Remove attached image"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>
              )}

              {/* Message Input Form */}
              <div className="p-4 bg-white dark:bg-[#0F172A] border-t border-slate-200/80 dark:border-slate-800">
                <form
                  onSubmit={handleSendMessage}
                  className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-2 focus-within:border-[#0066FF] transition"
                >
                  {/* Hidden File Input for Image Attachments */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="sr-only"
                  />

                  {/* Attachment Icon Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 rounded-xl text-slate-400 hover:text-[#0066FF] hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer shrink-0"
                    title="Attach Image (or drag and drop directly)"
                  >
                    <Paperclip className="w-4.5 h-4.5" />
                  </button>

                  {/* Text Input */}
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={`Message ${activeContact.name}...`}
                    className="flex-1 bg-transparent px-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden"
                  />

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={(!inputMessage.trim() && !pendingImage) || isSending}
                    className="p-2.5 rounded-xl bg-[#0066FF] hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition cursor-pointer shrink-0 shadow-2xs"
                    title="Send Encrypted Message"
                  >
                    <Send className="w-4.5 h-4.5 stroke-[2.2px]" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-slate-500">
              <MessageSquare className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Select an Admin Contact</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Choose an administrator from the left directory to open their encrypted chat channel.</p>
            </div>
          )}
        </div>
      </div>

      {/* Full Image Preview Modal */}
      {previewModalImage && (
        <div
          onClick={() => setPreviewModalImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in cursor-zoom-out"
        >
          <div className="relative max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl bg-black">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                downloadImageAsPng(previewModalImage);
              }}
              className="absolute top-3 right-14 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-[#0066FF] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Download as PNG"
            >
              <Download className="w-4 h-4" />
              <span>Download PNG</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewModalImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={previewModalImage} alt="Expanded preview" className="w-full h-auto max-h-[85vh] object-contain" />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminChatView;
