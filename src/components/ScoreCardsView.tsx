import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ScoreCard, SubjectScore, AssessmentRecord } from '../types';
import {
  calculateCompetencyGrade,
  COMPETENCY_SCALE,
  calculateScoreCardVisualTrends,
  getGradeColor,
} from '../services/gradingService';
import { exportScoreCardPdf, exportAllGradeScoreCardsBatchPdf } from '../services/pdfService';
import { GradeBroadsheetView } from './GradeBroadsheetView';
import { SubjectScoresheetView } from './SubjectScoresheetView';
import {
  GraduationCap,
  Printer,
  Edit3,
  Save,
  Plus,
  Trash2,
  Award,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  X,
  HelpCircle,
  FileDown,
  Building,
  BookOpen,
  Table,
  Lock,
  Layers,
  Sparkles,
  ArrowUpRight,
  BarChart2,
} from 'lucide-react';
import crestImage from '../assets/images/school_crest_emblem_1792317813141.jpg';

interface ScoreCardsViewProps {
  initialLearnerId?: string;
}

export const ScoreCardsView: React.FC<ScoreCardsViewProps> = ({ initialLearnerId }) => {
  const {
    learners,
    scoreCards,
    saveScoreCard,
    currentUser,
    attendance,
    schoolProfile,
    assessments,
  } = useApp();

  const [wingFilter, setWingFilter] = useState<'all' | 'junior' | 'primary'>('all');

  const isLearnerJunior = (l: { grade: string }) => {
    const g = l.grade.toLowerCase();
    return g.includes('grade 7') || g.includes('grade 8') || g.includes('grade 9') || g.includes('junior') || g.includes('jss');
  };

  // Role-based accessible learners scoping
  const accessibleLearners = React.useMemo(() => {
    if (currentUser.role === 'parent') {
      return learners.filter((l) => l.id === currentUser.learnerId || l.parentId === currentUser.parentId);
    }
    if (currentUser.role === 'teacher' && currentUser.teacherType === 'class_teacher' && currentUser.teacherGrade) {
      // Class teacher has access to all learners in their represented grade
      return learners.filter((l) => l.grade === currentUser.teacherGrade);
    }
    return learners;
  }, [currentUser, learners]);

  const displayedLearners = React.useMemo(() => {
    return accessibleLearners.filter((l) => {
      if (wingFilter === 'junior') return isLearnerJunior(l);
      if (wingFilter === 'primary') return !isLearnerJunior(l);
      return true;
    });
  }, [accessibleLearners, wingFilter]);

  const defaultLearnerId = displayedLearners[0] ? displayedLearners[0].id : (accessibleLearners[0] ? accessibleLearners[0].id : '');

  const isPureSubjectTeacher =
    currentUser.role === 'teacher' &&
    currentUser.teacherType === 'subject_teacher' &&
    !currentUser.isOwner &&
    !['hoi', 'deputy_hoi', 'exam_council', 'senior_teacher'].includes(currentUser.ownerDesignation || '');

  const canAccessBroadsheet = !isPureSubjectTeacher && currentUser.role !== 'parent';

  const [viewMode, setViewMode] = useState<'broadsheet' | 'subject_scoresheet' | 'report_card'>(() => {
    if (initialLearnerId) return 'report_card';
    if (currentUser.role === 'parent') return 'report_card';
    if (isPureSubjectTeacher) return 'subject_scoresheet';
    return 'broadsheet';
  });

  const [selectedLearnerId, setSelectedLearnerId] = useState(defaultLearnerId);
  const [selectedTerm, setSelectedTerm] = useState('Term 1 - 2026');
  const [isEditing, setIsEditing] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [showGradingScaleModal, setShowGradingScaleModal] = useState(false);

  // Sync initialLearnerId when provided
  React.useEffect(() => {
    if (initialLearnerId) {
      setSelectedLearnerId(initialLearnerId);
      setViewMode('report_card');
    }
  }, [initialLearnerId]);

  // Sync selected learner if out of displayed bounds
  React.useEffect(() => {
    if (displayedLearners.length > 0 && !displayedLearners.some((l) => l.id === selectedLearnerId)) {
      setSelectedLearnerId(displayedLearners[0].id);
    }
  }, [displayedLearners, selectedLearnerId]);

  const activeLearner = learners.find((l) => l.id === selectedLearnerId);
  const activeIsJunior = activeLearner ? isLearnerJunior(activeLearner) : false;
  const activeWingName = activeIsJunior
    ? (schoolProfile?.juniorWingName || 'Mwivona Junior School')
    : (schoolProfile?.primaryWingName || 'Mwivona Primary School');

  // Active Assessment configuration for this Grade & Term
  const activeAssessment: AssessmentRecord | undefined = useMemo(() => {
    if (!activeLearner) return undefined;
    const found = assessments.find((a) => a.grade === activeLearner.grade && a.term === selectedTerm);
    if (found) return found;
    return {
      id: `assess-${activeLearner.grade.replace(/\s+/g, '_')}-${selectedTerm.replace(/\s+/g, '_')}`,
      name: `${selectedTerm} Summative Assessment 2026`,
      grade: activeLearner.grade,
      term: selectedTerm,
      academicYear: '2025/2026',
      type: 'End of Term Exam' as const,
      dateAdministered: '2026-04-01',
      deadline: '2026-04-05',
      status: 'published' as const,
      absentLearnerIds: [] as string[],
    };
  }, [assessments, activeLearner, selectedTerm]);

  // Find existing scorecard or scaffold one
  const existingScoreCard = scoreCards.find(
    (sc) => sc.learnerId === selectedLearnerId && sc.term === selectedTerm
  );

  // Exam absenteeism signal from class teacher or existing record
  const isLearnerAbsentForExam = useMemo(() => {
    if (!selectedLearnerId) return false;
    if (activeAssessment?.absentLearnerIds?.includes(selectedLearnerId)) return true;
    if (existingScoreCard?.isExamAbsent) return true;
    return false;
  }, [activeAssessment, selectedLearnerId, existingScoreCard]);

  // Permission helpers
  const canEditSubject = (sub: SubjectScore) => {
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'teacher') {
      if (currentUser.teacherType === 'class_teacher') {
        return (
          currentUser.registeredSubjects?.includes(sub.subjectName) ||
          sub.subjectTeacher === currentUser.name ||
          currentUser.teacherGrade === activeLearner?.grade
        );
      }
      if (currentUser.teacherType === 'subject_teacher') {
        return (
          currentUser.registeredSubjects?.includes(sub.subjectName) ||
          sub.subjectTeacher === currentUser.name
        );
      }
    }
    return false;
  };

  const canEditClassTeacherRemarks =
    currentUser.role === 'admin' ||
    (currentUser.role === 'teacher' &&
      currentUser.teacherType === 'class_teacher' &&
      currentUser.teacherGrade === activeLearner?.grade);

  const canEditPrincipalRemarks = currentUser.role === 'admin';

  // Calculate term attendance rate for this student
  const studentAttendance = attendance.filter((a) => a.learnerId === selectedLearnerId);
  const presentCount = studentAttendance.filter((a) => a.status === 'present' || a.status === 'late').length;
  const computedAttendanceRate =
    studentAttendance.length > 0 ? (presentCount / studentAttendance.length) * 100 : 96.5;

  const defaultJuniorSubjects: SubjectScore[] = [
    {
      id: 'sub-js-d901',
      subjectName: 'English Language',
      catScore: 26,
      midTermScore: 18,
      finalExamScore: 45,
      totalScore: 89,
      letterGrade: 'EE2',
      points: 7,
      teacherRemarks: 'Expressive functional writing, rich vocabulary and perceptive reading comprehension.',
      subjectTeacher: 'Ms. Clara Sterling',
    },
    {
      id: 'sub-js-d902',
      subjectName: 'Kiswahili Lugha',
      catScore: 25,
      midTermScore: 17,
      finalExamScore: 43,
      totalScore: 85,
      letterGrade: 'EE2',
      points: 7,
      teacherRemarks: 'Kusikiliza kwa makini, insha zenye mvuto, na ufasaha mzuri wa lugha.',
      subjectTeacher: 'Mwl. Otieno',
    },
    {
      id: 'sub-js-d903',
      subjectName: 'Mathematics',
      catScore: 27,
      midTermScore: 19,
      finalExamScore: 46,
      totalScore: 92,
      letterGrade: 'EE1',
      points: 8,
      teacherRemarks: 'Strong mathematical reasoning, algebra proficiency, and accurate problem solving.',
      subjectTeacher: 'Mr. Marcus Thorne',
    },
    {
      id: 'sub-js-d904',
      subjectName: 'Kenyan Sign Language',
      catScore: 26,
      midTermScore: 17,
      finalExamScore: 44,
      totalScore: 87,
      letterGrade: 'EE2',
      points: 7,
      teacherRemarks: 'Fluent visual signing, expressive gestures, and sharp spatial grammar.',
      subjectTeacher: 'Ms. Faith Mwende',
    },
    {
      id: 'sub-js-d905',
      subjectName: 'Integrated Science',
      catScore: 25,
      midTermScore: 17,
      finalExamScore: 43,
      totalScore: 85,
      letterGrade: 'EE2',
      points: 7,
      teacherRemarks: 'Active in science practicals, laboratory safety, and hypotheses formulation.',
      subjectTeacher: 'Dr. Arthur Pendelton',
    },
    {
      id: 'sub-js-d906',
      subjectName: 'Agriculture',
      catScore: 26,
      midTermScore: 17,
      finalExamScore: 44,
      totalScore: 87,
      letterGrade: 'EE2',
      points: 7,
      teacherRemarks: 'Demonstrates deep practical knowledge in kitchen gardening, crop care and soil preservation.',
      subjectTeacher: 'Mr. David Mutiso',
    },
    {
      id: 'sub-js-d907',
      subjectName: 'Social Studies',
      catScore: 24,
      midTermScore: 16,
      finalExamScore: 42,
      totalScore: 82,
      letterGrade: 'EE2',
      points: 7,
      teacherRemarks: 'Good grasp of geography, governance, civic duty, and African heritage.',
      subjectTeacher: 'Mrs. Hannah Vance',
    },
    {
      id: 'sub-js-d908',
      subjectName: 'CRE',
      catScore: 28,
      midTermScore: 18,
      finalExamScore: 45,
      totalScore: 91,
      letterGrade: 'EE1',
      points: 8,
      teacherRemarks: 'Exemplary moral integrity, scriptural understanding and constructive peer collaboration.',
      subjectTeacher: 'Rev. Daniel K.',
    },
    {
      id: 'sub-js-d909',
      subjectName: 'IRE',
      catScore: 26,
      midTermScore: 17,
      finalExamScore: 43,
      totalScore: 86,
      letterGrade: 'EE2',
      points: 7,
      teacherRemarks: 'Good understanding of Quranic teachings, Hadith and civic harmony.',
      subjectTeacher: 'Ustadh Ali Hassan',
    },
    {
      id: 'sub-js-d910',
      subjectName: 'HRE',
      catScore: 25,
      midTermScore: 17,
      finalExamScore: 43,
      totalScore: 85,
      letterGrade: 'EE2',
      points: 7,
      teacherRemarks: 'Respectful engagement with Vedic scriptures, moral values and environmental harmony.',
      subjectTeacher: 'Pandit Rajesh Sharma',
    },
    {
      id: 'sub-js-d911',
      subjectName: 'Creative Arts and Sports',
      catScore: 27,
      midTermScore: 18,
      finalExamScore: 46,
      totalScore: 91,
      letterGrade: 'EE1',
      points: 8,
      teacherRemarks: 'Outstanding creative musical talent, athletics engagement, and teamwork.',
      subjectTeacher: 'Mr. Kevin Ochieng',
    },
    {
      id: 'sub-js-d912',
      subjectName: 'Pre-Technical Studies',
      catScore: 28,
      midTermScore: 19,
      finalExamScore: 47,
      totalScore: 94,
      letterGrade: 'EE1',
      points: 8,
      teacherRemarks: 'Superb technical design, tools handling, and computer systems logic.',
      subjectTeacher: 'Mr. David Mutiso',
    },
  ];

  const defaultPrimarySubjects: SubjectScore[] = [
    {
      id: 'sub-pri-d601',
      subjectName: 'English Language',
      catScore: 25,
      midTermScore: 17,
      finalExamScore: 44,
      totalScore: 86,
      letterGrade: 'EE2',
      points: 7,
      teacherRemarks: 'Good vocabulary comprehension, reading fluency, and neat handwriting.',
      subjectTeacher: 'Ms. Clara Sterling',
    },
    {
      id: 'sub-pri-d602',
      subjectName: 'Kiswahili Lugha',
      catScore: 25,
      midTermScore: 17,
      finalExamScore: 42,
      totalScore: 84,
      letterGrade: 'EE2',
      points: 7,
      teacherRemarks: 'Kusoma kwa ufasaha, utunzi safi wa insha, na sarufi sahihi.',
      subjectTeacher: 'Mwl. Otieno',
    },
    {
      id: 'sub-pri-d603',
      subjectName: 'Mathematics',
      catScore: 26,
      midTermScore: 18,
      finalExamScore: 45,
      totalScore: 89,
      letterGrade: 'EE2',
      points: 7,
      teacherRemarks: 'Accurate in fractions, decimals, time, Kenyan currency, and spatial patterns.',
      subjectTeacher: 'Mr. Marcus Thorne',
    },
    {
      id: 'sub-pri-d604',
      subjectName: 'Science and Technology',
      catScore: 27,
      midTermScore: 18,
      finalExamScore: 46,
      totalScore: 91,
      letterGrade: 'EE1',
      points: 8,
      teacherRemarks: 'Enthusiastic project work on local plants, simple machines, and clean energy.',
      subjectTeacher: 'Dr. Arthur Pendelton',
    },
    {
      id: 'sub-pri-d605',
      subjectName: 'Agriculture',
      catScore: 26,
      midTermScore: 17,
      finalExamScore: 44,
      totalScore: 87,
      letterGrade: 'EE2',
      points: 7,
      teacherRemarks: 'Hands-on participation in school seedbed nursery and crop conservation.',
      subjectTeacher: 'Mr. David Mutiso',
    },
    {
      id: 'sub-pri-d606',
      subjectName: 'Social Studies',
      catScore: 24,
      midTermScore: 16,
      finalExamScore: 43,
      totalScore: 83,
      letterGrade: 'EE2',
      points: 7,
      teacherRemarks: 'Good understanding of national symbols, citizenship and Kenyan communities.',
      subjectTeacher: 'Mrs. Hannah Vance',
    },
    {
      id: 'sub-pri-d607',
      subjectName: 'CRE',
      catScore: 27,
      midTermScore: 18,
      finalExamScore: 45,
      totalScore: 90,
      letterGrade: 'EE1',
      points: 8,
      teacherRemarks: 'Biblical values, respect, honesty and excellent behavior in school.',
      subjectTeacher: 'Rev. Daniel K.',
    },
    {
      id: 'sub-pri-d608',
      subjectName: 'IRE',
      catScore: 25,
      midTermScore: 17,
      finalExamScore: 43,
      totalScore: 85,
      letterGrade: 'EE2',
      points: 7,
      teacherRemarks: 'Good moral etiquette, kindness, and mastery of fundamental Islamic principles.',
      subjectTeacher: 'Ustadh Ali Hassan',
    },
    {
      id: 'sub-pri-d609',
      subjectName: 'HRE',
      catScore: 25,
      midTermScore: 17,
      finalExamScore: 43,
      totalScore: 85,
      letterGrade: 'EE2',
      points: 7,
      teacherRemarks: 'Reverence for moral living, non-violence and mutual respect among peers.',
      subjectTeacher: 'Pandit Rajesh Sharma',
    },
    {
      id: 'sub-pri-d610',
      subjectName: 'Creative Arts',
      catScore: 26,
      midTermScore: 18,
      finalExamScore: 44,
      totalScore: 88,
      letterGrade: 'EE2',
      points: 7,
      teacherRemarks: 'Artistic talent in Kenyan beadwork, clay pottery, vocal folk tunes, and pattern design.',
      subjectTeacher: 'Mrs. Hannah Vance',
    },
    {
      id: 'sub-pri-d611',
      subjectName: 'Physical and Health Education PHE',
      catScore: 27,
      midTermScore: 18,
      finalExamScore: 45,
      totalScore: 90,
      letterGrade: 'EE1',
      points: 8,
      teacherRemarks: 'Agile athletics participation, sportsmanship, and personal hygiene habits.',
      subjectTeacher: 'Mr. Kevin Ochieng',
    },
    {
      id: 'sub-pri-d612',
      subjectName: 'Home Science',
      catScore: 26,
      midTermScore: 17,
      finalExamScore: 44,
      totalScore: 87,
      letterGrade: 'EE2',
      points: 7,
      teacherRemarks: 'Competent needlework skills, healthy cooking habits, and kitchen cleanliness.',
      subjectTeacher: 'Ms. Faith Mwende',
    },
  ];

  const defaultSubjects = activeIsJunior ? defaultJuniorSubjects : defaultPrimarySubjects;

  // Editable card buffer
  const [cardBuffer, setCardBuffer] = useState<ScoreCard>(() => {
    const isAbsent = Boolean(
      activeAssessment?.absentLearnerIds?.includes(selectedLearnerId) || existingScoreCard?.isExamAbsent
    );
    const absentReason =
      activeAssessment?.absentReasons?.[selectedLearnerId] ||
      existingScoreCard?.examAbsentReason ||
      (isAbsent ? 'Marked Absent by Class Teacher (Did Not Sit Exam)' : undefined);
    const assessName = activeAssessment?.name || existingScoreCard?.assessmentName || `${selectedTerm} Summative Assessment 2026`;

    if (existingScoreCard) {
      return {
        ...existingScoreCard,
        assessmentName: assessName,
        isExamAbsent: isAbsent,
        examAbsentReason: absentReason,
      };
    }
    const initialPoints = defaultSubjects.reduce((acc, curr) => acc + curr.points, 0);
    const totalMarks = defaultSubjects.reduce((acc, curr) => acc + curr.totalScore, 0);
    const maxPossibleMarks = defaultSubjects.length * 100;
    return {
      id: `sc-${selectedLearnerId}-${Date.now()}`,
      learnerId: selectedLearnerId,
      term: selectedTerm,
      academicYear: '2025/2026',
      issueDate: '2026-04-10',
      assessmentName: assessName,
      isExamAbsent: isAbsent,
      examAbsentReason: absentReason,
      status: 'published',
      attendancePercentage: computedAttendanceRate,
      totalMarks,
      maxPossibleMarks,
      averageScore: Number(((totalMarks / maxPossibleMarks) * 100).toFixed(1)),
      gpa: Number((initialPoints / defaultSubjects.length).toFixed(2)),
      classRank: 4,
      classSize: 28,
      classTeacherRemark: 'Hardworking and respectful learner with sustained academic growth in the Kenyan CBC curriculum.',
      principalRemark: `Commendable discipline and academic progress. Keep advancing ${activeWingName}.`,
      subjects: defaultSubjects,
    };
  });

  // Sync buffer when learner or term changes
  React.useEffect(() => {
    const isAbsent = Boolean(
      activeAssessment?.absentLearnerIds?.includes(selectedLearnerId) || existingScoreCard?.isExamAbsent
    );
    const absentReason =
      activeAssessment?.absentReasons?.[selectedLearnerId] ||
      existingScoreCard?.examAbsentReason ||
      (isAbsent ? 'Marked Absent by Class Teacher (Did Not Sit Exam)' : undefined);
    const assessName = activeAssessment?.name || existingScoreCard?.assessmentName || `${selectedTerm} Summative Assessment 2026`;

    if (existingScoreCard) {
      setCardBuffer({
        ...existingScoreCard,
        assessmentName: assessName,
        isExamAbsent: isAbsent,
        examAbsentReason: absentReason,
      });
    } else {
      const activeDefaults = activeIsJunior ? defaultJuniorSubjects : defaultPrimarySubjects;
      const initialPoints = activeDefaults.reduce((acc, curr) => acc + curr.points, 0);
      const totalMarks = activeDefaults.reduce((acc, curr) => acc + curr.totalScore, 0);
      const maxPossibleMarks = activeDefaults.length * 100;
      setCardBuffer({
        id: `sc-${selectedLearnerId}-${Date.now()}`,
        learnerId: selectedLearnerId,
        term: selectedTerm,
        academicYear: '2025/2026',
        issueDate: '2026-04-10',
        assessmentName: assessName,
        isExamAbsent: isAbsent,
        examAbsentReason: absentReason,
        status: 'published',
        attendancePercentage: computedAttendanceRate,
        totalMarks,
        maxPossibleMarks,
        averageScore: Number(((totalMarks / maxPossibleMarks) * 100).toFixed(1)),
        gpa: Number((initialPoints / activeDefaults.length).toFixed(2)),
        classRank: 4,
        classSize: 28,
        classTeacherRemark: 'Hardworking and respectful learner with sustained academic growth in the Kenyan CBC curriculum.',
        principalRemark: `Commendable discipline and academic progress. Keep advancing ${activeWingName}.`,
        subjects: activeDefaults,
      });
    }
    setIsEditing(false);
  }, [selectedLearnerId, selectedTerm, existingScoreCard, activeIsJunior, activeWingName, activeAssessment]);

  const handleSubjectChange = (
    index: number,
    field: keyof SubjectScore,
    value: string | number
  ) => {
    const updatedSubjects = [...cardBuffer.subjects];
    const item = { ...updatedSubjects[index], [field]: value };

    if (field === 'catScore' || field === 'midTermScore' || field === 'finalExamScore') {
      const cat = Number(field === 'catScore' ? value : item.catScore) || 0;
      const mid = Number(field === 'midTermScore' ? value : item.midTermScore) || 0;
      const fin = Number(field === 'finalExamScore' ? value : item.finalExamScore) || 0;
      const total = cat + mid + fin;
      const gradeResult = calculateCompetencyGrade(total);
      item.totalScore = total;
      item.letterGrade = gradeResult.grade;
      item.points = gradeResult.points;
    }

    updatedSubjects[index] = item;

    // Recalculate totals
    const totalMarks = updatedSubjects.reduce((acc, curr) => acc + curr.totalScore, 0);
    const maxPossible = updatedSubjects.length * 100;
    const averageScore = maxPossible > 0 ? (totalMarks / maxPossible) * 100 : 0;
    
    // Average points out of 8.0 scale
    const totalPoints = updatedSubjects.reduce((acc, curr) => acc + curr.points, 0);
    const gpa = updatedSubjects.length > 0 ? Number((totalPoints / updatedSubjects.length).toFixed(2)) : 0;

    setCardBuffer({
      ...cardBuffer,
      subjects: updatedSubjects,
      totalMarks,
      maxPossibleMarks: maxPossible,
      averageScore,
      gpa,
    });
  };

  const handleAddSubject = () => {
    const total = 81;
    const gradeResult = calculateCompetencyGrade(total);
    const newSub: SubjectScore = {
      id: `sub-${Date.now()}`,
      subjectName: 'French & Foreign Languages',
      catScore: 25,
      midTermScore: 16,
      finalExamScore: 40,
      totalScore: total,
      letterGrade: gradeResult.grade,
      points: gradeResult.points,
      teacherRemarks: 'Good vocabulary and oral pronunciation.',
      subjectTeacher: 'Mme. Dupont',
    };
    const updated = [...cardBuffer.subjects, newSub];
    const totalMarks = updated.reduce((acc, curr) => acc + curr.totalScore, 0);
    const maxPossible = updated.length * 100;
    const averageScore = (totalMarks / maxPossible) * 100;
    const totalPoints = updated.reduce((acc, curr) => acc + curr.points, 0);
    const gpa = Number((totalPoints / updated.length).toFixed(2));

    setCardBuffer({
      ...cardBuffer,
      subjects: updated,
      totalMarks,
      maxPossibleMarks: maxPossible,
      averageScore,
      gpa,
    });
  };

  const handleRemoveSubject = (index: number) => {
    const updated = cardBuffer.subjects.filter((_, i) => i !== index);
    const totalMarks = updated.reduce((acc, curr) => acc + curr.totalScore, 0);
    const maxPossible = updated.length * 100;
    const averageScore = maxPossible > 0 ? (totalMarks / maxPossible) * 100 : 0;
    const totalPoints = updated.reduce((acc, curr) => acc + curr.points, 0);
    const gpa = updated.length > 0 ? Number((totalPoints / updated.length).toFixed(2)) : 0;

    setCardBuffer({
      ...cardBuffer,
      subjects: updated,
      totalMarks,
      maxPossibleMarks: maxPossible,
      averageScore,
      gpa,
    });
  };

  const handleSave = () => {
    saveScoreCard(cardBuffer);
    setIsEditing(false);
  };

  const overallGradeInfo = calculateCompetencyGrade(cardBuffer.averageScore);

  // Compute rich visual trends for the active learner's scorecard
  const activeTrends = useMemo(() => {
    return calculateScoreCardVisualTrends(
      cardBuffer.subjects || [],
      cardBuffer.averageScore,
      activeLearner?.previousTermAverageScore
    );
  }, [cardBuffer, activeLearner]);

  // Batch Export State
  const [isGeneratingBatchPdf, setIsGeneratingBatchPdf] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  const handleExportBatchPdf = () => {
    if (!activeLearner) return;
    const targetGrade = activeLearner.grade;
    const gradeLearners = learners.filter((l) => l.grade === targetGrade);
    if (gradeLearners.length === 0) return;

    setIsGeneratingBatchPdf(true);
    setBatchProgress({ current: 0, total: gradeLearners.length });

    setTimeout(() => {
      try {
        exportAllGradeScoreCardsBatchPdf(
          schoolProfile,
          targetGrade,
          selectedTerm,
          gradeLearners,
          scoreCards,
          (cur, tot) => {
            setBatchProgress({ current: cur, total: tot });
          },
          activeAssessment
        );
      } finally {
        setTimeout(() => {
          setIsGeneratingBatchPdf(false);
          setBatchProgress(null);
        }, 800);
      }
    }, 120);
  };

  return (
    <div className="space-y-6">
      {/* Top View Mode Navigation Tabs */}
      <div className="bg-white rounded-xl p-2 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {canAccessBroadsheet && (
            <button
              onClick={() => setViewMode('broadsheet')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'broadsheet'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Table className="w-4 h-4" />
              <span>Grade Broadsheet (All Learning Areas)</span>
            </button>
          )}

          {isPureSubjectTeacher && (
            <div
              title="Restricted: Multi-subject broadsheets are reserved for Class Teachers, Exam Council, Senior Teachers, Deputy HOI & HOI."
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-200 cursor-not-allowed"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Grade Broadsheet (Restricted)</span>
            </div>
          )}

          {currentUser.role !== 'parent' && (
            <button
              onClick={() => setViewMode('subject_scoresheet')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'subject_scoresheet'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Subject Scoresheet (Single Subject)</span>
            </button>
          )}

          <button
            onClick={() => setViewMode('report_card')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'report_card'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Learner Report Card</span>
          </button>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600">
          <Award className="w-3.5 h-3.5 text-indigo-600" />
          <span>Kenyan CBC 8-Point Rubric (EE1–BE2)</span>
        </div>
      </div>

      {viewMode === 'broadsheet' && canAccessBroadsheet && (
        <GradeBroadsheetView
          onViewLearnerReportCard={(learnerId) => {
            setSelectedLearnerId(learnerId);
            setViewMode('report_card');
          }}
        />
      )}

      {viewMode === 'subject_scoresheet' && currentUser.role !== 'parent' && (
        <SubjectScoresheetView />
      )}

      {viewMode === 'report_card' && (
        <>
          {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Academic Assessment & Standards</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-indigo-700">8-Level Competency Grading Scale (EE1–BE2)</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Learner Score Cards & Competency Transcripts
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Subject evaluations scored on 8-point rubric: EE1 (8 pts), EE2 (7 pts), ME1 (6 pts), ME2 (5 pts), AE1 (4 pts), AE2 (3 pts), BE1 (2 pts), BE2 (1 pt).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => setShowGradingScaleModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>Rubric</span>
          </button>

          {(currentUser.role === 'admin' || currentUser.role === 'teacher') && (
            <button
              onClick={() => {
                if (isEditing) handleSave();
                else setIsEditing(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                isEditing
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-white hover:bg-slate-50 border border-slate-300 text-slate-700'
              }`}
            >
              {isEditing ? <Save className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5 text-slate-500" />}
              <span>{isEditing ? 'Save Card' : 'Edit Marks'}</span>
            </button>
          )}

          <button
            onClick={() => {
              const exportCard: ScoreCard = {
                ...cardBuffer,
                assessmentName: activeAssessment?.name || cardBuffer.assessmentName,
                isExamAbsent: isLearnerAbsentForExam,
                examAbsentReason: activeAssessment?.absentReasons?.[selectedLearnerId] || cardBuffer.examAbsentReason,
              };
              exportScoreCardPdf(exportCard, activeLearner, schoolProfile);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs"
            title="Download this learner's assessment form as a strict 1-page A4 PDF"
          >
            <FileDown className="w-3.5 h-3.5 text-indigo-600" />
            <span>Download 1-Page PDF</span>
          </button>

          {currentUser.role !== 'parent' && (
            <button
              onClick={handleExportBatchPdf}
              disabled={isGeneratingBatchPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              title="Generate a single combined PDF containing all 1-page A4 assessment forms for this entire grade cohort"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>
                {isGeneratingBatchPdf
                  ? `Generating ${batchProgress?.current || 0}/${batchProgress?.total || 0}...`
                  : 'Print All in Grade (1 PDF)'}
              </span>
            </button>
          )}

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Official Print Preview</span>
          </button>
        </div>
      </div>


      {/* Wing Filter & Selectors Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
        {/* Wing Filter Toggle (Primary School vs Junior School) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Filter Section:</span>
            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 text-xs">
              <button
                onClick={() => setWingFilter('all')}
                className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  wingFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Learners ({accessibleLearners.length})
              </button>
              <button
                onClick={() => setWingFilter('junior')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  wingFilter === 'junior'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Junior School (Grades 7–9)</span>
              </button>
              <button
                onClick={() => setWingFilter('primary')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  wingFilter === 'primary'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Primary School (Grades 1–6)</span>
              </button>
            </div>
          </div>

          {/* Active Learner Wing Badge */}
          {activeLearner && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold border ${
              activeIsJunior 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-900' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <Building className="w-3.5 h-3.5" />
              <span>Report Heading: <strong>{activeWingName}</strong></span>
              <span className="text-[10px] opacity-75 font-mono">({activeLearner.grade})</span>
            </div>
          )}
        </div>

        {/* Student & Term Selectors */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">
              Select Learner:
            </label>
            <select
              value={selectedLearnerId}
              disabled={currentUser.role === 'parent'}
              onChange={(e) => setSelectedLearnerId(e.target.value)}
              className="text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60 cursor-pointer min-w-64"
            >
              {displayedLearners.map((learner) => {
                const isJun = isLearnerJunior(learner);
                return (
                  <option key={learner.id} value={learner.id}>
                    [{isJun ? 'Junior' : 'Primary'}] {learner.firstName} {learner.lastName} ({learner.studentId} · {learner.grade})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Term Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
            {['Term 1 - 2026', 'Term 2 - 2026', 'Term 3 - 2026'].map((term) => (
              <button
                key={term}
                onClick={() => setSelectedTerm(term)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  selectedTerm === term
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Assessment Context Banner */}
      <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
        isLearnerAbsentForExam
          ? 'bg-rose-50 border-rose-200 text-rose-950'
          : 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isLearnerAbsentForExam ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'
          }`}>
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Evaluation Assessment:
              </span>
              <span className="font-extrabold text-sm text-slate-900">
                {activeAssessment?.name || cardBuffer.assessmentName || `${selectedTerm} Summative Assessment 2026`}
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase border ${
                activeAssessment?.status === 'published'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : activeAssessment?.status === 'requested'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-indigo-100 text-indigo-800 border-indigo-300'
              }`}>
                {activeAssessment?.status ? activeAssessment.status.replace('_', ' ') : 'Published'}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Grade Level: <strong>{activeLearner?.grade || 'Current Grade'}</strong> · Academic Term: <strong>{selectedTerm}</strong>
              {activeAssessment?.deadline && (
                <span> · Marks Submission Deadline: <strong className="font-mono">{activeAssessment.deadline}</strong></span>
              )}
            </p>
          </div>
        </div>

        {isLearnerAbsentForExam ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-100 border border-rose-300 rounded-lg text-rose-900 text-xs font-semibold self-stretch sm:self-auto justify-center">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
            <span>EXAM STATUS: ABSENT (Did Not Sit Exam)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <CalendarCheck className="w-4 h-4 text-emerald-600" />
            <span>Regular Exam Candidate</span>
          </div>
        )}
      </div>

      {/* Prominent Absentee Warning if Learner Did Not Sit Assessment */}
      {isLearnerAbsentForExam && (
        <div className="bg-rose-50 border-l-4 border-rose-600 p-4 rounded-xl shadow-xs flex items-start gap-3">
          <div className="p-1.5 bg-rose-100 rounded-lg text-rose-700 shrink-0 mt-0.5">
            <X className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wide">
              Learner Exam Absentee Notice (Status: DNS · Did Not Sit)
            </h4>
            <p className="text-xs text-rose-800 mt-1 leading-relaxed">
              This learner was marked <strong>Absent</strong> by the class teacher during the administration of{' '}
              <strong>{activeAssessment?.name || cardBuffer.assessmentName || 'this assessment'}</strong>.
              Reason recorded:{' '}
              <span className="italic font-medium">"{cardBuffer.examAbsentReason || activeAssessment?.absentReasons?.[selectedLearnerId] || 'Absent during exam session'}"</span>.
            </p>
            <p className="text-[11px] text-rose-700 mt-1 font-mono">
              Notice: As per Kenyan CBA guidelines, absent candidates are assigned DNS (Did Not Sit) across all learning areas and are excluded from class ranking and cohort mean computations.
            </p>
          </div>
        </div>
      )}

      {/* High-Level Academic KPI Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] text-slate-500 block uppercase font-medium">Mean Mark</span>
          <div className={`text-2xl font-bold font-mono tabular-nums ${
            isLearnerAbsentForExam ? 'text-rose-600' : 'text-indigo-700'
          }`}>
            {isLearnerAbsentForExam ? 'DNS' : `${cardBuffer.averageScore.toFixed(1)}%`}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            {isLearnerAbsentForExam
              ? 'Did Not Sit Exam'
              : `${cardBuffer.totalMarks} / ${cardBuffer.maxPossibleMarks} points`}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] text-slate-500 block uppercase font-medium">Mean Competency Points</span>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums flex items-baseline gap-1">
            {isLearnerAbsentForExam ? (
              <span className="text-rose-600">DNS</span>
            ) : (
              <>
                <span>{cardBuffer.gpa.toFixed(2)}</span>
                <span className="text-xs text-slate-400 font-normal">/ 8.0</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border ${
              isLearnerAbsentForExam
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : overallGradeInfo.badgeClass
            }`}>
              {isLearnerAbsentForExam ? 'DNS' : overallGradeInfo.grade}
            </span>
            <span className="text-[11px] text-slate-600 truncate">
              {isLearnerAbsentForExam ? 'Did Not Sit' : overallGradeInfo.label}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] text-slate-500 block uppercase font-medium">Class Standing</span>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {isLearnerAbsentForExam ? (
              <span className="text-rose-600 text-xl font-bold">DNS</span>
            ) : (
              `Rank #${cardBuffer.classRank}`
            )}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            {isLearnerAbsentForExam ? 'Excluded from ranking' : `Out of ${cardBuffer.classSize} students`}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] text-slate-500 block uppercase font-medium">Term Attendance</span>
          <div className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
            {cardBuffer.attendancePercentage.toFixed(1)}%
          </div>
          <span className="text-xs text-emerald-600 mt-1 block font-medium">Regular attendance</span>
        </div>
      </div>

      {/* VISUAL TRENDS & CBC COMPETENCY PROFILE DASHBOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trajectory Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span className="font-bold text-slate-900 text-xs">Academic Trajectory &amp; Growth</span>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                activeTrends.isPositiveDelta
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {activeTrends.deltaPercentageStr} {activeTrends.isPositiveDelta ? '▲ Upward' : '▼ Need Guidance'}
            </span>
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Previous Term Baseline:</span>
              <span className="font-mono font-bold text-slate-700">{activeTrends.previousScore.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Current Term Average:</span>
              <span className="font-mono font-bold text-indigo-700 text-sm">{activeTrends.currentScore.toFixed(1)}%</span>
            </div>

            {/* Visual Trajectory Progress Track */}
            <div className="relative pt-2">
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${Math.min(100, Math.max(10, activeTrends.currentScore))}%` }}
                  className={`h-full rounded-full transition-all duration-500 ${
                    activeTrends.isPositiveDelta ? 'bg-emerald-500' : 'bg-indigo-500'
                  }`}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                <span>0%</span>
                <span className="text-slate-500 font-bold">Standard 50%</span>
                <span className="text-indigo-600 font-bold">Current: {activeTrends.currentScore.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">{activeTrends.trajectoryLabel}</span>
          </div>
        </div>

        {/* CBC Competency Distribution Balance */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-600" />
              <span className="font-bold text-slate-900 text-xs">CBC Competency Balance</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              {cardBuffer.subjects.length} Learning Areas
            </span>
          </div>

          {/* Segmented Visual Stacked Bar */}
          <div className="mt-3">
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100">
              {cardBuffer.subjects.length > 0 && (
                <>
                  <div
                    style={{ width: `${(activeTrends.categoryCounts.EE / cardBuffer.subjects.length) * 100}%` }}
                    className="bg-emerald-500 h-full"
                    title={`Exceeding (EE): ${activeTrends.categoryCounts.EE}`}
                  />
                  <div
                    style={{ width: `${(activeTrends.categoryCounts.ME / cardBuffer.subjects.length) * 100}%` }}
                    className="bg-blue-500 h-full"
                    title={`Meeting (ME): ${activeTrends.categoryCounts.ME}`}
                  />
                  <div
                    style={{ width: `${(activeTrends.categoryCounts.AE / cardBuffer.subjects.length) * 100}%` }}
                    className="bg-amber-500 h-full"
                    title={`Approaching (AE): ${activeTrends.categoryCounts.AE}`}
                  />
                  <div
                    style={{ width: `${(activeTrends.categoryCounts.BE / cardBuffer.subjects.length) * 100}%` }}
                    className="bg-rose-500 h-full"
                    title={`Below (BE): ${activeTrends.categoryCounts.BE}`}
                  />
                </>
              )}
            </div>

            <div className="grid grid-cols-4 gap-1.5 mt-3 text-center">
              <div className="p-1.5 rounded bg-emerald-50 border border-emerald-100">
                <span className="text-[10px] text-emerald-800 font-bold block">EE</span>
                <span className="text-sm font-bold font-mono text-emerald-700">{activeTrends.categoryCounts.EE}</span>
              </div>
              <div className="p-1.5 rounded bg-blue-50 border border-blue-100">
                <span className="text-[10px] text-blue-800 font-bold block">ME</span>
                <span className="text-sm font-bold font-mono text-blue-700">{activeTrends.categoryCounts.ME}</span>
              </div>
              <div className="p-1.5 rounded bg-amber-50 border border-amber-100">
                <span className="text-[10px] text-amber-800 font-bold block">AE</span>
                <span className="text-sm font-bold font-mono text-amber-700">{activeTrends.categoryCounts.AE}</span>
              </div>
              <div className="p-1.5 rounded bg-rose-50 border border-rose-100">
                <span className="text-[10px] text-rose-800 font-bold block">BE</span>
                <span className="text-sm font-bold font-mono text-rose-700">{activeTrends.categoryCounts.BE}</span>
              </div>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            Overall Standing: <strong className="text-slate-800">{overallGradeInfo.grade}</strong> ({overallGradeInfo.label})
          </div>
        </div>

        {/* Spotlight Strengths & Priority Growth */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600" />
              <span className="font-bold text-slate-900 text-xs">Subject Strengths &amp; Growth</span>
            </div>
            <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
              Personalized
            </span>
          </div>

          <div className="space-y-2 mt-3 text-xs">
            {activeTrends.topStrengthSubject && (
              <div className="p-2 rounded-lg bg-emerald-50/80 border border-emerald-200 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">★ Core Strength</span>
                  <span className="font-bold text-slate-900 truncate block max-w-44">
                    {activeTrends.topStrengthSubject.name}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    {activeTrends.topStrengthSubject.score}%
                  </span>
                  <span className="block text-[10px] font-mono font-bold text-emerald-800">
                    {activeTrends.topStrengthSubject.grade}
                  </span>
                </div>
              </div>
            )}

            {activeTrends.priorityGrowthSubject && (
              <div className="p-2 rounded-lg bg-indigo-50/80 border border-indigo-200 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-indigo-800 uppercase block">Target Focus Area</span>
                  <span className="font-bold text-slate-900 truncate block max-w-44">
                    {activeTrends.priorityGrowthSubject.name}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-indigo-700 text-sm">
                    {activeTrends.priorityGrowthSubject.score}%
                  </span>
                  <span className="block text-[10px] font-mono font-bold text-indigo-800">
                    {activeTrends.priorityGrowthSubject.grade}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            Cohort Rank: <strong>Rank #{cardBuffer.classRank}</strong> of {cardBuffer.classSize} students
          </div>
        </div>
      </div>

      {/* Subject Scores Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Curriculum Competency Subject Performance · {selectedTerm}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                With Visual Trends
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Evaluated on 8-level competency rubric: EE1 (8 pts), EE2 (7 pts), ME1 (6 pts), ME2 (5 pts), AE1 (4 pts), AE2 (3 pts), BE1 (2 pts), BE2 (1 pt)
            </p>
          </div>

          {isEditing && (
            <button
              onClick={handleAddSubject}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Subject</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-2.5 px-4">Subject</th>
                <th className="py-2.5 px-3 text-right">CAT (/30)</th>
                <th className="py-2.5 px-3 text-right">Midterm (/20)</th>
                <th className="py-2.5 px-3 text-right">Final Exam (/50)</th>
                <th className="py-2.5 px-3 text-right">Total (/100)</th>
                <th className="py-2.5 px-3 text-left">Score Visual Trend</th>
                <th className="py-2.5 px-3 text-center">Competency Grade</th>
                <th className="py-2.5 px-3 text-center">Points (/8)</th>
                <th className="py-2.5 px-4">Subject Teacher Remarks</th>
                {isEditing && <th className="py-2.5 px-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cardBuffer.subjects.map((sub, idx) => {
                const gradeInfo = calculateCompetencyGrade(sub.totalScore);
                const gradeColor = getGradeColor(gradeInfo.grade);
                return (
                  <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {isEditing ? (
                        <input
                          type="text"
                          value={sub.subjectName}
                          onChange={(e) => handleSubjectChange(idx, 'subjectName', e.target.value)}
                          className="p-1 border border-slate-200 rounded text-xs w-full max-w-xs font-semibold"
                        />
                      ) : (
                        <div>
                          <div>{sub.subjectName}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            Instructor: {sub.subjectTeacher}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* CAT */}
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          max="30"
                          value={sub.catScore}
                          onChange={(e) => handleSubjectChange(idx, 'catScore', Number(e.target.value))}
                          className="p-1 border border-slate-200 rounded text-xs w-14 text-right font-mono"
                        />
                      ) : isLearnerAbsentForExam ? (
                        <span className="text-rose-600 font-bold">DNS</span>
                      ) : (
                        sub.catScore
                      )}
                    </td>

                    {/* Midterm */}
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={sub.midTermScore}
                          onChange={(e) => handleSubjectChange(idx, 'midTermScore', Number(e.target.value))}
                          className="p-1 border border-slate-200 rounded text-xs w-14 text-right font-mono"
                        />
                      ) : isLearnerAbsentForExam ? (
                        <span className="text-rose-600 font-bold">DNS</span>
                      ) : (
                        sub.midTermScore
                      )}
                    </td>

                    {/* Final Exam */}
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={sub.finalExamScore}
                          onChange={(e) => handleSubjectChange(idx, 'finalExamScore', Number(e.target.value))}
                          className="p-1 border border-slate-200 rounded text-xs w-14 text-right font-mono"
                        />
                      ) : isLearnerAbsentForExam ? (
                        <span className="text-rose-600 font-bold">DNS</span>
                      ) : (
                        sub.finalExamScore
                      )}
                    </td>

                    {/* Total */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-indigo-700 tabular-nums">
                      {isLearnerAbsentForExam ? (
                        <span className="text-rose-600 font-bold">DNS</span>
                      ) : (
                        sub.totalScore
                      )}
                    </td>

                    {/* Visual Score Trend Bar */}
                    <td className="py-3 px-3">
                      {isLearnerAbsentForExam ? (
                        <div className="w-28 text-center text-[10px] font-mono text-rose-600 font-bold bg-rose-50 border border-rose-200 py-0.5 rounded">
                          Did Not Sit (DNS)
                        </div>
                      ) : (
                        <div className="w-28">
                          <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                            <span className="font-bold text-slate-700">{sub.totalScore}%</span>
                            <span className={`px-1 rounded font-bold text-[9px] border ${gradeInfo.badgeClass}`}>
                              {gradeInfo.grade}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              style={{
                                width: `${Math.min(100, Math.max(5, sub.totalScore))}%`,
                                backgroundColor: gradeColor.hex,
                              }}
                              className="h-full rounded-full transition-all duration-300"
                            />
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Competency Grade (EE1–BE2) */}
                    <td className="py-3 px-3 text-center">
                      {isLearnerAbsentForExam ? (
                        <span className="inline-block font-mono font-bold px-2 py-0.5 rounded text-xs border bg-rose-100 text-rose-800 border-rose-300">
                          DNS
                        </span>
                      ) : (
                        <span
                          className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-xs border ${gradeInfo.badgeClass}`}
                          title={`${gradeInfo.label} (${gradeInfo.condition})`}
                        >
                          {gradeInfo.grade}
                        </span>
                      )}
                    </td>

                    {/* Points (/8) */}
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-800 tabular-nums">
                      {isLearnerAbsentForExam ? (
                        <span className="text-rose-600 font-bold">0 pts</span>
                      ) : (
                        `${gradeInfo.points} pts`
                      )}
                    </td>

                    {/* Remarks */}
                    <td className="py-3 px-4 text-slate-600">
                      {isEditing ? (
                        <input
                          type="text"
                          value={sub.teacherRemarks}
                          onChange={(e) => handleSubjectChange(idx, 'teacherRemarks', e.target.value)}
                          className="p-1 border border-slate-200 rounded text-xs w-full"
                        />
                      ) : isLearnerAbsentForExam ? (
                        <span className="text-rose-700 italic text-[11px]">
                          Did Not Sit (DNS) — Marked absent during exam sitting.
                        </span>
                      ) : (
                        sub.teacherRemarks
                      )}
                    </td>

                    {/* Delete Subject if Editing */}
                    {isEditing && (
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleRemoveSubject(idx)}
                          className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Teacher and Principal Feedback Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2 text-xs">
          <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">
            Class Teacher Remark
          </span>
          {isEditing ? (
            <textarea
              rows={3}
              value={cardBuffer.classTeacherRemark}
              onChange={(e) => setCardBuffer({ ...cardBuffer, classTeacherRemark: e.target.value })}
              className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          ) : (
            <p className="text-slate-800 italic leading-relaxed">
              "{cardBuffer.classTeacherRemark}"
            </p>
          )}
          <p className="text-[11px] font-semibold text-slate-500">
            — Mr. Marcus Thorne, Class Tutor
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2 text-xs">
          <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">
            Principal / Head of School Assessment
          </span>
          {isEditing ? (
            <textarea
              rows={3}
              value={cardBuffer.principalRemark}
              onChange={(e) => setCardBuffer({ ...cardBuffer, principalRemark: e.target.value })}
              className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          ) : (
            <p className="text-slate-800 italic leading-relaxed">
              "{cardBuffer.principalRemark}"
            </p>
          )}
          <p className="text-[11px] font-semibold text-slate-500">
            — Dr. Evelyn Vance, Head of School
          </p>
        </div>
      </div>

      {/* Official Printable Score Card Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* Action Bar (no-print) */}
            <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 no-print flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">Official Report Card Document:</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {activeWingName}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Strictly 1-Page A4
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => exportScoreCardPdf(cardBuffer, activeLearner, schoolProfile)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors cursor-pointer shadow-xs"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Download 1-Page PDF</span>
                </button>
                {currentUser.role !== 'parent' && (
                  <button
                    onClick={handleExportBatchPdf}
                    disabled={isGeneratingBatchPdf}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>
                      {isGeneratingBatchPdf
                        ? `Generating ${batchProgress?.current || 0}/${batchProgress?.total || 0}...`
                        : 'Print All in Grade (1 PDF)'}
                    </span>
                  </button>
                )}
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Form</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Print Container */}
            <div id="printable-area" className="p-6 space-y-4 overflow-y-auto text-xs text-slate-900 bg-white print:p-0 print:space-y-3">
              <style>{`
                @media print {
                  @page {
                    size: A4 portrait;
                    margin: 0.2in;
                  }
                  body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                  }
                  .no-print {
                    display: none !important;
                  }
                  #printable-area {
                    padding: 0 !important;
                    margin: 0 !important;
                    overflow: visible !important;
                    width: 100% !important;
                  }
                }
              `}</style>

              {/* Official Academic Header - Bearing distinct wing name */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={crestImage}
                    alt="School Crest"
                    className="w-14 h-14 object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h1 className="text-lg font-extrabold tracking-tight text-slate-900 uppercase">
                      {activeWingName}
                    </h1>
                    <p className="text-xs font-semibold text-indigo-800">
                      {schoolProfile.name} · {activeIsJunior ? 'Junior Secondary Wing (KJSEA Formative Assessment)' : 'Primary School Wing (KPSEA Formative Assessment)'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      MoE/KNEC Center Registration: {schoolProfile.registrationNumber} · {schoolProfile.county}, {schoolProfile.subCounty}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-indigo-800 block uppercase">
                    {activeIsJunior ? 'KJSEA Junior School Assessment Form' : 'KPSEA Primary School Progress Form'}
                  </span>
                  <span className="text-xs font-bold text-indigo-900 block bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 mt-0.5">
                    {activeAssessment?.name || cardBuffer.assessmentName || `${selectedTerm} Summative Assessment 2026`}
                  </span>
                  <span className="text-xs text-slate-700 block font-semibold mt-0.5">{selectedTerm}</span>
                  <span className="text-[10px] text-slate-500 block">
                    Issued: {cardBuffer.issueDate}
                  </span>
                </div>
              </div>

              {/* Student Metadata Strip */}
              {activeLearner && (
                <div className="grid grid-cols-4 gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs">
                  <div>
                    <span className="text-[9px] uppercase font-semibold text-slate-400 block">
                      Learner Full Name
                    </span>
                    <span className="font-bold text-slate-900 text-xs">
                      {activeLearner.firstName} {activeLearner.lastName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-semibold text-slate-400 block">
                      Student UPI / ID
                    </span>
                    <span className="font-mono font-semibold text-slate-800 text-xs">
                      {activeLearner.studentId}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-semibold text-slate-400 block">
                      Section &amp; Class
                    </span>
                    <span className="font-bold text-indigo-700 text-xs">{activeWingName} · {activeLearner.grade}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-semibold text-slate-400 block">
                      Class Rank &amp; Attendance
                    </span>
                    <span className={`font-mono font-bold text-xs ${isLearnerAbsentForExam ? 'text-rose-700' : 'text-slate-800'}`}>
                      {isLearnerAbsentForExam ? 'DNS (Did Not Sit Exam)' : `Rank #${cardBuffer.classRank}`} · {cardBuffer.attendancePercentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Prominent Absentee Alert Banner for Exam Attendance */}
              {isLearnerAbsentForExam && (
                <div className="p-2.5 bg-rose-50 border-2 border-rose-300 rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-bold font-mono text-[10px] bg-rose-700 text-white">
                      EXAM SITTING STATUS: ABSENT (DNS)
                    </span>
                    <span className="font-semibold text-rose-900 text-xs">
                      {cardBuffer.examAbsentReason || activeAssessment?.absentReasons?.[selectedLearnerId] || 'Marked Absent by Class Teacher'} · Did Not Sit for this Examination
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-rose-700 font-bold">
                    Excluded from Class Standing &amp; Mean Calculation
                  </span>
                </div>
              )}

              {/* Printable Visual Trajectory & Competency Profile Strip */}
              <div className="p-2.5 bg-indigo-50/60 border border-indigo-200 rounded-lg flex items-center justify-between text-xs flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-indigo-900 text-[11px]">Academic Trajectory:</span>
                  <span className="text-slate-700">Prev: {activeTrends.previousScore.toFixed(1)}% ➔ Curr: <strong>{activeTrends.currentScore.toFixed(1)}%</strong></span>
                  <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                    activeTrends.isPositiveDelta ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {activeTrends.deltaPercentageStr} {activeTrends.isPositiveDelta ? '▲' : '▼'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-slate-500">Balance:</span>
                  <span className="font-bold text-emerald-700">{activeTrends.categoryCounts.EE} EE</span>
                  <span className="text-slate-300">·</span>
                  <span className="font-bold text-blue-700">{activeTrends.categoryCounts.ME} ME</span>
                  <span className="text-slate-300">·</span>
                  <span className="font-bold text-amber-700">{activeTrends.categoryCounts.AE} AE</span>
                  <span className="text-slate-300">·</span>
                  <span className="font-bold text-rose-700">{activeTrends.categoryCounts.BE} BE</span>
                </div>
              </div>

              {/* Grade Table with Visual Progress Bar & Full Unclipped Remarks */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-[10px] uppercase font-semibold text-slate-700">
                    <tr>
                      <th className="py-1.5 px-3">Subject / Academic Area</th>
                      <th className="py-1.5 px-2 text-right">CAT (30)</th>
                      <th className="py-1.5 px-2 text-right">Mid (20)</th>
                      <th className="py-1.5 px-2 text-right">Exam (50)</th>
                      <th className="py-1.5 px-2 text-right">Total (100)</th>
                      <th className="py-1.5 px-2 text-left">Score Visual Trend</th>
                      <th className="py-1.5 px-2 text-center">Grade</th>
                      <th className="py-1.5 px-2 text-center">Points</th>
                      <th className="py-1.5 px-3 text-left min-w-56">Teacher Remarks &amp; Observations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {cardBuffer.subjects.map((s) => {
                      const g = calculateCompetencyGrade(s.totalScore);
                      const gCol = getGradeColor(g.grade);
                      return (
                        <tr key={s.id}>
                          <td className="py-2 px-3 font-semibold text-slate-900 whitespace-nowrap">{s.subjectName}</td>
                          <td className="py-2 px-2 text-right font-mono tabular-nums text-slate-600">
                            {isLearnerAbsentForExam ? <span className="text-rose-600 font-bold">DNS</span> : s.catScore}
                          </td>
                          <td className="py-2 px-2 text-right font-mono tabular-nums text-slate-600">
                            {isLearnerAbsentForExam ? <span className="text-rose-600 font-bold">DNS</span> : s.midTermScore}
                          </td>
                          <td className="py-2 px-2 text-right font-mono tabular-nums text-slate-600">
                            {isLearnerAbsentForExam ? <span className="text-rose-600 font-bold">DNS</span> : s.finalExamScore}
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-bold text-slate-900 tabular-nums">
                            {isLearnerAbsentForExam ? <span className="text-rose-600 font-bold">DNS</span> : s.totalScore}
                          </td>
                          <td className="py-2 px-2">
                            {isLearnerAbsentForExam ? (
                              <span className="text-[10px] font-mono text-rose-600 font-bold">Did Not Sit</span>
                            ) : (
                              <div className="w-24">
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
                                  <div
                                    style={{
                                      width: `${Math.min(100, Math.max(5, s.totalScore))}%`,
                                      backgroundColor: gCol.hex,
                                    }}
                                    className="h-full rounded-full"
                                  />
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center font-mono font-bold text-indigo-700">
                            {isLearnerAbsentForExam ? (
                              <span className="text-rose-600 font-bold">DNS</span>
                            ) : (
                              g.grade
                            )}
                          </td>
                          <td className="py-2 px-2 text-center font-mono font-bold text-slate-800">
                            {isLearnerAbsentForExam ? (
                              <span className="text-rose-600 font-bold">0</span>
                            ) : (
                              g.points
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-700 text-[10.5px] leading-snug whitespace-normal break-words">
                            {isLearnerAbsentForExam ? (
                              <span className="text-rose-700 italic">Did Not Sit (DNS) — Candidate absent during examination session.</span>
                            ) : (
                              s.teacherRemarks
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary Metrics Strip */}
              <div className="grid grid-cols-4 gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-semibold block">Total Marks</span>
                  <span className={`text-sm font-bold font-mono tabular-nums ${isLearnerAbsentForExam ? 'text-rose-600' : 'text-slate-900'}`}>
                    {isLearnerAbsentForExam ? 'DNS' : `${cardBuffer.totalMarks} / ${cardBuffer.maxPossibleMarks}`}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-semibold block">Mean Percentage</span>
                  <span className={`text-sm font-bold font-mono tabular-nums ${isLearnerAbsentForExam ? 'text-rose-600' : 'text-indigo-700'}`}>
                    {isLearnerAbsentForExam ? 'DNS' : `${cardBuffer.averageScore.toFixed(1)}%`}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-semibold block">Competency GPA</span>
                  <span className={`text-sm font-bold font-mono tabular-nums ${isLearnerAbsentForExam ? 'text-rose-600' : 'text-slate-900'}`}>
                    {isLearnerAbsentForExam ? 'DNS / 8.0 (DNS)' : `${cardBuffer.gpa.toFixed(2)} / 8.0 (${overallGradeInfo.grade})`}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-semibold block">Attendance Rate</span>
                  <span className="text-sm font-bold font-mono text-emerald-700 tabular-nums">
                    {cardBuffer.attendancePercentage.toFixed(1)}%
                  </span>
                </div>
              </div>


              {/* 8-Tier Grading Rubric Legend Table */}
              <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-lg text-[10px] text-slate-600 space-y-1.5">
                <span className="font-bold text-slate-800 block text-[11px]">
                  Institutional 8-Level Competency Grading Scale Rubric:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-[10px]">
                  {COMPETENCY_SCALE.map((lvl) => (
                    <div key={lvl.grade} className="p-1.5 bg-white border border-slate-200 rounded">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>{lvl.grade} ({lvl.points} pts)</span>
                        <span className="text-indigo-600 text-[9px]">{lvl.condition}</span>
                      </div>
                      <div className="text-[9px] text-slate-500 truncate">{lvl.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Remarks and Official Signatures - Fully Accommodating All Remarks */}
              <div className="space-y-3 pt-2">
                <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                  <span className="text-[10px] uppercase font-bold text-slate-600 block">
                    Class Teacher's Evaluative Remarks &amp; Observations
                  </span>
                  <p className="text-slate-900 italic mt-1 leading-relaxed text-xs break-words font-medium">
                    "{cardBuffer.classTeacherRemark}"
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                    — Mr. Marcus Thorne, Class Tutor
                  </p>
                </div>

                <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                  <span className="text-[10px] uppercase font-bold text-slate-600 block">
                    Principal &amp; Head of Institution Comments &amp; Endorsement
                  </span>
                  <p className="text-slate-900 italic mt-1 leading-relaxed text-xs break-words font-medium">
                    "{cardBuffer.principalRemark}"
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                    — Dr. Evelyn Vance, Head of Institution ({activeWingName})
                  </p>
                </div>

                {/* Signature Lines with Digital Signatures */}
                <div className="pt-4 grid grid-cols-3 gap-6 text-[11px]">
                  <div>
                    <div className="h-10 flex items-end pb-1">
                      {schoolProfile.signatures?.['class_teacher']?.signatureDataUrl ? (
                        <img
                          src={schoolProfile.signatures['class_teacher'].signatureDataUrl}
                          alt="Tutor Signature"
                          className="max-h-10 object-contain"
                        />
                      ) : null}
                    </div>
                    <div className="border-b border-slate-400 mb-1"></div>
                    <p className="font-semibold text-slate-800">
                      {schoolProfile.signatures?.['class_teacher']?.signatoryName || 'Mr. Marcus Thorne'}
                    </p>
                    <p className="text-slate-400 text-[10px]">
                      {schoolProfile.signatures?.['class_teacher']?.roleTitle || 'Class Tutor Signature'}
                    </p>
                  </div>
                  <div>
                    <div className="h-10 flex items-end pb-1">
                      {schoolProfile.signatures?.['hoi']?.signatureDataUrl ? (
                        <img
                          src={schoolProfile.signatures['hoi'].signatureDataUrl}
                          alt="Principal Signature"
                          className="max-h-10 object-contain"
                        />
                      ) : null}
                    </div>
                    <div className="border-b border-slate-400 mb-1"></div>
                    <p className="font-semibold text-slate-800">
                      {schoolProfile.signatures?.['hoi']?.signatoryName || 'Dr. Evelyn Vance'}
                    </p>
                    <p className="text-slate-400 text-[10px]">
                      {schoolProfile.signatures?.['hoi']?.roleTitle || 'Principal Signature'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="inline-block p-1.5 border-2 border-indigo-700 rounded text-indigo-900 font-mono font-bold text-[10px] uppercase">
                      {schoolProfile.signatures?.['seal']?.signatureDataUrl ? (
                        <img
                          src={schoolProfile.signatures['seal'].signatureDataUrl}
                          alt="Seal"
                          className="w-16 h-16 object-contain mx-auto"
                        />
                      ) : (
                        <span>Official {activeWingName} Seal</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer (no-print) */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end no-print">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Close Document
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {/* Standalone Grading Scale Legend Modal */}
      {showGradingScaleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">8-Level Competency Grading Scale</h3>
              </div>
              <button
                onClick={() => setShowGradingScaleModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {COMPETENCY_SCALE.map((item) => (
                <div key={item.grade} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded border ${item.badgeClass}`}>
                      {item.grade}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">{item.label}</p>
                      <p className="text-[11px] text-slate-500">{item.description}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-indigo-700 text-sm">{item.points} Points</span>
                    <p className="text-[11px] text-slate-500 font-mono">{item.condition}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowGradingScaleModal(false)}
                className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-lg text-xs hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close Rubric
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
