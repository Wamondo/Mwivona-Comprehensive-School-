import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  LearnerRecord,
  ParentRecord,
} from '../types';
import {
  Search,
  Plus,
  Shield,
  Eye,
  EyeOff,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertTriangle,
  GraduationCap,
  CreditCard,
  UserCheck,
  FileText,
  Lock,
  Unlock,
  X,
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  BookOpen,
  Building,
  Pencil,
  Trash2
} from 'lucide-react';
import {
  maskPhoneNumber,
  maskEmail,
  maskNationalId,
  maskAddress,
  canRoleDecryptSensitivePII
} from '../services/cryptoService';
import { BulkOnboardingModal } from './BulkOnboardingModal';
import { EditLearnerModal } from './EditLearnerModal';

interface LearnersAndParentsViewProps {
  onOpenAddModal: () => void;
  onNavigateToFees: (learnerId: string) => void;
  onNavigateToScorecard: (learnerId: string) => void;
  onNavigateToAttendance: (learnerId: string) => void;
}

export const LearnersAndParentsView: React.FC<LearnersAndParentsViewProps> = ({
  onOpenAddModal,
  onNavigateToFees,
  onNavigateToScorecard,
  onNavigateToAttendance,
}) => {
  const {
    learners,
    parents,
    feeStructures,
    scoreCards,
    attendance,
    currentUser,
    isParentDecrypted,
    toggleParentDecryption,
    grades: configuredGrades,
    updateLearner,
    deleteLearner,
  } = useApp();

  // Strict Permission Check: Only HOI (Head of Institution) and App Owner are authorized to edit and delete registered learners
  const isHoiOrOwner = React.useMemo(() => {
    if (!currentUser) return false;
    // 1. Verified App Owner
    if (currentUser.isOwner) return true;
    if (currentUser.ownerDesignation === 'owner' || currentUser.ownerDesignation === 'hoi') return true;
    if (currentUser.id === 'user-owner-main') return true;

    // 2. Head of Institution (HOI / Principal)
    if (currentUser.role === 'admin') {
      const title = (currentUser.title || '').toLowerCase();
      const email = (currentUser.email || '').toLowerCase();
      const id = currentUser.id || '';
      return (
        id === 'user-admin-1' ||
        title.includes('head of') ||
        title.includes('principal') ||
        title.includes('hoi') ||
        email.includes('principal')
      );
    }
    return false;
  }, [currentUser]);

  // Persistent search query in localStorage for fast navigation across tabs
  const [searchQuery, setSearchQueryState] = useState(() => {
    return localStorage.getItem('academias_learner_search') || '';
  });
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [wingFilter, setWingFilter] = useState<'all' | 'junior' | 'primary'>('all');
  const [activeLearnerDetail, setActiveLearnerDetail] = useState<LearnerRecord | null>(null);
  const [isBulkOnboardOpen, setIsBulkOnboardOpen] = useState(false);
  const [onboardSuccessNotice, setOnboardSuccessNotice] = useState<string | null>(null);

  // Edit and Delete modals state (Exclusive to HOI and Owner)
  const [learnerForEdit, setLearnerForEdit] = useState<LearnerRecord | null>(null);
  const [learnerForDelete, setLearnerForDelete] = useState<LearnerRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isLearnerJunior = (l: { grade: string }) => {
    const g = l.grade.toLowerCase();
    return g.includes('grade 7') || g.includes('grade 8') || g.includes('grade 9') || g.includes('junior') || g.includes('jss');
  };

  const setSearchQuery = (query: string) => {
    setSearchQueryState(query);
    localStorage.setItem('mwivona_learner_search', query);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  // Role-based accessible learners filtering:
  // 1. Parent: only their learner
  // 2. Class Teacher: only learners in their represented grade
  // 3. Subject Teacher: learners taking their registered subjects
  const accessibleLearners = React.useMemo(() => {
    if (currentUser.role === 'parent') {
      return learners.filter(
        (l) => l.id === currentUser.learnerId || (currentUser.parentId && l.parentId === currentUser.parentId)
      );
    }
    if (currentUser.role === 'teacher') {
      if (currentUser.teacherType === 'class_teacher' && currentUser.teacherGrade) {
        return learners.filter((l) => l.grade === currentUser.teacherGrade);
      }
      if (currentUser.teacherType === 'subject_teacher' && currentUser.registeredSubjects?.length) {
        const subjects = currentUser.registeredSubjects;
        return learners.filter((l) => {
          const learnerCards = scoreCards.filter((sc) => sc.learnerId === l.id);
          const hasSubjectInScorecard = learnerCards.some((sc) =>
            sc.subjects?.some((sub) => subjects.includes(sub.subjectName))
          );
          return hasSubjectInScorecard || ['Grade 7A', 'Grade 8A'].includes(l.grade);
        });
      }
    }
    return learners;
  }, [currentUser, learners, scoreCards]);

  const grades = React.useMemo(() => {
    const set = new Set<string>();
    // First include configured school grades matching wing filter
    if (configuredGrades && configuredGrades.length > 0) {
      configuredGrades.forEach((g) => {
        const isJunior = g.tier === 'Junior School' || g.level >= 7;
        if (wingFilter === 'junior' && !isJunior) return;
        if (wingFilter === 'primary' && isJunior) return;
        set.add(g.name);
      });
    }
    // Also include any grades present on existing accessible learners
    accessibleLearners.forEach((l) => {
      if (wingFilter === 'junior' && !isLearnerJunior(l)) return;
      if (wingFilter === 'primary' && isLearnerJunior(l)) return;
      set.add(l.grade);
    });
    return ['all', ...Array.from(set).sort()];
  }, [configuredGrades, accessibleLearners, wingFilter]);

  const filteredLearners = accessibleLearners.filter((learner) => {
    if (wingFilter === 'junior' && !isLearnerJunior(learner)) return false;
    if (wingFilter === 'primary' && isLearnerJunior(learner)) return false;
    const parent = parents.find((p) => p.id === learner.parentId);
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return selectedGrade === 'all' || learner.grade === selectedGrade;
    }

    const learnerFullName = `${learner.firstName} ${learner.lastName}`.toLowerCase();
    const matchesLearnerName =
      learner.firstName.toLowerCase().includes(query) ||
      learner.lastName.toLowerCase().includes(query) ||
      learnerFullName.includes(query);

    const matchesStudentId =
      learner.studentId.toLowerCase().includes(query) ||
      learner.studentId.replace(/[^a-z0-9]/gi, '').toLowerCase().includes(query.replace(/[^a-z0-9]/gi, ''));

    // Parent ID and Name filtering (National ID, Parent System ID, Full Name, Contact)
    const matchesParentName = parent ? parent.fullName.toLowerCase().includes(query) : false;
    const matchesParentNationalId = parent
      ? parent.nationalId.toLowerCase().includes(query) ||
        parent.nationalId.replace(/[^a-z0-9]/gi, '').toLowerCase().includes(query.replace(/[^a-z0-9]/gi, ''))
      : false;
    const matchesParentSystemId = parent ? parent.id.toLowerCase().includes(query) : false;
    const matchesParentPhone = parent ? parent.phone.replace(/[^0-9]/g, '').includes(query.replace(/[^0-9]/g, '')) : false;

    const matchesSearch =
      matchesLearnerName ||
      matchesStudentId ||
      matchesParentName ||
      matchesParentNationalId ||
      matchesParentSystemId ||
      matchesParentPhone;

    const matchesGrade = selectedGrade === 'all' || learner.grade === selectedGrade;

    return matchesSearch && matchesGrade;
  });

  const handleToggleDecrypt = async (e: React.MouseEvent, parentId: string) => {
    e.stopPropagation();
    await toggleParentDecryption(parentId);
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Student Information System</span>
            <span aria-hidden="true">·</span>
            <span>Cryptographic PII Protection</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Learner & Parent Registry
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Verified student records, encrypted emergency contacts, guardianship relationships, and fee standing.
          </p>
        </div>

        {currentUser.role === 'admin' && (
          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <button
              onClick={() => setIsBulkOnboardOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs"
              title="Batch import student roster and parents from CSV/Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
              <span>Bulk Onboard (CSV)</span>
            </button>

            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Enroll Learner & Parent</span>
            </button>
          </div>
        )}
      </div>

      {/* Bulk Onboarding Success Alert */}
      {onboardSuccessNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{onboardSuccessNotice}</span>
          </div>
          <button
            onClick={() => setOnboardSuccessNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Persistent & Sticky Filter Toolbar */}
      <div className="sticky top-16 z-20 bg-slate-50/95 backdrop-blur-md py-3 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-slate-200 shadow-2xs transition-all">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Search Bar with Parent ID and Name filtering */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by student name, student ID, parent name, or parent ID (e.g. ID-28491048)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-20 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition-colors"
            />
            {searchQuery ? (
              <button
                onClick={clearSearch}
                title="Clear search"
                className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="hidden sm:inline-block absolute right-3 top-2.5 text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 pointer-events-none">
                Persistent
              </span>
            )}
          </div>

          {/* Wing and Grade Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
            {/* Wing selector toggle */}
            <div className="inline-flex rounded-lg p-0.5 bg-slate-200/90 text-xs">
              <button
                onClick={() => { setWingFilter('all'); setSelectedGrade('all'); }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  wingFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Wings
              </button>
              <button
                onClick={() => { setWingFilter('junior'); setSelectedGrade('all'); }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  wingFilter === 'junior'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-3 h-3" />
                <span>Junior School</span>
              </button>
              <button
                onClick={() => { setWingFilter('primary'); setSelectedGrade('all'); }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  wingFilter === 'primary'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3 h-3" />
                <span>Primary School</span>
              </button>
            </div>

            <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">
              {filteredLearners.length} of {accessibleLearners.length}
            </span>

            <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg overflow-x-auto">
              {grades.map((grade) => (
                <button
                  key={grade}
                  onClick={() => setSelectedGrade(grade)}
                  className={`px-2 py-0.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    selectedGrade === grade
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {grade === 'all' ? 'All Grades' : grade}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Search Filter Badge Indicator */}
        {searchQuery.trim() && (
          <div className="max-w-7xl mx-auto flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
            <span className="font-semibold text-slate-700">Filtering by:</span>
            <span className="font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 font-medium">
              "{searchQuery}"
            </span>
            <span className="text-slate-400">· (matches Learner Name, Student ID, Parent Name, or Parent ID)</span>
            <button
              onClick={clearSearch}
              className="ml-auto text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer text-xs"
            >
              Reset Search
            </button>
          </div>
        )}
      </div>

      {/* Learners & Parents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredLearners.map((learner) => {
          const parent = parents.find((p) => p.id === learner.parentId);
          const fee = feeStructures.find(
            (fs) => fs.learnerId === learner.id && fs.term === 'Term 2 - 2026'
          );
          const scoreCard = scoreCards.find((sc) => sc.learnerId === learner.id);
          const studentAttendance = attendance.filter((a) => a.learnerId === learner.id);
          const presentCount = studentAttendance.filter(
            (a) => a.status === 'present' || a.status === 'late'
          ).length;
          const attendancePercent =
            studentAttendance.length > 0
              ? (presentCount / studentAttendance.length) * 100
              : 96;

          const isDecrypted = parent ? isParentDecrypted(parent.id) : false;

          return (
            <div
              key={learner.id}
              onClick={() => setActiveLearnerDetail(learner)}
              className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between overflow-hidden"
            >
              {/* Top Banner */}
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg ${learner.photoPlaceholderColor} text-white flex items-center justify-center font-bold text-sm shrink-0`}
                    >
                      {learner.firstName[0]}
                      {learner.lastName[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">
                        {learner.firstName} {learner.lastName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        <span className="font-mono text-slate-600">{learner.studentId}</span>
                        <span aria-hidden="true">·</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border ${
                          isLearnerJunior(learner)
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {isLearnerJunior(learner) ? 'Junior School' : 'Primary School'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-slate-800">{learner.grade}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] uppercase font-semibold font-mono px-2 py-0.5 rounded ${
                      fee?.status === 'paid'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : fee?.status === 'overdue'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {fee?.status || 'Active'}
                  </span>
                </div>

                {learner.emergencyMedicalNotes && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50/70 p-2 rounded border border-amber-200/70">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                    <span className="line-clamp-1">{learner.emergencyMedicalNotes}</span>
                  </div>
                )}
              </div>

              {/* Parent & Encrypted Contact Section */}
              <div className="p-5 bg-slate-50/60 border-b border-slate-100 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Parent / Guardian Details
                  </span>
                  {parent && (
                    <button
                      onClick={(e) => handleToggleDecrypt(e, parent.id)}
                      title={
                        isDecrypted
                          ? 'Mask sensitive contact details'
                          : 'Decrypt sensitive contact details using authorized session key'
                      }
                      className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                    >
                      {isDecrypted ? (
                        <>
                          <Lock className="w-3 h-3 text-emerald-600" />
                          <span>Mask PII</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3 h-3 text-indigo-500" />
                          <span>Decrypt PII</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {parent ? (
                  <div className="space-y-1.5 text-slate-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-900">{parent.fullName}</span>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Parent ID: {isDecrypted ? parent.nationalId : maskNationalId(parent.nationalId)}
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-500">{parent.relationship}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-[11px]">
                        {isDecrypted ? parent.phone : maskPhoneNumber(parent.phone)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-[11px] truncate">
                        {isDecrypted ? parent.email : maskEmail(parent.email)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-[11px] truncate">
                        {isDecrypted ? parent.homeAddress : maskAddress(parent.homeAddress)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No parent profile linked</p>
                )}
              </div>

              {/* Bottom Metrics: Fee Balance & Academic Standing */}
              <div className="p-4 bg-white flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Term 2 Fee Due</span>
                  <p className="font-mono font-bold text-slate-900 tabular-nums">
                    ${fee ? fee.balance.toLocaleString() : '0'}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Attendance</span>
                  <p className="font-bold text-slate-800 tabular-nums">
                    {attendancePercent.toFixed(0)}%
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Rubric Pts</span>
                  <p className="font-mono font-bold text-indigo-700 tabular-nums">
                    {scoreCard ? `${scoreCard.gpa.toFixed(2)}/8` : '7.50/8'}
                  </p>
                </div>
              </div>

              {/* Exclusive Action Bar: Restricted to HOI and Owner accounts ONLY */}
              {isHoiOrOwner && (
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Shield className="w-3 h-3 text-indigo-500" />
                    HOI &amp; Owner
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLearnerForEdit(learner);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-md transition-colors cursor-pointer shadow-2xs hover:border-indigo-300"
                      title="Edit registered learner and parent details (HOI and Owner only)"
                    >
                      <Pencil className="w-3 h-3 text-indigo-600" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLearnerForDelete(learner);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-md transition-colors cursor-pointer shadow-2xs hover:border-rose-300"
                      title="Permanently delete learner from school directory (HOI and Owner only)"
                    >
                      <Trash2 className="w-3 h-3 text-rose-600" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredLearners.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <GraduationCap className="w-10 h-10 text-slate-300 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-slate-900">No Learners Match Search Filter</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              No student records found matching "{searchQuery}" in {selectedGrade === 'all' ? 'any grade' : selectedGrade}.
            </p>
          </div>
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="px-3.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
            >
              Clear Search Query
            </button>
          )}
        </div>
      )}

      {/* Learner Detail Drawer / Modal */}
      {activeLearnerDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-xs">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-lg ${activeLearnerDetail.photoPlaceholderColor} text-white flex items-center justify-center font-bold text-sm`}
                >
                  {activeLearnerDetail.firstName[0]}
                  {activeLearnerDetail.lastName[0]}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {activeLearnerDetail.firstName} {activeLearnerDetail.lastName}
                  </h3>
                  {currentUser.role === 'admin' ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-slate-500 font-medium">Class:</span>
                      <select
                        value={activeLearnerDetail.grade}
                        onChange={(e) => {
                          const newGrade = e.target.value;
                          updateLearner(activeLearnerDetail.id, { grade: newGrade });
                          setActiveLearnerDetail({ ...activeLearnerDetail, grade: newGrade });
                        }}
                        className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5 cursor-pointer"
                      >
                        {configuredGrades.map((g) => (
                          <option key={g.id || g.name} value={g.name}>
                            {g.name} ({g.tier})
                          </option>
                        ))}
                      </select>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-500">{activeLearnerDetail.studentId}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      {activeLearnerDetail.studentId} · {activeLearnerDetail.grade} · Enrolled:{' '}
                      {activeLearnerDetail.enrollmentDate}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setActiveLearnerDetail(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Emergency Notes */}
              {activeLearnerDetail.emergencyMedicalNotes && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold">Medical Alert:</span>{' '}
                    {activeLearnerDetail.emergencyMedicalNotes}
                  </div>
                </div>
              )}

              {/* Parent & Encrypted Details */}
              {(() => {
                const parent = parents.find((p) => p.id === activeLearnerDetail.parentId);
                const isDecrypted = parent ? isParentDecrypted(parent.id) : false;

                return (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-indigo-600" />
                        <h4 className="font-bold text-slate-900 text-sm">Parent & Guardian Records</h4>
                      </div>
                      {parent && (
                        <button
                          onClick={(e) => handleToggleDecrypt(e, parent.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer"
                        >
                          {isDecrypted ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          <span>{isDecrypted ? 'Lock / Mask Details' : 'Decrypt with AES-256 Key'}</span>
                        </button>
                      )}
                    </div>

                    {parent && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 font-semibold">
                            Full Legal Name
                          </span>
                          <p className="font-semibold text-slate-900">{parent.fullName}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 font-semibold">
                            Relationship & Occupation
                          </span>
                          <p className="text-slate-800">
                            {parent.relationship} · {parent.occupation}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 font-semibold">
                            National ID / Passport (Confidential)
                          </span>
                          <p className="font-mono text-slate-800">
                            {isDecrypted ? parent.nationalId : maskNationalId(parent.nationalId)}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 font-semibold">
                            Primary Phone Contact
                          </span>
                          <p className="font-mono text-slate-800">
                            {isDecrypted ? parent.phone : maskPhoneNumber(parent.phone)}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 font-semibold">
                            Email Address
                          </span>
                          <p className="font-mono text-slate-800">
                            {isDecrypted ? parent.email : maskEmail(parent.email)}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 font-semibold">
                            Residential Address
                          </span>
                          <p className="text-slate-800">
                            {isDecrypted ? parent.homeAddress : maskAddress(parent.homeAddress)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Quick Jump Buttons to Related Modules */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    const id = activeLearnerDetail.id;
                    setActiveLearnerDetail(null);
                    onNavigateToFees(id);
                  }}
                  className="p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-400 text-left transition-colors cursor-pointer group"
                >
                  <CreditCard className="w-4 h-4 text-indigo-600 mb-1 group-hover:scale-110 transition-transform" />
                  <p className="font-bold text-slate-900">Tuition & Fees</p>
                  <p className="text-[11px] text-slate-500">View statement & payments</p>
                </button>

                <button
                  onClick={() => {
                    const id = activeLearnerDetail.id;
                    setActiveLearnerDetail(null);
                    onNavigateToScorecard(id);
                  }}
                  className="p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-400 text-left transition-colors cursor-pointer group"
                >
                  <GraduationCap className="w-4 h-4 text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
                  <p className="font-bold text-slate-900">Score Card</p>
                  <p className="text-[11px] text-slate-500">View grades & academic rank</p>
                </button>

                <button
                  onClick={() => {
                    const id = activeLearnerDetail.id;
                    setActiveLearnerDetail(null);
                    onNavigateToAttendance(id);
                  }}
                  className="p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-400 text-left transition-colors cursor-pointer group"
                >
                  <Calendar className="w-4 h-4 text-amber-600 mb-1 group-hover:scale-110 transition-transform" />
                  <p className="font-bold text-slate-900">Attendance Log</p>
                  <p className="text-[11px] text-slate-500">Check register & absences</p>
                </button>
              </div>
            </div>

            {/* Footer with HOI and Owner Actions */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              {isHoiOrOwner ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLearnerForEdit(activeLearnerDetail);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-300 rounded-md transition-colors cursor-pointer shadow-2xs"
                    title="Edit Learner and Parent Record (HOI and Owner only)"
                  >
                    <Pencil className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Edit Profile (HOI/Owner)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLearnerForDelete(activeLearnerDetail);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-50 border border-rose-300 rounded-md transition-colors cursor-pointer shadow-2xs"
                    title="Permanently Delete Learner (HOI and Owner only)"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete Learner</span>
                  </button>
                </div>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={() => setActiveLearnerDetail(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Learner Modal - HOI & Owner Exclusive */}
      {learnerForEdit && (
        <EditLearnerModal
          isOpen={!!learnerForEdit}
          learner={learnerForEdit}
          onClose={() => setLearnerForEdit(null)}
          onSuccess={() => {
            if (activeLearnerDetail && activeLearnerDetail.id === learnerForEdit.id) {
              const freshLearner = learners.find((l) => l.id === learnerForEdit.id);
              if (freshLearner) {
                setActiveLearnerDetail(freshLearner);
              }
            }
            setLearnerForEdit(null);
            setOnboardSuccessNotice('Learner and guardian information updated successfully.');
            setTimeout(() => setOnboardSuccessNotice(null), 5000);
          }}
        />
      )}

      {/* Delete Confirmation Modal - HOI & Owner Exclusive */}
      {learnerForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-rose-200 max-w-md w-full overflow-hidden text-xs">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                  <Shield className="w-3 h-3" /> HOI &amp; Owner Protected Action
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Permanently Delete Learner?
                </h3>
                <p className="text-slate-600 text-xs">
                  Are you sure you want to permanently delete <strong className="text-slate-900">{learnerForDelete.firstName} {learnerForDelete.lastName}</strong> ({learnerForDelete.studentId}) from <span className="font-semibold text-slate-800">{learnerForDelete.grade}</span>?
                </p>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 space-y-1 text-[11px]">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                  <span>Irreversible Database Operation</span>
                </div>
                <p className="text-amber-700 leading-relaxed">
                  This action will permanently delete this student record from Firestore and system memory, along with linked academic scores, attendance logs, and fee balances.
                </p>
              </div>

              {deleteError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
                  {deleteError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setLearnerForDelete(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={async () => {
                    try {
                      setIsDeleting(true);
                      setDeleteError(null);
                      const deletedName = `${learnerForDelete.firstName} ${learnerForDelete.lastName}`;
                      await deleteLearner(learnerForDelete.id);
                      if (activeLearnerDetail?.id === learnerForDelete.id) {
                        setActiveLearnerDetail(null);
                      }
                      setLearnerForDelete(null);
                      setOnboardSuccessNotice(`Learner "${deletedName}" was successfully removed from the institution.`);
                      setTimeout(() => setOnboardSuccessNotice(null), 6000);
                    } catch (err) {
                      console.error('Delete failed:', err);
                      setDeleteError('An unexpected error occurred while deleting the learner.');
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isDeleting ? (
                    <span>Deleting Record...</span>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm &amp; Permanently Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Roster Onboarding Modal */}
      <BulkOnboardingModal
        isOpen={isBulkOnboardOpen}
        onClose={() => setIsBulkOnboardOpen(false)}
        onSuccess={(count) => {
          setIsBulkOnboardOpen(false);
          setOnboardSuccessNotice(`Successfully enrolled ${count} new learners and registered parents into the active directory.`);
          setTimeout(() => setOnboardSuccessNotice(null), 8000);
        }}
      />
    </div>
  );
};
