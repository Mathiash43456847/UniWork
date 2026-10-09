/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Shield, ArrowLeft, Mail, Lock, Database, Trash2, Users, CheckCircle2 } from 'lucide-react';
import { ActiveTab } from '../types';
import { UNIWORK_DARK_LOGO_BASE64, UNIWORK_FULL_LOGO_BASE64 } from '../assets/logoData';
import uniworkFullLogoUrl from '../assets/iwork-full-logo.png';

interface LegalViewProps {
  type: 'privacy' | 'terms';
  setActiveTab: (tab: ActiveTab) => void;
}

export default function LegalView({ type, setActiveTab }: LegalViewProps) {
  const isPrivacy = type === 'privacy';
  const logoSrc = UNIWORK_DARK_LOGO_BASE64 || UNIWORK_FULL_LOGO_BASE64 || uniworkFullLogoUrl || '/uniwork-full-logo.png';

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-900 text-slate-100 font-sans selection:bg-cyan-500 selection:text-white" id={`uniwork-legal-${type}`}>
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3 h-16 flex items-center">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-4 h-full">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 h-full">
            <button
              onClick={() => setActiveTab('about')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold transition cursor-pointer shrink-0 shadow-xs z-10"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div className="flex items-center h-full min-w-0 py-1">
              <img
                src={logoSrc}
                alt="UniWork Logo"
                className="h-8 sm:h-9 w-auto max-w-[200px] object-contain object-left block brightness-110"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60 shrink-0">
            <button
              onClick={() => setActiveTab('privacy')}
              className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                isPrivacy ? 'bg-cyan-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setActiveTab('terms')}
              className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                !isPrivacy ? 'bg-cyan-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Terms of Service
            </button>
          </div>
        </div>
      </header>

      {/* Main Document Content */}
      <main className="max-w-3xl mx-auto px-4 py-10 sm:py-14 space-y-10">
        {isPrivacy ? (
          /* Privacy Policy Content */
          <article className="space-y-8 animate-in fade-in duration-200">
            <div className="space-y-3 border-b border-slate-800 pb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/50 text-xs font-semibold">
                <Shield className="w-3.5 h-3.5" /> Official Policy
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                UniWork Privacy Policy
              </h1>
              <p className="text-sm text-slate-400">
                Effective date: August 2026 • Dedicated to data minimization and user privacy.
              </p>
            </div>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span className="text-cyan-400 font-sans tabular-nums">1.</span> Introduction
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                UniWork respects your privacy. Because we believe in data minimization, we collect significantly less information than typical apps. This policy explains exactly what we collect and why.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span className="text-cyan-400 font-sans tabular-nums">2.</span> What We Collect
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                We collect only the minimum data necessary to provide study productivity tracking:
              </p>
              <ul className="space-y-2.5 text-sm text-slate-300 pl-2">
                <li className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0" />
                  <div>
                    <strong className="text-white">Study Productivity Levels:</strong> Data you manually input regarding your study habits which would be processed by our proprietary system that would detect your productivity level.
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0" />
                  <div>
                    <strong className="text-white">Anonymous Internal User ID:</strong> A system-generated random ID used to save your progress.
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0" />
                  <div>
                    <strong className="text-white">Global Trend Data:</strong> Aggregated, anonymized statistics used to improve the platform.
                  </div>
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span className="text-cyan-400 font-sans tabular-nums">3.</span> What We Do NOT Collect
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                To protect your privacy, we explicitly do <strong className="text-rose-400">NOT</strong> collect or store:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {[
                  'Email addresses (discarded immediately after login)',
                  'IP addresses',
                  'Personal names or demographic info',
                  'Payment information',
                  'Location data'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300">
                    <span className="text-rose-400 font-bold">✕</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span className="text-cyan-400 font-sans tabular-nums">4.</span> How We Use Your Data
              </h2>
              <ul className="space-y-2 text-sm text-slate-300 pl-2">
                <li className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0" />
                  <span>To provide the core functionality of tracking your study productivity.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0" />
                  <span>To generate anonymous global trends (e.g., "average study time per day") which may be shared with third parties for research purposes.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0" />
                  <span className="text-white font-medium">We never sell individual user data. Only aggregated, fully anonymized global trends are shared.</span>
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span className="text-cyan-400 font-sans tabular-nums">5.</span> Authentication
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                We use Google OAuth for secure login. We temporarily access your Google ID to verify you, but we immediately discard it and replace it with our own anonymous Internal User ID. We never see your password or email.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span className="text-cyan-400 font-sans tabular-nums">6.</span> Data Retention & Deletion
              </h2>
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2 text-sm text-slate-300">
                <p>
                  • Your productivity data is stored securely in our encrypted database (Neon / PostgreSQL).
                </p>
                <p>
                  • You can delete your account at any time via Settings. Upon deletion, your Internal User ID and all associated data are permanently removed within 24 hours.
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span className="text-cyan-400 font-sans tabular-nums">7.</span> Children's Privacy
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                UniWork is open to all ages. Because we collect zero Personally Identifiable Information (PII) and store no emails, we comply with COPPA/GDPR-K through data minimization rather than age gates.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span className="text-cyan-400 font-sans tabular-nums">8.</span> Security
              </h2>
              <div className="space-y-2 text-sm text-slate-300">
                <p>• Data is encrypted at rest (PostgreSQL / Neon Database) and in transit (HTTPS via Vercel / Cloud Run).</p>
                <p>• Access to raw data is limited strictly to the founder.</p>
              </div>
            </section>

            <section className="space-y-3 pt-4 border-t border-slate-800">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span className="text-cyan-400 font-sans tabular-nums">9.</span> Contact Us
              </h2>
              <p className="text-sm text-slate-300">
                If you have questions about this policy, contact us at:
              </p>
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Customer Support</div>
                  <a
                    href="mailto:management@myuniwork.app"
                    className="text-cyan-400 hover:text-cyan-300 font-sans font-medium text-sm transition mt-0.5 inline-block"
                  >
                    management@myuniwork.app
                  </a>
                </div>
                <a
                  href="mailto:management@myuniwork.app"
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 justify-center"
                >
                  <Mail className="w-4 h-4" />
                  <span>Send Email</span>
                </a>
              </div>
            </section>
          </article>
        ) : (
          /* Terms of Service Content */
          <article className="space-y-8 animate-in fade-in duration-200">
            <div className="space-y-3 border-b border-slate-800 pb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/50 text-xs font-semibold">
                <Shield className="w-3.5 h-3.5" /> Legal Agreement
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                UniWork Terms of Service
              </h1>
              <p className="text-sm text-slate-400">
                Effective date: August 2026 • Please read carefully before using myuniwork.app.
              </p>
            </div>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span className="text-cyan-400 font-sans tabular-nums">1.</span> Acceptance of Terms
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                By accessing or using <span className="text-white font-semibold">myuniwork.app</span> ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span className="text-cyan-400 font-sans tabular-nums">2.</span> Use of the Service
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                UniWork provides a platform for tracking study productivity and viewing global study trends. You agree to use the Service only for lawful purposes. You are prohibited from:
              </p>
              <ul className="space-y-2 text-sm text-slate-300 pl-2">
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-400 font-bold">✕</span>
                  <span>Attempting to breach, hack, or disrupt our servers, database (Neon), or hosting (Vercel).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-400 font-bold">✕</span>
                  <span>Uploading malicious code, viruses, or spam.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-400 font-bold">✕</span>
                  <span>Using automated bots or scripts to interact with the Service without permission.</span>
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span className="text-cyan-400 font-sans tabular-nums">3.</span> User Accounts & Data
              </h2>
              <ul className="space-y-2.5 text-sm text-slate-300 pl-2">
                <li className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0" />
                  <span>You authenticate using Google OAuth, but we do not store your email. We assign you an anonymous Internal User ID.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0" />
                  <span>You are responsible for maintaining the security of your Google account used to access UniWork.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0" />
                  <span>As stated in our Privacy Policy, you own your inputted study data. We claim no ownership over your personal productivity inputs.</span>
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span className="text-cyan-400 font-sans tabular-nums">4.</span> Intellectual Property
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                The UniWork platform, including its proprietary system for detecting productivity levels, global trend algorithms, design, and code, is the exclusive property of Unial (UniWork). You may not copy, modify, or distribute any part of the Service without explicit written permission.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span className="text-cyan-400 font-sans tabular-nums">5.</span> "As Is" Disclaimer & Limitation of Liability
              </h2>
              <div className="space-y-2 text-sm text-slate-300">
                <p>• The Service is provided on an "AS IS" and "AS AVAILABLE" basis, without warranties of any kind.</p>
                <p>• We do not guarantee that the Service will be uninterrupted or error-free.</p>
                <p>• Unial (UniWork) and its employees shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service, including loss of data or productivity tracking errors.</p>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span className="text-cyan-400 font-sans tabular-nums">6.</span> Termination
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                We reserve the right to suspend or terminate your access to the Service at any time, without notice, if you violate these Terms or engage in activity that threatens the stability of the platform. You may stop using the Service and delete your account at any time.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span className="text-cyan-400 font-sans tabular-nums">7.</span> Changes to Terms
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                We may update these Terms from time to time as UniWork grows. Continued use of the Service after any changes constitutes your acceptance of the new Terms.
              </p>
            </section>

            <section className="space-y-3 pt-4 border-t border-slate-800">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span className="text-cyan-400 font-sans tabular-nums">8.</span> Contact Us
              </h2>
              <p className="text-sm text-slate-300">
                For any questions regarding these Terms, please contact:
              </p>
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Customer Support</div>
                  <a
                    href="mailto:management@myuniwork.app"
                    className="text-cyan-400 hover:text-cyan-300 font-sans font-medium text-sm transition mt-0.5 inline-block"
                  >
                    management@myuniwork.app
                  </a>
                </div>
                <a
                  href="mailto:management@myuniwork.app"
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 justify-center"
                >
                  <Mail className="w-4 h-4" />
                  <span>Send Email</span>
                </a>
              </div>
            </section>
          </article>
        )}
      </main>

      {/* Footer bar */}
      <footer className="border-t border-slate-800 py-6 px-4 text-center text-xs text-slate-500">
        <p>© 2026 UniWork (Unial). All rights reserved. • <a href="mailto:management@myuniwork.app" className="text-slate-400 hover:text-white underline">management@myuniwork.app</a></p>
      </footer>
    </div>
  );
}
