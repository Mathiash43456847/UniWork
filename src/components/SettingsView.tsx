import React, { useState } from 'react';
import { Sliders, MessageSquare } from 'lucide-react';
import { User, Tag, ActiveTab } from '../types';
import { ProfileSection } from './settings/ProfileSection';
import { AppearanceSection } from './settings/AppearanceSection';
import { CalendarSection } from './settings/CalendarSection';
import { AccountSection } from './settings/AccountSection';
import { FeedbackModal } from './settings/FeedbackModal';

interface SettingsViewProps {
  snapInterval?: number;
  onSaveSnapInterval?: (interval: number) => Promise<void>;
  recurrenceBehavior?: 'ask' | 'one' | 'all';
  onSaveRecurrenceBehavior?: (behavior: 'ask' | 'one' | 'all') => Promise<void>;
  currentUser?: User | null;
  onSignOut?: () => void;
  onOpenSignIn?: () => void;
  tags?: Tag[];
  onSaveTagsOrder?: (orderedTags: Tag[]) => void;
  onDeleteAccountAndData?: () => Promise<void>;
  setActiveTab?: (tab: ActiveTab) => void;
  onViewAboutPage?: () => void;
  themePreference?: 'auto' | 'day' | 'night';
  onSetThemePreference?: (pref: 'auto' | 'day' | 'night') => void;
}

export default function SettingsView({
  snapInterval = 10,
  onSaveSnapInterval = async () => {},
  recurrenceBehavior = 'ask',
  onSaveRecurrenceBehavior = async () => {},
  currentUser,
  onSignOut,
  onOpenSignIn,
  tags = [],
  onSaveTagsOrder = () => {},
  onDeleteAccountAndData,
  setActiveTab,
  onViewAboutPage,
  themePreference = 'auto',
  onSetThemePreference,
}: SettingsViewProps) {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-100 dark:bg-[#070A11] text-slate-800 dark:text-slate-100 transition-colors duration-200" id="larkcal-settings-view">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            <Sliders className="w-6 h-6 text-[#0066FF] dark:text-[#60A5FA]" />
            <span>Settings</span>
          </h2>
        </div>

        {/* Section 1: Profile */}
        <ProfileSection
          currentUser={currentUser}
          onSignOut={onSignOut}
          onOpenSignIn={onOpenSignIn}
        />

        {/* Section 2: Appearance */}
        <AppearanceSection
          themePreference={themePreference}
          onSetThemePreference={onSetThemePreference}
        />

        {/* Section 3: Calendar Options */}
        <CalendarSection
          snapInterval={snapInterval}
          onSaveSnapInterval={onSaveSnapInterval}
          recurrenceBehavior={recurrenceBehavior}
          onSaveRecurrenceBehavior={onSaveRecurrenceBehavior}
          tags={tags}
          onSaveTagsOrder={onSaveTagsOrder}
        />

        {/* Section 4: Account */}
        <AccountSection
          onDeleteAccountAndData={onDeleteAccountAndData}
        />

        {/* Footer Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400 pt-8 border-t border-slate-200 dark:border-slate-800 font-medium">
          <button
            type="button"
            onClick={onViewAboutPage}
            className="hover:text-[#0066FF] dark:hover:text-[#60A5FA] transition cursor-pointer"
          >
            About UniWork
          </button>
          <button
            type="button"
            onClick={() => setActiveTab?.('privacy')}
            className="hover:text-[#0066FF] dark:hover:text-[#60A5FA] transition cursor-pointer"
          >
            Privacy Policy
          </button>
          <button
            type="button"
            onClick={() => setActiveTab?.('terms')}
            className="hover:text-[#0066FF] dark:hover:text-[#60A5FA] transition cursor-pointer"
          >
            Terms of Service
          </button>
          <button
            type="button"
            onClick={() => setIsFeedbackOpen(true)}
            className="hover:text-[#0066FF] dark:hover:text-[#60A5FA] transition cursor-pointer font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#0066FF]" />
            <span>Send Feedback</span>
          </button>
        </div>
      </div>

      {/* Working Feedback Modal */}
      <FeedbackModal
        currentUser={currentUser}
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />
    </div>
  );
}
