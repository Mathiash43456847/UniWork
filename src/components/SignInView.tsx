/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, 
  ArrowLeft,
  BookOpen, 
  ShieldCheck, 
  Key, 
  X, 
  PlusCircle,
  Database,
  CheckCircle2,
  CheckSquare,
  Square,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';
import { UNIWORK_DARK_LOGO_BASE64, UNIWORK_FULL_LOGO_BASE64 } from '../assets/logoData';
import uniworkFullLogoUrl from '../assets/iwork-full-logo.png';
import { UniWorkAuraGlow } from './UniWorkAuraGlow';

interface SignInViewProps {
  onSignInSuccess: (user: User) => void;
  onExploreAbout: () => void;
  onNavigateLegal?: (type: 'terms' | 'privacy') => void;
  onBack?: () => void;
}

export default function SignInView({ onSignInSuccess, onExploreAbout, onNavigateLegal, onBack }: SignInViewProps) {
  const darkLogoSrc = UNIWORK_DARK_LOGO_BASE64 || UNIWORK_FULL_LOGO_BASE64 || uniworkFullLogoUrl || '/uniwork-full-logo.png';
  const handleBack = onBack || onExploreAbout;
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [activeButton, setActiveButton] = useState<'signup' | 'signin' | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [shakeTerms, setShakeTerms] = useState(false);
  const [customIdInput, setCustomIdInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIntent, setCurrentIntent] = useState<'signup' | 'signin'>('signup');
  const [hoveredButton, setHoveredButton] = useState<'signup' | 'signin' | null>(null);
  const [delayedButtonGlow, setDelayedButtonGlow] = useState<'signup' | 'signin' | null>(null);
  const hoveredButtonRef = useRef<'signup' | 'signin' | null>(null);
  const hoverDelayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const leaveDelayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialGuardTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialGuardActiveRef = useRef<boolean>(true);

  // Initial 3-second guard window upon entering SignInView:
  // Ensures the card starts with the aura, and applies a 75ms delay to button hover during this 3s window.
  // Once the 3-second period has elapsed, button hover is immediate.
  useEffect(() => {
    isInitialGuardActiveRef.current = true;
    setDelayedButtonGlow(null); // Card starts with the aura

    initialGuardTimerRef.current = setTimeout(() => {
      isInitialGuardActiveRef.current = false;
    }, 3000);

    return () => {
      if (initialGuardTimerRef.current) clearTimeout(initialGuardTimerRef.current);
      if (hoverDelayTimerRef.current) clearTimeout(hoverDelayTimerRef.current);
      if (leaveDelayTimerRef.current) clearTimeout(leaveDelayTimerRef.current);
    };
  }, []);

  const handleButtonMouseEnter = (type: 'signup' | 'signin') => {
    hoveredButtonRef.current = type;
    setHoveredButton(type);
    if (leaveDelayTimerRef.current) clearTimeout(leaveDelayTimerRef.current);
    if (hoverDelayTimerRef.current) clearTimeout(hoverDelayTimerRef.current);

    if (isInitialGuardActiveRef.current) {
      // During the 3-second guard window: 75ms delay before colour goes over the button
      hoverDelayTimerRef.current = setTimeout(() => {
        if (hoveredButtonRef.current === type) {
          setDelayedButtonGlow(type);
        }
      }, 75);
    } else {
      // Once the 3-second period is gone: immediate response
      setDelayedButtonGlow(type);
    }
  };

  const handleButtonMouseLeave = () => {
    hoveredButtonRef.current = null;
    setHoveredButton(null);
    if (hoverDelayTimerRef.current) clearTimeout(hoverDelayTimerRef.current);
    if (leaveDelayTimerRef.current) clearTimeout(leaveDelayTimerRef.current);

    // Smoothly return aura to the card
    leaveDelayTimerRef.current = setTimeout(() => {
      setDelayedButtonGlow(null);
    }, 100);
  };

  // Pre-configured student workspace IDs (Zero PII - no emails, names, or avatars stored)
  const WORKSPACE_PROFILES = [
    {
      id: 'usr-mathias-cheow-primary',
      title: 'Primary Academic Workspace',
      badge: 'Default Student Profile',
      idCode: 'usr-mathias-cheow-primary',
    },
    {
      id: 'usr_study_workspace_2',
      title: 'Secondary Project Workspace',
      badge: 'Study & Projects Vault',
      idCode: 'usr_study_workspace_2',
    }
  ];

  // Listen for OAuth message from Google popup window
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.user) {
        setIsAuthenticating(false);
        setActiveButton(null);
        setShowGoogleChooser(false);
        setError(null);
        onSignInSuccess(event.data.user);
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR' || event.data?.type === 'GOOGLE_AUTH_ERROR') {
        setIsAuthenticating(false);
        setActiveButton(null);
        setError(event.data.error || 'Authentication failed. Please try again.');
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [onSignInSuccess]);

  // Trigger Real Google OAuth Popup or direct database account chooser
  const handleStartRealGoogleOAuth = async (intent: 'signup' | 'signin' = 'signup') => {
    if (intent === 'signup' && !agreedToTerms) {
      setShakeTerms(true);
      setTimeout(() => setShakeTerms(false), 600);
      setError('Please agree to the Terms of Service and Privacy Policy to proceed with sign up.');
      return;
    }
    setError(null);
    setCurrentIntent(intent);
    setActiveButton(intent);
    setIsAuthenticating(true);

    // Micro-delay so press animation is felt smoothly before opening chooser
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const res = await fetch(`/api/auth/google/url?intent=${intent}&tz=${encodeURIComponent(userTz)}`);
      const data = await res.json();
      if (data.hasClientId && data.url) {
        const authWindow = window.open(
          data.url,
          'google_oauth_popup',
          'width=550,height=650,top=100,left=100'
        );
        if (!authWindow) {
          setShowGoogleChooser(true);
        }
      } else {
        setShowGoogleChooser(true);
      }
    } catch (err) {
      console.warn('OAuth URL fetch error, falling back to workspace chooser:', err);
      setShowGoogleChooser(true);
    } finally {
      setIsAuthenticating(false);
      setActiveButton(null);
    }
  };

  // Select a workspace and sync to Postgres database using user_id solely
  const handleSelectWorkspace = async (profile: typeof WORKSPACE_PROFILES[0]) => {
    setError(null);
    setIsAuthenticating(true);
    try {
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const res = await fetch('/api/auth/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.id,
          intent: currentIntent,
          timeZone: userTz
        })
      });
      const data = await res.json();
      if (data.success && data.user) {
        setIsAuthenticating(false);
        setShowGoogleChooser(false);
        onSignInSuccess(data.user);
      } else {
        setIsAuthenticating(false);
        setError(data.error || 'Sign in failed.');
      }
    } catch (err: any) {
      setIsAuthenticating(false);
      setError(err.message || 'Failed to authenticate with database.');
    }
  };

  // Custom Student ID or Workspace ID Sign In / Sign Up
  const handleCustomWorkspaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customIdInput.trim()) return;

    setError(null);
    setIsAuthenticating(true);
    try {
      const targetId = customIdInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || `usr_${Date.now()}`;
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      const res = await fetch('/api/auth/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetId,
          intent: currentIntent,
          timeZone: userTz
        })
      });
      const data = await res.json();
      if (data.success && data.user) {
        setIsAuthenticating(false);
        setShowGoogleChooser(false);
        onSignInSuccess(data.user);
      } else {
        setIsAuthenticating(false);
        setError(data.error || 'Authentication rejected by database.');
      }
    } catch (err: any) {
      setIsAuthenticating(false);
      setError(err.message || 'Database connection error.');
    }
  };

  // Continue Without Account (Guest Session - Zero PII)
  const handleGuestSignIn = () => {
    const guestUser: User = {
      id: `usr-guest-${Date.now()}`,
      isGuest: true,
      encryptionEnabled: true,
      signedInAt: new Date().toISOString(),
      authProvider: 'guest',
    };
    onSignInSuccess(guestUser);
  };

  return (
    <div className="h-screen h-[100dvh] w-screen w-[100dvw] bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-y-auto overflow-x-hidden">
      
      {/* Top Right Back Button */}
      <motion.button
        type="button"
        onClick={handleBack}
        whileHover={{ scale: 1.05, x: -2 }}
        whileTap={{ scale: 0.95 }}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white shadow-xl backdrop-blur-md transition cursor-pointer group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 text-cyan-400" />
        <span>Back</span>
      </motion.button>

      {/* Background Ambient Glows */}
      <motion.div 
        animate={{
          scale: [1, 1.25, 1],
          opacity: [0.2, 0.35, 0.2]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-44 -left-44 w-[28rem] h-[28rem] bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none"
      />
      <motion.div 
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.3, 0.2]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -bottom-44 -right-44 w-[28rem] h-[28rem] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none"
      />
      <motion.div 
        animate={{
          scale: [0.9, 1.1, 0.9],
          opacity: [0.1, 0.25, 0.1]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[36rem] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none"
      />

      {/* Main Container Card with UniWork Rainbow Gradient Border Frame and Swirling Ambient Aura */}
      <div className="w-full max-w-[480px] sm:max-w-[520px] relative z-10 my-auto">
        {/* Restrained Swirling Aura behind the Card (reduced spread, soft elegant ambient glow) */}
        <UniWorkAuraGlow
          active={!delayedButtonGlow}
          intensity="card"
          pillClassName="rounded-[36px]"
          className="transition-opacity duration-500 ease-out"
        />

        <motion.div 
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          className="w-full relative z-10 p-[1.5px] rounded-[32px] overflow-hidden group shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]"
        >
          {/* Animated UniWork Gradient Mesh Glow Background (Fades out when user hovers on either button) */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4.8, repeat: Infinity, ease: "linear" }}
            className={`absolute -inset-[150%] blur-md pointer-events-none transition-opacity duration-500 ease-out ${
              delayedButtonGlow ? 'opacity-0' : 'opacity-70'
            }`}
            style={{
              background:
                'conic-gradient(from 0deg, #00D2FF 0%, #0066FF 25%, #6366F1 50%, #A855F7 75%, #00D2FF 100%)',
            }}
          />

        {/* Card Inner Body */}
        <div className="relative bg-slate-950/95 backdrop-blur-2xl rounded-[30px] overflow-hidden border border-slate-800/80">
          
          {/* Header Section */}
          <div className="p-8 sm:p-10 pb-6 text-center bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-950 border-b border-slate-800/80">
            
            {/* DARK LOGO */}
            <motion.div 
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 400 }}
              className="flex items-center justify-center mb-6"
            >
              <img 
                src={darkLogoSrc} 
                alt="UniWork Logo" 
                className="h-14 sm:h-16 w-auto object-contain max-w-[320px] drop-shadow-lg"
              />
            </motion.div>

            {/* Tagline Divider */}
            <div className="flex items-center justify-center gap-3 my-2 max-w-xs mx-auto">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-cyan-400" />
              <span className="text-[11px] sm:text-xs font-bold text-cyan-400 tracking-widest uppercase whitespace-nowrap">
                The Unified Workspace
              </span>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-cyan-500/50 to-cyan-400" />
            </div>
          </div>

          {/* Action Buttons Section */}
          <div className="p-7 sm:p-10 space-y-5">
            
            {/* Real-time Error Notification Banner */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 overflow-hidden"
                >
                  <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 cursor-pointer hover:text-white transition" onClick={() => setError(null)} />
                  <div className="flex-1">
                    <p className="font-semibold text-rose-200">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Terms Agreement Checkbox with Shake Animation */}
            <motion.div 
              animate={shakeTerms ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : {}}
              transition={{ duration: 0.5 }}
              onClick={() => {
                setAgreedToTerms(!agreedToTerms);
                if (error?.includes('Terms of Service')) setError(null);
              }}
              className={`flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/90 border transition-all select-none cursor-pointer group ${
                !agreedToTerms && shakeTerms 
                  ? 'border-rose-500 ring-2 ring-rose-500/20' 
                  : agreedToTerms 
                  ? 'border-cyan-500/50 bg-cyan-950/20 ring-1 ring-cyan-500/20' 
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-cyan-400 shrink-0">
                {agreedToTerms ? (
                  <CheckSquare className="w-5 h-5 text-cyan-400 fill-cyan-400/20" />
                ) : (
                  <Square className="w-5 h-5 text-slate-500 group-hover:text-slate-400" />
                )}
              </div>
              <p className="text-xs text-slate-300 leading-snug">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onNavigateLegal) onNavigateLegal('terms');
                    else onExploreAbout();
                  }}
                  className="text-cyan-400 hover:text-cyan-300 underline font-semibold cursor-pointer"
                >
                  Terms of Service
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onNavigateLegal) onNavigateLegal('privacy');
                    else onExploreAbout();
                  }}
                  className="text-cyan-400 hover:text-cyan-300 underline font-semibold cursor-pointer"
                >
                  Privacy Policy
                </button>
              </p>
            </motion.div>
            
            {/* 1. Sign up with Google (with UniWork Liquid Ambient Aura) */}
            <div className="relative group">
              {/* Google-style Deep Volumetric UniWork Liquid Ambient Aura */}
              <UniWorkAuraGlow active={delayedButtonGlow === 'signup'} pillClassName="rounded-full" />

              <motion.button
                type="button"
                disabled={isAuthenticating}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onMouseEnter={() => handleButtonMouseEnter('signup')}
                onMouseLeave={handleButtonMouseLeave}
                onClick={() => handleStartRealGoogleOAuth('signup')}
                className={`relative z-10 w-full py-4 px-6 rounded-full bg-white hover:bg-slate-50 text-slate-900 font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.25)] cursor-pointer active:scale-[0.99] disabled:opacity-60 overflow-hidden ${
                  activeButton === 'signup' ? 'ring-4 ring-cyan-400/40' : ''
                }`}
              >
                {activeButton === 'signup' && isAuthenticating ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 text-slate-900 font-semibold"
                  >
                    <Loader2 className="w-5 h-5 animate-spin text-cyan-600" />
                    <span>Connecting to Google...</span>
                  </motion.div>
                ) : (
                  <>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign up with Google</span>
                  </>
                )}
              </motion.button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 my-2">
              <div className="h-[1px] flex-1 bg-slate-800" />
              <span className="text-[11px] text-slate-500 uppercase tracking-widest font-sans font-semibold">OR</span>
              <div className="h-[1px] flex-1 bg-slate-800" />
            </div>

            {/* 2. Log in with Google (with UniWork Liquid Ambient Aura) */}
            <div className="relative group">
              {/* Google-style Deep Volumetric UniWork Liquid Ambient Aura */}
              <UniWorkAuraGlow active={delayedButtonGlow === 'signin'} pillClassName="rounded-full" />

              <motion.button
                type="button"
                disabled={isAuthenticating}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onMouseEnter={() => handleButtonMouseEnter('signin')}
                onMouseLeave={handleButtonMouseLeave}
                onClick={() => handleStartRealGoogleOAuth('signin')}
                className={`relative z-10 w-full py-4 px-6 rounded-full bg-white hover:bg-slate-50 text-slate-900 font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.25)] cursor-pointer active:scale-[0.99] disabled:opacity-60 overflow-hidden ${
                  activeButton === 'signin' ? 'ring-4 ring-cyan-400/40' : ''
                }`}
              >
                {activeButton === 'signin' && isAuthenticating ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 text-slate-900 font-semibold"
                  >
                    <Loader2 className="w-5 h-5 animate-spin text-cyan-600" />
                    <span>Logging in to Google...</span>
                  </motion.div>
                ) : (
                  <>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Log in with Google</span>
                  </>
                )}
              </motion.button>
            </div>

          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-950 border-t border-slate-800/80 text-center text-[11px] text-slate-500 px-6">
            <div className="flex items-center justify-center gap-3 font-medium">
              <button
                type="button"
                onClick={() => onNavigateLegal ? onNavigateLegal('privacy') : onExploreAbout()}
                className="text-slate-400 hover:text-cyan-300 transition cursor-pointer"
              >
                Privacy
              </button>
              <span className="text-slate-600">·</span>
              <button
                type="button"
                onClick={() => onNavigateLegal ? onNavigateLegal('terms') : onExploreAbout()}
                className="text-slate-400 hover:text-cyan-300 transition cursor-pointer"
              >
                Terms
              </button>
              <span className="text-slate-600">·</span>
              <span className="text-slate-500">© 2026 UniWork</span>
            </div>
          </div>

        </div>
      </motion.div>
    </div>

      {/* WORKSPACE / USER ID CHOOSER MODAL WITH SMOOTH ANIMATION */}
      <AnimatePresence>
        {showGoogleChooser && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 12 }}
              transition={{ type: "spring", stiffness: 350, damping: 26 }}
              className="bg-white text-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200"
            >
              
              {/* Modal Header */}
              <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-cyan-600" />
                    <h3 className="text-lg font-bold text-slate-900">
                      {currentIntent === 'signup' ? 'Select Student Workspace' : 'Sign in to Workspace'}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 pl-8">to connect to <strong className="text-slate-800">UniWork Database</strong></p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={() => setShowGoogleChooser(false)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Error inside chooser */}
              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mx-4 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Workspace List with Staggered Items */}
              <div className="p-4 space-y-2">
                {WORKSPACE_PROFILES.map((prof, idx) => (
                  <motion.button
                    key={prof.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    whileHover={{ scale: 1.01, x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    disabled={isAuthenticating}
                    onClick={() => handleSelectWorkspace(prof)}
                    className="w-full p-3.5 rounded-2xl hover:bg-slate-50 border border-slate-100 transition-all text-left flex items-center gap-3.5 cursor-pointer group disabled:opacity-50"
                  >
                    <div className="w-11 h-11 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-sm shrink-0">
                      <Database className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {prof.title}
                      </div>
                      <div className="text-xs text-slate-600 font-sans tabular-nums truncate">
                        ID: {prof.idCode}
                      </div>
                      <div className="text-[10px] text-cyan-700 font-semibold mt-0.5">
                        {prof.badge}
                      </div>
                    </div>
                    {isAuthenticating && (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                    )}
                  </motion.button>
                ))}

                {/* Enter Custom Workspace ID Option */}
                {!showCustomInput ? (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setShowCustomInput(true)}
                    className="w-full p-3.5 rounded-2xl hover:bg-slate-50 border border-dashed border-slate-300 transition-all text-left flex items-center gap-3.5 text-slate-700 font-semibold text-xs cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                      <PlusCircle className="w-5 h-5" />
                    </div>
                    <span>Enter custom Workspace ID or Student ID</span>
                  </motion.button>
                ) : (
                  <motion.form 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onSubmit={handleCustomWorkspaceSubmit} 
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2"
                  >
                    <label className="block text-xs font-bold text-slate-700">Enter Workspace / Student ID</label>
                    <input
                      type="text"
                      placeholder="e.g. mathias-primary or student-101"
                      value={customIdInput}
                      onChange={(e) => setCustomIdInput(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600 bg-white font-sans tabular-nums"
                      required
                      autoFocus
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl cursor-pointer"
                      >
                        Connect Workspace
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCustomInput(false)}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.form>
                )}
              </div>

              {/* Privacy Notice Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed text-center">
                COPPA & Minor Privacy Guarantee: UniWork stores only anonymous workspace identifiers. No real names, emails, or personal images are ever recorded.
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

