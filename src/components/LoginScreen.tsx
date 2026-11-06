import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Shield,
  Lock,
  Phone,
  KeyRound,
  Eye,
  EyeOff,
  UserCheck,
  GraduationCap,
  Users,
  Building,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  BookOpen,
  HelpCircle,
  Crown,
  Smartphone,
  ShieldAlert,
  RefreshCw,
  Send,
  ArrowLeft
} from 'lucide-react';
import crestImage from '../assets/images/school_crest_emblem_1792317813141.jpg';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { validateKenyanPhoneNumber } from '../services/cryptoService';
import { OwnerDesignation } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const {
    loginWithCredentials,
    verifyOwnerOtp,
    resendOwnerOtp,
    currentDeviceName,
    deviceKickoutNotice,
    clearDeviceKickoutNotice,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'parent' | 'teacher' | 'admin'>('admin');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [ownerDesignation, setOwnerDesignation] = useState<OwnerDesignation>('owner');

  // OTP Challenge State for Secondary/Third-Party Device Access
  const [isOtpChallenged, setIsOtpChallenged] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpPhone, setOtpPhone] = useState('0716235185');
  const [otpPreviewBanner, setOtpPreviewBanner] = useState<string | null>(null);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number>(0);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpError, setOtpError] = useState<string | null>(null);

  const cleanDigits = phoneNumber.replace(/[^0-9]/g, '');
  const isOwnerNumber = cleanDigits.endsWith('716235185') || cleanDigits === '0716235185';

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    clearDeviceKickoutNotice();

    if (!phoneNumber.trim()) {
      setErrorMsg('Please enter your registered mobile phone number.');
      return;
    }

    const validation = validateKenyanPhoneNumber(phoneNumber);
    if (!validation.isValid) {
      setErrorMsg(
        validation.error ||
          'The phone number format should start with 07.... Or 01.... Not +2547.... nor +254..... (Example: 0712345678 or 0110445566)'
      );
      return;
    }

    if (!idNumber.trim()) {
      setErrorMsg('Please enter your ID number as your password.');
      return;
    }

    // Remove any other trial sessions or stale logins
    sessionStorage.clear();
    localStorage.removeItem('academias_secure_v1_trial_session');

    // Determine target responsibility for the owner
    let targetRole = ownerDesignation;
    if (isOwnerNumber && ownerDesignation === 'owner') {
      if (activeTab === 'teacher') targetRole = 'class_teacher';
      else if (activeTab === 'parent') targetRole = 'parent';
      else targetRole = 'owner';
    }

    setIsLoading(true);
    try {
      const res = await loginWithCredentials(phoneNumber, idNumber, targetRole);
      setIsLoading(false);

      if (res.requiresOtp && res.challengeDetails) {
        setIsOtpChallenged(true);
        setOtpPhone(res.challengeDetails.phone);
        setOtpExpiresAt(res.challengeDetails.expiresAt);
        setOtpPreviewBanner(res.challengeDetails.dispatchedOtpPreview || null);
        setResendCooldown(45);
        setOtpInput('');
        setOtpError(null);
        return;
      }

      if (res.success) {
        if (onLoginSuccess) onLoginSuccess();
      } else {
        setErrorMsg(res.error || 'Invalid credentials. Please verify your phone number and ID number.');
      }
    } catch (err) {
      setIsLoading(false);
      setErrorMsg('An unexpected error occurred during authentication. Please retry.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);
    const cleanOtp = otpInput.trim().replace(/[^0-9]/g, '');

    if (cleanOtp.length !== 6) {
      setOtpError('Please enter the complete 6-digit numeric OTP verification code.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const res = await verifyOwnerOtp(cleanOtp, ownerDesignation);
      setIsVerifyingOtp(false);
      if (res.success) {
        setIsOtpChallenged(false);
        if (onLoginSuccess) onLoginSuccess();
      } else {
        setOtpError(res.error || 'Invalid OTP code. Please check the SMS dispatched to 0716235185.');
      }
    } catch {
      setIsVerifyingOtp(false);
      setOtpError('System error verifying OTP. Please retry.');
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setOtpError(null);
    setIsVerifyingOtp(true);
    try {
      const res = await resendOwnerOtp();
      setIsVerifyingOtp(false);
      if (res.success) {
        setOtpPreviewBanner(res.dispatchedOtpPreview || null);
        setResendCooldown(45);
      } else {
        setOtpError(res.error || 'Unable to dispatch SMS. Please try again.');
      }
    } catch {
      setIsVerifyingOtp(false);
      setOtpError('Failed to resend OTP.');
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Emblem Crest */}
        <div className="inline-flex p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl mb-4">
          <img
            src={crestImage}
            alt="Mwivona Comprehensive School Crest"
            className="w-16 h-16 object-contain rounded-xl"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold tracking-wide uppercase mb-3">
          EduPulse System
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white">
          EduPulse
        </h1>
        <p className="mt-1 text-sm text-indigo-100 font-semibold">
          Mwivona Comprehensive School
        </p>
        <p className="mt-0.5 text-xs text-indigo-300 font-medium">
          Primary School &amp; Junior School Wings · Official Institutional Portal
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0">
        {/* Device Kickout / Single-Phone Concurrency Alert */}
        {deviceKickoutNotice && (
          <div className="mb-4 p-4 bg-amber-500/20 border-2 border-amber-400/60 rounded-xl text-amber-100 text-xs shadow-lg flex items-start justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-200 text-sm">Single-Phone Access Policy Notice</p>
                <p className="mt-1 leading-relaxed text-slate-200">{deviceKickoutNotice}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearDeviceKickoutNotice}
              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded text-[11px] cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* PWA Install Banner for Phones, Tablets, and Computers */}
        <div className="mb-4">
          <PWAInstallButton variant="banner" />
        </div>

        {/* MAIN CONTAINER */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900">
          
          {/* VIEW A: OTP VERIFICATION CHALLENGE VIEW (FOR SECONDARY / THIRD-PARTY PHONE) */}
          {isOtpChallenged ? (
            <div className="p-6 sm:p-8 space-y-6">
              {/* Header Badge */}
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="p-2.5 bg-amber-100 border border-amber-300 rounded-xl text-amber-800">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm text-slate-900">
                      Owner Account Device Challenge
                    </span>
                    <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded text-[10px] font-bold">
                      1 Phone at a Time
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Secondary / Third-party device access authorization
                  </p>
                </div>
              </div>

              {/* Informative Security Notice */}
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-indigo-900">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  <span>Single-Phone Policy Enforced</span>
                </div>
                <p className="leading-relaxed text-indigo-900">
                  Access to the School Owner Account is protected by single-device security. Only <strong>one authorized phone</strong> can hold active access at a time.
                </p>
                <p className="leading-relaxed text-indigo-800">
                  Because this device (<span className="font-mono font-semibold">{currentDeviceName}</span>) is not the current authorized phone, a 6-digit SMS verification code (OTP) has been dispatched to the Owner's registered mobile number (07•••••185).
                </p>
              </div>

              {/* Real-time SMS Dispatch Preview Banner (for verification/testing) */}
              {otpPreviewBanner && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 space-y-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold text-emerald-900">
                      <Send className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Cellular SMS Dispatched to Owner's Phone</span>
                    </span>
                    <span className="font-mono bg-emerald-200 text-emerald-950 px-2 py-0.5 rounded text-[10px] font-bold">
                      Delivered
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded border border-emerald-200 font-mono text-[11px] text-emerald-900">
                    MWIVONA SECURITY: Secondary device ({currentDeviceName}) requested access. Verification OTP: <strong>{otpPreviewBanner}</strong> (Expires in 5 minutes).
                  </div>
                  <p className="text-[10px] text-emerald-700">
                    If this is a delegated party, enter the OTP provided by the owner to authorize this device.
                  </p>
                </div>
              )}

              {/* Error Alert */}
              {otpError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{otpError}</span>
                </div>
              )}

              {/* OTP Form */}
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Enter 6-Digit SMS Verification Code (OTP)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    required
                    placeholder="e.g. 482915"
                    value={otpInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setOtpInput(val);
                      if (otpError) setOtpError(null);
                    }}
                    className="w-full text-center tracking-[0.4em] font-mono text-2xl font-black py-3 px-4 bg-slate-50 border-2 border-indigo-300 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white text-slate-950"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5 text-center">
                    Enter the 6-digit verification code sent to the Owner's phone. Authorizing this device will transfer the active lock and revoke access from the prior phone.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingOtp || otpInput.trim().length !== 6}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isVerifyingOtp ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Validating OTP &amp; Binding Device...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify OTP &amp; Authorize This Phone</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOtpChallenged(false);
                      setOtpInput('');
                      setOtpError(null);
                    }}
                    className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Credentials</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || isVerifyingOtp}
                    className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-semibold disabled:text-slate-400 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? '' : 'hover:rotate-180 transition-transform'}`} />
                    <span>
                      {resendCooldown > 0
                        ? `Resend OTP in ${resendCooldown}s`
                        : 'Resend SMS OTP to Owner'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* VIEW B: STANDARD CREDENTIALS LOGIN */
            <>
              {/* Role Header Tabs */}
              <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin');
                    setErrorMsg(null);
                  }}
                  className={`py-3.5 px-3 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    activeTab === 'admin'
                      ? 'bg-white text-indigo-700 border-b-2 border-indigo-600 font-bold'
                      : 'hover:text-slate-900'
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>Admin / Owner</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('teacher');
                    setErrorMsg(null);
                  }}
                  className={`py-3.5 px-3 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    activeTab === 'teacher'
                      ? 'bg-white text-indigo-700 border-b-2 border-indigo-600 font-bold'
                      : 'hover:text-slate-900'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Teacher Login</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('parent');
                    setErrorMsg(null);
                  }}
                  className={`py-3.5 px-3 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    activeTab === 'parent'
                      ? 'bg-white text-indigo-700 border-b-2 border-indigo-600 font-bold'
                      : 'hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Parent Login</span>
                </button>
              </div>

              {/* Form Container */}
              <div className="p-6 sm:p-8 space-y-6">
                
                {/* Context Info Banner */}
                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-950 flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    {activeTab === 'admin' && (
                      <span>
                        <strong>Owner &amp; Administrative Authority:</strong> Restricted access for authorized leadership and system officers.
                      </span>
                    )}
                    {activeTab === 'teacher' && (
                      <span>
                        <strong>Teacher Portal Access:</strong> Log in with registered mobile phone number and staff ID. Class teachers access all records for their grade; subject teachers enter marks.
                      </span>
                    )}
                    {activeTab === 'parent' && (
                      <span>
                        <strong>Parent Portal Access:</strong> Log in with your registered phone number and national ID to access the specific dashboard and records of <strong>only your child</strong>.
                      </span>
                    )}
                  </div>
                </div>

                {/* Error Message */}
                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Credentials Form */}
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Registered Mobile Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        required
                        placeholder="0712345678 or 0110445566"
                        value={phoneNumber}
                        onChange={(e) => {
                          setPhoneNumber(e.target.value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs text-slate-900"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                      <span>Format: 10 digits starting with <strong>07....</strong> or <strong>01....</strong></span>
                      <span className="text-amber-700 font-medium font-mono">No +254</span>
                    </div>
                    {(phoneNumber.trim().startsWith('+254') || phoneNumber.trim().startsWith('254') || phoneNumber.trim().startsWith('+')) && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">
                        ⚠️ Invalid format: The phone number should start with 07.... or 01.... Not +254...
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700">
                        Password (National ID or Staff ID Number)
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsForgotPasswordOpen(true)}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <KeyRound className="w-3 h-3 text-indigo-500" />
                        <span>Forgot password?</span>
                      </button>
                    </div>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="e.g. National ID or Staff ID"
                        value={idNumber}
                        onChange={(e) => setIdNumber(e.target.value)}
                        className="w-full pl-9 pr-10 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Case-insensitive. Prefix "ID-" is optional.
                    </p>
                  </div>

                  {/* Owner Multi-Responsibility Mode Chooser */}
                  {isOwnerNumber && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-bold text-amber-950 text-xs">
                          <Crown className="w-4 h-4 text-amber-600 fill-amber-500" />
                          <span>👑 App Owner Account Recognized</span>
                        </span>
                        <span className="text-[10px] font-mono bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded font-semibold">
                          1 Active Phone Protected
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-900 leading-snug">
                        Log in directly as <strong>Owner</strong> or choose an active responsibility context:
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                        {[
                          { id: 'owner', label: '👑 Owner (Direct)' },
                          { id: 'hoi', label: '🏫 HOI (Principal)' },
                          { id: 'deputy_hoi', label: '📋 Deputy HOI' },
                          { id: 'exam_council', label: '📊 Exam Council' },
                          { id: 'senior_teacher', label: '⭐ Senior Teacher' },
                          { id: 'class_teacher', label: '🎓 Class Teacher' },
                          { id: 'subject_teacher', label: '📖 Subject Teacher' },
                          { id: 'parent', label: '👨‍👩‍👧 Parent Portal' },
                        ].map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setOwnerDesignation(r.id as OwnerDesignation)}
                            className={`px-2 py-1.5 text-[11px] rounded-lg border text-left transition-colors cursor-pointer ${
                              ownerDesignation === r.id
                                ? 'bg-amber-600 text-white border-amber-700 font-bold shadow-xs'
                                : 'bg-white text-slate-800 border-amber-200 hover:bg-amber-100/50'
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Verifying Device &amp; Credentials...</span>
                      </>
                    ) : (
                      <>
                        <span>
                          Log In to {activeTab === 'parent' ? 'Parent Portal' : activeTab === 'teacher' ? 'Teacher Portal' : 'Admin & Owner Portal'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>

                  {/* Dedicated Forgotten Password Reset Button */}
                  <div className="pt-2 text-center border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsForgotPasswordOpen(true)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1.5 p-1 rounded hover:bg-indigo-50 transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Forgotten Password? Request SMS Reset Link</span>
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>

        {/* Security & Cryptographic Notice */}
        <div className="mt-4 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3 text-slate-400" />
          <span>Single-Phone Device Lock · Cellular SMS OTP Challenge · AES-256 Storage</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        onSuccessLoginPrefill={(phone, newPass) => {
          setPhoneNumber(phone);
          setIdNumber(newPass);
          setErrorMsg(null);
        }}
      />
    </div>
  );
};
