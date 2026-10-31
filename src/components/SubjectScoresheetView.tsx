import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ScoreCard, SubjectScore, LearnerRecord, SubjectMarksSubmission } from '../types';
import { calculateCompetencyGrade, calculateGradeFromPoints, COMPETENCY_SCALE } from '../services/gradingService';
import { exportSubjectScoresheetPdf, SubjectScoresheetRow, SubjectPerformanceSummary } from '../services/pdfService';
import { getSubjectsForGrade } from './GradeBroadsheetView';
import {
  BookOpen,
  FileDown,
  Save,
  CheckCircle2,
  Users,
  TrendingUp,
  Award,
  Filter,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  Lock,
  Trophy,
  Crown,
  ArrowUpRight,
  BarChart3,
  Send,
  Clock,
  UserX,
  AlertTriangle
} from 'lucide-react';

interface RowBuffer {
  learnerId: string;
  studentId: string;
  studentName: string;
  gender: string;
  catScore: number;
  midTermScore: number;
  finalExamScore: number;
  totalScore: number;
  letterGrade: string;
  points: number;
  teacherRemarks: string;
  previousTermScore?: number;
}

export const SubjectScoresheetView: React.FC = () => {
  const {
    learners,
    scoreCards,
    saveScoreCard,
    currentUser,
    schoolProfile,
    teachers,
    grades,
    addAuditLog,
    assessments,
    subjectSubmissions,
    saveSubjectSubmission,
  } = useApp();

  // Role detection: Is the current user strictly a Subject Teacher?
  const isSubjectTeacherOnly =
    currentUser.role === 'teacher' &&
    currentUser.teacherType === 'subject_teacher' &&
    !currentUser.isOwner &&
    !['hoi', 'deputy_hoi', 'exam_council', 'senior_teacher'].includes(currentUser.ownerDesignation || '');

  // Available grades
  const availableGrades = useMemo(() => {
    const fromLearners = Array.from(new Set(learners.map((l) => l.grade))).filter(Boolean);
    const fromGrades = grades.map((g) => g.name);
    const combined = Array.from(new Set([...fromLearners, ...fromGrades]));
    return combined.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [learners, grades]);

  const defaultGrade = useMemo(() => {
    if (currentUser.role === 'teacher' && currentUser.teacherGrade) {
      return currentUser.teacherGrade;
    }
    return availableGrades.includes('Grade 7A') ? 'Grade 7A' : availableGrades[0] || 'Grade 7A';
  }, [currentUser, availableGrades]);

  const [selectedGrade, setSelectedGrade] = useState<string>(defaultGrade);
  const [selectedTerm, setSelectedTerm] = useState<string>('Term 1 - 2026');
  const [activeTab, setActiveTab] = useState<'roster' | 'summary' | 'honours' | 'all'>('roster');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Available subjects for the selected grade
  const gradeSubjects = useMemo(() => {
    return getSubjectsForGrade(selectedGrade);
  }, [selectedGrade]);

  // If user is pure Subject Teacher, strictly filter to their authorized subjects
  const authorizedSubjects = useMemo(() => {
    if (isSubjectTeacherOnly) {
      const teacherRegistered = currentUser.registeredSubjects || [];
      const matched = gradeSubjects.filter((s) =>
        teacherRegistered.some((r) => r.toLowerCase().includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(r.toLowerCase()))
      );
      return matched.length > 0 ? matched : gradeSubjects;
    }
    return gradeSubjects;
  }, [isSubjectTeacherOnly, currentUser, gradeSubjects]);

  const [selectedSubject, setSelectedSubject] = useState<string>(
    authorizedSubjects[0]?.name || 'Mathematics'
  );

  // If grade changes, ensure selected subject is valid
  useEffect(() => {
    if (!authorizedSubjects.some((s) => s.name === selectedSubject)) {
      if (authorizedSubjects[0]) {
        setSelectedSubject(authorizedSubjects[0].name);
      }
    }
  }, [selectedGrade, authorizedSubjects, selectedSubject]);

  // Learners in selected grade
  const gradeLearners = useMemo(() => {
    return learners.filter((l) => l.grade === selectedGrade);
  }, [learners, selectedGrade]);

  // Evaluator teacher name
  const evaluatorName = useMemo(() => {
    if (isSubjectTeacherOnly) return currentUser.name;
    const subObj = gradeSubjects.find((s) => s.name === selectedSubject);
    return subObj?.teacher || currentUser.name || 'Subject Teacher';
  }, [isSubjectTeacherOnly, currentUser, gradeSubjects, selectedSubject]);

  // Active Assessment configuration for this Grade & Term
  const activeAssessment = useMemo(() => {
    return assessments.find((a) => a.grade === selectedGrade && a.term === selectedTerm);
  }, [assessments, selectedGrade, selectedTerm]);

  // Absent learners signaled by Class Teacher
  const absentLearnerIds = useMemo(() => {
    return new Set(activeAssessment?.absentLearnerIds || []);
  }, [activeAssessment]);

  // Current Subject Marks Submission Status
  const currentSubjectSubmission = useMemo(() => {
    return subjectSubmissions.find(
      (s) =>
        s.grade === selectedGrade &&
        s.term === selectedTerm &&
        s.subjectName === selectedSubject
    );
  }, [subjectSubmissions, selectedGrade, selectedTerm, selectedSubject]);

  const isSubmitted = currentSubjectSubmission?.status === 'submitted';

  // Local editable buffer for all learners in this grade & subject
  const [rowsBuffer, setRowsBuffer] = useState<RowBuffer[]>([]);

  // Initialize buffer from existing scorecards or realistic CBC baselines
  useEffect(() => {
    const initialRows: RowBuffer[] = gradeLearners.map((learner, idx) => {
      const isAbsent = absentLearnerIds.has(learner.id);
      const existingCard = scoreCards.find(
        (sc) => sc.learnerId === learner.id && sc.term === selectedTerm
      );
      const subjectMatch = existingCard?.subjects.find((s) => s.subjectName === selectedSubject);

      const baselinePrev = learner.previousTermAverageScore ?? (75 - ((learner.studentId.charCodeAt(learner.studentId.length - 1) % 9) + 2));

      // If signaled absent by Class Teacher (Did Not Sit Exam)
      if (isAbsent) {
        return {
          learnerId: learner.id,
          studentId: learner.studentId,
          studentName: `${learner.firstName} ${learner.lastName}`,
          gender: learner.gender || 'Male',
          catScore: 0,
          midTermScore: 0,
          finalExamScore: 0,
          totalScore: 0,
          letterGrade: 'DNS',
          points: 0,
          teacherRemarks: 'Did Not Sit Exam (Marked Absent by Class Teacher)',
          previousTermScore: baselinePrev,
        };
      }

      if (subjectMatch) {
        return {
          learnerId: learner.id,
          studentId: learner.studentId,
          studentName: `${learner.firstName} ${learner.lastName}`,
          gender: learner.gender || 'Male',
          catScore: subjectMatch.catScore,
          midTermScore: subjectMatch.midTermScore,
          finalExamScore: subjectMatch.finalExamScore,
          totalScore: subjectMatch.totalScore,
          letterGrade: subjectMatch.letterGrade,
          points: subjectMatch.points,
          teacherRemarks: subjectMatch.teacherRemarks || 'Good participation and subject comprehension.',
          previousTermScore: baselinePrev,
        };
      }

      // Default deterministic marks if none recorded yet
      const seed = (learner.id.charCodeAt(learner.id.length - 1) + idx * 5) % 20;
      const cat = 22 + (seed % 8);
      const mid = 15 + (seed % 5);
      const fin = 39 + (seed % 11);
      const total = cat + mid + fin;
      const gradeResult = calculateCompetencyGrade(total);

      return {
        learnerId: learner.id,
        studentId: learner.studentId,
        studentName: `${learner.firstName} ${learner.lastName}`,
        gender: learner.gender || 'Male',
        catScore: cat,
        midTermScore: mid,
        finalExamScore: fin,
        totalScore: total,
        letterGrade: gradeResult.grade,
        points: gradeResult.points,
        teacherRemarks: 'Active in class activities and discussions.',
        previousTermScore: baselinePrev,
      };
    });

    setRowsBuffer(initialRows);
  }, [gradeLearners, selectedSubject, selectedTerm, scoreCards, absentLearnerIds]);

  // Handle cell edit in row buffer
  const handleScoreChange = (
    index: number,
    field: 'catScore' | 'midTermScore' | 'finalExamScore' | 'teacherRemarks',
    value: string | number
  ) => {
    setRowsBuffer((prev) => {
      const updated = [...prev];
      const target = { ...updated[index] };

      if (field === 'teacherRemarks') {
        target.teacherRemarks = String(value);
      } else {
        const numVal = Math.max(0, Number(value) || 0);
        if (field === 'catScore') target.catScore = Math.min(30, numVal);
        if (field === 'midTermScore') target.midTermScore = Math.min(20, numVal);
        if (field === 'finalExamScore') target.finalExamScore = Math.min(50, numVal);

        const total = target.catScore + target.midTermScore + target.finalExamScore;
        const gradeResult = calculateCompetencyGrade(total);
        target.totalScore = total;
        target.letterGrade = gradeResult.grade;
        target.points = gradeResult.points;
      }

      updated[index] = target;
      return updated;
    });
  };

  // Sorted rows by totalScore descending with position
  const sortedRowsWithPosition = useMemo(() => {
    const list = [...rowsBuffer];
    list.sort((a, b) => b.totalScore - a.totalScore);
    return list.map((item, idx) => ({
      ...item,
      position: idx + 1,
    }));
  }, [rowsBuffer]);

  // Subject Statistics & CBC Grade in relation to mean points
  const subjectStats = useMemo(() => {
    if (rowsBuffer.length === 0) {
      return { mean: 0, meanPoints: 0, passRate: 0, relationGrade: 'BE2', relationLabel: 'Below Expectations' };
    }
    const totalScoreSum = rowsBuffer.reduce((acc, curr) => acc + curr.totalScore, 0);
    const mean = totalScoreSum / rowsBuffer.length;
    const totalPtsSum = rowsBuffer.reduce((acc, curr) => acc + curr.points, 0);
    const meanPoints = totalPtsSum / rowsBuffer.length;
    const gradeResult = calculateGradeFromPoints(meanPoints);

    const passing = rowsBuffer.filter((r) => r.letterGrade.startsWith('EE') || r.letterGrade.startsWith('ME')).length;
    const passRate = (passing / rowsBuffer.length) * 100;

    return {
      mean,
      meanPoints,
      passRate,
      relationGrade: gradeResult.grade,
      relationLabel: gradeResult.label,
    };
  }, [rowsBuffer]);

  // Subject Performance Summary & Academic Honours
  const performanceSummary: SubjectPerformanceSummary = useMemo(() => {
    const totalEnrolled = Math.max(1, rowsBuffer.length);

    // Level distribution with gender counts
    const levelDistribution = COMPETENCY_SCALE.map((lvl) => {
      const match = rowsBuffer.filter((r) => r.letterGrade === lvl.grade);
      const boys = match.filter((r) => r.gender.toLowerCase().startsWith('m')).length;
      const girls = match.filter((r) => r.gender.toLowerCase().startsWith('f')).length;
      const total = match.length;
      const percentage = (total / totalEnrolled) * 100;
      return {
        grade: lvl.grade,
        label: lvl.label,
        points: lvl.points,
        boys,
        girls,
        total,
        percentage,
      };
    });

    // Best 3 Boys & Best 3 Girls in this subject
    const boysList = sortedRowsWithPosition.filter((r) => r.gender.toLowerCase().startsWith('m'));
    const girlsList = sortedRowsWithPosition.filter((r) => r.gender.toLowerCase().startsWith('f'));

    const bestBoys = boysList.slice(0, 3).map((b, idx) => ({
      rank: idx + 1,
      studentId: b.studentId,
      name: b.studentName,
      score: b.totalScore,
      level: b.letterGrade,
    }));

    const bestGirls = girlsList.slice(0, 3).map((g, idx) => ({
      rank: idx + 1,
      studentId: g.studentId,
      name: g.studentName,
      score: g.totalScore,
      level: g.letterGrade,
    }));

    // Most Improved Boys & Girls in this subject
    const boysImproved = boysList.map((b) => {
      const prev = b.previousTermScore ?? (b.totalScore - 6);
      return {
        studentId: b.studentId,
        name: b.studentName,
        previousScore: prev,
        currentScore: b.totalScore,
        delta: b.totalScore - prev,
      };
    }).sort((a, b) => b.delta - a.delta);

    const girlsImproved = girlsList.map((g) => {
      const prev = g.previousTermScore ?? (g.totalScore - 6);
      return {
        studentId: g.studentId,
        name: g.studentName,
        previousScore: prev,
        currentScore: g.totalScore,
        delta: g.totalScore - prev,
      };
    }).sort((a, b) => b.delta - a.delta);

    const mostImprovedBoys = boysImproved.slice(0, 3).map((item, idx) => ({
      rank: idx + 1,
      ...item,
    }));

    const mostImprovedGirls = girlsImproved.slice(0, 3).map((item, idx) => ({
      rank: idx + 1,
      ...item,
    }));

    return {
      levelDistribution,
      meanPoints: subjectStats.meanPoints,
      relationGrade: subjectStats.relationGrade,
      relationLabel: subjectStats.relationLabel,
      bestBoys,
      bestGirls,
      mostImprovedBoys,
      mostImprovedGirls,
    };
  }, [rowsBuffer, sortedRowsWithPosition, subjectStats]);

  // Eligible sitting learners (excluding absent / Did Not Sit learners)
  const eligibleRows = useMemo(() => {
    return rowsBuffer.filter((r) => !absentLearnerIds.has(r.learnerId));
  }, [rowsBuffer, absentLearnerIds]);

  // Missing marks count for eligible learners (where totalScore is 0 or all assessments are 0)
  const missingMarksRows = useMemo(() => {
    return eligibleRows.filter(
      (r) => r.catScore === 0 && r.midTermScore === 0 && r.finalExamScore === 0
    );
  }, [eligibleRows]);

  const isAllEligibleMarksRecorded = eligibleRows.length > 0 && missingMarksRows.length === 0;

  // Batch Save Subject Scores to AppContext & Firestore
  const handleSaveAll = () => {
    let savedCount = 0;
    rowsBuffer.forEach((item) => {
      const isAbsent = absentLearnerIds.has(item.learnerId);
      const existingCard = scoreCards.find(
        (sc) => sc.learnerId === item.learnerId && sc.term === selectedTerm
      );

      const otherSubjects = existingCard?.subjects
        ? existingCard.subjects.filter((s) => s.subjectName !== selectedSubject)
        : [];

      // If absent, we don't save a score or we save with 0 and DNS
      const currentSubjectEntry: SubjectScore = {
        id: `sub-${selectedSubject}-${item.learnerId}`,
        subjectName: selectedSubject,
        catScore: isAbsent ? 0 : item.catScore,
        midTermScore: isAbsent ? 0 : item.midTermScore,
        finalExamScore: isAbsent ? 0 : item.finalExamScore,
        totalScore: isAbsent ? 0 : item.totalScore,
        letterGrade: (isAbsent ? 'DNS' : item.letterGrade) as any,
        points: isAbsent ? 0 : item.points,
        teacherRemarks: isAbsent
          ? 'Did Not Sit Exam (Marked Absent by Class Teacher)'
          : item.teacherRemarks,
        subjectTeacher: evaluatorName,
      };

      const updatedSubjects = [...otherSubjects, currentSubjectEntry];
      const sittingSubjects = updatedSubjects.filter((s) => s.letterGrade !== ('DNS' as any));
      const totalMarks = sittingSubjects.reduce((acc, curr) => acc + curr.totalScore, 0);
      const maxPossibleMarks = sittingSubjects.length * 100;
      const averageScore = maxPossibleMarks > 0 ? (totalMarks / maxPossibleMarks) * 100 : 0;
      const totalPoints = sittingSubjects.reduce((acc, curr) => acc + curr.points, 0);
      const gpa = sittingSubjects.length > 0 ? Number((totalPoints / sittingSubjects.length).toFixed(2)) : 0;

      const newCard: ScoreCard = {
        id: existingCard?.id || `sc-${item.learnerId}-${Date.now()}`,
        learnerId: item.learnerId,
        term: selectedTerm,
        academicYear: '2025/2026',
        assessmentName: activeAssessment?.name || `${selectedTerm} Summative Assessment`,
        isExamAbsent: isAbsent,
        examAbsentReason: isAbsent ? 'Marked Absent by Class Teacher' : undefined,
        issueDate: '2026-04-10',
        status: 'published',
        attendancePercentage: existingCard?.attendancePercentage || 96,
        totalMarks,
        maxPossibleMarks,
        averageScore: Number(averageScore.toFixed(1)),
        gpa,
        classRank: 1,
        classSize: gradeLearners.length,
        classTeacherRemark: existingCard?.classTeacherRemark || 'Hardworking learner with sustained academic progress.',
        principalRemark: existingCard?.principalRemark || 'Commendable effort and steady academic growth.',
        subjects: updatedSubjects,
      };

      saveScoreCard(newCard);
      savedCount++;
    });

    addAuditLog(
      'Subject Evaluation Scoresheet Saved',
      `Saved ${savedCount} marks for ${selectedSubject} in ${selectedGrade} (${selectedTerm}). Evaluator: ${evaluatorName}`
    );

    setSaveSuccessMsg(`Successfully committed ${savedCount} learner marks for ${selectedSubject} to storage!`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Submit Marks directly to Broadsheet & Scorecards
  const handleSubmitMarksToBroadsheet = async () => {
    if (!isAllEligibleMarksRecorded) {
      alert(
        `Cannot submit marks yet: ${missingMarksRows.length} eligible sitting learner(s) still have unrecorded marks (${missingMarksRows.map((m) => m.studentName).slice(0, 3).join(', ')}...). Under school academic policy, marks may only be submitted when all eligible learners have recorded scores.`
      );
      return;
    }

    // 1. Commit all marks into scorecards
    handleSaveAll();

    // 2. Mark submission status as submitted in subjectSubmissions
    const subDef = gradeSubjects.find((s) => s.name === selectedSubject);
    const submissionRecord: SubjectMarksSubmission = {
      id: currentSubjectSubmission?.id || `subm-${activeAssessment?.id || 'eval'}-${selectedSubject.replace(/\s+/g, '_')}`,
      assessmentId: activeAssessment?.id || `assess-${selectedGrade.replace(/\s+/g, '_')}-${selectedTerm.replace(/\s+/g, '_')}`,
      grade: selectedGrade,
      term: selectedTerm,
      subjectName: selectedSubject,
      subjectCode: subDef?.code || 'SUB',
      teacherName: evaluatorName,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      deadline: activeAssessment?.deadline || '2026-04-05',
      totalLearners: rowsBuffer.length,
      eligibleLearners: eligibleRows.length,
      recordedLearners: eligibleRows.length,
      isComplete: true,
    };

    await saveSubjectSubmission(submissionRecord);

    addAuditLog(
      'Subject Marks Submitted to Broadsheet & Scorecards',
      `${evaluatorName} submitted complete marks for ${selectedSubject} in ${selectedGrade} (${selectedTerm}) directly to the composite broadsheet and individual scorecards.`
    );

    setSaveSuccessMsg(`🚀 Marks for ${selectedSubject} have been submitted directly to the ${selectedGrade} Broadsheet and individual scorecards!`);
    setTimeout(() => setSaveSuccessMsg(null), 6000);
  };

  // PDF Export
  const handleExportPdf = () => {
    const pdfRows: SubjectScoresheetRow[] = sortedRowsWithPosition.map((r) => ({
      position: r.position,
      studentId: r.studentId,
      studentName: r.studentName,
      gender: r.gender,
      catScore: r.catScore,
      midTermScore: r.midTermScore,
      finalExamScore: r.finalExamScore,
      totalScore: r.totalScore,
      letterGrade: r.letterGrade,
      points: r.points,
      teacherRemarks: r.teacherRemarks,
    }));

    exportSubjectScoresheetPdf(
      schoolProfile || {
        id: 'school_config',
        name: 'Mwivona Comprehensive School',
        registrationNumber: 'MW-2026-COMP',
        phone: '+254 716 235 185',
        email: 'info@mwivonacomprehensive.sc.ke',
        postalAddress: 'P.O. Box 4500-00100, Nairobi, Kenya',
        motto: 'Excellence, Integrity & Holistic Growth',
        principalName: 'Dr. Evelyn Vance',
        academicYear: '2025/2026',
        currentTerm: 'Term 1 - 2026',
        primaryWingName: 'Mwivona Primary School',
        juniorWingName: 'Mwivona Junior School',
        mpesaPaybillNumber: '247247',
        mpesaAccountNumber: 'MWIVONA-FEES',
        bankAccountDetails: 'KCB Bank, Kipande Branch, Acc: 1102938475',
      },
      selectedGrade,
      selectedTerm,
      selectedSubject,
      evaluatorName,
      pdfRows,
      subjectStats.mean,
      performanceSummary
    );
  };

  // CSV Export with Summary
  const handleExportCsv = () => {
    const headers = [
      'Position',
      'Admission Number',
      'Learner Name',
      'Gender',
      'CAT (/30)',
      'Midterm (/20)',
      'Final Exam (/50)',
      'Total Score (/100)',
      'CBC Level',
      'Points (/8)',
      'Teacher Remarks',
    ];

    const rowsData = sortedRowsWithPosition.map((r) => [
      r.position,
      `"${r.studentId}"`,
      `"${r.studentName}"`,
      r.gender,
      r.catScore,
      r.midTermScore,
      r.finalExamScore,
      r.totalScore,
      r.letterGrade,
      r.points,
      `"${r.teacherRemarks.replace(/"/g, '""')}"`,
    ]);

    const summaryRow = [
      'AVERAGE',
      '-',
      'SUBJECT MEAN',
      '-',
      '-',
      '-',
      '-',
      subjectStats.mean.toFixed(1),
      subjectStats.relationGrade,
      subjectStats.meanPoints.toFixed(2),
      `"Evaluator: ${evaluatorName} (${subjectStats.relationLabel})"`,
    ];

    const levelSummary = [
      '\n--- SUBJECT COMPETENCY LEVEL DISTRIBUTION (GENDER BREAKDOWN) ---',
      'Level,Points,Boys,Girls,Total,Percentage',
      ...performanceSummary.levelDistribution.map(
        (l) => `"${l.grade} - ${l.label}",${l.points},${l.boys},${l.girls},${l.total},${l.percentage.toFixed(1)}%`
      ),
    ];

    const honoursSummary = [
      '\n--- BEST 3 BOYS IN SUBJECT ---',
      'Rank,Adm No,Name,Score,CBC Level',
      ...performanceSummary.bestBoys.map((b) => `${b.rank},"${b.studentId}","${b.name}",${b.score},${b.level}`),
      '\n--- BEST 3 GIRLS IN SUBJECT ---',
      'Rank,Adm No,Name,Score,CBC Level',
      ...performanceSummary.bestGirls.map((g) => `${g.rank},"${g.studentId}","${g.name}",${g.score},${g.level}`),
      '\n--- TOP 3 MOST IMPROVED BOYS IN SUBJECT ---',
      'Rank,Adm No,Name,Previous Score,Current Score,Growth Delta',
      ...performanceSummary.mostImprovedBoys.map((b) => `${b.rank},"${b.studentId}","${b.name}",${b.previousScore},${b.currentScore},+${b.delta.toFixed(1)}`),
      '\n--- TOP 3 MOST IMPROVED GIRLS IN SUBJECT ---',
      'Rank,Adm No,Name,Previous Score,Current Score,Growth Delta',
      ...performanceSummary.mostImprovedGirls.map((g) => `${g.rank},"${g.studentId}","${g.name}",${g.previousScore},${g.currentScore},+${g.delta.toFixed(1)}`),
    ];

    const csvContent = [
      headers.join(','),
      ...rowsData.map((e) => e.join(',')),
      summaryRow.join(','),
      ...levelSummary,
      ...honoursSummary,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Scoresheet_Summary_${selectedSubject.replace(/\s+/g, '_')}_${selectedGrade.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Role Notice Banner for Subject Teacher Scoping */}
      {isSubjectTeacherOnly && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-start gap-3 text-xs text-indigo-900">
          <BookOpen className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">Subject Teacher Scoping Enforced</p>
            <p className="text-indigo-800 text-[11px] leading-relaxed">
              You are signed in as a designated Subject Teacher ({evaluatorName}). Under Kenyan CBC school governance, your access is scoped to enter and evaluate assessments for your assigned subject(s): <strong>{authorizedSubjects.map((s) => s.name).join(', ')}</strong>. Multi-subject grade broadsheets are reserved for Class Teachers, Academic Coordinator / Exam Council, Senior Teachers, Deputy HOI, and HOI.
            </p>
          </div>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 flex-wrap">
            <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              {activeAssessment?.name || 'Single-Subject Assessment'}
            </span>
            <span aria-hidden="true">·</span>
            <span>CAT (/30) + Midterm (/20) + Exam (/50)</span>
            <span aria-hidden="true">·</span>
            <span className={isSubmitted ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
              {isSubmitted ? '✓ Marks Submitted to Broadsheet' : '⏳ Marks Pending Submission'}
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            <span>{selectedSubject} · Scoresheet ({selectedGrade})</span>
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Evaluator: <strong className="text-slate-800">{evaluatorName}</strong> · Assessment: <strong className="text-indigo-700">{activeAssessment?.name || 'Term 1 Summative Assessment 2026'}</strong> · Deadline: <strong className="text-slate-800">{activeAssessment?.deadline || '2026-04-05'}</strong>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            disabled={rowsBuffer.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            title="Download CSV with Performance Summary"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportPdf}
            disabled={rowsBuffer.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            title="Export official portrait Subject Scoresheet PDF with summary"
          >
            <FileDown className="w-4 h-4 text-slate-700" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={handleSaveAll}
            disabled={rowsBuffer.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            title="Save draft scores without official submission"
          >
            <Save className="w-4 h-4" />
            <span>Save Draft</span>
          </button>

          {/* Submit Marks Directly to Broadsheet & Scorecards Button */}
          <button
            onClick={handleSubmitMarksToBroadsheet}
            disabled={!isAllEligibleMarksRecorded || rowsBuffer.length === 0}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer ${
              isSubmitted
                ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                : isAllEligibleMarksRecorded
                ? 'bg-indigo-700 hover:bg-indigo-800 text-white animate-pulse'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
            }`}
            title={
              !isAllEligibleMarksRecorded
                ? `Cannot submit yet: ${missingMarksRows.length} eligible sitting learner(s) still have unrecorded marks. All eligible learners must have marks before submission.`
                : 'Submit marks directly to Grade Broadsheet and individual scorecards'
            }
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitted ? '✓ Resubmit to Broadsheet' : '🚀 Submit Marks to Broadsheet'}</span>
          </button>
        </div>
      </div>

      {/* Active Assessment & Absent Signal Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Assessment & Submission Status Card */}
        <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-indigo-700 shrink-0" />
            <div>
              <p className="font-bold text-indigo-950">
                {activeAssessment?.name || `${selectedTerm} Summative Assessment`}
              </p>
              <p className="text-[11px] text-indigo-800">
                Marks Upload Deadline: <strong>{activeAssessment?.deadline || '2026-04-05'}</strong>
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              isSubmitted
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}>
              {isSubmitted ? 'SUBMITTED' : 'PENDING'}
            </span>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {eligibleRows.length - missingMarksRows.length} / {eligibleRows.length} recorded
            </p>
          </div>
        </div>

        {/* Signal from Class Teacher regarding Absent Learners Card */}
        <div className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 border ${
          absentLearnerIds.size > 0
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          <div className="flex items-center gap-2.5">
            {absentLearnerIds.size > 0 ? (
              <UserX className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <div>
              <p className="font-bold">
                {absentLearnerIds.size > 0
                  ? `Signal from Class Teacher: ${absentLearnerIds.size} Absent (Did Not Sit)`
                  : 'All Registered Learners Sat for Exam'}
              </p>
              <p className="text-[11px] leading-tight mt-0.5">
                {absentLearnerIds.size > 0
                  ? `Class Teacher marked ${gradeLearners.filter((l) => absentLearnerIds.has(l.id)).map((l) => `${l.firstName} ${l.lastName}`).join(', ')} as Absent. You can upload marks minus these learners.`
                  : 'No learners were marked absent by the class teacher.'}
              </p>
            </div>
          </div>
          <span className="font-mono font-bold text-xs shrink-0">
            {eligibleRows.length} Eligible
          </span>
        </div>
      </div>

      {/* Missing Marks Warning if non-absent learner has unrecorded marks */}
      {!isAllEligibleMarksRecorded && eligibleRows.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Submission Locked:</strong> {missingMarksRows.length} eligible learner(s) still have unrecorded marks (e.g. {missingMarksRows.slice(0, 3).map((l) => l.studentName).join(', ')}{missingMarksRows.length > 3 ? '...' : ''}). Under school policy, marks should only be submitted when all eligible learners have recorded marks.
            </span>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {saveSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl flex items-center gap-2 text-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{saveSuccessMsg}</span>
        </div>
      )}

      {/* Selection Filters */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <label className="font-bold text-slate-700">Subject:</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-indigo-50/60 border border-indigo-300 rounded-lg px-3 py-1.5 font-bold text-indigo-900 focus:outline-indigo-500 cursor-pointer"
            >
              {authorizedSubjects.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="font-bold text-slate-700">Grade:</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-semibold text-slate-800 focus:outline-indigo-500 cursor-pointer"
            >
              {availableGrades.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="font-bold text-slate-700">Term:</label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-semibold text-slate-800 focus:outline-indigo-500 cursor-pointer"
            >
              <option value="Term 1 - 2026">Term 1 - 2026</option>
              <option value="Term 2 - 2026">Term 2 - 2026</option>
              <option value="Term 3 - 2026">Term 3 - 2026</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-600">
          <span className="font-bold text-slate-800">{rowsBuffer.length}</span>
          <span>Learners Registered in Roster</span>
        </div>
      </div>

      {/* Sub-Tab Navigation for Scoresheet */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('roster')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'roster'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Mark Evaluation Table</span>
        </button>

        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'summary'
              ? 'bg-indigo-700 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Competency Distribution (Boys/Girls)</span>
        </button>

        <button
          onClick={() => setActiveTab('honours')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'honours'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Best 3 in Subject &amp; Most Improved</span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap text-slate-600 hover:bg-slate-100 ${
            activeTab === 'all' ? 'bg-slate-200 text-slate-900 font-bold' : ''
          }`}
        >
          <span>View All Sections</span>
        </button>
      </div>

      {/* Performance Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Subject Mean Score</p>
          <p className="text-xl font-extrabold text-indigo-700 mt-0.5">
            {subjectStats.mean.toFixed(1)}%
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Class CBC Level: <strong className="text-slate-800">{calculateCompetencyGrade(subjectStats.mean).grade}</strong>
          </p>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Mean Points (/8.0)</p>
          <p className="text-xl font-extrabold text-emerald-700 mt-0.5">
            {subjectStats.meanPoints.toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Relation: <strong className="text-emerald-800">{subjectStats.relationGrade}</strong> ({subjectStats.relationLabel})
          </p>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pass / Competency Rate</p>
          <p className="text-xl font-extrabold text-blue-700 mt-0.5">
            {subjectStats.passRate.toFixed(1)}%
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Meeting or Exceeding expectations</p>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Evaluated Cohort</p>
          <p className="text-xl font-extrabold text-slate-900 mt-0.5">{rowsBuffer.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {rowsBuffer.filter((r) => r.gender.toLowerCase().startsWith('m')).length} Boys · {rowsBuffer.filter((r) => r.gender.toLowerCase().startsWith('f')).length} Girls
          </p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECTION 1: ACADEMIC HONOURS & MOST IMPROVED IN SUBJECT         */}
      {/* ============================================================== */}
      {(activeTab === 'honours' || activeTab === 'all') && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Best 3 Boys in Subject */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-3.5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-sm">Best 3 Boys in {selectedSubject}</h3>
                </div>
                <span className="text-[11px] bg-blue-800/80 px-2 py-0.5 rounded text-blue-200 font-medium">
                  {selectedGrade}
                </span>
              </div>

              <div className="p-4 divide-y divide-slate-100 text-xs">
                {performanceSummary.bestBoys.length === 0 ? (
                  <p className="text-slate-400 italic py-4 text-center">No male learners evaluated.</p>
                ) : (
                  performanceSummary.bestBoys.map((boy) => (
                    <div key={boy.studentId} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                            boy.rank === 1
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : boy.rank === 2
                              ? 'bg-slate-200 text-slate-800 border border-slate-300'
                              : 'bg-amber-50 text-amber-900 border border-amber-200'
                          }`}
                        >
                          {boy.rank}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">{boy.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{boy.studentId}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-extrabold text-sm text-indigo-700">{boy.score} Marks</span>
                        <div className="flex items-center gap-1.5 justify-end mt-0.5">
                          <span className="font-mono font-bold text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                            {boy.level}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Best 3 Girls in Subject */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-3.5 bg-gradient-to-r from-rose-900 to-pink-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-300" />
                  <h3 className="font-bold text-sm">Best 3 Girls in {selectedSubject}</h3>
                </div>
                <span className="text-[11px] bg-rose-800/80 px-2 py-0.5 rounded text-rose-200 font-medium">
                  {selectedGrade}
                </span>
              </div>

              <div className="p-4 divide-y divide-slate-100 text-xs">
                {performanceSummary.bestGirls.length === 0 ? (
                  <p className="text-slate-400 italic py-4 text-center">No female learners evaluated.</p>
                ) : (
                  performanceSummary.bestGirls.map((girl) => (
                    <div key={girl.studentId} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                            girl.rank === 1
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : girl.rank === 2
                              ? 'bg-slate-200 text-slate-800 border border-slate-300'
                              : 'bg-amber-50 text-amber-900 border border-amber-200'
                          }`}
                        >
                          {girl.rank}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">{girl.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{girl.studentId}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-extrabold text-sm text-rose-700">{girl.score} Marks</span>
                        <div className="flex items-center gap-1.5 justify-end mt-0.5">
                          <span className="font-mono font-bold text-[10px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-800 border border-rose-200">
                            {girl.level}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Top 3 Most Improved Boys & Girls in this Subject */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-xs">Top 3 Most Improved Boys ({selectedSubject})</h3>
                </div>
                <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded font-mono">
                  Delta Growth
                </span>
              </div>

              <div className="p-4 divide-y divide-slate-100 text-xs">
                {performanceSummary.mostImprovedBoys.map((item) => (
                  <div key={item.studentId} className="py-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center justify-center font-bold text-[11px]">
                        {item.rank}
                      </span>
                      <div>
                        <p className="font-bold text-slate-900">{item.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{item.studentId}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 font-bold text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <ArrowUpRight className="w-3 h-3" />
                        +{item.delta.toFixed(1)} pts
                      </span>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {item.previousScore.toFixed(0)} → <strong className="text-slate-800">{item.currentScore}</strong>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-xs">Top 3 Most Improved Girls ({selectedSubject})</h3>
                </div>
                <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded font-mono">
                  Delta Growth
                </span>
              </div>

              <div className="p-4 divide-y divide-slate-100 text-xs">
                {performanceSummary.mostImprovedGirls.map((item) => (
                  <div key={item.studentId} className="py-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center justify-center font-bold text-[11px]">
                        {item.rank}
                      </span>
                      <div>
                        <p className="font-bold text-slate-900">{item.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{item.studentId}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 font-bold text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <ArrowUpRight className="w-3 h-3" />
                        +{item.delta.toFixed(1)} pts
                      </span>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {item.previousScore.toFixed(0)} → <strong className="text-slate-800">{item.currentScore}</strong>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 2: SUBJECT COMPETENCY DISTRIBUTION WITH GENDER COUNTS   */}
      {/* ============================================================== */}
      {(activeTab === 'summary' || activeTab === 'all') && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-700" />
              <h3 className="font-bold text-slate-900 text-sm">
                {selectedSubject} Competency Distribution &amp; Gender Breakdown ({selectedGrade})
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">
              Mean Points: <strong className="text-indigo-700 font-mono">{subjectStats.meanPoints.toFixed(2)} / 8.0</strong> · Relation: <strong className="text-indigo-900">{subjectStats.relationGrade}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-semibold">
                  <th className="py-2.5 px-3">Competency Level</th>
                  <th className="py-2.5 px-3">Marks Range</th>
                  <th className="py-2.5 px-2 text-center w-16">Rubric Pts</th>
                  <th className="py-2.5 px-3 text-center bg-blue-950 font-bold w-20">Boys (M)</th>
                  <th className="py-2.5 px-3 text-center bg-rose-950 font-bold w-20">Girls (F)</th>
                  <th className="py-2.5 px-3 text-center bg-indigo-950 font-bold w-24">Total Learners</th>
                  <th className="py-2.5 px-3 text-center w-24">% of Cohort</th>
                  <th className="py-2.5 px-4 min-w-[140px]">Visual Gender Proportion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {performanceSummary.levelDistribution.map((lvl) => (
                  <tr key={lvl.grade} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      <span className="font-mono font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 mr-2">
                        {lvl.grade}
                      </span>
                      <span>{lvl.label}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                      {lvl.grade === 'EE1'
                        ? '>89 marks'
                        : lvl.grade === 'EE2'
                        ? '75 - 89 marks'
                        : lvl.grade === 'ME1'
                        ? '58 - 74 marks'
                        : lvl.grade === 'ME2'
                        ? '41 - 57 marks'
                        : lvl.grade === 'AE1'
                        ? '31 - 40 marks'
                        : lvl.grade === 'AE2'
                        ? '21 - 30 marks'
                        : lvl.grade === 'BE1'
                        ? '11 - 20 marks'
                        : '0 - 10 marks'}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-slate-800 font-mono">
                      {lvl.points}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-blue-900 bg-blue-50/40">
                      {lvl.boys}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-rose-900 bg-rose-50/40">
                      {lvl.girls}
                    </td>
                    <td className="py-2.5 px-3 text-center font-extrabold text-indigo-700 bg-indigo-50/40 text-sm">
                      {lvl.total}
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                      {lvl.percentage.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                        {lvl.total > 0 && (
                          <>
                            <div
                              style={{ width: `${(lvl.boys / Math.max(1, rowsBuffer.length)) * 100}%` }}
                              className="bg-blue-600 h-full"
                              title={`Boys: ${lvl.boys}`}
                            />
                            <div
                              style={{ width: `${(lvl.girls / Math.max(1, rowsBuffer.length)) * 100}%` }}
                              className="bg-rose-500 h-full"
                              title={`Girls: ${lvl.girls}`}
                            />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 3: EDITABLE SCORESHEET TABLE                           */}
      {/* ============================================================== */}
      {(activeTab === 'roster' || activeTab === 'all') && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-700" />
              <h3 className="font-bold text-slate-900 text-sm">
                {selectedSubject} Assessment Roster ({selectedGrade})
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 italic">
              Weights: CAT max 30, Midterm max 20, Final Exam max 50 = Total 100
            </span>
          </div>

          {rowsBuffer.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Users className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-semibold">No learners enrolled in {selectedGrade}.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-semibold">
                    <th className="py-2.5 px-2 text-center w-10">Pos</th>
                    <th className="py-2.5 px-3">Adm No</th>
                    <th className="py-2.5 px-3 min-w-[150px]">Learner Name</th>
                    <th className="py-2.5 px-2 text-center w-8">Sex</th>
                    <th className="py-2.5 px-2 text-center w-24 bg-slate-800">CAT (/30)</th>
                    <th className="py-2.5 px-2 text-center w-24 bg-slate-800">Mid (/20)</th>
                    <th className="py-2.5 px-2 text-center w-24 bg-slate-800">Exam (/50)</th>
                    <th className="py-2.5 px-2.5 text-center w-20 bg-indigo-950 font-bold">Tot (/100)</th>
                    <th className="py-2.5 px-2 text-center w-16 bg-indigo-950 font-bold">Level</th>
                    <th className="py-2.5 px-2 text-center w-14 bg-indigo-950 font-bold">Pts</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Teacher Evaluator Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sortedRowsWithPosition.map((row) => {
                    const originalIndex = rowsBuffer.findIndex((r) => r.learnerId === row.learnerId);
                    const isAbsent = absentLearnerIds.has(row.learnerId);

                    return (
                      <tr
                        key={row.learnerId}
                        className={`transition-colors ${
                          isAbsent
                            ? 'bg-rose-50/40 text-slate-500 hover:bg-rose-50/60'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2 px-2 text-center font-bold text-slate-900 bg-slate-50/50">
                          {isAbsent ? (
                            <span className="font-mono text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300">
                              DNS
                            </span>
                          ) : row.position === 1 ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px]">
                              1
                            </span>
                          ) : (
                            row.position
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600 font-semibold whitespace-nowrap">
                          {row.studentId}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{row.studentName}</span>
                            {isAbsent && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                🚫 Absent (DNS)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center text-slate-500 font-mono text-[11px]">
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                              row.gender.toLowerCase().startsWith('m')
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {row.gender.charAt(0)}
                          </span>
                        </td>

                        {/* CAT Input */}
                        <td className="py-1.5 px-2 text-center bg-slate-50/30">
                          {isAbsent ? (
                            <span className="text-[10px] font-mono text-rose-400 font-bold">DNS</span>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              max={30}
                              value={row.catScore}
                              onChange={(e) =>
                                handleScoreChange(originalIndex, 'catScore', e.target.value)
                              }
                              className="w-16 text-center font-bold text-slate-900 bg-white border border-slate-300 rounded px-1 py-1 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                            />
                          )}
                        </td>

                        {/* Midterm Input */}
                        <td className="py-1.5 px-2 text-center bg-slate-50/30">
                          {isAbsent ? (
                            <span className="text-[10px] font-mono text-rose-400 font-bold">DNS</span>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              max={20}
                              value={row.midTermScore}
                              onChange={(e) =>
                                handleScoreChange(originalIndex, 'midTermScore', e.target.value)
                              }
                              className="w-16 text-center font-bold text-slate-900 bg-white border border-slate-300 rounded px-1 py-1 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                            />
                          )}
                        </td>

                        {/* Final Exam Input */}
                        <td className="py-1.5 px-2 text-center bg-slate-50/30">
                          {isAbsent ? (
                            <span className="text-[10px] font-mono text-rose-400 font-bold">DNS</span>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              max={50}
                              value={row.finalExamScore}
                              onChange={(e) =>
                                handleScoreChange(originalIndex, 'finalExamScore', e.target.value)
                              }
                              className="w-16 text-center font-bold text-slate-900 bg-white border border-slate-300 rounded px-1 py-1 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                            />
                          )}
                        </td>

                        {/* Total Score */}
                        <td className="py-2 px-2.5 text-center font-extrabold text-indigo-700 bg-indigo-50/40 text-sm">
                          {isAbsent ? <span className="text-slate-400">-</span> : row.totalScore}
                        </td>

                        {/* Competency Level Badge */}
                        <td className="py-2 px-2 text-center bg-indigo-50/40">
                          {isAbsent ? (
                            <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-rose-50 border border-rose-300 text-rose-700">
                              DNS
                            </span>
                          ) : (
                            <span
                              className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded ${
                                row.points >= 7
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : row.points >= 5
                                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                  : row.points >= 3
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              {row.letterGrade}
                            </span>
                          )}
                        </td>

                        {/* Points */}
                        <td className="py-2 px-2 text-center font-bold text-slate-800 bg-indigo-50/40 font-mono">
                          {isAbsent ? <span className="text-slate-400">-</span> : row.points}
                        </td>

                        {/* Teacher Remarks Input */}
                        <td className="py-1.5 px-3">
                          {isAbsent ? (
                            <span className="text-[11px] text-rose-600 italic">
                              Did Not Sit Exam (Marked Absent by Class Teacher)
                            </span>
                          ) : (
                            <input
                              type="text"
                              value={row.teacherRemarks}
                              onChange={(e) =>
                                handleScoreChange(originalIndex, 'teacherRemarks', e.target.value)
                              }
                              className="w-full text-xs text-slate-700 bg-white border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                              placeholder="Teacher rubric remarks..."
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Subject Summary Row */}
                  <tr className="bg-indigo-50 font-bold text-indigo-950 border-t-2 border-indigo-200">
                    <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wider text-[11px]">
                      Subject Class Average:
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-700">
                      {(
                        eligibleRows.reduce((a, b) => a + b.catScore, 0) / Math.max(1, eligibleRows.length)
                      ).toFixed(1)}
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-700">
                      {(
                        eligibleRows.reduce((a, b) => a + b.midTermScore, 0) /
                        Math.max(1, eligibleRows.length)
                      ).toFixed(1)}
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-700">
                      {(
                        eligibleRows.reduce((a, b) => a + b.finalExamScore, 0) /
                        Math.max(1, eligibleRows.length)
                      ).toFixed(1)}
                    </td>
                    <td className="py-2.5 px-2.5 text-center text-indigo-900 text-sm">
                      {subjectStats.mean.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono">
                      {subjectStats.relationGrade}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono">
                      {subjectStats.meanPoints.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-normal italic">
                      {eligibleRows.length} sitting learners evaluated by {evaluatorName} ({subjectStats.relationLabel})
                      {absentLearnerIds.size > 0 && ` · ${absentLearnerIds.size} absent (DNS)`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Footer with Save & Submit Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-600">
              <span>Policy: Marks should only be submitted when all eligible learners have recorded scores. </span>
              {absentLearnerIds.size > 0 && (
                <strong className="text-rose-700">({absentLearnerIds.size} absent learners are excluded).</strong>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleSaveAll}
                disabled={rowsBuffer.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>Save Draft</span>
              </button>

              <button
                onClick={handleSubmitMarksToBroadsheet}
                disabled={!isAllEligibleMarksRecorded || rowsBuffer.length === 0}
                className={`flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer ${
                  isSubmitted
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    : isAllEligibleMarksRecorded
                    ? 'bg-indigo-700 hover:bg-indigo-800 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                }`}
                title={
                  !isAllEligibleMarksRecorded
                    ? `Cannot submit yet: ${missingMarksRows.length} eligible sitting learner(s) missing marks.`
                    : 'Submit marks directly to Grade Broadsheet and individual scorecards'
                }
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitted ? '✓ Resubmit to Broadsheet' : '🚀 Submit Marks to Broadsheet'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
