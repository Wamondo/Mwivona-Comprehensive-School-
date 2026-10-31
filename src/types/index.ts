export type UserRole = 'admin' | 'teacher' | 'bursar' | 'parent';

export type TeacherType = 'class_teacher' | 'subject_teacher';

export type OwnerDesignation =
  | 'owner'
  | 'hoi'
  | 'deputy_hoi'
  | 'exam_council'
  | 'senior_teacher'
  | 'class_teacher'
  | 'subject_teacher'
  | 'parent';

export interface UserSession {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  phone: string; // Registered mobile phone
  idNumber: string; // National ID or Staff ID used as password
  title: string;
  isOwner?: boolean; // True for the verified application owner
  ownerDesignation?: OwnerDesignation; // Current active responsibility for the owner
  learnerId?: string; // If role is parent, associated child ID
  parentId?: string; // If role is parent, parent profile ID
  teacherType?: TeacherType; // If role is teacher, class_teacher or subject_teacher
  teacherGrade?: string; // If class teacher, assigned represented grade (e.g. 'Grade 7A')
  registeredSubjects?: string[]; // Registered subjects taught by this teacher
}

export interface TeacherRecord {
  id: string;
  name: string;
  phone: string;
  nationalOrStaffId: string;
  email: string;
  teacherType: TeacherType;
  assignedGrade?: string; // If class teacher
  registeredSubjects: string[];
  department: string;
}

export interface ParentRecord {
  id: string;
  fullName: string;
  relationship: 'Mother' | 'Father' | 'Guardian';
  nationalId: string; // Sensitive - encrypted
  phone: string; // Sensitive - encrypted
  alternatePhone?: string; // Sensitive - encrypted
  email: string; // Sensitive - encrypted
  homeAddress: string; // Sensitive - encrypted
  occupation: string;
  preferredChannel: 'sms' | 'email' | 'call';
  encryptedPayload?: string; // AES-GCM ciphertext representation
}

export interface LearnerRecord {
  id: string;
  studentId: string; // e.g. STU-2026-001
  firstName: string;
  lastName: string;
  grade: string; // e.g. 'Grade 5A', 'Grade 6B', 'Grade 7A', 'Grade 8A'
  dateOfBirth: string;
  gender: 'Female' | 'Male' | 'Other';
  parentId: string;
  emergencyMedicalNotes?: string;
  enrollmentDate: string;
  status: 'active' | 'graduated' | 'inactive';
  photoPlaceholderColor: string;
  previousTermAverageScore?: number; // Previous term baseline % for calculating academic improvement
}

export interface FeePayment {
  id: string;
  transactionRef: string;
  receiptNumber: string;
  learnerId: string;
  parentId: string;
  term: string; // e.g. "Term 1 - 2026"
  amount: number;
  paymentDate: string;
  method: 'Bank Transfer' | 'M-Pesa / Mobile Money' | 'Card' | 'Cash';
  status: 'completed' | 'pending_verification' | 'reversed';
  recordedBy: string;
  notes?: string;
}

export interface FeeStructure {
  id: string;
  learnerId: string;
  term: string;
  tuitionFee: number;
  sportsAndActivityFee: number;
  learningMaterialsFee: number;
  discountOrScholarship: number;
  totalDue: number;
  amountPaid: number;
  balance: number;
  dueDate: string;
  status: 'paid' | 'partial' | 'pending' | 'overdue';
}

export interface PaymentReminder {
  id: string;
  learnerId: string;
  parentId: string;
  term: string;
  amountDue: number;
  dueDate: string;
  type: 'upcoming_due' | 'due_today' | 'overdue_first_notice' | 'final_demand';
  channel: 'sms' | 'email' | 'in_app';
  status: 'sent' | 'scheduled' | 'delivered';
  scheduledDate: string;
  sentDate?: string;
  messagePreview: string;
}

export type CompetencyGrade = 'EE1' | 'EE2' | 'ME1' | 'ME2' | 'AE1' | 'AE2' | 'BE1' | 'BE2';

export interface SubjectScore {
  id: string;
  subjectName: string;
  catScore: number; // max 30
  midTermScore: number; // max 20
  finalExamScore: number; // max 50
  totalScore: number; // max 100
  letterGrade: CompetencyGrade;
  points: number; // 8-point scale (8, 7, 6, 5, 4, 3, 2, 1)
  teacherRemarks: string;
  subjectTeacher: string;
}

export interface ScoreCard {
  id: string;
  learnerId: string;
  term: string;
  academicYear: string;
  issueDate: string;
  assessmentName?: string; // Specific assessment e.g. "Term 1 Summative Assessment 2026"
  assessmentType?: string; // e.g. "End of Term Exam", "Mid-Term Evaluation", etc.
  isExamAbsent?: boolean; // If class teacher marked student absent for this assessment
  examAbsentReason?: string;
  subjects: SubjectScore[];
  totalMarks: number;
  maxPossibleMarks: number;
  averageScore: number;
  gpa: number; // 8.0 point scale
  classRank: number;
  classSize: number;
  attendancePercentage: number;
  classTeacherRemark: string;
  principalRemark: string;
  status: 'draft' | 'published';
}

export type AttendanceSession = 'morning' | 'afternoon';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  id: string;
  learnerId: string;
  date: string; // YYYY-MM-DD
  session?: AttendanceSession; // Morning (session 1) or Afternoon (session 2)
  status: AttendanceStatus;
  reason?: string;
  markedBy: string;
}

export interface AssessmentRecord {
  id: string;
  grade: string;
  term: string;
  academicYear: string;
  name: string; // e.g. "Term 1 Final Summative Assessment 2026"
  type: 'Opener Exam' | 'Mid-Term Evaluation' | 'End of Term Exam' | 'Continuous Assessment (CAT)';
  dateAdministered: string;
  deadline?: string;
  marksDeadline?: string;
  status: 'draft' | 'requested' | 'in_progress' | 'submitted' | 'published' | 'completed';
  instructions?: string;
  absentLearnerIds: string[]; // Class teacher marked absent / did not sit
  absentReasons?: Record<string, string>;
  requestedAt?: string;
  requestedBy?: string;
}

export interface SubjectMarksSubmission {
  id: string; // `subm-${grade}-${term}-${subjectName}`
  assessmentId?: string;
  grade: string;
  term: string;
  subjectName: string;
  subjectCode?: string;
  teacherName: string;
  submittedAt?: string;
  deadline?: string;
  status: 'pending' | 'in_progress' | 'submitted';
  totalEligible?: number;
  totalLearners?: number;
  eligibleLearners?: number;
  recordedCount?: number;
  absentCount?: number;
  recordedLearners?: number | string[];
  isComplete?: boolean;
  notes?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  securityFlag?: boolean;
}

export interface DigitalSignatureRecord {
  id: string;
  role: 'hoi' | 'bursar' | 'coordinator' | 'class_teacher' | 'seal';
  roleTitle: string;
  signatoryName: string;
  signatureDataUrl: string; // Base64 PNG image (with transparency)
  sourceType: 'draw' | 'upload' | 'preset';
  updatedAt: string;
  dateStr?: string;
  isVerified: boolean;
  verificationCode: string;
}

export interface SchoolProfile {
  id: string;
  name: string; // e.g. Mwivona Comprehensive School
  primaryWingName: string; // e.g. Mwivona Primary School
  juniorWingName: string; // e.g. Mwivona Junior School
  registrationNumber: string; // MoE / KNEC Registration Code
  county: string;
  subCounty: string;
  postalAddress: string;
  email: string;
  phone: string; // Kenyan format: 07... or 01...
  motto: string;
  curriculum: string; // e.g., 'Kenyan CBC (Competency-Based Curriculum Grades 1 - 9)'
  principalName?: string; // Head of Institution
  bankName: string;
  bankAccount: string;
  mpesaPaybill: string;
  mpesaAccountName: string;
  academicYear: string;
  currentTerm: string;
  signatures?: Record<string, DigitalSignatureRecord>;
}

export interface GradeLevel {
  id: string;
  name: string; // e.g., 'Grade 1', 'Grade 7A', 'Grade 8B'
  level: number; // 1 to 9
  tier: 'Lower Primary' | 'Upper Primary' | 'Junior School';
  wing?: 'Primary' | 'Junior'; // Primary School (Grades 1-6) or Junior School (Grades 7-9)
  stream?: string; // e.g., 'A', 'B', 'East', 'West'
  classTeacherId?: string; // Associated TeacherRecord ID
  roomNumber?: string;
  capacity?: number;
}

export interface SubjectDefinition {
  id: string;
  code: string;
  name: string;
  category: 'Languages' | 'Sciences' | 'Humanities' | 'Technical & Applied' | 'Creative Arts & Sports';
  applicableGrades: number[]; // e.g. [7, 8, 9] for Junior School, [1, 2, 3] for Lower Primary
  assignedTeacherId?: string;
  description?: string;
}

export interface AdminAccount {
  id: string;
  name: string;
  phone: string; // 07... or 01...
  nationalOrStaffId: string; // Used as password
  role: 'admin' | 'bursar';
  title: string;
  email: string;
  assignedDate: string;
}

export interface OwnerOtpChallenge {
  otpCode: string;
  expiresAt: number; // Unix timestamp in ms
  targetDeviceId: string;
  targetDeviceName: string;
  requestedAt: string;
  attemptsLeft: number;
}

export interface OwnerDeviceLock {
  id: string; // 'owner_device_lock'
  activeDeviceId: string; // UUID of the single authorized phone
  activeDeviceName: string; // Friendly name of current active phone/device
  authorizedPhone: string; // Strictly '0716235185'
  authorizedId: string; // Strictly '34233496'
  lastActiveAt: string; // ISO date
  registeredAt: string; // ISO date
  pendingChallenge?: OwnerOtpChallenge | null;
  lastOtpDispatchedTo?: string; // '0716235185'
}

export interface LoginResult {
  success: boolean;
  error?: string;
  session?: UserSession;
  requiresOtp?: boolean;
  challengeDetails?: {
    phone: string;
    targetDeviceId: string;
    expiresAt: number;
    dispatchedOtpPreview?: string; // Preview code for on-screen notification alert
  };
}

