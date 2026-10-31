import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  UserRole,
  UserSession,
  OwnerDesignation,
  ParentRecord,
  LearnerRecord,
  FeePayment,
  FeeStructure,
  PaymentReminder,
  ScoreCard,
  AttendanceRecord,
  AuditLogEntry,
  TeacherRecord,
  SchoolProfile,
  GradeLevel,
  SubjectDefinition,
  AdminAccount,
  AssessmentRecord,
  SubjectMarksSubmission,
  AttendanceSession,
  AttendanceStatus,
  OwnerDeviceLock,
  LoginResult,
} from '../types';
import {
  INITIAL_USER_SESSIONS,
  INITIAL_PARENTS,
  INITIAL_LEARNERS,
  INITIAL_FEE_STRUCTURES,
  INITIAL_PAYMENTS,
  INITIAL_REMINDERS,
  INITIAL_SCORE_CARDS,
  INITIAL_ATTENDANCE,
  INITIAL_AUDIT_LOGS,
  INITIAL_TEACHERS,
  INITIAL_SCHOOL_PROFILE,
  INITIAL_GRADES,
  INITIAL_SUBJECTS,
  INITIAL_ADMIN_ACCOUNTS,
  INITIAL_ASSESSMENTS,
  INITIAL_SUBJECT_SUBMISSIONS,
} from '../data/mockData';
import {
  canRoleDecryptSensitivePII,
  canRoleRecordPayments,
  canRoleDispatchReminders,
  canRoleEditScoreCards,
  canRoleMarkAttendance,
  decryptSensitiveText,
  encryptSensitiveText,
  maskPhoneNumber,
  validateKenyanPhoneNumber,
  normalizeKenyanPhone,
} from '../services/cryptoService';
import {
  testFirestoreConnection,
  saveDocumentToFirestore,
  fetchDocumentFromFirestore,
  fetchCollectionFromFirestore,
  batchSyncToFirestore,
  deleteDocumentFromFirestore,
  firestoreDatabaseId,
  firebaseProjectId,
} from '../services/firebase';
import {
  getCurrentDeviceId,
  getCurrentDeviceFriendlyName,
  getOwnerDeviceLock,
  persistOwnerDeviceLock,
  initiateOwnerOtpChallenge,
  verifyOwnerOtpAndAuthorizeDevice,
  OWNER_PHONE,
  OWNER_ID_NUMBER,
  OWNER_LOCK_DOC_ID,
} from '../services/deviceLockService';
import { createSynchronousPresetPng } from '../utils/signaturePresets';

interface AppContextType {
  currentUser: UserSession;
  allUsers: UserSession[];
  isAuthenticated: boolean;
  isOwner: boolean;
  switchUser: (session: UserSession) => void;
  switchRole: (role: UserRole) => void;
  switchOwnerResponsibility: (designation: OwnerDesignation, teacherGrade?: string) => void;
  loginWithCredentials: (
    phone: string,
    idNumber: string,
    actingDesignation?: OwnerDesignation
  ) => Promise<LoginResult>;
  verifyOwnerOtp: (
    enteredOtp: string,
    actingDesignation?: OwnerDesignation
  ) => Promise<{ success: boolean; error?: string; session?: UserSession }>;
  resendOwnerOtp: () => Promise<{ success: boolean; error?: string; dispatchedOtpPreview?: string }>;
  forceRelockOwnerDevice: () => Promise<boolean>;
  ownerDeviceLock: OwnerDeviceLock | null;
  currentDeviceId: string;
  currentDeviceName: string;
  deviceKickoutNotice: string | null;
  clearDeviceKickoutNotice: () => void;
  requestPasswordResetLink: (phone: string) => {
    success: boolean;
    error?: string;
    resetToken?: string;
    resetLink?: string;
    user?: { name: string; role: string; phone: string; idNumber: string };
  };
  resetPasswordForUser: (
    phone: string,
    token: string,
    newPasswordOrId: string
  ) => { success: boolean; error?: string; userName?: string };
  logout: () => void;

  // Cloud Database (Firestore) State
  isCloudConnected: boolean;
  isCloudLoaded: boolean;
  firestoreDbId: string;
  firebaseProjectId: string;
  isSyncingToCloud: boolean;
  syncAllDataToFirestore: () => Promise<boolean>;
  
  // Data
  parents: ParentRecord[];
  learners: LearnerRecord[];
  teachers: TeacherRecord[];
  feeStructures: FeeStructure[];
  feePayments: FeePayment[];
  reminders: PaymentReminder[];
  scoreCards: ScoreCard[];
  attendance: AttendanceRecord[];
  auditLogs: AuditLogEntry[];

  // School, Grades 1-9, Teachers, Subjects, Admins
  schoolProfile: SchoolProfile;
  updateSchoolProfile: (updates: Partial<SchoolProfile>) => void;

  grades: GradeLevel[];
  addGrade: (grade: Omit<GradeLevel, 'id'>) => void;
  updateGrade: (id: string, updates: Partial<GradeLevel>) => void;
  deleteGrade: (id: string) => void;

  subjects: SubjectDefinition[];
  addSubject: (subject: Omit<SubjectDefinition, 'id'>) => void;
  updateSubject: (id: string, updates: Partial<SubjectDefinition>) => void;
  deleteSubject: (id: string) => void;

  adminAccounts: AdminAccount[];
  addAdminAccount: (admin: Omit<AdminAccount, 'id'>) => void;
  updateAdminAccount: (id: string, updates: Partial<AdminAccount>) => void;
  deleteAdminAccount: (id: string) => void;

  addTeacher: (teacher: Omit<TeacherRecord, 'id'>) => void;
  updateTeacher: (id: string, updates: Partial<TeacherRecord>) => void;
  deleteTeacher: (id: string) => void;

  // Decryption state for sensitive PII
  decryptedParentIds: Set<string>;
  toggleParentDecryption: (parentId: string) => Promise<boolean>;
  isParentDecrypted: (parentId: string) => boolean;
  
  // Actions
  addLearnerWithParent: (
    learner: Omit<LearnerRecord, 'id' | 'studentId' | 'parentId' | 'status' | 'enrollmentDate' | 'photoPlaceholderColor'>,
    parent: Omit<ParentRecord, 'id' | 'encryptedPayload'>,
    initialTuition: number,
    term: string,
    dueDate: string
  ) => Promise<void>;
  updateLearner: (id: string, updates: Partial<LearnerRecord>) => void;
  updateParent: (id: string, updates: Partial<ParentRecord>) => void;
  
  // Fee Payments
  recordPayment: (payment: {
    learnerId: string;
    term: string;
    amount: number;
    method: 'Bank Transfer' | 'M-Pesa / Mobile Money' | 'Card' | 'Cash';
    notes?: string;
  }) => FeePayment;

  // Reminders
  batchDispatchReminders: () => { sentCount: number; message: string };
  sendBulkOverdueReminders: (options: {
    learnerIds: string[];
    term: string;
    channels: ('sms' | 'email')[];
    customMessageTemplate?: string;
    urgencyLevel?: 'standard' | 'friendly' | 'final';
  }) => {
    sentSmsCount: number;
    sentEmailCount: number;
    totalRecipients: number;
    totalDebtNotified: number;
    message: string;
  };
  scheduleReminder: (reminder: Omit<PaymentReminder, 'id' | 'status'>) => void;

  // Scorecards & Assessments Workflow
  saveScoreCard: (card: ScoreCard) => void;
  assessments: AssessmentRecord[];
  saveAssessment: (assessment: AssessmentRecord) => void;
  subjectSubmissions: SubjectMarksSubmission[];
  saveSubjectSubmission: (submission: SubjectMarksSubmission) => void;
  toggleExamAbsence: (grade: string, term: string, learnerId: string, isAbsent: boolean, reason?: string) => void;

  // Attendance (Morning & Afternoon Dual Session)
  recordSingleAttendance: (record: Omit<AttendanceRecord, 'id' | 'markedBy'>) => void;
  batchMarkClassAttendance: (
    date: string,
    grade: string,
    status: AttendanceStatus,
    session?: AttendanceSession | 'both'
  ) => void;

  // Helpers
  getLearnerById: (id: string) => LearnerRecord | undefined;
  getParentById: (id: string) => ParentRecord | undefined;
  getFeeStructureForLearner: (learnerId: string, term?: string) => FeeStructure | undefined;
  getPaymentsForLearner: (learnerId: string) => FeePayment[];
  getScoreCardsForLearner: (learnerId: string) => ScoreCard[];
  getAttendanceForLearner: (learnerId: string) => AttendanceRecord[];
  addAuditLog: (action: string, details: string, securityFlag?: boolean) => void;

  resetToDefault: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'academias_secure_v1_';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load current user
  const [currentUser, setCurrentUser] = useState<UserSession>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}user`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...parsed, phone: normalizeKenyanPhone(parsed.phone || '') };
      } catch { /* ignore */ }
    }
    return INITIAL_USER_SESSIONS[0]; // Admin by default
  });

  const [parents, setParents] = useState<ParentRecord[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}parents`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const existingIds = new Set(parsed.map((p: ParentRecord) => p.id));
          const toAdd = INITIAL_PARENTS.filter((p) => !existingIds.has(p.id));
          return [...parsed, ...toAdd].map((p: ParentRecord) => {
            const cleanParent: ParentRecord = {
              ...p,
              phone: normalizeKenyanPhone(p.phone || ''),
            };
            if (p.alternatePhone) {
              cleanParent.alternatePhone = normalizeKenyanPhone(p.alternatePhone);
            } else {
              delete cleanParent.alternatePhone;
            }
            return cleanParent;
          });
        }
      } catch { /* ignore */ }
    }
    return INITIAL_PARENTS;
  });

  const [learners, setLearners] = useState<LearnerRecord[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}learners`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const existingIds = new Set(parsed.map((p: LearnerRecord) => p.id));
          const toAdd = INITIAL_LEARNERS.filter((l) => !existingIds.has(l.id));
          return [...parsed, ...toAdd];
        }
      } catch { /* ignore */ }
    }
    return INITIAL_LEARNERS;
  });

  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}fee_structures`);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_FEE_STRUCTURES;
  });

  const [feePayments, setFeePayments] = useState<FeePayment[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}fee_payments`);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_PAYMENTS;
  });

  const [reminders, setReminders] = useState<PaymentReminder[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}reminders`);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_REMINDERS;
  });

  const [scoreCards, setScoreCards] = useState<ScoreCard[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}score_cards`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some((sc: ScoreCard) => sc.learnerId === 'stu-4' || sc.learnerId === 'stu-5')) {
          return parsed;
        }
      } catch { /* ignore */ }
    }
    return INITIAL_SCORE_CARDS;
  });

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}attendance`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (parsed.some((a) => a.session === 'afternoon')) {
            return parsed;
          }
          // Upgrade single-session legacy records to morning + afternoon sessions
          const upgraded: AttendanceRecord[] = [];
          parsed.forEach((a) => {
            upgraded.push({ ...a, session: a.session || 'morning' });
            upgraded.push({
              id: `${a.id}-afternoon`,
              learnerId: a.learnerId,
              date: a.date,
              session: 'afternoon',
              status: a.status,
              markedBy: a.markedBy || 'Mr. Marcus Thorne',
            });
          });
          return upgraded;
        }
      } catch { /* ignore */ }
    }
    return INITIAL_ATTENDANCE;
  });

  const [assessments, setAssessments] = useState<AssessmentRecord[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}assessments`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch { /* ignore */ }
    }
    return INITIAL_ASSESSMENTS;
  });

  const [subjectSubmissions, setSubjectSubmissions] = useState<SubjectMarksSubmission[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}subject_submissions`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch { /* ignore */ }
    }
    return INITIAL_SUBJECT_SUBMISSIONS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}audit_logs`);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_AUDIT_LOGS;
  });

  const [teachers, setTeachers] = useState<TeacherRecord[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}teachers`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((t: TeacherRecord) => ({
          ...t,
          phone: normalizeKenyanPhone(t.phone || ''),
        }));
      } catch { /* ignore */ }
    }
    return INITIAL_TEACHERS;
  });

  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile>(() => {
    let base = { ...INITIAL_SCHOOL_PROFILE } as SchoolProfile;
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}school_profile`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name && !parsed.name.includes('Academia') && parsed.primaryWingName && parsed.juniorWingName) {
          base = parsed;
        }
      } catch { /* ignore */ }
    }

    // Ensure default signatures exist if not already present
    if (!base.signatures || Object.keys(base.signatures).length === 0) {
      const defaultSigs = {
        hoi: {
          id: 'sig-hoi-init',
          role: 'hoi' as const,
          roleTitle: 'Chief Principal & Head of School',
          signatoryName: 'Dr. Evelyn Vance, Ph.D',
          signatureDataUrl: createSynchronousPresetPng('hoi', 'Dr. Evelyn Vance', '#1e3a8a'),
          sourceType: 'preset' as const,
          updatedAt: new Date().toISOString(),
          dateStr: new Date().toLocaleDateString('en-GB'),
          isVerified: true,
          verificationCode: 'SIG-HOI-VANCE-2026',
        },
        bursar: {
          id: 'sig-bursar-init',
          role: 'bursar' as const,
          roleTitle: 'Chief Bursar & Treasury Controller',
          signatoryName: 'Sarah Kimani, CPA',
          signatureDataUrl: createSynchronousPresetPng('bursar', 'Sarah Kimani, CPA', '#0f172a'),
          sourceType: 'preset' as const,
          updatedAt: new Date().toISOString(),
          dateStr: new Date().toLocaleDateString('en-GB'),
          isVerified: true,
          verificationCode: 'SIG-BURSAR-KIMANI-2026',
        },
        seal: {
          id: 'sig-seal-init',
          role: 'seal' as const,
          roleTitle: 'Official Institutional Seal & Stamp',
          signatoryName: 'Mwivona Comprehensive School Seal',
          signatureDataUrl: createSynchronousPresetPng('seal', 'Mwivona Seal', '#4338ca'),
          sourceType: 'preset' as const,
          updatedAt: new Date().toISOString(),
          dateStr: new Date().toLocaleDateString('en-GB'),
          isVerified: true,
          verificationCode: 'SEAL-MWIVONA-OFFICIAL',
        },
      };
      base = { ...base, signatures: defaultSigs };
    }

    return base;
  });

  const [grades, setGrades] = useState<GradeLevel[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}grades`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 8 && parsed.some((g: GradeLevel) => g.wing === 'Junior')) {
          return parsed;
        }
      } catch { /* ignore */ }
    }
    return INITIAL_GRADES;
  });

  const [subjects, setSubjects] = useState<SubjectDefinition[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}subjects`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const has901 = Array.isArray(parsed) && parsed.some((s: SubjectDefinition) => s.code?.includes('901'));
        const has601 = Array.isArray(parsed) && parsed.some((s: SubjectDefinition) => s.code?.includes('601'));
        const has301 = Array.isArray(parsed) && parsed.some((s: SubjectDefinition) => s.code?.includes('301'));
        const hasLegacy = Array.isArray(parsed) && parsed.some((s: SubjectDefinition) => s.code?.includes('101 (ENG)') || s.code === '101 (ENG)');
        if (has901 && has601 && has301 && !hasLegacy) {
          return parsed;
        }
      } catch { /* ignore */ }
    }
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}subjects`, JSON.stringify(INITIAL_SUBJECTS));
    } catch { /* ignore */ }
    return INITIAL_SUBJECTS;
  });

  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}admins`);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_ADMIN_ACCOUNTS;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}auth`);
    if (saved !== null) {
      return saved === 'true';
    }
    return false; // Authentication required by default
  });

  const [decryptedParentIds, setDecryptedParentIds] = useState<Set<string>>(new Set());
  const [ownerDeviceLock, setOwnerDeviceLock] = useState<OwnerDeviceLock | null>(() => {
    try {
      const cached = localStorage.getItem('academias_owner_device_lock_v1');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [deviceKickoutNotice, setDeviceKickoutNotice] = useState<string | null>(null);
  const currentDeviceId = getCurrentDeviceId();
  const currentDeviceName = getCurrentDeviceFriendlyName();
  const clearDeviceKickoutNotice = () => setDeviceKickoutNotice(null);

  // Monitor single active phone lock concurrency
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.isOwner) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const lock = await getOwnerDeviceLock();
        if (!isMounted) return;
        if (lock) {
          setOwnerDeviceLock(lock);
          // If another phone/device took over ownership
          if (lock.activeDeviceId && lock.activeDeviceId !== currentDeviceId) {
            setDeviceKickoutNotice(
              'Session Terminated: The Owner Account was accessed and authorized on another device via SMS OTP verification. Under your strict single-phone security policy, only one phone can access the Owner Account at a time.'
            );
            logout();
          }
        }
      } catch {
        /* ignore */
      }
    }, 6000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated, currentUser?.isOwner, currentDeviceId]);

  // Active curriculum migration & synchronization
  useEffect(() => {
    const has901 = subjects.some((s) => s.code?.includes('901'));
    const has601 = subjects.some((s) => s.code?.includes('601'));
    const has301 = subjects.some((s) => s.code?.includes('301'));
    const hasLegacy = subjects.some((s) => s.code?.includes('101 (ENG)'));
    if (!has901 || !has601 || !has301 || hasLegacy) {
      console.log('Auto-migrating subjects to official KNEC 901/601/301 curriculum...');
      setSubjects(INITIAL_SUBJECTS);
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}subjects`, JSON.stringify(INITIAL_SUBJECTS));
      } catch { /* ignore */ }
      batchSyncToFirestore('subjects', INITIAL_SUBJECTS).catch(() => {});
    }
  }, [subjects]);

  // Persistence effects
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}school_profile`, JSON.stringify(schoolProfile));
  }, [schoolProfile]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}grades`, JSON.stringify(grades));
  }, [grades]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}subjects`, JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}admins`, JSON.stringify(adminAccounts));
  }, [adminAccounts]);

  // Persistence effects
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}user`, JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}auth`, String(isAuthenticated));
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}teachers`, JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}parents`, JSON.stringify(parents));
  }, [parents]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}learners`, JSON.stringify(learners));
  }, [learners]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}fee_structures`, JSON.stringify(feeStructures));
  }, [feeStructures]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}fee_payments`, JSON.stringify(feePayments));
  }, [feePayments]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}reminders`, JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}score_cards`, JSON.stringify(scoreCards));
  }, [scoreCards]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}attendance`, JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}audit_logs`, JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Cloud Database (Firestore) State
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);
  const [isSyncingToCloud, setIsSyncingToCloud] = useState<boolean>(false);
  const [isCloudLoaded, setIsCloudLoaded] = useState<boolean>(false);

  // Validate Connection to Firestore on boot and initialize cloud data
  useEffect(() => {
    let isMounted = true;

    async function initCloudData() {
      const connected = await testFirestoreConnection();
      if (!isMounted) return;
      setIsCloudConnected(connected);

      if (!connected) return;

      try {
        // Fetch existing collections from Firestore
        const [
          remoteLearners,
          remoteParents,
          remoteTeachers,
          remoteFeeStructures,
          remoteFeePayments,
          remoteScoreCards,
          remoteAttendance,
          remoteReminders,
          remoteGrades,
          remoteSubjects,
          remoteAdmins,
          remoteSettings,
          remoteAssessments,
          remoteSubmissions,
        ] = await Promise.all([
          fetchCollectionFromFirestore<LearnerRecord>('learners').catch(() => []),
          fetchCollectionFromFirestore<ParentRecord>('parents').catch(() => []),
          fetchCollectionFromFirestore<TeacherRecord>('teachers').catch(() => []),
          fetchCollectionFromFirestore<FeeStructure>('feeStructures').catch(() => []),
          fetchCollectionFromFirestore<FeePayment>('feePayments').catch(() => []),
          fetchCollectionFromFirestore<ScoreCard>('scoreCards').catch(() => []),
          fetchCollectionFromFirestore<AttendanceRecord>('attendance').catch(() => []),
          fetchCollectionFromFirestore<PaymentReminder>('paymentReminders').catch(() => []),
          fetchCollectionFromFirestore<GradeLevel>('grades').catch(() => []),
          fetchCollectionFromFirestore<SubjectDefinition>('subjects').catch(() => []),
          fetchCollectionFromFirestore<AdminAccount>('admins').catch(() => []),
          fetchDocumentFromFirestore<SchoolProfile & { id: string }>('settings', 'school_config').catch(() => null),
          fetchCollectionFromFirestore<AssessmentRecord>('assessments').catch(() => []),
          fetchCollectionFromFirestore<SubjectMarksSubmission>('subjectSubmissions').catch(() => []),
        ]);

        if (!isMounted) return;

        // If Firestore has no learners yet, auto-seed the complete Mwivona Comprehensive School initial dataset!
        if (!remoteLearners || remoteLearners.length === 0) {
          console.log('Bootstrapping Firestore with Mwivona Comprehensive School initial dataset...');
          await Promise.all([
            batchSyncToFirestore('learners', INITIAL_LEARNERS),
            batchSyncToFirestore('parents', INITIAL_PARENTS),
            batchSyncToFirestore('teachers', INITIAL_TEACHERS),
            batchSyncToFirestore('feeStructures', INITIAL_FEE_STRUCTURES),
            batchSyncToFirestore('feePayments', INITIAL_PAYMENTS),
            batchSyncToFirestore('paymentReminders', INITIAL_REMINDERS),
            batchSyncToFirestore('scoreCards', INITIAL_SCORE_CARDS),
            batchSyncToFirestore('attendance', INITIAL_ATTENDANCE),
            batchSyncToFirestore('auditLogs', INITIAL_AUDIT_LOGS),
            saveDocumentToFirestore('settings', { ...INITIAL_SCHOOL_PROFILE, id: 'school_config' }),
            batchSyncToFirestore('grades', INITIAL_GRADES),
            batchSyncToFirestore('subjects', INITIAL_SUBJECTS),
            batchSyncToFirestore('admins', INITIAL_ADMIN_ACCOUNTS),
            batchSyncToFirestore('assessments', INITIAL_ASSESSMENTS),
            batchSyncToFirestore('subjectSubmissions', INITIAL_SUBJECT_SUBMISSIONS),
          ]);
        } else {
          // Hydrate live state from Firestore
          if (remoteLearners && remoteLearners.length > 0) setLearners(remoteLearners);
          if (remoteParents && remoteParents.length > 0) setParents(remoteParents);
          if (remoteTeachers && remoteTeachers.length > 0) setTeachers(remoteTeachers);
          if (remoteFeeStructures && remoteFeeStructures.length > 0) setFeeStructures(remoteFeeStructures);
          if (remoteFeePayments && remoteFeePayments.length > 0) setFeePayments(remoteFeePayments);
          if (remoteScoreCards && remoteScoreCards.length > 0) setScoreCards(remoteScoreCards);
          if (remoteAttendance && remoteAttendance.length > 0) setAttendance(remoteAttendance);
          if (remoteReminders && remoteReminders.length > 0) setReminders(remoteReminders);
          if (remoteGrades && remoteGrades.length > 0) setGrades(remoteGrades);
          if (remoteAssessments && remoteAssessments.length > 0) setAssessments(remoteAssessments);
          if (remoteSubmissions && remoteSubmissions.length > 0) setSubjectSubmissions(remoteSubmissions);
          if (remoteSubjects && remoteSubjects.length > 0) {
            const hasOfficialCurriculum =
              remoteSubjects.some((s) => s.code?.includes('901')) &&
              remoteSubjects.some((s) => s.code?.includes('601')) &&
              remoteSubjects.some((s) => s.code?.includes('301')) &&
              !remoteSubjects.some((s) => s.code?.includes('101 (ENG)'));

            if (hasOfficialCurriculum) {
              setSubjects(remoteSubjects);
            } else {
              console.log('Upgrading Firestore with official KNEC 901/601/301 curriculum...');
              setSubjects(INITIAL_SUBJECTS);
              try {
                localStorage.setItem(`${STORAGE_KEY_PREFIX}subjects`, JSON.stringify(INITIAL_SUBJECTS));
              } catch { /* ignore */ }
              batchSyncToFirestore('subjects', INITIAL_SUBJECTS).catch(() => {});
            }
          } else {
            batchSyncToFirestore('subjects', INITIAL_SUBJECTS).catch(() => {});
          }
          if (remoteAdmins && remoteAdmins.length > 0) setAdminAccounts(remoteAdmins);
          if (remoteSettings && remoteSettings.name) {
            const { id: _, ...profile } = remoteSettings;
            setSchoolProfile(profile as SchoolProfile);
          }
        }
        setIsCloudLoaded(true);
      } catch (err) {
        console.warn('Cloud hydration notice:', err);
      }
    }

    initCloudData();

    return () => {
      isMounted = false;
    };
  }, []);

  const syncAllDataToFirestore = async (): Promise<boolean> => {
    setIsSyncingToCloud(true);
    try {
      await Promise.all([
        batchSyncToFirestore('learners', learners),
        batchSyncToFirestore('parents', parents),
        batchSyncToFirestore('teachers', teachers),
        batchSyncToFirestore('feeStructures', feeStructures),
        batchSyncToFirestore('feePayments', feePayments),
        batchSyncToFirestore('paymentReminders', reminders),
        batchSyncToFirestore('scoreCards', scoreCards),
        batchSyncToFirestore('attendance', attendance),
        batchSyncToFirestore('auditLogs', auditLogs),
        saveDocumentToFirestore('settings', { ...schoolProfile, id: 'school_config' }),
        batchSyncToFirestore('grades', grades),
        batchSyncToFirestore('subjects', subjects),
        batchSyncToFirestore('admins', adminAccounts),
        batchSyncToFirestore('assessments', assessments),
        batchSyncToFirestore('subjectSubmissions', subjectSubmissions),
      ]);
      addAuditLog(
        'Cloud Database Synchronized',
        `Synchronized active school records to Firestore live database: ${firestoreDatabaseId}`
      );
      setIsSyncingToCloud(false);
      return true;
    } catch (err) {
      console.error('Failed to sync to Firestore:', err);
      setIsSyncingToCloud(false);
      return false;
    }
  };

  const addAuditLog = (action: string, details: string, securityFlag = false) => {
    const now = new Date();
    const formattedTime = now.toISOString().replace('T', ' ').slice(0, 19);
    const newEntry: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: formattedTime,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      details,
      securityFlag,
    };
    setAuditLogs((prev) => [newEntry, ...prev.slice(0, 49)]);
  };

  const switchUser = (session: UserSession) => {
    setCurrentUser(session);
    setIsAuthenticated(true);
    if (session.role === 'parent' && session.parentId) {
      setDecryptedParentIds(new Set([session.parentId]));
    } else {
      setDecryptedParentIds(new Set()); // Reset decrypted view when switching users for zero-trust
    }
    addAuditLog('User Session Switched', `Active session: ${session.name} (${session.role.toUpperCase()})`);
  };

  const switchRole = (role: UserRole) => {
    const matchingSession = INITIAL_USER_SESSIONS.find((s) => s.role === role) || {
      id: `user-${role}-gen`,
      name: `${role.charAt(0).toUpperCase() + role.slice(1)} User`,
      role,
      email: `${role}@academiacademy.edu`,
      phone: '+254 700 000 000',
      idNumber: 'ID-GEN-001',
      title: `${role.toUpperCase()} Authority`,
    };
    switchUser(matchingSession);
  };

  const clearAllTrialAndStaleSessions = () => {
    try {
      sessionStorage.clear();
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.includes('trial') ||
            key.includes('demo') ||
            key.includes('temp_') ||
            key.includes('preview_') ||
            key.includes('role_preview'))
        ) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      /* ignore */
    }
  };

  const buildOwnerSession = (
    designation: OwnerDesignation = 'owner',
    teacherGrade: string = 'Grade 7A'
  ): UserSession => {
    const base: UserSession = {
      id: 'user-owner-main',
      name: 'App Owner & Director',
      email: 'dwnwmnd@gmail.com',
      phone: '0716235185',
      idNumber: '34233496',
      role: 'admin',
      title: 'App Owner & School Director (Master Executive)',
      isOwner: true,
      ownerDesignation: designation,
    };

    switch (designation) {
      case 'hoi':
        return {
          ...base,
          role: 'admin',
          title: 'Head of Institution (HOI) / Chief Principal',
        };
      case 'deputy_hoi':
        return {
          ...base,
          role: 'admin',
          title: 'Deputy Head of Institution (Deputy HOI) · Academics & Operations',
        };
      case 'exam_council':
        return {
          ...base,
          role: 'admin',
          title: 'Academic Coordinator & Examination Council Chair',
        };
      case 'senior_teacher':
        return {
          ...base,
          role: 'teacher',
          teacherType: 'class_teacher',
          teacherGrade: teacherGrade || 'Grade 7A',
          registeredSubjects: ['Mathematics', 'Integrated Science', 'Pre-Technical Studies'],
          title: `Senior Teacher & Academic Lead (${teacherGrade || 'Grade 7A'})`,
        };
      case 'class_teacher':
        return {
          ...base,
          role: 'teacher',
          teacherType: 'class_teacher',
          teacherGrade: teacherGrade || 'Grade 7A',
          registeredSubjects: ['Mathematics', 'Creative Arts and Sports'],
          title: `Class Teacher · ${teacherGrade || 'Grade 7A'} (Junior School)`,
        };
      case 'subject_teacher':
        return {
          ...base,
          role: 'teacher',
          teacherType: 'subject_teacher',
          registeredSubjects: ['Mathematics', 'Integrated Science'],
          title: 'Subject Teacher (Mathematics & Integrated Science)',
        };
      case 'parent':
        return {
          ...base,
          role: 'parent',
          parentId: 'par-1',
          learnerId: 'stu-1',
          title: 'Parent / Guardian of Liam Mwangi (Grade 7A)',
        };
      case 'owner':
      default:
        return {
          ...base,
          role: 'admin',
          title: 'App Owner & School Director (Master Executive)',
        };
    }
  };

  const switchOwnerResponsibility = (
    designation: OwnerDesignation,
    grade?: string
  ) => {
    const targetGrade = grade || currentUser.teacherGrade || 'Grade 7A';
    const updated = buildOwnerSession(designation, targetGrade);
    setCurrentUser(updated);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}user`, JSON.stringify(updated));
    if (updated.role === 'parent' && updated.parentId) {
      setDecryptedParentIds(new Set([updated.parentId]));
    } else {
      setDecryptedParentIds(new Set());
    }
    addAuditLog(
      'Owner Responsibility Switched',
      `App Owner switched active responsibility context to: ${updated.title}`
    );
  };

  const loginWithCredentials = async (
    phoneInput: string,
    idNumberInput: string,
    actingDesignation?: OwnerDesignation
  ): Promise<LoginResult> => {
    const rawPhone = phoneInput.trim();
    const rawId = idNumberInput.trim();

    if (!rawPhone || !rawId) {
      return {
        success: false,
        error: 'Please provide both your registered mobile phone number and ID number (as password).',
      };
    }

    const validation = validateKenyanPhoneNumber(rawPhone);
    if (!validation.isValid) {
      return {
        success: false,
        error:
          validation.error ||
          'The phone number format should start with 07.... Or 01.... Not +2547.... nor +254..... (Example: 0712345678 or 0110445566)',
      };
    }
    const cleanPhone = validation.cleanPhone!;

    const normId = (id: string) => id.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    const phoneMatch = (stored: string, targetClean: string) => {
      const s = normalizeKenyanPhone(stored);
      return s === targetClean;
    };

    const idMatch = (stored: string, input: string) => {
      const s = normId(stored);
      const i = normId(input);
      if (!s || !i) return false;
      const cleanS = s.replace(/^ID/, '');
      const cleanI = i.replace(/^ID/, '');
      return s === i || cleanS === cleanI || cleanS === i || s === cleanI;
    };

    clearAllTrialAndStaleSessions();

    // 0. CHECK IF ATTEMPTING TO ACCESS APP OWNER ACCOUNT
    const isOwnerPhone = cleanPhone === OWNER_PHONE || phoneMatch(OWNER_PHONE, cleanPhone);
    const isOwnerId = idMatch(OWNER_ID_NUMBER, rawId);

    if (isOwnerPhone) {
      // Access to owner account is strictly restricted to ID 34233496
      if (!isOwnerId) {
        return {
          success: false,
          error: 'Access Denied: Invalid password credentials for the School Owner Account.',
        };
      }

      // Valid credentials for Owner! Now enforce SINGLE ACTIVE PHONE at a time.
      const currentLock = await getOwnerDeviceLock();

      // Case A: First-time initialization (no device locked yet)
      if (!currentLock || !currentLock.activeDeviceId) {
        const newLock: OwnerDeviceLock = {
          id: OWNER_LOCK_DOC_ID,
          activeDeviceId: currentDeviceId,
          activeDeviceName: currentDeviceName,
          authorizedPhone: OWNER_PHONE,
          authorizedId: OWNER_ID_NUMBER,
          lastActiveAt: new Date().toISOString(),
          registeredAt: new Date().toISOString(),
          pendingChallenge: null,
        };
        await persistOwnerDeviceLock(newLock);
        setOwnerDeviceLock(newLock);

        const ownerSession = buildOwnerSession(actingDesignation || 'owner');
        setCurrentUser(ownerSession);
        setIsAuthenticated(true);
        if (ownerSession.role === 'parent' && ownerSession.parentId) {
          setDecryptedParentIds(new Set([ownerSession.parentId]));
        } else {
          setDecryptedParentIds(new Set());
        }
        addAuditLog(
          'Owner Primary Phone Initialized',
          `Primary device bound to Owner Account: ${currentDeviceName} (ID: ${currentDeviceId.slice(0, 8)}...). Single-phone lock active.`
        );
        return { success: true, session: ownerSession };
      }

      // Case B: Current device matches the authorized active phone
      if (currentLock.activeDeviceId === currentDeviceId) {
        currentLock.lastActiveAt = new Date().toISOString();
        currentLock.activeDeviceName = currentDeviceName;
        await persistOwnerDeviceLock(currentLock);
        setOwnerDeviceLock(currentLock);

        const ownerSession = buildOwnerSession(actingDesignation || 'owner');
        setCurrentUser(ownerSession);
        setIsAuthenticated(true);
        if (ownerSession.role === 'parent' && ownerSession.parentId) {
          setDecryptedParentIds(new Set([ownerSession.parentId]));
        } else {
          setDecryptedParentIds(new Set());
        }
        addAuditLog(
          'Owner Device Authenticated',
          `Owner logged in from verified active device: ${currentDeviceName}.`
        );
        return { success: true, session: ownerSession };
      }

      // Case C: Second or Third Party Device Attempting Access!
      // Enforce: Only ONE phone at a time. Trigger OTP sent to owner number 0716235185.
      const challengeRes = await initiateOwnerOtpChallenge(currentDeviceId, currentDeviceName);
      const updatedLock = await getOwnerDeviceLock();
      setOwnerDeviceLock(updatedLock);

      addAuditLog(
        'Owner Device OTP Challenge Dispatched',
        `Secondary device (${currentDeviceName}) attempted Owner access. Cellular SMS OTP dispatched to ${OWNER_PHONE}.`
      );

      return {
        success: false,
        requiresOtp: true,
        challengeDetails: {
          phone: OWNER_PHONE,
          targetDeviceId: currentDeviceId,
          expiresAt: challengeRes.challenge.expiresAt,
          dispatchedOtpPreview: challengeRes.challenge.otpCode,
        },
      };
    }

    // 1. Check Parent Records
    const matchedParent = parents.find(
      (p) =>
        (phoneMatch(p.phone, cleanPhone) ||
          (p.alternatePhone && phoneMatch(p.alternatePhone, cleanPhone))) &&
        idMatch(p.nationalId, rawId)
    );

    if (matchedParent) {
      const child = learners.find((l) => l.parentId === matchedParent.id);
      const session: UserSession = {
        id: `session-parent-${matchedParent.id}`,
        name: matchedParent.fullName,
        role: 'parent',
        email: matchedParent.email,
        phone: normalizeKenyanPhone(matchedParent.phone),
        idNumber: matchedParent.nationalId,
        title: child
          ? `Parent of ${child.firstName} ${child.lastName} (${child.grade})`
          : 'Parent / Guardian',
        parentId: matchedParent.id,
        learnerId: child ? child.id : undefined,
      };

      setCurrentUser(session);
      setIsAuthenticated(true);
      setDecryptedParentIds(new Set([matchedParent.id]));
      addAuditLog(
        'Parent Portal Authentication',
        `Authenticated parent ${matchedParent.fullName} via Phone (${maskPhoneNumber(matchedParent.phone)}) & ID. Scoped access to learner: ${
          child ? `${child.firstName} ${child.lastName} (${child.studentId})` : 'Unassigned'
        }.`
      );
      return { success: true, session };
    }

    // 2. Check Teachers Directory
    const matchedTeacher = teachers.find(
      (t) => phoneMatch(t.phone, cleanPhone) && idMatch(t.nationalOrStaffId, rawId)
    );

    if (matchedTeacher) {
      const isClassTeacher = matchedTeacher.teacherType === 'class_teacher';
      const session: UserSession = {
        id: `session-teacher-${matchedTeacher.id}`,
        name: matchedTeacher.name,
        role: 'teacher',
        email: matchedTeacher.email,
        phone: normalizeKenyanPhone(matchedTeacher.phone),
        idNumber: matchedTeacher.nationalOrStaffId,
        title: isClassTeacher
          ? `Class Teacher · ${matchedTeacher.assignedGrade}`
          : `Subject Teacher (${matchedTeacher.registeredSubjects.join(', ')})`,
        teacherType: matchedTeacher.teacherType,
        teacherGrade: matchedTeacher.assignedGrade,
        registeredSubjects: matchedTeacher.registeredSubjects,
      };

      setCurrentUser(session);
      setIsAuthenticated(true);
      setDecryptedParentIds(new Set());
      addAuditLog(
        'Teacher Portal Authentication',
        isClassTeacher
          ? `${matchedTeacher.name} logged in as Class Teacher for ${matchedTeacher.assignedGrade} with full grade access.`
          : `${matchedTeacher.name} logged in as Subject Teacher for: ${matchedTeacher.registeredSubjects.join(', ')}.`
      );
      return { success: true, session };
    }

    // 3. Check Registered Administrators & Bursars
    const matchedRegisteredAdmin = adminAccounts.find(
      (a) => phoneMatch(a.phone, cleanPhone) && idMatch(a.nationalOrStaffId, rawId)
    );
    if (matchedRegisteredAdmin) {
      const session: UserSession = {
        id: `session-admin-${matchedRegisteredAdmin.id}`,
        name: matchedRegisteredAdmin.name,
        role: matchedRegisteredAdmin.role,
        email: matchedRegisteredAdmin.email,
        phone: normalizeKenyanPhone(matchedRegisteredAdmin.phone),
        idNumber: matchedRegisteredAdmin.nationalOrStaffId,
        title: matchedRegisteredAdmin.title,
      };
      setCurrentUser(session);
      setIsAuthenticated(true);
      addAuditLog(
        `${matchedRegisteredAdmin.role === 'admin' ? 'Administrator' : 'Bursar'} Portal Authentication`,
        `${matchedRegisteredAdmin.name} (${matchedRegisteredAdmin.title}) logged in.`
      );
      return { success: true, session };
    }

    // 4. Fallback to Initial User Sessions
    const matchedSession = INITIAL_USER_SESSIONS.find(
      (u) =>
        (u.role === 'admin' || u.role === 'bursar') &&
        phoneMatch(u.phone, cleanPhone) &&
        idMatch(u.idNumber, rawId)
    );
    if (matchedSession) {
      setCurrentUser(matchedSession);
      setIsAuthenticated(true);
      addAuditLog(`${matchedSession.role.toUpperCase()} Authentication`, `${matchedSession.name} logged in.`);
      return { success: true, session: matchedSession };
    }

    return {
      success: false,
      error:
        'Access Denied: No account matched the provided mobile phone number and ID number password. Please check your credentials.',
    };
  };

  const verifyOwnerOtp = async (
    enteredOtp: string,
    actingDesignation: OwnerDesignation = 'owner'
  ): Promise<{ success: boolean; error?: string; session?: UserSession }> => {
    const res = await verifyOwnerOtpAndAuthorizeDevice(
      enteredOtp,
      currentDeviceId,
      currentDeviceName
    );
    if (!res.success) {
      return { success: false, error: res.error };
    }

    const updatedLock = await getOwnerDeviceLock();
    setOwnerDeviceLock(updatedLock);

    const ownerSession = buildOwnerSession(actingDesignation);
    setCurrentUser(ownerSession);
    setIsAuthenticated(true);
    if (ownerSession.role === 'parent' && ownerSession.parentId) {
      setDecryptedParentIds(new Set([ownerSession.parentId]));
    } else {
      setDecryptedParentIds(new Set());
    }

    addAuditLog(
      'Owner Access Granted via Verified OTP',
      `Access authorized for secondary device (${currentDeviceName}). Active single-phone lock transferred. Prior device revoked.`
    );
    return { success: true, session: ownerSession };
  };

  const resendOwnerOtp = async (): Promise<{ success: boolean; error?: string; dispatchedOtpPreview?: string }> => {
    const res = await initiateOwnerOtpChallenge(currentDeviceId, currentDeviceName);
    if (res.success) {
      const updated = await getOwnerDeviceLock();
      setOwnerDeviceLock(updated);
      return { success: true, dispatchedOtpPreview: res.challenge.otpCode };
    }
    return { success: false, error: res.error || 'Failed to dispatch SMS' };
  };

  const forceRelockOwnerDevice = async (): Promise<boolean> => {
    const lock: OwnerDeviceLock = {
      id: OWNER_LOCK_DOC_ID,
      activeDeviceId: currentDeviceId,
      activeDeviceName: currentDeviceName,
      authorizedPhone: OWNER_PHONE,
      authorizedId: OWNER_ID_NUMBER,
      lastActiveAt: new Date().toISOString(),
      registeredAt: new Date().toISOString(),
      pendingChallenge: null,
    };
    await persistOwnerDeviceLock(lock);
    setOwnerDeviceLock(lock);
    addAuditLog('Owner Device Re-locked', `Active single-phone lock re-bound to current device: ${currentDeviceName}`);
    return true;
  };

  const requestPasswordResetLink = (
    phoneInput: string
  ): {
    success: boolean;
    error?: string;
    resetToken?: string;
    resetLink?: string;
    user?: { name: string; role: string; phone: string; idNumber: string };
  } => {
    const validation = validateKenyanPhoneNumber(phoneInput);
    if (!validation.isValid) {
      return {
        success: false,
        error:
          validation.error ||
          'The phone number format should start with 07.... Or 01.... Not +2547.... nor +254..... (Example: 0712345678 or 0110445566)',
      };
    }

    const cleanPhone = validation.cleanPhone!;

    // Find account across parents, teachers, and administrative staff
    const parent = parents.find(
      (p) =>
        normalizeKenyanPhone(p.phone) === cleanPhone ||
        (p.alternatePhone && normalizeKenyanPhone(p.alternatePhone) === cleanPhone)
    );
    if (parent) {
      const token = `RST-${Math.floor(100000 + Math.random() * 900000)}`;
      const resetLink = `https://academiacademy.edu/reset?token=${token}&phone=${cleanPhone}`;

      addAuditLog(
        'Password Reset Link Requested',
        `Password reset link dispatched via cellular SMS to ${cleanPhone} for Parent ${parent.fullName}.`
      );

      // Record simulated SMS delivery in reminders table
      const resetSms: PaymentReminder = {
        id: `sms-reset-${Date.now()}`,
        learnerId: '',
        parentId: parent.id,
        term: 'Account Security',
        amountDue: 0,
        dueDate: new Date().toISOString().slice(0, 10),
        type: 'upcoming_due',
        channel: 'sms',
        status: 'delivered',
        scheduledDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
        sentDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
        messagePreview: `ACADEMIA-PORTAL SMS: Reset your password by clicking ${resetLink} (Link valid for 15 minutes).`,
      };
      setReminders((prev) => [resetSms, ...prev]);

      return {
        success: true,
        resetToken: token,
        resetLink,
        user: {
          name: parent.fullName,
          role: 'Parent',
          phone: cleanPhone,
          idNumber: parent.nationalId,
        },
      };
    }

    const teacher = teachers.find((t) => normalizeKenyanPhone(t.phone) === cleanPhone);
    if (teacher) {
      const token = `RST-${Math.floor(100000 + Math.random() * 900000)}`;
      const resetLink = `https://academiacademy.edu/reset?token=${token}&phone=${cleanPhone}`;

      addAuditLog(
        'Password Reset Link Requested',
        `Password reset link dispatched via cellular SMS to ${cleanPhone} for Teacher ${teacher.name}.`
      );

      const resetSms: PaymentReminder = {
        id: `sms-reset-${Date.now()}`,
        learnerId: '',
        parentId: '',
        term: 'Account Security',
        amountDue: 0,
        dueDate: new Date().toISOString().slice(0, 10),
        type: 'upcoming_due',
        channel: 'sms',
        status: 'delivered',
        scheduledDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
        sentDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
        messagePreview: `ACADEMIA-PORTAL SMS: Reset your teacher password by clicking ${resetLink} (Link valid for 15 minutes).`,
      };
      setReminders((prev) => [resetSms, ...prev]);

      return {
        success: true,
        resetToken: token,
        resetLink,
        user: {
          name: teacher.name,
          role: teacher.teacherType === 'class_teacher' ? `Class Teacher (${teacher.assignedGrade})` : 'Subject Teacher',
          phone: cleanPhone,
          idNumber: teacher.nationalOrStaffId,
        },
      };
    }

    const adminUser = INITIAL_USER_SESSIONS.find((u) => normalizeKenyanPhone(u.phone) === cleanPhone);
    if (adminUser) {
      const token = `RST-${Math.floor(100000 + Math.random() * 900000)}`;
      const resetLink = `https://academiacademy.edu/reset?token=${token}&phone=${cleanPhone}`;

      addAuditLog(
        'Password Reset Link Requested',
        `Password reset link dispatched via cellular SMS to ${cleanPhone} for ${adminUser.name} (${adminUser.role.toUpperCase()}).`
      );

      return {
        success: true,
        resetToken: token,
        resetLink,
        user: {
          name: adminUser.name,
          role: adminUser.role.toUpperCase(),
          phone: cleanPhone,
          idNumber: adminUser.idNumber,
        },
      };
    }

    return {
      success: false,
      error: `No registered account found with mobile phone ${cleanPhone}. Please verify your 10-digit number (format starting with 07... or 01...) or contact the school office.`,
    };
  };

  const resetPasswordForUser = (
    phoneInput: string,
    _token: string,
    newPasswordOrId: string
  ): { success: boolean; error?: string; userName?: string } => {
    const validation = validateKenyanPhoneNumber(phoneInput);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }
    const cleanPhone = validation.cleanPhone!;
    const newPass = newPasswordOrId.trim();

    if (!newPass || newPass.length < 3) {
      return {
        success: false,
        error: 'New password must be at least 3 characters long (e.g. your updated National ID or Staff ID).',
      };
    }

    // 1. Check Parents
    const parentIndex = parents.findIndex(
      (p) =>
        normalizeKenyanPhone(p.phone) === cleanPhone ||
        (p.alternatePhone && normalizeKenyanPhone(p.alternatePhone) === cleanPhone)
    );
    if (parentIndex !== -1) {
      const target = parents[parentIndex];
      const updatedParents = [...parents];
      updatedParents[parentIndex] = { ...target, nationalId: newPass };
      setParents(updatedParents);
      localStorage.setItem(`${STORAGE_KEY_PREFIX}parents`, JSON.stringify(updatedParents));

      addAuditLog(
        'Password Reset Completed',
        `Password (National ID) reset completed successfully for Parent ${target.fullName} via verified SMS link to ${cleanPhone}.`
      );
      return { success: true, userName: target.fullName };
    }

    // 2. Check Teachers
    const teacherIndex = teachers.findIndex((t) => normalizeKenyanPhone(t.phone) === cleanPhone);
    if (teacherIndex !== -1) {
      const target = teachers[teacherIndex];
      const updatedTeachers = [...teachers];
      updatedTeachers[teacherIndex] = { ...target, nationalOrStaffId: newPass };
      setTeachers(updatedTeachers);
      localStorage.setItem(`${STORAGE_KEY_PREFIX}teachers`, JSON.stringify(updatedTeachers));

      addAuditLog(
        'Password Reset Completed',
        `Password (Staff ID) reset completed successfully for Teacher ${target.name} via verified SMS link to ${cleanPhone}.`
      );
      return { success: true, userName: target.name };
    }

    // 3. Check Administrators
    const adminIndex = INITIAL_USER_SESSIONS.findIndex(
      (u) => normalizeKenyanPhone(u.phone) === cleanPhone
    );
    if (adminIndex !== -1) {
      const target = INITIAL_USER_SESSIONS[adminIndex];
      target.idNumber = newPass;

      addAuditLog(
        'Password Reset Completed',
        `Password reset completed successfully for ${target.name} (${target.role.toUpperCase()}) via verified SMS link to ${cleanPhone}.`
      );
      return { success: true, userName: target.name };
    }

    return {
      success: false,
      error: 'Account could not be found to complete the password update.',
    };
  };

  const logout = () => {
    clearAllTrialAndStaleSessions();
    setIsAuthenticated(false);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}auth`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}user`);
    setDecryptedParentIds(new Set());
    addAuditLog('User Session Ended', `Signed out ${currentUser?.name || 'User'}`);
  };

  const toggleParentDecryption = async (parentId: string): Promise<boolean> => {
    const allowed = canRoleDecryptSensitivePII(currentUser.role);
    if (!allowed && currentUser.role !== 'parent') {
      alert("Access Denied: Your assigned role lacks permissions to decrypt sensitive PII.");
      return false;
    }

    // If already decrypted, re-encrypt / hide
    if (decryptedParentIds.has(parentId)) {
      setDecryptedParentIds((prev) => {
        const next = new Set(prev);
        next.delete(parentId);
        return next;
      });
      return false;
    }

    // Decrypt and log
    const parent = parents.find((p) => p.id === parentId);
    setDecryptedParentIds((prev) => new Set(prev).add(parentId));
    addAuditLog(
      'Decrypted Sensitive PII',
      `Authorized decryption of phone, ID & address for parent ${parent?.fullName || parentId}`,
      true
    );
    return true;
  };

  const isParentDecrypted = (parentId: string) => {
    // If user is parent and this is their child's parent or themselves, always allow
    if (currentUser.role === 'parent') {
      if (currentUser.parentId === parentId) return true;
      if (currentUser.learnerId) {
        const learner = learners.find((l) => l.id === currentUser.learnerId);
        if (learner && learner.parentId === parentId) return true;
      }
    }
    return decryptedParentIds.has(parentId);
  };

  const addLearnerWithParent = async (
    learnerData: Omit<LearnerRecord, 'id' | 'studentId' | 'parentId' | 'status' | 'enrollmentDate' | 'photoPlaceholderColor'>,
    parentData: Omit<ParentRecord, 'id' | 'encryptedPayload'>,
    initialTuition: number,
    term: string,
    dueDate: string
  ) => {
    const parentId = `par-${Date.now()}`;
    const learnerId = `stu-${Date.now()}`;
    const studentIdNumber = String(learners.length + 1).padStart(3, '0');
    const studentId = `STU-2026-${studentIdNumber}`;

    // Encrypt sensitive phone + email payload for storage
    const encryptedPayload = await encryptSensitiveText(`${parentData.email}|${parentData.phone}`);

    const cleanParentData = Object.fromEntries(
      Object.entries(parentData).filter(([_, v]) => v !== undefined)
    ) as unknown as Omit<ParentRecord, 'id' | 'encryptedPayload'>;

    const newParent: ParentRecord = {
      ...cleanParentData,
      id: parentId,
      encryptedPayload,
    };

    const colors = ['bg-indigo-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600', 'bg-sky-600', 'bg-teal-600', 'bg-violet-600'];
    const randomColor = colors[learners.length % colors.length];

    const cleanLearnerData = Object.fromEntries(
      Object.entries(learnerData).filter(([_, v]) => v !== undefined)
    ) as unknown as Omit<LearnerRecord, 'id' | 'studentId' | 'parentId' | 'enrollmentDate' | 'status' | 'photoPlaceholderColor'>;

    const newLearner: LearnerRecord = {
      ...cleanLearnerData,
      id: learnerId,
      studentId,
      parentId,
      enrollmentDate: new Date().toISOString().slice(0, 10),
      status: 'active',
      photoPlaceholderColor: randomColor,
    };

    const newFeeStructure: FeeStructure = {
      id: `fs-${Date.now()}`,
      learnerId,
      term,
      tuitionFee: initialTuition,
      sportsAndActivityFee: 150,
      learningMaterialsFee: 100,
      discountOrScholarship: 0,
      totalDue: initialTuition + 250,
      amountPaid: 0,
      balance: initialTuition + 250,
      dueDate,
      status: 'pending',
    };

    setParents((prev) => [newParent, ...prev]);
    setLearners((prev) => [newLearner, ...prev]);
    setFeeStructures((prev) => [newFeeStructure, ...prev]);

    // Persist to Firestore
    saveDocumentToFirestore('parents', newParent).catch((e) => console.warn('Firestore write error:', e));
    saveDocumentToFirestore('learners', newLearner).catch((e) => console.warn('Firestore write error:', e));
    saveDocumentToFirestore('feeStructures', newFeeStructure).catch((e) => console.warn('Firestore write error:', e));

    addAuditLog('Created Student & Parent Record', `Enrolled ${newLearner.firstName} ${newLearner.lastName} (${studentId}) with parent ${newParent.fullName}`);
  };

  const updateLearner = (id: string, updates: Partial<LearnerRecord>) => {
    setLearners((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          const updated = { ...l, ...updates };
          saveDocumentToFirestore('learners', updated).catch((e) => console.warn('Firestore write error:', e));
          return updated;
        }
        return l;
      })
    );
    addAuditLog('Updated Learner Profile', `Modified details for learner ${id}`);
  };

  const updateParent = (id: string, updates: Partial<ParentRecord>) => {
    setParents((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, ...updates };
          saveDocumentToFirestore('parents', updated).catch((e) => console.warn('Firestore write error:', e));
          return updated;
        }
        return p;
      })
    );
    addAuditLog('Updated Parent Contact', `Modified sensitive records for parent ${id}`, true);
  };

  const recordPayment = ({
    learnerId,
    term,
    amount,
    method,
    notes,
  }: {
    learnerId: string;
    term: string;
    amount: number;
    method: 'Bank Transfer' | 'M-Pesa / Mobile Money' | 'Card' | 'Cash';
    notes?: string;
  }): FeePayment => {
    const learner = learners.find((l) => l.id === learnerId);
    const parentId = learner ? learner.parentId : '';
    const receiptNum = `REC-2026-${String(feePayments.length + 101).padStart(4, '0')}`;
    const txnRef = `TXN-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newPayment: FeePayment = {
      id: `pay-${Date.now()}`,
      transactionRef: txnRef,
      receiptNumber: receiptNum,
      learnerId,
      parentId,
      term,
      amount,
      paymentDate: new Date().toISOString().slice(0, 10),
      method,
      status: 'completed',
      recordedBy: currentUser.name,
      notes,
    };

    // Update Fee structure
    setFeeStructures((prev) =>
      prev.map((fs) => {
        if (fs.learnerId === learnerId && fs.term === term) {
          const newAmountPaid = fs.amountPaid + amount;
          const newBalance = Math.max(0, fs.totalDue - newAmountPaid);
          const newStatus = newBalance <= 0 ? 'paid' : 'partial';
          const updatedFs: FeeStructure = {
            ...fs,
            amountPaid: newAmountPaid,
            balance: newBalance,
            status: newStatus,
          };
          saveDocumentToFirestore('feeStructures', updatedFs).catch((e) => console.warn('Firestore write error:', e));
          return updatedFs;
        }
        return fs;
      })
    );

    setFeePayments((prev) => [newPayment, ...prev]);
    saveDocumentToFirestore('feePayments', newPayment).catch((e) => console.warn('Firestore write error:', e));

    addAuditLog(
      'Recorded Tuition Payment',
      `Receipt ${receiptNum} issued for Ksh ${amount.toLocaleString()} (${method}) for ${learner?.firstName} ${learner?.lastName}`
    );

    return newPayment;
  };

  const batchDispatchReminders = () => {
    // Look for fee structures with pending or overdue balance > 0
    const pendingFees = feeStructures.filter((fs) => fs.balance > 0);
    let sentCount = 0;

    const updatedReminders = [...reminders];

    pendingFees.forEach((fee) => {
      const learner = learners.find((l) => l.id === fee.learnerId);
      const parent = parents.find((p) => p.id === learner?.parentId);
      if (!learner || !parent) return;

      const isOverdue = new Date(fee.dueDate) < new Date('2026-06-18');
      const reminderType = isOverdue ? 'overdue_first_notice' : 'upcoming_due';
      const channel = parent.preferredChannel === 'call' ? 'sms' : parent.preferredChannel;

      const message = isOverdue
        ? `Overdue Tuition Alert: Dear ${parent.fullName}, tuition balance of Ksh ${fee.balance.toLocaleString()} for ${learner.firstName} ${learner.lastName} is past due date (${fee.dueDate}). Kindly settle promptly.`
        : `Tuition Reminder: Dear ${parent.fullName}, term fees of Ksh ${fee.balance.toLocaleString()} for ${learner.firstName} ${learner.lastName} are due on ${fee.dueDate}.`;

      updatedReminders.unshift({
        id: `rem-auto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        learnerId: learner.id,
        parentId: parent.id,
        term: fee.term,
        amountDue: fee.balance,
        dueDate: fee.dueDate,
        type: reminderType,
        channel,
        status: 'delivered',
        scheduledDate: new Date().toISOString().slice(0, 10),
        sentDate: new Date().toLocaleString(),
        messagePreview: message,
      });

      sentCount++;
    });

    setReminders(updatedReminders);
    batchSyncToFirestore('paymentReminders', updatedReminders).catch((e) => console.warn('Firestore write error:', e));

    addAuditLog(
      'Dispatched Automated Payment Reminders',
      `Sent ${sentCount} automated SMS and email reminders to parents with pending tuition balances`
    );

    return {
      sentCount,
      message: `Successfully dispatched ${sentCount} automated payment notifications across SMS and Email queues.`,
    };
  };

  const sendBulkOverdueReminders = ({
    learnerIds,
    term,
    channels,
    customMessageTemplate,
    urgencyLevel = 'standard',
  }: {
    learnerIds: string[];
    term: string;
    channels: ('sms' | 'email')[];
    customMessageTemplate?: string;
    urgencyLevel?: 'standard' | 'friendly' | 'final';
  }) => {
    let sentSmsCount = 0;
    let sentEmailCount = 0;
    let totalDebtNotified = 0;
    const newReminders: PaymentReminder[] = [];

    learnerIds.forEach((id) => {
      const learner = learners.find((l) => l.id === id);
      const parent = parents.find((p) => p.id === learner?.parentId);
      const fee =
        feeStructures.find((fs) => fs.learnerId === id && fs.term === term) ||
        feeStructures.find((fs) => fs.learnerId === id && fs.balance > 0);

      if (!learner || !parent || !fee || fee.balance <= 0) return;

      totalDebtNotified += fee.balance;
      const dueDateStr = fee.dueDate;
      const amountStr = `Ksh ${fee.balance.toLocaleString()}`;

      let messageText = '';
      if (customMessageTemplate) {
        messageText = customMessageTemplate
          .replace(/{ParentName}/g, parent.fullName)
          .replace(/{LearnerName}/g, `${learner.firstName} ${learner.lastName}`)
          .replace(/{Grade}/g, learner.grade)
          .replace(/{AmountDue}/g, amountStr)
          .replace(/{DueDate}/g, dueDateStr)
          .replace(/{Paybill}/g, `Paybill 28491 (A/C: ${learner.studentId})`);
      } else if (urgencyLevel === 'final') {
        messageText = `FINAL OVERDUE DEMAND: Dear ${parent.fullName}, outstanding tuition of ${amountStr} for ${learner.firstName} ${learner.lastName} (${learner.grade}) was due on ${dueDateStr}. Immediate settlement required to prevent academic service suspension.`;
      } else if (urgencyLevel === 'friendly') {
        messageText = `Friendly Tuition Reminder: Dear ${parent.fullName}, a tuition balance of ${amountStr} remains for ${learner.firstName} for ${term} (due ${dueDateStr}). Settle via Paybill 28491. Thank you.`;
      } else {
        messageText = `OVERDUE TUITION ALERT: Dear ${parent.fullName}, tuition balance of ${amountStr} for ${learner.firstName} ${learner.lastName} is overdue (was due ${dueDateStr}). Please remit via Paybill 28491 A/C: ${learner.studentId}.`;
      }

      channels.forEach((ch) => {
        if (ch === 'sms') sentSmsCount++;
        if (ch === 'email') sentEmailCount++;

        newReminders.unshift({
          id: `rem-bulk-${Date.now()}-${ch}-${Math.random().toString(36).substring(2, 6)}`,
          learnerId: learner.id,
          parentId: parent.id,
          term: fee.term,
          amountDue: fee.balance,
          dueDate: fee.dueDate,
          type: 'overdue_first_notice',
          channel: ch,
          status: 'delivered',
          scheduledDate: new Date().toISOString().slice(0, 10),
          sentDate: new Date().toLocaleString(),
          messagePreview: messageText,
        });
      });
    });

    setReminders((prev) => [...newReminders, ...prev]);
    batchSyncToFirestore('paymentReminders', newReminders).catch((e) => console.warn('Firestore write error:', e));

    const totalRecipients = learnerIds.length;
    addAuditLog(
      'Dispatched Bulk Overdue Reminders',
      `Sent ${sentSmsCount} SMS and ${sentEmailCount} emails across ${totalRecipients} accounts notifying Ksh ${totalDebtNotified.toLocaleString()} in overdue tuition`
    );

    return {
      sentSmsCount,
      sentEmailCount,
      totalRecipients,
      totalDebtNotified,
      message: `Successfully dispatched ${sentSmsCount} SMS and ${sentEmailCount} Email reminders across ${totalRecipients} parent accounts notifying Ksh ${totalDebtNotified.toLocaleString()} in overdue tuition.`,
    };
  };

  const scheduleReminder = (reminderData: Omit<PaymentReminder, 'id' | 'status'>) => {
    const newReminder: PaymentReminder = {
      ...reminderData,
      id: `rem-sch-${Date.now()}`,
      status: 'scheduled',
    };
    setReminders((prev) => [newReminder, ...prev]);
    saveDocumentToFirestore('paymentReminders', newReminder).catch((e) => console.warn('Firestore write error:', e));
    addAuditLog('Scheduled Payment Reminder', `Scheduled reminder for ${reminderData.dueDate} via ${reminderData.channel}`);
  };

  const saveScoreCard = (card: ScoreCard) => {
    setScoreCards((prev) => {
      const exists = prev.some((c) => c.id === card.id);
      if (exists) {
        return prev.map((c) => (c.id === card.id ? card : c));
      }
      return [card, ...prev];
    });

    saveDocumentToFirestore('scoreCards', card).catch((e) => console.warn('Firestore write error:', e));

    const learner = learners.find((l) => l.id === card.learnerId);
    addAuditLog(
      'Published Learner Score Card',
      `Generated term report card for ${learner?.firstName} ${learner?.lastName} (${card.term}) with GPA ${card.gpa.toFixed(2)}`
    );
  };

  const recordSingleAttendance = (recordData: Omit<AttendanceRecord, 'id' | 'markedBy'>) => {
    const session = recordData.session || 'morning';
    const id = `att-${recordData.learnerId}-${recordData.date}-${session}`;
    const newRecord: AttendanceRecord = {
      ...recordData,
      session,
      id,
      markedBy: currentUser.name,
    };

    setAttendance((prev) => {
      const filtered = prev.filter(
        (a) => !(a.learnerId === recordData.learnerId && a.date === recordData.date && (a.session || 'morning') === session)
      );
      return [newRecord, ...filtered];
    });

    saveDocumentToFirestore('attendance', newRecord).catch((e) => console.warn('Firestore write error:', e));
  };

  const batchMarkClassAttendance = (
    date: string,
    grade: string,
    status: AttendanceStatus,
    session: AttendanceSession | 'both' = 'both'
  ) => {
    const classLearners = learners.filter((l) => l.grade === grade);
    const targetSessions: AttendanceSession[] = session === 'both' ? ['morning', 'afternoon'] : [session];

    const newRecords: AttendanceRecord[] = [];
    classLearners.forEach((l) => {
      targetSessions.forEach((sess) => {
        newRecords.push({
          id: `att-${l.id}-${date}-${sess}`,
          learnerId: l.id,
          date,
          session: sess,
          status,
          markedBy: currentUser.name,
        });
      });
    });

    setAttendance((prev) => {
      const existingOther = prev.filter(
        (a) => !(a.date === date && classLearners.some((l) => l.id === a.learnerId) && targetSessions.includes(a.session || 'morning'))
      );
      return [...newRecords, ...existingOther];
    });

    batchSyncToFirestore('attendance', newRecords).catch((e) => console.warn('Firestore write error:', e));

    addAuditLog(
      'Batch Marked Attendance',
      `Marked ${classLearners.length} students as ${status.toUpperCase()} (${session === 'both' ? 'Morning & Afternoon' : session}) for ${grade} on ${date}`
    );
  };

  const saveAssessment = (assessment: AssessmentRecord) => {
    setAssessments((prev) => {
      const exists = prev.some((a) => a.id === assessment.id);
      return exists ? prev.map((a) => (a.id === assessment.id ? assessment : a)) : [assessment, ...prev];
    });

    saveDocumentToFirestore('assessments', assessment).catch((e) => console.warn('Firestore write error:', e));
    addAuditLog('Assessment Configured', `Updated assessment ${assessment.name} for ${assessment.grade} (${assessment.term})`);
  };

  const saveSubjectSubmission = (submission: SubjectMarksSubmission) => {
    setSubjectSubmissions((prev) => {
      const exists = prev.some((s) => s.id === submission.id);
      return exists ? prev.map((s) => (s.id === submission.id ? submission : s)) : [submission, ...prev];
    });

    saveDocumentToFirestore('subjectSubmissions', submission).catch((e) => console.warn('Firestore write error:', e));
    addAuditLog('Subject Marks Submitted', `Submitted marks for ${submission.subjectName} (${submission.grade} - ${submission.term})`);
  };

  const toggleExamAbsence = (grade: string, term: string, learnerId: string, isAbsent: boolean, reason?: string) => {
    setAssessments((prev) => {
      const current = prev.find((a) => a.grade === grade && a.term === term) || {
        id: `asm-${grade.replace(/\s+/g, '-').toLowerCase()}-${term.replace(/\s+/g, '-').toLowerCase()}`,
        grade,
        term,
        academicYear: '2026',
        name: `${term} Summative Assessment 2026`,
        type: 'End of Term Exam' as const,
        dateAdministered: new Date().toISOString().slice(0, 10),
        status: 'in_progress' as const,
        absentLearnerIds: [],
      };

      const set = new Set(current.absentLearnerIds || []);
      if (isAbsent) {
        set.add(learnerId);
      } else {
        set.delete(learnerId);
      }

      const updated: AssessmentRecord = {
        ...current,
        absentLearnerIds: Array.from(set),
      };

      saveDocumentToFirestore('assessments', updated).catch(() => {});
      const exists = prev.some((a) => a.id === updated.id);
      return exists ? prev.map((a) => (a.id === updated.id ? updated : a)) : [updated, ...prev];
    });

    // Also update ScoreCard for this learner and term
    setScoreCards((prev) =>
      prev.map((sc) => {
        if (sc.learnerId === learnerId && sc.term === term) {
          const updatedCard: ScoreCard = {
            ...sc,
            isExamAbsent: isAbsent,
            ...(reason ? { examAbsentReason: reason } : {}),
          };
          saveDocumentToFirestore('scoreCards', updatedCard).catch(() => {});
          return updatedCard;
        }
        return sc;
      })
    );

    const learner = learners.find((l) => l.id === learnerId);
    const learnerName = learner ? `${learner.firstName} ${learner.lastName}` : learnerId;
    addAuditLog(
      isAbsent ? 'Marked Learner Exam Absent' : 'Cleared Exam Absenteeism',
      `${learnerName} marked ${isAbsent ? 'ABSENT (Did Not Sit)' : 'PRESENT'} for ${grade} ${term} assessment`,
      isAbsent
    );
  };

  const getLearnerById = (id: string) => learners.find((l) => l.id === id);
  const getParentById = (id: string) => parents.find((p) => p.id === id);
  const getFeeStructureForLearner = (learnerId: string, term = 'Term 2 - 2026') =>
    feeStructures.find((fs) => fs.learnerId === learnerId && fs.term === term) ||
    feeStructures.find((fs) => fs.learnerId === learnerId);
  const getPaymentsForLearner = (learnerId: string) =>
    feePayments.filter((p) => p.learnerId === learnerId);
  const getScoreCardsForLearner = (learnerId: string) =>
    scoreCards.filter((sc) => sc.learnerId === learnerId);
  const getAttendanceForLearner = (learnerId: string) =>
    attendance.filter((a) => a.learnerId === learnerId);

  const updateSchoolProfile = (updates: Partial<SchoolProfile>) => {
    setSchoolProfile((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem(`${STORAGE_KEY_PREFIX}school_profile`, JSON.stringify(next));
      saveDocumentToFirestore('settings', { ...next, id: 'school_config' }).catch(() => {});
      return next;
    });
    addAuditLog('School Profile Updated', `Updated official details for ${schoolProfile.name}`);
  };

  const addGrade = (grade: Omit<GradeLevel, 'id'>) => {
    const newGrade: GradeLevel = {
      ...grade,
      id: `grd-${Date.now()}`,
    };
    setGrades((prev) => [...prev, newGrade]);
    saveDocumentToFirestore('grades', newGrade).catch(() => {});
    addAuditLog('Grade Registered', `Added cohort ${newGrade.name} (${newGrade.tier})`);
  };

  const updateGrade = (id: string, updates: Partial<GradeLevel>) => {
    setGrades((prev) =>
      prev.map((g) => {
        if (g.id === id) {
          const next = { ...g, ...updates };
          saveDocumentToFirestore('grades', next).catch(() => {});
          return next;
        }
        return g;
      })
    );
    addAuditLog('Grade Updated', `Modified grade profile for ${id}`);
  };

  const deleteGrade = (id: string) => {
    setGrades((prev) => prev.filter((g) => g.id !== id));
    deleteDocumentFromFirestore('grades', id).catch(() => {});
    addAuditLog('Grade Removed', `Deleted grade cohort ${id}`);
  };

  const addSubject = (subject: Omit<SubjectDefinition, 'id'>) => {
    const newSubject: SubjectDefinition = {
      ...subject,
      id: `sub-${Date.now()}`,
    };
    setSubjects((prev) => [...prev, newSubject]);
    saveDocumentToFirestore('subjects', newSubject).catch(() => {});
    addAuditLog('CBC Subject Registered', `Added learning area ${newSubject.name} (${newSubject.code})`);
  };

  const updateSubject = (id: string, updates: Partial<SubjectDefinition>) => {
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const next = { ...s, ...updates };
          saveDocumentToFirestore('subjects', next).catch(() => {});
          return next;
        }
        return s;
      })
    );
    addAuditLog('CBC Subject Updated', `Modified subject ${id}`);
  };

  const deleteSubject = (id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    deleteDocumentFromFirestore('subjects', id).catch(() => {});
    addAuditLog('CBC Subject Removed', `Deleted subject ${id}`);
  };

  const addTeacher = (teacher: Omit<TeacherRecord, 'id'>) => {
    const newTeacher: TeacherRecord = {
      ...teacher,
      id: `tch-${Date.now()}`,
    };
    setTeachers((prev) => [...prev, newTeacher]);
    saveDocumentToFirestore('teachers', newTeacher).catch(() => {});
    addAuditLog('Teacher Registered', `Enrolled faculty teacher ${newTeacher.name} (${newTeacher.teacherType})`);
  };

  const updateTeacher = (id: string, updates: Partial<TeacherRecord>) => {
    setTeachers((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const next = { ...t, ...updates };
          saveDocumentToFirestore('teachers', next).catch(() => {});
          return next;
        }
        return t;
      })
    );
    addAuditLog('Teacher Updated', `Modified profile for teacher ${id}`);
  };

  const deleteTeacher = (id: string) => {
    setTeachers((prev) => prev.filter((t) => t.id !== id));
    deleteDocumentFromFirestore('teachers', id).catch(() => {});
    addAuditLog('Teacher Removed', `Deleted teacher ${id}`);
  };

  const addAdminAccount = (admin: Omit<AdminAccount, 'id'>) => {
    const newAdmin: AdminAccount = {
      ...admin,
      id: `adm-${Date.now()}`,
    };
    setAdminAccounts((prev) => [...prev, newAdmin]);
    saveDocumentToFirestore('admins', newAdmin).catch(() => {});
    addAuditLog('Administrator Registered', `Created administrator account for ${newAdmin.name} (${newAdmin.role})`);
  };

  const updateAdminAccount = (id: string, updates: Partial<AdminAccount>) => {
    setAdminAccounts((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const next = { ...a, ...updates };
          saveDocumentToFirestore('admins', next).catch(() => {});
          return next;
        }
        return a;
      })
    );
    addAuditLog('Administrator Updated', `Updated officer profile for ${id}`);
  };

  const deleteAdminAccount = (id: string) => {
    setAdminAccounts((prev) => prev.filter((a) => a.id !== id));
    deleteDocumentFromFirestore('admins', id).catch(() => {});
    addAuditLog('Administrator Removed', `Removed admin ${id}`);
  };

  const resetToDefault = () => {
    localStorage.clear();
    setParents(INITIAL_PARENTS);
    setLearners(INITIAL_LEARNERS);
    setFeeStructures(INITIAL_FEE_STRUCTURES);
    setFeePayments(INITIAL_PAYMENTS);
    setReminders(INITIAL_REMINDERS);
    setScoreCards(INITIAL_SCORE_CARDS);
    setAttendance(INITIAL_ATTENDANCE);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setSchoolProfile(INITIAL_SCHOOL_PROFILE);
    setGrades(INITIAL_GRADES);
    setSubjects(INITIAL_SUBJECTS);
    setAdminAccounts(INITIAL_ADMIN_ACCOUNTS);
    setTeachers(INITIAL_TEACHERS);
    setCurrentUser(INITIAL_USER_SESSIONS[0]);
    setDecryptedParentIds(new Set());
  };

  const isOwner = Boolean(
    currentUser.isOwner ||
    (currentUser.phone && (normalizeKenyanPhone(currentUser.phone) === '0716235185' || currentUser.phone === '0716235185'))
  );

  return (
    <AppContext.Provider
      value={{
        currentUser,
        allUsers: INITIAL_USER_SESSIONS,
        isAuthenticated,
        isOwner,
        switchUser,
        switchRole,
        switchOwnerResponsibility,
        loginWithCredentials,
        verifyOwnerOtp,
        resendOwnerOtp,
        forceRelockOwnerDevice,
        ownerDeviceLock,
        currentDeviceId,
        currentDeviceName,
        deviceKickoutNotice,
        clearDeviceKickoutNotice,
        requestPasswordResetLink,
        resetPasswordForUser,
        logout,
        parents,
        learners,
        teachers,
        feeStructures,
        feePayments,
        reminders,
        scoreCards,
        attendance,
        auditLogs,
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
        adminAccounts,
        addAdminAccount,
        updateAdminAccount,
        deleteAdminAccount,
        addTeacher,
        updateTeacher,
        deleteTeacher,
        decryptedParentIds,
        toggleParentDecryption,
        isParentDecrypted,
        addLearnerWithParent,
        updateLearner,
        updateParent,
        recordPayment,
        batchDispatchReminders,
        sendBulkOverdueReminders,
        scheduleReminder,
        saveScoreCard,
        assessments,
        saveAssessment,
        subjectSubmissions,
        saveSubjectSubmission,
        toggleExamAbsence,
        recordSingleAttendance,
        batchMarkClassAttendance,
        getLearnerById,
        getParentById,
        getFeeStructureForLearner,
        getPaymentsForLearner,
        getScoreCardsForLearner,
        getAttendanceForLearner,
        addAuditLog,
        resetToDefault,
        isCloudConnected,
        isCloudLoaded,
        firestoreDbId: firestoreDatabaseId,
        firebaseProjectId,
        isSyncingToCloud,
        syncAllDataToFirestore,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
