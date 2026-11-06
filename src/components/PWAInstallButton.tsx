import React, { useState } from 'react';
import { Download, Smartphone, Check, Laptop } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { InstallAppModal } from './InstallAppModal';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'banner' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'navbar' }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // If app is already running as an installed standalone PWA, suppress button or show verified tag
  if (isInstalled) {
    if (variant === 'compact') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Check className="w-3 h-3 text-emerald-600" />
          <span>Installed</span>
        </span>
      );
    }
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setIsModalOpen(true);
      }
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      {variant === 'navbar' && (
        <button
          onClick={handleClick}
          title="Install ElimuPulse on your Phone, Tablet, Laptop, or Computer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 rounded-lg shadow-2xs hover:shadow-sm transition-all cursor-pointer border border-indigo-500/40"
        >
          <Download className="w-3.5 h-3.5 text-indigo-100" />
          <span className="hidden sm:inline">Install App</span>
          <span className="sm:hidden">Install</span>
        </button>
      )}

      {variant === 'compact' && (
        <button
          onClick={handleClick}
          className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors cursor-pointer"
          title="Install app on your device"
        >
          <Download className="w-3 h-3 text-indigo-600" />
          <span>Install App</span>
        </button>
      )}

      {variant === 'banner' && (
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white px-4 py-2.5 rounded-xl border border-indigo-700/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
              <Smartphone className="w-4 h-4 text-indigo-300" />
            </div>
            <div>
              <p className="font-bold text-xs">Install ElimuPulse on this Device</p>
              <p className="text-[11px] text-indigo-200">
                Launch full-screen like a native app on Android, iPhone, iPad, Windows, or Mac.
              </p>
            </div>
          </div>
          <button
            onClick={handleClick}
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-white text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Install Now</span>
          </button>
        </div>
      )}

      <InstallAppModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
