import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Building,
  Users,
  GraduationCap,
  BookOpen,
  UserCheck,
  Plus,
  Save,
  CheckCircle2,
  Trash2,
  Edit2,
  Phone,
  Mail,
  Shield,
  CreditCard,
  MapPin,
  HelpCircle,
  Sparkles,
  Search,
  Filter,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { SchoolProfile, GradeLevel, SubjectDefinition, TeacherRecord, AdminAccount } from '../types';
import { INITIAL_SUBJECTS } from '../data/mockData';
import { validateKenyanPhoneNumber } from '../services/cryptoService';

type TabKey = 'school' | 'admins' | 'teachers' | 'grades' | 'subjects' | 'guide';

export const SchoolAcademicSetupView: React.FC = () => {
  const {
    schoolProfile,
    updateSchoolProfile,
    grades,
    addGrade,
    updateGrade,
    deleteGrade,
    subjects,
    addSubject,
    updateSubject,
    deleteSubject,
    teachers,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    adminAccounts,
    addAdminAccount,
    updateAdminAccount,
    deleteAdminAccount,
    learners,
    isCloudConnected,
    syncAllDataToFirestore,
  } = useApp();

  const [activeTab, setActiveTab] = useState<TabKey>('school');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setSuccessNotice(msg);
    setTimeout(() => setSuccessNotice(null), 5000);
  };

  // 1. School Profile Form State
  const [schoolForm, setSchoolForm] = useState<SchoolProfile>({ ...schoolProfile });
  const [isSavingSchool, setIsSavingSchool] = useState(false);

  const handleSaveSchool = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSchool(true);
    updateSchoolProfile(schoolForm);
    setTimeout(() => {
      setIsSavingSchool(false);
      showNotification('School profile and official institutional settings saved successfully!');
    }, 400);
  };

  // 2. Teacher Modal State
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [teacherModalTierFilter, setTeacherModalTierFilter] = useState<'auto' | 'all' | 'lower' | 'upper' | 'junior'>('auto');
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [teacherForm, setTeacherForm] = useState<Omit<TeacherRecord, 'id'>>({
    name: '',
    phone: '',
    nationalOrStaffId: '',
    email: '',
    teacherType: 'class_teacher',
    assignedGrade: 'Grade 7A',
    registeredSubjects: ['Mathematics & Algebra'],
    department: 'Mathematics & STEM',
  });
  const [teacherError, setTeacherError] = useState<string | null>(null);

  // 3. Grade Modal State
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  const [gradeForm, setGradeForm] = useState<Omit<GradeLevel, 'id'>>({
    name: 'Grade 1',
    level: 1,
    tier: 'Lower Primary',
    stream: 'Main',
    classTeacherId: '',
    roomNumber: '',
    capacity: 40,
  });

  // 4. Subject Modal State
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [subjectForm, setSubjectForm] = useState<Omit<SubjectDefinition, 'id'>>({
    name: '',
    code: '',
    category: 'Sciences',
    applicableGrades: [7, 8, 9],
    assignedTeacherId: '',
    description: '',
  });

  // 5. Admin Account Modal State
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [adminForm, setAdminForm] = useState<Omit<AdminAccount, 'id'>>({
    name: '',
    phone: '',
    nationalOrStaffId: '',
    role: 'admin',
    title: 'Head of School / Chief Principal',
    email: '',
    assignedDate: new Date().toISOString().slice(0, 10),
  });
  const [adminError, setAdminError] = useState<string | null>(null);

  // Filters
  const [teacherSearch, setTeacherSearch] = useState('');
  const [gradeTierFilter, setGradeTierFilter] = useState<'all' | 'Lower Primary' | 'Upper Primary' | 'Junior School'>('all');
  const [subjectCategoryFilter, setSubjectCategoryFilter] = useState('all');
  const [subjectWingFilter, setSubjectWingFilter] = useState<'all' | 'junior' | 'upper_primary' | 'lower_primary'>('all');

  // Teacher Handlers
  const handleOpenAddTeacher = () => {
    setEditingTeacherId(null);
    setTeacherForm({
      name: '',
      phone: '',
      nationalOrStaffId: '',
      email: '',
      teacherType: 'class_teacher',
      assignedGrade: grades[0]?.name || 'Grade 7A',
      registeredSubjects: [subjects[0]?.name || 'Mathematics & Algebra'],
      department: 'Mathematics & STEM',
    });
    setTeacherError(null);
    setIsTeacherModalOpen(true);
  };

  const handleOpenEditTeacher = (t: TeacherRecord) => {
    setEditingTeacherId(t.id);
    setTeacherForm({
      name: t.name,
      phone: t.phone,
      nationalOrStaffId: t.nationalOrStaffId,
      email: t.email,
      teacherType: t.teacherType,
      assignedGrade: t.assignedGrade,
      registeredSubjects: t.registeredSubjects,
      department: t.department,
    });
    setTeacherError(null);
    setIsTeacherModalOpen(true);
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherError(null);

    const val = validateKenyanPhoneNumber(teacherForm.phone);
    if (!val.isValid) {
      setTeacherError(val.error || 'Phone must start with 07.... or 01....');
      return;
    }

    if (!teacherForm.nationalOrStaffId.trim()) {
      setTeacherError('Please provide a National ID or Staff ID (acts as the teacher password).');
      return;
    }

    const payload = {
      ...teacherForm,
      phone: val.cleanPhone!,
    };

    if (editingTeacherId) {
      updateTeacher(editingTeacherId, payload);
      showNotification(`Updated teacher details for ${payload.name}`);
    } else {
      addTeacher(payload);
      showNotification(`Registered teacher ${payload.name}. They can now log in using ${payload.phone} and ID ${payload.nationalOrStaffId}.`);
    }
    setIsTeacherModalOpen(false);
  };

  // Grade Handlers
  const handleOpenAddGrade = () => {
    setEditingGradeId(null);
    setGradeForm({
      name: 'Grade 1',
      level: 1,
      tier: 'Lower Primary',
      stream: 'Main',
      classTeacherId: '',
      roomNumber: 'Block A',
      capacity: 40,
    });
    setIsGradeModalOpen(true);
  };

  const handleOpenEditGrade = (g: GradeLevel) => {
    setEditingGradeId(g.id);
    setGradeForm({
      name: g.name,
      level: g.level,
      tier: g.tier,
      stream: g.stream,
      classTeacherId: g.classTeacherId,
      roomNumber: g.roomNumber,
      capacity: g.capacity,
    });
    setIsGradeModalOpen(true);
  };

  const handleSaveGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGradeId) {
      updateGrade(editingGradeId, gradeForm);
      showNotification(`Updated ${gradeForm.name}`);
    } else {
      addGrade(gradeForm);
      showNotification(`Added new grade cohort ${gradeForm.name} (Grade ${gradeForm.level})`);
    }
    setIsGradeModalOpen(false);
  };

  const handleEnsureAllGrades = () => {
    const standardLevels = [
      { name: 'Grade 1', level: 1, tier: 'Lower Primary' as const, stream: 'Main', roomNumber: 'Block A - Rm 1', capacity: 35 },
      { name: 'Grade 2', level: 2, tier: 'Lower Primary' as const, stream: 'Main', roomNumber: 'Block A - Rm 2', capacity: 35 },
      { name: 'Grade 3', level: 3, tier: 'Lower Primary' as const, stream: 'Main', roomNumber: 'Block A - Rm 3', capacity: 35 },
      { name: 'Grade 4', level: 4, tier: 'Upper Primary' as const, stream: 'Main', roomNumber: 'Block B - Rm 1', capacity: 40 },
      { name: 'Grade 5A', level: 5, tier: 'Upper Primary' as const, stream: 'A', roomNumber: 'Block B - Rm 2', capacity: 40 },
      { name: 'Grade 6B', level: 6, tier: 'Upper Primary' as const, stream: 'B', roomNumber: 'Block B - Rm 3', capacity: 40 },
      { name: 'Grade 7A', level: 7, tier: 'Junior School' as const, stream: 'A', roomNumber: 'JSS Complex - Rm 101', capacity: 45 },
      { name: 'Grade 8A', level: 8, tier: 'Junior School' as const, stream: 'A', roomNumber: 'JSS Complex - Rm 102', capacity: 45 },
      { name: 'Grade 9', level: 9, tier: 'Junior School' as const, stream: 'Main', roomNumber: 'JSS Complex - Rm 201', capacity: 45 },
    ];

    let addedCount = 0;
    standardLevels.forEach((std) => {
      const exists = grades.some((g) => g.level === std.level);
      if (!exists) {
        addGrade({
          name: std.name,
          level: std.level,
          tier: std.tier,
          stream: std.stream,
          roomNumber: std.roomNumber,
          capacity: std.capacity,
          classTeacherId: '',
        });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      showNotification(`Successfully auto-provisioned ${addedCount} missing CBC Grade levels. All Grades 1 through 9 are now registered!`);
    } else {
      showNotification('All CBC Grade levels (Grade 1 through 9) are already registered in the system.');
    }
  };

  // Subject Handlers
  const handleOpenAddSubject = () => {
    setEditingSubjectId(null);
    setSubjectForm({
      name: '',
      code: '',
      category: 'Sciences',
      applicableGrades: [7, 8, 9],
      assignedTeacherId: '',
      description: '',
    });
    setIsSubjectModalOpen(true);
  };

  const handleOpenEditSubject = (s: SubjectDefinition) => {
    setEditingSubjectId(s.id);
    setSubjectForm({
      name: s.name,
      code: s.code,
      category: s.category,
      applicableGrades: s.applicableGrades,
      assignedTeacherId: s.assignedTeacherId,
      description: s.description,
    });
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSubjectId) {
      updateSubject(editingSubjectId, subjectForm);
      showNotification(`Updated subject: ${subjectForm.name}`);
    } else {
      addSubject(subjectForm);
      showNotification(`Added new CBC subject: ${subjectForm.name} (${subjectForm.code})`);
    }
    setIsSubjectModalOpen(false);
  };

  const handleEnsureStandardSubjects = () => {
    let updatedCount = 0;
    // Remove obsolete legacy subjects if any
    subjects.forEach((s) => {
      const isLegacy =
        s.code?.includes("101 (ENG)") ||
        s.code?.includes("102 (KIS)") ||
        s.code?.includes("103 (MAT)") ||
        s.code?.includes("104 (ISC)") ||
        s.code?.includes("105 (AGN)") ||
        s.code?.includes("01 (ENG)") ||
        s.code?.includes("101 (ILA)");
      if (isLegacy && !INITIAL_SUBJECTS.some((init) => init.id === s.id || init.code === s.code)) {
        deleteSubject(s.id);
        updatedCount++;
      }
    });

    INITIAL_SUBJECTS.forEach((initSub) => {
      const existing = subjects.find(
        (s) => s.id === initSub.id || s.code === initSub.code || s.name.toLowerCase() === initSub.name.toLowerCase()
      );
      if (!existing) {
        addSubject(initSub);
        updatedCount++;
      } else if (existing.code !== initSub.code || existing.name !== initSub.name) {
        updateSubject(existing.id, initSub);
        updatedCount++;
      }
    });

    showNotification(
      `Official KNEC 901/601/301 curriculum synchronized (${INITIAL_SUBJECTS.length} subjects: Junior 901-912, Upper Primary 601-612, Lower Primary 301-307)!`
    );
  };

  // Admin Account Handlers
  const handleOpenAddAdmin = () => {
    setEditingAdminId(null);
    setAdminForm({
      name: '',
      phone: '',
      nationalOrStaffId: '',
      role: 'admin',
      title: 'Deputy Principal',
      email: '',
      assignedDate: new Date().toISOString().slice(0, 10),
    });
    setAdminError(null);
    setIsAdminModalOpen(true);
  };

  const handleSaveAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);

    const val = validateKenyanPhoneNumber(adminForm.phone);
    if (!val.isValid) {
      setAdminError(val.error || 'Phone must start with 07.... or 01....');
      return;
    }

    if (!adminForm.nationalOrStaffId.trim()) {
      setAdminError('Please provide a National ID / Staff ID (used as password).');
      return;
    }

    const payload = {
      ...adminForm,
      phone: val.cleanPhone!,
    };

    if (editingAdminId) {
      updateAdminAccount(editingAdminId, payload);
      showNotification(`Updated administrator account for ${payload.name}`);
    } else {
      addAdminAccount(payload);
      showNotification(`Registered administrator ${payload.name}. They can log in with ${payload.phone} and ID ${payload.nationalOrStaffId}.`);
    }
    setIsAdminModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Institutional Governance & Academic Structure</span>
            <span aria-hidden="true">·</span>
            <span>Kenyan CBC Grades 1 - 9</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            School Registration & Academic Configuration
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Register your school profile, administrative officers, faculty teachers, CBC grades (Grade 1 to 9), and curriculum subjects.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            onClick={() => setActiveTab('guide')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            <span>Step-by-Step Setup Guide</span>
          </button>
          <button
            onClick={() => syncAllDataToFirestore()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Sync All to Cloud DB</span>
          </button>
        </div>
      </div>

      {/* Success Notice */}
      {successNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{successNotice}</span>
          </div>
          <button
            onClick={() => setSuccessNotice(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1 rounded font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 text-xs font-medium">
        <button
          onClick={() => setActiveTab('school')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg transition-colors cursor-pointer border-b-2 font-semibold ${
            activeTab === 'school'
              ? 'border-indigo-600 text-indigo-700 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>1. School Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('admins')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg transition-colors cursor-pointer border-b-2 font-semibold ${
            activeTab === 'admins'
              ? 'border-indigo-600 text-indigo-700 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>2. School Administrators ({adminAccounts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('teachers')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg transition-colors cursor-pointer border-b-2 font-semibold ${
            activeTab === 'teachers'
              ? 'border-indigo-600 text-indigo-700 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>3. Teachers & Faculty ({teachers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('grades')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg transition-colors cursor-pointer border-b-2 font-semibold ${
            activeTab === 'grades'
              ? 'border-indigo-600 text-indigo-700 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>4. Grades 1 to 9 ({grades.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('subjects')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg transition-colors cursor-pointer border-b-2 font-semibold ${
            activeTab === 'subjects'
              ? 'border-indigo-600 text-indigo-700 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>5. CBC Subjects ({subjects.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg transition-colors cursor-pointer border-b-2 font-semibold ml-auto ${
            activeTab === 'guide'
              ? 'border-indigo-600 text-indigo-700 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Registration Walkthrough</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: SCHOOL PROFILE REGISTRATION                       */}
      {/* ======================================================== */}
      {activeTab === 'school' && (
        <form onSubmit={handleSaveSchool} className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Institution Identity & Registration Particulars</h2>
              <p className="text-xs text-slate-500">Official Ministry of Education details shown on all PDF receipts and competency scorecards.</p>
            </div>
            <button
              type="submit"
              disabled={isSavingSchool}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingSchool ? 'Saving...' : 'Save School Profile'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Comprehensive School Name *</label>
              <input
                type="text"
                required
                value={schoolForm.name}
                onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                placeholder="e.g. Mwivona Comprehensive School"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-emerald-800 mb-1">Primary School Wing Name (Grades 1–6) *</label>
              <input
                type="text"
                required
                value={schoolForm.primaryWingName || 'Mwivona Primary School'}
                onChange={(e) => setSchoolForm({ ...schoolForm, primaryWingName: e.target.value })}
                placeholder="e.g. Mwivona Primary School"
                className="w-full px-3 py-2 bg-emerald-50/50 border border-emerald-300 rounded-lg text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-emerald-700">Name printed on Primary School report cards</span>
            </div>

            <div>
              <label className="block font-semibold text-indigo-800 mb-1">Junior School Wing Name (Grades 7–9) *</label>
              <input
                type="text"
                required
                value={schoolForm.juniorWingName || 'Mwivona Junior School'}
                onChange={(e) => setSchoolForm({ ...schoolForm, juniorWingName: e.target.value })}
                placeholder="e.g. Mwivona Junior School"
                className="w-full px-3 py-2 bg-indigo-50/50 border border-indigo-300 rounded-lg text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-indigo-700">Name printed on Junior School score cards</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">MoE / KNEC Registration Code *</label>
              <input
                type="text"
                required
                value={schoolForm.registrationNumber}
                onChange={(e) => setSchoolForm({ ...schoolForm, registrationNumber: e.target.value })}
                placeholder="e.g. MOE/COMP/2026/04812"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Curriculum Standard *</label>
              <input
                type="text"
                required
                value={schoolForm.curriculum}
                onChange={(e) => setSchoolForm({ ...schoolForm, curriculum: e.target.value })}
                placeholder="e.g. Kenyan CBC (Grades 1 to 9)"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">County *</label>
              <input
                type="text"
                required
                value={schoolForm.county}
                onChange={(e) => setSchoolForm({ ...schoolForm, county: e.target.value })}
                placeholder="e.g. Kakamega County"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sub-County / District *</label>
              <input
                type="text"
                required
                value={schoolForm.subCounty}
                onChange={(e) => setSchoolForm({ ...schoolForm, subCounty: e.target.value })}
                placeholder="e.g. Westlands Sub-County"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">School Motto / Values *</label>
              <input
                type="text"
                required
                value={schoolForm.motto}
                onChange={(e) => setSchoolForm({ ...schoolForm, motto: e.target.value })}
                placeholder="e.g. Strive for Excellence, Integrity and Leadership"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 italic focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">School Mobile Phone (Format: 07.. or 01..) *</label>
              <input
                type="tel"
                required
                value={schoolForm.phone}
                onChange={(e) => setSchoolForm({ ...schoolForm, phone: e.target.value })}
                placeholder="0711002233"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official School Email *</label>
              <input
                type="email"
                required
                value={schoolForm.email}
                onChange={(e) => setSchoolForm({ ...schoolForm, email: e.target.value })}
                placeholder="admin@mwivonacomprehensive.sc.ke"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Postal Address *</label>
              <input
                type="text"
                required
                value={schoolForm.postalAddress}
                onChange={(e) => setSchoolForm({ ...schoolForm, postalAddress: e.target.value })}
                placeholder="P.O. Box 120 - 50307, Luanda, Kenya"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Financial Account Particulars (for Kshs Fee Collection & Receipts) */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Official School Fee Collection Accounts (Kshs)</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Configured accounts printed on official fee vouchers and payment reminder SMS messages.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bank Name & Branch</label>
                <input
                  type="text"
                  value={schoolForm.bankName}
                  onChange={(e) => setSchoolForm({ ...schoolForm, bankName: e.target.value })}
                  placeholder="e.g. Kenya Commercial Bank (KCB) · Kakamega Branch"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bank Account Number</label>
                <input
                  type="text"
                  value={schoolForm.bankAccount}
                  onChange={(e) => setSchoolForm({ ...schoolForm, bankAccount: e.target.value })}
                  placeholder="e.g. 1289045671"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">M-Pesa Paybill / Till Number</label>
                <input
                  type="text"
                  value={schoolForm.mpesaPaybill}
                  onChange={(e) => setSchoolForm({ ...schoolForm, mpesaPaybill: e.target.value })}
                  placeholder="e.g. 522522"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">M-Pesa Account Name Ref</label>
                <input
                  type="text"
                  value={schoolForm.mpesaAccountName}
                  onChange={(e) => setSchoolForm({ ...schoolForm, mpesaAccountName: e.target.value })}
                  placeholder="e.g. MWIVONA-FEES"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* TAB 2: SCHOOL ADMINISTRATORS                             */}
      {/* ======================================================== */}
      {activeTab === 'admins' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Registered School Administrators & Bursars</h2>
              <p className="text-xs text-slate-500">
                School heads, deputy principals, and bursars log in using their registered mobile phone and National/Staff ID as their password.
              </p>
            </div>
            <button
              onClick={handleOpenAddAdmin}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Register Administrator</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Officer Name</th>
                  <th className="py-2.5 px-3">Role / Designation</th>
                  <th className="py-2.5 px-3">Registered Phone (Login)</th>
                  <th className="py-2.5 px-3">National / Staff ID (Password)</th>
                  <th className="py-2.5 px-3">Official Email</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adminAccounts.map((adm) => (
                  <tr key={adm.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                        {adm.name[0]}
                      </div>
                      <span>{adm.name}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold font-mono ${
                        adm.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {adm.title}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-slate-800">{adm.phone}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {adm.nationalOrStaffId}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-mono">{adm.email}</td>
                    <td className="py-3 px-4 text-right">
                      {adminAccounts.length > 1 && (
                        <button
                          onClick={() => {
                            if (confirm(`Remove administrator ${adm.name}?`)) {
                              deleteAdminAccount(adm.id);
                              showNotification(`Removed administrator ${adm.name}`);
                            }
                          }}
                          className="p-1 text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                          title="Remove officer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: TEACHERS REGISTRATION                             */}
      {/* ======================================================== */}
      {activeTab === 'teachers' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Faculty Teacher Registry & Subject Assignments</h2>
              <p className="text-xs text-slate-500">
                Register teachers with their phone (07.../01...) and National/Staff ID. Class teachers represent full grades; subject teachers assess registered learning areas.
              </p>
            </div>
            <button
              onClick={handleOpenAddTeacher}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Teacher</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search teacher by name, phone, or subject..."
              value={teacherSearch}
              onChange={(e) => setTeacherSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Teacher Name</th>
                  <th className="py-2.5 px-3">Role Type</th>
                  <th className="py-2.5 px-3">Registered Phone (Login)</th>
                  <th className="py-2.5 px-3">Staff / National ID (Password)</th>
                  <th className="py-2.5 px-3">Assigned Grade / Subjects</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers
                  .filter((t) => {
                    const q = teacherSearch.toLowerCase();
                    return (
                      !q ||
                      t.name.toLowerCase().includes(q) ||
                      t.phone.includes(q) ||
                      t.registeredSubjects.some((s) => s.toLowerCase().includes(q))
                    );
                  })
                  .map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div>{t.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{t.email}</div>
                      </td>
                      <td className="py-3 px-3">
                        {t.teacherType === 'class_teacher' ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Class Teacher · {t.assignedGrade}
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                            Subject Teacher
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-slate-800">{t.phone}</td>
                      <td className="py-3 px-3 font-mono text-slate-700">
                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {t.nationalOrStaffId}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {t.registeredSubjects.map((sub, sIdx) => (
                            <span key={sIdx} className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] text-slate-700">
                              {sub}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{t.department}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditTeacher(t)}
                            className="p-1 text-indigo-600 hover:text-indigo-900 cursor-pointer"
                            title="Edit teacher"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Remove teacher ${t.name}?`)) {
                                deleteTeacher(t.id);
                                showNotification(`Removed teacher ${t.name}`);
                              }
                            }}
                            className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                            title="Remove teacher"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: GRADES (GRADE 1 TO 9)                             */}
      {/* ======================================================== */}
      {activeTab === 'grades' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Grade Levels & Streams (Grade 1 through 9)</h2>
              <p className="text-xs text-slate-500">
                Kenyan CBC 3-tier structure: Lower Primary (Grades 1-3), Upper Primary (Grades 4-6), and Junior Secondary School (Grades 7-9).
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <button
                onClick={handleEnsureAllGrades}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg border border-indigo-200 transition-colors cursor-pointer text-xs"
                title="Automatically verify and register all CBC Grade 1 through 9 cohorts"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Auto-Ensure Grades 1 to 9</span>
              </button>
              <button
                onClick={handleOpenAddGrade}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Register New Grade / Stream</span>
              </button>
            </div>
          </div>

          {/* Tier filter pill buttons */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Filter Tier:</span>
            {(['all', 'Lower Primary', 'Upper Primary', 'Junior School'] as const).map((tier) => (
              <button
                key={tier}
                onClick={() => setGradeTierFilter(tier)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  gradeTierFilter === tier
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tier === 'all' ? 'All Grades (1 - 9)' : tier}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {grades
              .filter((g) => gradeTierFilter === 'all' || g.tier === gradeTierFilter)
              .map((g) => {
                const enrolledCount = learners.filter((l) => l.grade === g.name).length;
                const assignedTeacher = teachers.find((t) => t.id === g.classTeacherId || t.assignedGrade === g.name);

                return (
                  <div key={g.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 hover:border-indigo-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-mono">
                          {g.tier} · Level {g.level}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 mt-1">{g.name}</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditGrade(g)}
                          className="p-1 text-slate-500 hover:text-indigo-600 cursor-pointer"
                          title="Edit grade"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Remove grade ${g.name}?`)) {
                              deleteGrade(g.id);
                              showNotification(`Removed ${g.name}`);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Delete grade"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-slate-700">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Enrolled Learners:</span>
                        <span className="font-bold font-mono text-slate-900">{enrolledCount} / {g.capacity || 40}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Class Teacher:</span>
                        <span className="font-semibold text-slate-900">{assignedTeacher ? assignedTeacher.name : 'Unassigned'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Classroom:</span>
                        <span className="text-slate-800">{g.roomNumber || 'Main Block'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: SUBJECTS REGISTRATION                             */}
      {/* ======================================================== */}
      {activeTab === 'subjects' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Kenyan CBC Learning Areas & Curriculum Subjects</h2>
              <p className="text-xs text-slate-500">
                Official learning areas for Junior School (Grades 7-9), Upper Primary (Grades 4-6), and Lower Primary (Grades 1-3).
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <button
                onClick={handleEnsureStandardSubjects}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg border border-indigo-200 transition-colors cursor-pointer text-xs"
                title="Automatically verify and register standard Kenyan CBC learning areas"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Auto-Ensure Standard Subjects</span>
              </button>
              <button
                onClick={handleOpenAddSubject}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Register New Subject</span>
              </button>
            </div>
          </div>

          {/* Wing / Section filter buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
            <span className="text-slate-500 font-medium">Filter Section:</span>
            <button
              onClick={() => setSubjectWingFilter('all')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                subjectWingFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Learning Areas ({subjects.length})
            </button>
            <button
              onClick={() => setSubjectWingFilter('lower_primary')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                subjectWingFilter === 'lower_primary'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Lower Primary (Grades 1–3 · Codes 301–307)</span>
            </button>
            <button
              onClick={() => setSubjectWingFilter('upper_primary')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                subjectWingFilter === 'upper_primary'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Upper Primary (Grades 4–6 · Codes 601–612)</span>
            </button>
            <button
              onClick={() => setSubjectWingFilter('junior')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                subjectWingFilter === 'junior'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Junior School (Grades 7–9 · Codes 901–912)</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Subject Name & Code</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Applicable Grades</th>
                  <th className="py-2.5 px-3">Assigned Lead Teacher</th>
                  <th className="py-2.5 px-3">Core Learning Outcomes</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjects
                  .filter((sub) => {
                    if (subjectWingFilter === 'junior') {
                      return sub.applicableGrades.some((g) => g >= 7);
                    }
                    if (subjectWingFilter === 'upper_primary') {
                      return sub.applicableGrades.some((g) => g >= 4 && g <= 6);
                    }
                    if (subjectWingFilter === 'lower_primary') {
                      return sub.applicableGrades.some((g) => g <= 3);
                    }
                    return true;
                  })
                  .map((sub) => {
                    const assignedTeacher = teachers.find((t) => t.id === sub.assignedTeacherId || t.registeredSubjects.includes(sub.name));

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div>{sub.name}</div>
                        <div className="font-mono text-[10px] text-indigo-700 font-bold">{sub.code}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                          {sub.category}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {sub.applicableGrades.map((lvl) => (
                            <span key={lvl} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-mono font-bold">
                              Gr {lvl}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800">
                        {assignedTeacher ? assignedTeacher.name : 'Faculty Pool'}
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                        {sub.description || 'CBC Core curriculum study area.'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditSubject(sub)}
                            className="p-1 text-indigo-600 hover:text-indigo-900 cursor-pointer"
                            title="Edit subject"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Remove subject ${sub.name}?`)) {
                                deleteSubject(sub.id);
                                showNotification(`Removed subject ${sub.name}`);
                              }
                            }}
                            className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                            title="Remove subject"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: SETUP GUIDE & WALKTHROUGH                         */}
      {/* ======================================================== */}
      {activeTab === 'guide' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 text-xs text-slate-800">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">
              How to Register a School, Admin, Teachers, Grades (1 - 9) & Subjects
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Step-by-step institutional registration workflow according to Kenyan educational standards and role access policies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">1</span>
                <span>Register School Profile & MoE Registration Code</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-xs">
                In the <strong>"1. School Profile"</strong> tab above, enter your official Institution Name, Ministry of Education / KNEC code, County, Sub-County, postal address, official school phone number, and Safaricom M-Pesa Paybill number. These details automatically brand all official PDF receipts and CBC report cards.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">2</span>
                <span>Register School Administrators</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-xs">
                In the <strong>"2. School Administrators"</strong> tab, click <em>"Register Administrator"</em>. Provide their full name, mobile phone number (format <code>07...</code> or <code>01...</code>), and their National ID or Staff ID. The ID number serves as their official login password.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">3</span>
                <span>Register Teachers & Assign Roles</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-xs">
                Under <strong>"3. Teachers & Faculty"</strong>, add each teacher with their 10-digit mobile phone and National/Staff ID as password. Designate them either as a <strong>Class Teacher</strong> (responsible for an entire grade cohort roll call and remarks) or a <strong>Subject Teacher</strong> (assigned to specific curriculum learning areas).
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">4</span>
                <span>Configure Grades 1 through 9</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-xs">
                In <strong>"4. Grades 1 to 9"</strong>, ensure your grades match your school's enrollment: Lower Primary (Grades 1-3), Upper Primary (Grades 4-6), and Junior Secondary School (Grades 7, 8, 9). You can register multiple streams per grade (e.g., Grade 7A, Grade 7B) and assign the Class Teacher.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 md:col-span-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">5</span>
                <span>Configure CBC Curriculum Subjects (Grades 1 to 9)</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-xs">
                In <strong>"5. CBC Subjects"</strong>, register each curriculum learning area (e.g. Mathematics & Algebra, English Literature, Kiswahili & Fasihi, Integrated Science, Pre-Technical Studies, Agriculture & Nutrition, Creative Arts & Sports). Select applicable grade levels (from Grade 1 to 9) and assign the designated faculty teacher. These subjects automatically appear on teacher score entry sheets and competency report cards.
              </p>
            </div>
          </div>

          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
            <h3 className="font-bold text-indigo-900 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>How Teachers & Parents Log In After Registration</span>
            </h3>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-indigo-950">
              <li><strong>Teachers:</strong> Enter their registered phone number (e.g. <code>0722101202</code>) and their National/Staff ID as password. Class teachers will see their entire assigned class cohort; subject teachers access their assigned subject scores.</li>
              <li><strong>Parents:</strong> When a learner is enrolled, the parent's phone (e.g. <code>0712345678</code>) and National ID are registered. Parents log in to view only their enrolled child's scorecards, attendance, and fee receipts in Kshs.</li>
              <li><strong>Password Resets:</strong> If forgotten, any registered user clicks "Forgot password?" to receive an instantaneous SMS reset link to their registered <code>07...</code> or <code>01...</code> number.</li>
            </ul>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: REGISTER / EDIT TEACHER                           */}
      {/* ======================================================== */}
      {isTeacherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden text-xs text-slate-900">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  {editingTeacherId ? 'Edit Teacher Record' : 'Register New Faculty Teacher'}
                </h3>
              </div>
              <button
                onClick={() => setIsTeacherModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="p-6 space-y-4">
              {teacherError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{teacherError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mr. Marcus Thorne"
                  value={teacherForm.name}
                  onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mobile Phone (Login) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0722101202"
                    value={teacherForm.phone}
                    onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                  />
                  <span className="text-[10px] text-slate-500">Format: 07.... or 01....</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    National ID / Staff ID (Password) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ID-77012"
                    value={teacherForm.nationalOrStaffId}
                    onChange={(e) => setTeacherForm({ ...teacherForm, nationalOrStaffId: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                  />
                  <span className="text-[10px] text-slate-500">Used as teacher login password</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="teacher@academiacademy.edu"
                  value={teacherForm.email}
                  onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Teacher Role Type *</label>
                  <select
                    value={teacherForm.teacherType}
                    onChange={(e) => setTeacherForm({ ...teacherForm, teacherType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                  >
                    <option value="class_teacher">Class Teacher (Full Grade Access)</option>
                    <option value="subject_teacher">Subject Teacher (Subject Scores Only)</option>
                  </select>
                </div>

                {teacherForm.teacherType === 'class_teacher' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Assigned Grade (1 - 9) *</label>
                    <select
                      value={teacherForm.assignedGrade || grades[0]?.name}
                      onChange={(e) => setTeacherForm({ ...teacherForm, assignedGrade: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold"
                    >
                      {grades.map((g) => (
                        <option key={g.id} value={g.name}>{g.name} ({g.tier})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department</label>
                <select
                  value={teacherForm.department}
                  onChange={(e) => setTeacherForm({ ...teacherForm, department: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                >
                  <option value="Mathematics & STEM">Mathematics & STEM</option>
                  <option value="Languages & Humanities">Languages & Humanities</option>
                  <option value="Natural Sciences">Natural Sciences</option>
                  <option value="Creative Arts & Sports">Creative Arts & Sports</option>
                  <option value="Technical & Vocational">Technical & Vocational</option>
                  <option value="Primary Department">Primary Department</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-semibold text-slate-700">
                    Registered Subjects Taught{' '}
                    <span className="text-xs font-normal text-indigo-600">
                      ({teacherForm.registeredSubjects.length} selected)
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const targetSubs = subjects.filter((s) => {
                          const g = (teacherForm.assignedGrade || '').toLowerCase();
                          if (g.includes('grade 1') || g.includes('grade 2') || g.includes('grade 3') || g.includes('lower')) {
                            return s.applicableGrades.some((x) => x <= 3);
                          }
                          if (g.includes('grade 4') || g.includes('grade 5') || g.includes('grade 6') || g.includes('upper')) {
                            return s.applicableGrades.some((x) => x >= 4 && x <= 6);
                          }
                          return s.applicableGrades.some((x) => x >= 7);
                        });
                        const newNames = Array.from(new Set([...teacherForm.registeredSubjects, ...targetSubs.map((s) => s.name)]));
                        setTeacherForm({ ...teacherForm, registeredSubjects: newNames });
                      }}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline"
                    >
                      Select All for Grade
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setTeacherForm({ ...teacherForm, registeredSubjects: [] })}
                      className="text-[11px] text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Tier quick-filter pills inside modal */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2 text-[11px]">
                  <span className="text-slate-400 font-medium">Filter:</span>
                  <button
                    type="button"
                    onClick={() => setTeacherModalTierFilter('auto')}
                    className={`px-2 py-0.5 rounded cursor-pointer font-medium ${
                      teacherModalTierFilter === 'auto'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    📌 Auto (For Assigned Grade)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeacherModalTierFilter('lower')}
                    className={`px-2 py-0.5 rounded cursor-pointer font-medium ${
                      teacherModalTierFilter === 'lower'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Lower Primary (301–307)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeacherModalTierFilter('upper')}
                    className={`px-2 py-0.5 rounded cursor-pointer font-medium ${
                      teacherModalTierFilter === 'upper'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Upper Primary (601–612)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeacherModalTierFilter('junior')}
                    className={`px-2 py-0.5 rounded cursor-pointer font-medium ${
                      teacherModalTierFilter === 'junior'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Junior School (901–912)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeacherModalTierFilter('all')}
                    className={`px-2 py-0.5 rounded cursor-pointer font-medium ${
                      teacherModalTierFilter === 'all'
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    All ({subjects.length})
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  {subjects
                    .filter((sub) => {
                      if (teacherModalTierFilter === 'lower') {
                        return sub.applicableGrades.some((g) => g <= 3);
                      }
                      if (teacherModalTierFilter === 'upper') {
                        return sub.applicableGrades.some((g) => g >= 4 && g <= 6);
                      }
                      if (teacherModalTierFilter === 'junior') {
                        return sub.applicableGrades.some((g) => g >= 7);
                      }
                      if (teacherModalTierFilter === 'auto') {
                        const g = (teacherForm.assignedGrade || '').toLowerCase();
                        if (g.includes('grade 1') || g.includes('grade 2') || g.includes('grade 3') || g.includes('lower')) {
                          return sub.applicableGrades.some((x) => x <= 3);
                        }
                        if (g.includes('grade 4') || g.includes('grade 5') || g.includes('grade 6') || g.includes('upper')) {
                          return sub.applicableGrades.some((x) => x >= 4 && x <= 6);
                        }
                        return sub.applicableGrades.some((x) => x >= 7);
                      }
                      return true;
                    })
                    .map((sub) => {
                      const isSelected = teacherForm.registeredSubjects.includes(sub.name);
                      return (
                        <label key={sub.id} className="flex items-center justify-between p-1.5 hover:bg-white rounded cursor-pointer transition-colors border border-transparent hover:border-slate-200">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTeacherForm({
                                    ...teacherForm,
                                    registeredSubjects: [...teacherForm.registeredSubjects, sub.name],
                                  });
                                } else {
                                  setTeacherForm({
                                    ...teacherForm,
                                    registeredSubjects: teacherForm.registeredSubjects.filter((s) => s !== sub.name),
                                  });
                                }
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-slate-800 font-medium text-xs">{sub.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-mono">{sub.category}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                              {sub.code}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTeacherModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer font-semibold shadow-xs"
                >
                  {editingTeacherId ? 'Save Changes' : 'Register Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: REGISTER / EDIT GRADE                             */}
      {/* ======================================================== */}
      {isGradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden text-xs text-slate-900">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  {editingGradeId ? 'Edit Grade Cohort' : 'Register New Grade Cohort (Grades 1 to 9)'}
                </h3>
              </div>
              <button
                onClick={() => setIsGradeModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGrade} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Grade Level (1 to 9) *</label>
                  <select
                    value={gradeForm.level}
                    onChange={(e) => {
                      const lvl = parseInt(e.target.value, 10);
                      const tier = lvl <= 3 ? 'Lower Primary' : lvl <= 6 ? 'Upper Primary' : 'Junior School';
                      setGradeForm({
                        ...gradeForm,
                        level: lvl,
                        tier,
                        name: `Grade ${lvl}${gradeForm.stream && gradeForm.stream !== 'Main' ? gradeForm.stream : ''}`,
                      });
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                      <option key={lvl} value={lvl}>Grade {lvl}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stream / Cohort *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. A, B, East, Main"
                    value={gradeForm.stream || ''}
                    onChange={(e) => {
                      const str = e.target.value;
                      setGradeForm({
                        ...gradeForm,
                        stream: str,
                        name: `Grade ${gradeForm.level}${str && str !== 'Main' ? str : ''}`,
                      });
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Display Grade Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grade 7A"
                  value={gradeForm.name}
                  onChange={(e) => setGradeForm({ ...gradeForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Educational Tier *</label>
                <select
                  value={gradeForm.tier}
                  onChange={(e) => setGradeForm({ ...gradeForm, tier: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium"
                >
                  <option value="Lower Primary">Lower Primary (Grade 1 - 3)</option>
                  <option value="Upper Primary">Upper Primary (Grade 4 - 6)</option>
                  <option value="Junior School">Junior Secondary School (Grade 7 - 9)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Class Teacher</label>
                <select
                  value={gradeForm.classTeacherId || ''}
                  onChange={(e) => setGradeForm({ ...gradeForm, classTeacherId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                >
                  <option value="">-- Select Class Teacher --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.teacherType})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Room / Block</label>
                  <input
                    type="text"
                    placeholder="e.g. JSS Hall 1"
                    value={gradeForm.roomNumber || ''}
                    onChange={(e) => setGradeForm({ ...gradeForm, roomNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Capacity</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={gradeForm.capacity || 40}
                    onChange={(e) => setGradeForm({ ...gradeForm, capacity: parseInt(e.target.value, 10) || 40 })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGradeModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer font-semibold shadow-xs"
                >
                  {editingGradeId ? 'Save Changes' : 'Register Grade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: REGISTER / EDIT SUBJECT                           */}
      {/* ======================================================== */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden text-xs text-slate-900">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  {editingSubjectId ? 'Edit CBC Subject' : 'Register New CBC Subject'}
                </h3>
              </div>
              <button
                onClick={() => setIsSubjectModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="p-6 space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject Learning Area Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Integrated Science"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Subject Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SCI-JSS"
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 uppercase"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={subjectForm.category}
                    onChange={(e) => setSubjectForm({ ...subjectForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                  >
                    <option value="Sciences">Sciences</option>
                    <option value="Languages">Languages</option>
                    <option value="Humanities">Humanities</option>
                    <option value="Technical & Applied">Technical & Applied</option>
                    <option value="Creative Arts & Sports">Creative Arts & Sports</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Applicable Grades (Grade 1 to 9)</label>
                <div className="flex flex-wrap gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => {
                    const isSelected = subjectForm.applicableGrades.includes(lvl);
                    return (
                      <button
                        type="button"
                        key={lvl}
                        onClick={() => {
                          if (isSelected) {
                            setSubjectForm({
                              ...subjectForm,
                              applicableGrades: subjectForm.applicableGrades.filter((g) => g !== lvl),
                            });
                          } else {
                            setSubjectForm({
                              ...subjectForm,
                              applicableGrades: [...subjectForm.applicableGrades, lvl].sort((a, b) => a - b),
                            });
                          }
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-mono font-bold cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-300 text-slate-700'
                        }`}
                      >
                        Gr {lvl}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Lead Teacher</label>
                <select
                  value={subjectForm.assignedTeacherId || ''}
                  onChange={(e) => setSubjectForm({ ...subjectForm, assignedTeacherId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                >
                  <option value="">-- Faculty Pool / Multiple Teachers --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.department})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Curriculum Notes / Objectives</label>
                <textarea
                  rows={2}
                  placeholder="CBC learning area objectives and syllabus coverage."
                  value={subjectForm.description || ''}
                  onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer font-semibold shadow-xs"
                >
                  {editingSubjectId ? 'Save Changes' : 'Register Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: REGISTER / EDIT ADMIN                             */}
      {/* ======================================================== */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden text-xs text-slate-900">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  {editingAdminId ? 'Edit Administrator' : 'Register New School Administrator'}
                </h3>
              </div>
              <button
                onClick={() => setIsAdminModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdmin} className="p-6 space-y-4">
              {adminError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{adminError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Evelyn Vance"
                  value={adminForm.name}
                  onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role *</label>
                  <select
                    value={adminForm.role}
                    onChange={(e) => {
                      const r = e.target.value as 'admin' | 'bursar';
                      setAdminForm({
                        ...adminForm,
                        role: r,
                        title: r === 'admin' ? 'Head of School / Chief Principal' : 'Bursar / Financial Controller',
                      });
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium"
                  >
                    <option value="admin">Administrator / Principal</option>
                    <option value="bursar">Bursar / Finance</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Title / Designation</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chief Principal"
                    value={adminForm.title}
                    onChange={(e) => setAdminForm({ ...adminForm, title: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Phone (Login) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="0711223344"
                    value={adminForm.phone}
                    onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                  />
                  <span className="text-[10px] text-slate-500">Starts with 07.. or 01..</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">National ID / Staff ID (Password) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ADMIN-001"
                    value={adminForm.nationalOrStaffId}
                    onChange={(e) => setAdminForm({ ...adminForm, nationalOrStaffId: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                  />
                  <span className="text-[10px] text-slate-500">Used as password</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Email Address</label>
                <input
                  type="email"
                  placeholder="admin@academiacademy.edu"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer font-semibold shadow-xs"
                >
                  {editingAdminId ? 'Save Changes' : 'Register Administrator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
