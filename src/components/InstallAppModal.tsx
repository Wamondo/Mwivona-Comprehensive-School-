import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  Tablet,
  Laptop,
  CheckCircle2,
  X,
  Share2,
  PlusSquare,
  Globe,
  Sparkles,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isDesktop, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'auto' | 'android' | 'ios' | 'desktop'>('auto');
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const currentTab = activeTab === 'auto'
    ? isIOS
      ? 'ios'
      : isAndroid
      ? 'android'
      : 'desktop'
    : activeTab;

  const handleNativeInstall = async () => {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 p-5 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/pwa-192x192.png"
              alt="Mwivona Crest"
              className="w-12 h-12 rounded-xl bg-white p-1 shadow-md object-contain shrink-0"
            />
            <div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white font-mono text-[10px] uppercase font-bold tracking-wider mb-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Progressive Web App (PWA)
              </div>
              <h2 className="text-base font-bold tracking-tight">Install Mwivona Portal</h2>
              <p className="text-indigo-100 text-[11px] mt-0.5">
                Fast, offline-ready application for Phones, Tablets &amp; Computers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Banner if installed */}
        {installSuccess && (
          <div className="m-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">Installation Initiated!</p>
              <p className="text-[11px] text-emerald-700">
                Mwivona Comprehensive School Portal is being added to your device home screen / apps.
              </p>
            </div>
          </div>
        )}

        {/* One-click Native Install Trigger when available */}
        {isInstallable && !installSuccess && (
          <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-indigo-950 text-xs">Ready for 1-Click Install</p>
              <p className="text-[11px] text-indigo-700">
                Your browser supports direct installation to your device.
              </p>
            </div>
            <button
              onClick={handleNativeInstall}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-colors cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Install Now</span>
            </button>
          </div>
        )}

        {/* Device Switcher Tabs */}
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between gap-1 p-1 bg-slate-200/70 rounded-xl">
            <button
              onClick={() => setActiveTab('android')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer ${
                currentTab === 'android'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android / Phone</span>
            </button>

            <button
              onClick={() => setActiveTab('ios')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer ${
                currentTab === 'ios'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>iPhone &amp; iPad</span>
            </button>

            <button
              onClick={() => setActiveTab('desktop')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer ${
                currentTab === 'desktop'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Laptops &amp; PCs</span>
            </button>
          </div>
        </div>

        {/* Tab Guides */}
        <div className="p-6 space-y-4">
          {/* ANDROID GUIDE */}
          {currentTab === 'android' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>How to Install on Android Phones &amp; Tablets</span>
              </div>
              <ol className="space-y-2 text-slate-700 list-decimal list-inside leading-relaxed pl-1">
                <li>
                  Open this portal in <strong>Google Chrome</strong> or <strong>Samsung Internet</strong>.
                </li>
                <li>
                  Tap the <strong>three dots menu (⋮)</strong> in the top-right corner of the browser.
                </li>
                <li>
                  Select <strong className="text-indigo-600 font-semibold">"Install app"</strong> or <strong className="text-indigo-600 font-semibold">"Add to Home screen"</strong>.
                </li>
                <li>
                  Tap <strong>Install</strong> on the confirmation pop-up. The app emblem will appear on your phone home screen and app drawer!
                </li>
              </ol>
            </div>
          )}

          {/* IOS GUIDE */}
          {currentTab === 'ios' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <Tablet className="w-4 h-4 text-indigo-600" />
                <span>How to Install on iPhone &amp; iPad (iOS Safari)</span>
              </div>
              <ol className="space-y-2.5 text-slate-700 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">1</span>
                  <span>
                    Open this portal in Apple <strong>Safari</strong> (or Chrome on iOS).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">2</span>
                  <span>
                    Tap the <strong>Share</strong> button <Share2 className="w-3.5 h-3.5 inline text-indigo-600 mx-1" /> at the bottom of the screen (on iPhone) or top right (on iPad).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">3</span>
                  <span>
                    Scroll down and tap <strong className="text-indigo-600">"Add to Home Screen"</strong> <PlusSquare className="w-3.5 h-3.5 inline text-indigo-600 mx-1" />.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">4</span>
                  <span>
                    Tap <strong>Add</strong> in the top right. Mwivona Portal will launch standalone like a native App Store app!
                  </span>
                </li>
              </ol>
            </div>
          )}

          {/* DESKTOP GUIDE */}
          {currentTab === 'desktop' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <Laptop className="w-4 h-4 text-indigo-600" />
                <span>How to Install on Windows, Mac &amp; Linux Computers</span>
              </div>
              <ol className="space-y-2 text-slate-700 list-decimal list-inside leading-relaxed pl-1">
                <li>
                  Open the portal in <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong>, or <strong>Brave</strong>.
                </li>
                <li>
                  Look at the right side of the URL address bar at the top: click the <strong className="text-indigo-600">Install icon</strong> (an icon showing an arrow in a box or computer screen with an arrow).
                </li>
                <li>
                  Or click the browser menu (<strong>⋮</strong> or <strong>...</strong>) &rarr; <strong>"Cast, save, and share"</strong> (or <strong>"Apps"</strong>) &rarr; <strong className="text-indigo-600 font-semibold">"Install Mwivona Portal"</strong>.
                </li>
                <li>
                  Click <strong>Install</strong>. A desktop shortcut will be placed on your Desktop and Start / Applications menu!
                </li>
              </ol>
            </div>
          )}

          {/* Benefits Grid */}
          <div className="pt-3 border-t border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              App Capabilities Once Installed
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Runs full-screen (No URL bar)</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Instant loading with offline cache</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Direct Home screen icon</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>AES-256 encrypted storage</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>PWA Standards Compliant</span>
          </div>

          <div className="flex items-center gap-2">
            {isInstallable && (
              <button
                onClick={handleNativeInstall}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
