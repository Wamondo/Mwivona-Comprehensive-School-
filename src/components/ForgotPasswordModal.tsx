import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  KeyRound,
  Phone,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  ShieldCheck,
  Clock,
  RotateCcw,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  UserCheck
} from 'lucide-react';
import { validateKenyanPhoneNumber } from '../services/cryptoService';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessLoginPrefill?: (phone: string, newPassword: string) => void;
}

type ResetStep = 'enter_phone' | 'sms_sent' | 'set_new_password' | 'success';

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccessLoginPrefill,
}) => {
  const { requestPasswordResetLink, resetPasswordForUser } = useApp();

  const [step, setStep] = useState<ResetStep>('enter_phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reset link info
  const [resetToken, setResetToken] = useState('');
  const [resetLink, setResetLink] = useState('');
  const [targetAccount, setTargetAccount] = useState<{
    name: string;
    role: string;
    phone: string;
    idNumber: string;
  } | null>(null);

  // New password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Simulated countdown for SMS link expiration (15 mins)
  const [secondsRemaining, setSecondsRemaining] = useState(900);

  useEffect(() => {
    let timer: any;
    if (step === 'sms_sent' && secondsRemaining > 0) {
      timer = setInterval(() => {
        setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, secondsRemaining]);

  if (!isOpen) return null;

  const handleResetModalState = () => {
    setStep('enter_phone');
    setPhoneNumber('');
    setErrorMsg(null);
    setIsLoading(false);
    setResetToken('');
    setResetLink('');
    setTargetAccount(null);
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setSecondsRemaining(900);
    onClose();
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validate phone strictly according to user rules
    const validation = validateKenyanPhoneNumber(phoneNumber);
    if (!validation.isValid) {
      setErrorMsg(
        validation.error ||
          'The phone number format should start with 07.... Or 01.... Not +2547.... nor +254.....'
      );
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const res = requestPasswordResetLink(validation.cleanPhone!);
      setIsLoading(false);

      if (res.success && res.resetToken && res.resetLink && res.user) {
        setResetToken(res.resetToken);
        setResetLink(res.resetLink);
        setTargetAccount(res.user);
        setSecondsRemaining(900);
        setStep('sms_sent');
      } else {
        setErrorMsg(
          res.error ||
            'No registered account matched this mobile number. Please check the 10 digits.'
        );
      }
    }, 400);
  };

  const handleOpenResetLink = () => {
    setErrorMsg(null);
    setStep('set_new_password');
  };

  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!newPassword.trim()) {
      setErrorMsg('Please enter your new password or ID number.');
      return;
    }

    if (newPassword.trim().length < 3) {
      setErrorMsg('Password must be at least 3 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('The new password and confirmation password do not match.');
      return;
    }

    if (!targetAccount) {
      setErrorMsg('Account session lost. Please restart the reset process.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const res = resetPasswordForUser(targetAccount.phone, resetToken, newPassword.trim());
      setIsLoading(false);

      if (res.success) {
        setStep('success');
      } else {
        setErrorMsg(res.error || 'Failed to update password. Please try again.');
      }
    }, 400);
  };

  const handleProceedToLogin = () => {
    if (targetAccount && onSuccessLoginPrefill) {
      onSuccessLoginPrefill(targetAccount.phone, newPassword.trim());
    }
    handleResetModalState();
  };

  // Helper to pre-populate sample accounts
  const handleSelectSample = (samplePhone: string) => {
    setPhoneNumber(samplePhone);
    setErrorMsg(null);
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden text-slate-900">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-600">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Forgotten Password Reset
              </h3>
              <p className="text-xs text-slate-500">
                Secure cellular SMS reset link dispatch
              </p>
            </div>
          </div>
          <button
            onClick={handleResetModalState}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs">
          
          {/* Progress Indicator */}
          <div className="flex items-center justify-between px-2 text-[11px] font-medium text-slate-500">
            <span
              className={
                step === 'enter_phone'
                  ? 'text-indigo-600 font-bold'
                  : 'text-slate-400'
              }
            >
              1. Phone Number
            </span>
            <span>→</span>
            <span
              className={
                step === 'sms_sent'
                  ? 'text-indigo-600 font-bold'
                  : 'text-slate-400'
              }
            >
              2. SMS Link Dispatch
            </span>
            <span>→</span>
            <span
              className={
                step === 'set_new_password' || step === 'success'
                  ? 'text-indigo-600 font-bold'
                  : 'text-slate-400'
              }
            >
              3. Set Password
            </span>
          </div>

          {/* Error Message Alert */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* STEP 1: ENTER REGISTERED PHONE NUMBER */}
          {step === 'enter_phone' && (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-indigo-950 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-900">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  <span>SMS Password Reset Link</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Enter your registered mobile phone number. The portal will look up your account and dispatch a secure one-time password reset link directly to your mobile phone via SMS.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Registered Mobile Phone Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    autoFocus
                    placeholder="0712345678 or 0110445566"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Explicit Kenyan Phone Requirement Notice */}
                <div className="mt-2 p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-start gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Format Requirement:</span> Phone number must start with <strong className="font-mono">07....</strong> or <strong className="font-mono">01....</strong> (10 digits). Do <span className="underline font-semibold">NOT</span> use <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">+2547...</code> nor <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">+254...</code>.
                  </div>
                </div>

                {/* Live validation indicator */}
                {phoneNumber.trim().startsWith('+254') && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1.5">
                    ⚠️ Invalid prefix: Please remove '+254' and enter format starting with 07... or 01... (e.g. 0712345678)
                  </p>
                )}
              </div>

              {/* Quick Sample Selector for Convenience */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  <span>Or Pick a Registered Demo Number to Test:</span>
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleSelectSample('0712345678')}
                    className="p-1.5 text-left border border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/50 rounded-lg transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-slate-800 block">Catherine Mwangi</span>
                    <span className="text-slate-500 font-mono">0712345678 (Parent)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectSample('0722101202')}
                    className="p-1.5 text-left border border-slate-200 hover:border-emerald-400 bg-slate-50 hover:bg-emerald-50/50 rounded-lg transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-slate-800 block">Mr. Marcus Thorne</span>
                    <span className="text-slate-500 font-mono">0722101202 (Class Tch)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectSample('0112345678')}
                    className="p-1.5 text-left border border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/50 rounded-lg transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-slate-800 block">Mr. Kevin Ochieng</span>
                    <span className="text-indigo-600 font-mono font-semibold">0112345678 (01... Tch)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectSample('0110445566')}
                    className="p-1.5 text-left border border-slate-200 hover:border-purple-400 bg-slate-50 hover:bg-purple-50/50 rounded-lg transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-slate-800 block">Beatrice Chen</span>
                    <span className="text-purple-600 font-mono font-semibold">0110445566 (01... Par)</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleResetModalState}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !phoneNumber.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying & Sending SMS...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Password Reset Link</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: SIMULATED INCOMING CELLULAR SMS & RESET LINK */}
          {step === 'sms_sent' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>SMS Reset Link Dispatched</span>
                </span>
                <span className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Expires in: {formatTimer(secondsRemaining)}</span>
                </span>
              </div>

              {/* Realistic Incoming Smartphone SMS Preview Card */}
              <div className="rounded-xl border border-slate-300 bg-linear-to-b from-slate-100 to-slate-200/80 p-3 shadow-inner">
                <div className="flex items-center justify-between text-[11px] text-slate-500 pb-2 border-b border-slate-300/60 mb-2.5">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Incoming SMS: MWIVONA-PORTAL</span>
                  </div>
                  <span className="font-mono text-[10px]">Just Now · Delivered</span>
                </div>

                <div className="bg-white rounded-xl p-3.5 shadow-sm border border-slate-200/80 space-y-2">
                  <p className="text-xs text-slate-800 leading-relaxed">
                    <strong>Mwivona Comprehensive School:</strong> Hi {targetAccount?.name}, tap the secure link below to reset your password for mobile <strong>{targetAccount?.phone}</strong>:
                  </p>

                  <div className="p-2.5 bg-indigo-50/80 rounded-lg border border-indigo-200 flex items-center justify-between">
                    <div className="font-mono text-indigo-700 font-semibold truncate text-[11px] max-w-[280px]">
                      {resetLink}
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-600 text-white font-mono shrink-0">
                      Token: {resetToken}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400">
                    This link expires in 15 minutes. If you did not request this, please notify the school office.
                  </p>
                </div>
              </div>

              {/* Target User Confirmation Box */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">{targetAccount?.name}</div>
                  <div className="text-[11px] text-slate-500">
                    Role: <strong className="text-indigo-700">{targetAccount?.role}</strong> · Phone: <span className="font-mono font-medium">{targetAccount?.phone}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800 font-semibold">
                  Verified Contact
                </span>
              </div>

              {/* Action Buttons: Tap Link to Set New Password */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setStep('enter_phone');
                    setErrorMsg(null);
                  }}
                  className="w-full sm:w-auto px-3 py-2 text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 text-xs cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Change Number</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenResetLink}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <span>Open Reset Link & Set Password</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SET NEW PASSWORD */}
          {step === 'set_new_password' && (
            <form onSubmit={handleSaveNewPassword} className="space-y-4">
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    {targetAccount?.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{targetAccount?.name}</div>
                    <div className="text-[11px] text-slate-600 font-mono">
                      {targetAccount?.phone} · {targetAccount?.role}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-mono font-semibold">
                  <ShieldCheck className="w-3 h-3" />
                  <span>SMS LINK VERIFIED</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Enter New Password (or National ID / Staff ID) *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoFocus
                      placeholder="e.g. ID-28491048 or new secure password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    For parents, this acts as your National ID password credential.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Confirm New Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep('sms_sent')}
                  className="px-3 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold rounded-lg cursor-pointer"
                >
                  Back to SMS
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !newPassword.trim()}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <span>Save & Apply New Password</span>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: SUCCESS CONFIRMATION & AUTO-FILL LOGIN */}
          {step === 'success' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Password Reset Successfully!
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto leading-relaxed">
                  Your credentials have been securely updated in the school identity registry for <strong>{targetAccount?.name}</strong>.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl max-w-sm mx-auto text-left text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Registered Phone:</span>
                  <span className="font-mono font-bold text-slate-800">{targetAccount?.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Updated Password/ID:</span>
                  <span className="font-mono font-bold text-indigo-700">{newPassword}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Access Scope:</span>
                  <span className="font-semibold text-slate-800">{targetAccount?.role}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleProceedToLogin}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <span>Proceed to Log In With New Password</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
