import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  FileText,
  LogOut,
  Crown,
  ChevronDown,
  Check,
  User,
  Award,
  BookOpen,
  GraduationCap,
  Users,
  Smartphone
} from 'lucide-react';
import crestImage from '../assets/images/school_crest_emblem_1792317813141.jpg';
import { UserSession, OwnerDesignation } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAuditLog: () => void;
  onOpenSecurityModal: () => void;
  onOpenProductionCenter?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAuditLog,
  onOpenSecurityModal,
  onOpenProductionCenter,
}) => {
  const { currentUser, logout, schoolProfile, isOwner, switchOwnerResponsibility } = useApp();
  const [showOwnerSwitcher, setShowOwnerSwitcher] = useState(false);

  // Dynamic Navigation Links based on logged-in role
  const getNavLinks = () => {
    if (currentUser.role === 'parent') {
      return [
        { id: 'dashboard', label: 'Learner Dashboard' },
        { id: 'scorecards', label: 'Learner Score Card' },
        { id: 'attendance', label: 'Attendance' },
        { id: 'fees', label: 'Tuition & Receipts' },
      ];
    }
    if (currentUser.role === 'teacher') {
      if (currentUser.teacherType === 'class_teacher') {
        const gradeLabel = currentUser.teacherGrade || 'Class';
        return [
          { id: 'dashboard', label: `Dashboard (${gradeLabel})` },
          { id: 'learners', label: `Class Learners (${gradeLabel})` },
          { id: 'attendance', label: `Roll Call (${gradeLabel})` },
          { id: 'scorecards', label: `Class Broadsheet & Scores` },
          { id: 'fees', label: 'Class Fees Standing' },
        ];
      }
      return [
        { id: 'dashboard', label: 'Teacher Dashboard' },
        { id: 'scorecards', label: 'Subject Scoresheet' },
        { id: 'learners', label: 'Enrolled Learners' },
        { id: 'attendance', label: 'Attendance' },
      ];
    }
    return [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'school', label: 'School & Academic Setup' },
      { id: 'learners', label: 'Learners & Parents' },
      { id: 'fees', label: 'Tuition & Fees' },
      { id: 'reminders', label: 'Automated Reminders' },
      { id: 'scorecards', label: 'Broadsheets & Scores' },
      { id: 'attendance', label: 'Attendance' },
      { id: 'reports', label: 'Monthly Reports' },
    ];
  };

  const OWNER_RESPONSIBILITIES: {
    id: OwnerDesignation;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    badge: string;
  }[] = [
    {
      id: 'owner',
      label: 'App Owner & Director',
      description: 'Master control, persistent storage, security audit & institutional settings',
      icon: Crown,
      badge: 'Super Admin',
    },
    {
      id: 'hoi',
      label: 'HOI (Head of Institution)',
      description: 'Overall school oversight, principal remarks & institutional governance',
      icon: Award,
      badge: 'HOI / Principal',
    },
    {
      id: 'deputy_hoi',
      label: 'Deputy HOI',
      description: 'Academic coordination, discipline & student attendance oversight',
      icon: Award,
      badge: 'Deputy HOI',
    },
    {
      id: 'exam_council',
      label: 'Coordinator / Exam Council',
      description: 'Examination council oversight, grade broadsheets & academic standards',
      icon: Award,
      badge: 'Exam Council',
    },
    {
      id: 'senior_teacher',
      label: 'Senior Teacher',
      description: 'Senior faculty lead, curriculum monitoring & staff mentorship',
      icon: GraduationCap,
      badge: 'Senior Faculty',
    },
    {
      id: 'class_teacher',
      label: 'Class Teacher (Grade 7A)',
      description: 'Daily roll call, conduct remarks, class fees standing & scorecards',
      icon: Users,
      badge: 'Class Teacher',
    },
    {
      id: 'subject_teacher',
      label: 'Teacher / Subject Teacher',
      description: 'Enter subject CATs, midterms, final scores & CBC rubrics',
      icon: BookOpen,
      badge: 'Subject Teacher',
    },
    {
      id: 'parent',
      label: 'Parent / Guardian Portal',
      description: 'Live parent portal: track child attendance, score card, fees & M-Pesa',
      icon: User,
      badge: 'Parent Portal',
    },
  ];

  const getOwnerDesignationLabel = (user: UserSession) => {
    switch (user.ownerDesignation) {
      case 'hoi':
        return 'HOI (Principal)';
      case 'deputy_hoi':
        return 'Deputy HOI';
      case 'exam_council':
        return 'Coordinator / Exam Council';
      case 'senior_teacher':
        return 'Senior Teacher';
      case 'class_teacher':
        return `Class Teacher (${user.teacherGrade || '7A'})`;
      case 'subject_teacher':
        return 'Subject Teacher';
      case 'parent':
        return 'Parent Portal';
      case 'owner':
      default:
        return 'App Owner & Director';
    }
  };

  const navLinks = getNavLinks();

  const getRoleBadge = (user: UserSession) => {
    if (user.isOwner) {
      return getOwnerDesignationLabel(user);
    }
    if (user.role === 'admin') return 'Head of School';
    if (user.role === 'bursar') return 'Bursar / Finance';
    if (user.role === 'parent') return 'Parent Portal';
    if (user.role === 'teacher') {
      if (user.teacherType === 'class_teacher') {
        return `Class Teacher (${user.teacherGrade})`;
      }
      return `Subject Teacher (${user.registeredSubjects?.[0] ? user.registeredSubjects[0].slice(0, 16) + '...' : 'Faculty'})`;
    }
    return user.role;
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Bar 3-Zone Contract */}
        <div className="flex items-center justify-between gap-8 h-16">
          
          {/* Zone 1: Single text element wordmark + School Crest */}
          <div className="flex items-center gap-3 shrink-0">
            <img
              src={crestImage}
              alt="Mwivona Comprehensive School Crest"
              className="w-9 h-9 object-contain rounded-md"
              referrerPolicy="no-referrer"
            />
            <button
              onClick={() => setActiveTab('dashboard')}
              className="text-left cursor-pointer hover:opacity-90 transition-opacity"
            >
              <div className="flex items-center gap-2">
                <span className="font-black text-base tracking-tight text-indigo-700 leading-tight">
                  EduPulse
                </span>
                <span className="text-slate-300">·</span>
                <span className="font-extrabold text-sm tracking-tight text-slate-900 leading-tight truncate max-w-[190px] sm:max-w-none">
                  {schoolProfile?.name || 'Mwivona Comprehensive School'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                <span className="text-emerald-700 font-semibold">Primary</span>
                <span>&</span>
                <span className="text-indigo-700 font-semibold">Junior School</span>
                <span className="text-slate-300">·</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-300 font-mono text-[9px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE SYSTEM
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links (single-line, clean hover underline) */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600 overflow-x-auto py-1">
            {navLinks.map((link) => {
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => setActiveTab(link.id)}
                  className={`whitespace-nowrap transition-colors pb-0.5 cursor-pointer ${
                    isActive
                      ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600'
                      : 'hover:text-slate-900'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Action & Active Role Switcher */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Install PWA Button for Phones, Tablets, and Laptops */}
            <PWAInstallButton variant="navbar" />

            {/* Live Production Center launcher */}
            {onOpenProductionCenter && (
              <button
                onClick={onOpenProductionCenter}
                title="Application Launch Status: Fully Operational in Production"
                className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-md border border-slate-300 transition-colors cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>🚀 Live System</span>
              </button>
            )}

            {/* Quick Security Status Badge */}
            <button
              onClick={onOpenSecurityModal}
              title="Click to view AES-256 encryption status and RBAC permissions"
              className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>AES-256 Active</span>
            </button>

            {/* Audit Log button */}
            <button
              onClick={onOpenAuditLog}
              title="Security & System Audit Log"
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4" />
            </button>

            {/* Authenticated User Badge / Owner Responsibility Switcher */}
            {isOwner ? (
              <div className="flex items-center gap-2">
                <span
                  title="Single Active Phone Policy Active: Restricted to authorized owner device"
                  className="hidden md:inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-1 rounded"
                >
                  <Smartphone className="w-3 h-3 text-emerald-600" />
                  <span>1-Phone Locked</span>
                </span>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowOwnerSwitcher(!showOwnerSwitcher)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-md transition-all cursor-pointer shadow-xs"
                    title="App Owner: Click to switch active responsibility (Owner, HOI, Deputy HOI, Senior Teacher, Class Teacher, Subject Teacher, Parent)"
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-500 shrink-0" />
                    <span className="font-bold text-amber-900">App Owner</span>
                    <span className="text-amber-400">·</span>
                    <span className="font-semibold text-indigo-900 truncate max-w-[140px]">
                      {getOwnerDesignationLabel(currentUser)}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  </button>

                {showOwnerSwitcher && (
                  <div
                    className="absolute right-0 mt-2 w-84 bg-white rounded-xl shadow-2xl border border-slate-200 py-2.5 z-50 text-xs animate-in fade-in"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-3.5 py-2 border-b border-slate-100 bg-amber-50/50 rounded-t-xl">
                      <div className="flex items-center gap-1.5">
                        <Crown className="w-4 h-4 text-amber-600 fill-amber-500" />
                        <span className="font-bold text-slate-900">Owner Responsibility Center</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        As the application owner, switch between your authorized responsibilities across Mwivona Comprehensive:
                      </p>
                    </div>

                    <div className="max-h-96 overflow-y-auto py-1 divide-y divide-slate-50">
                      {OWNER_RESPONSIBILITIES.map((resp) => {
                        const Icon = resp.icon;
                        const isCurrent = currentUser.ownerDesignation === resp.id || (!currentUser.ownerDesignation && resp.id === 'owner');
                        return (
                          <button
                            key={resp.id}
                            type="button"
                            onClick={() => {
                              switchOwnerResponsibility(resp.id);
                              setActiveTab('dashboard');
                              setShowOwnerSwitcher(false);
                            }}
                            className={`w-full text-left px-3.5 py-2.5 flex items-start gap-2.5 hover:bg-slate-50 transition-colors cursor-pointer ${
                              isCurrent ? 'bg-indigo-50/80 border-l-3 border-indigo-600' : ''
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                              isCurrent ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-slate-900 truncate">{resp.label}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium shrink-0 ${
                                  isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {resp.badge}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                                {resp.description}
                              </p>
                            </div>
                            {isCurrent && (
                              <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-1" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="px-3.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>📱 Single Active Phone Protected</span>
                      <button
                        type="button"
                        onClick={() => setShowOwnerSwitcher(false)}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded-md">
                <div className="w-2 h-2 rounded-full bg-emerald-600" />
                <span className="max-w-[130px] truncate font-semibold text-slate-800">{currentUser.name}</span>
                <span className="text-slate-400">·</span>
                <span className="font-semibold text-indigo-700">{getRoleBadge(currentUser)}</span>
              </div>
            )}

            {/* Quick Sign Out Button */}
            <button
              onClick={() => logout()}
              title="Sign out and return to the Phone/ID login portal"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="lg:hidden flex items-center gap-3 overflow-x-auto py-2.5 border-t border-slate-100 text-xs">
          {navLinks.map((link) => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setActiveTab(link.id)}
                className={`whitespace-nowrap px-2.5 py-1 rounded transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
