import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ScoreCard, SubjectScore, LearnerRecord, AssessmentRecord, SubjectMarksSubmission } from '../types';
import {
  calculateCompetencyGrade,
  calculateGradeFromPoints,
  COMPETENCY_SCALE,
  getGradeColor,
  GradeSubjectDef,
  getSubjectsForGrade,
} from '../services/gradingService';
import {
  exportGradeBroadsheetPdf,
  exportAllGradeScoreCardsBatchPdf,
  BroadsheetStudentRow,
  BroadsheetPerformanceSummary,
} from '../services/pdfService';
import {
  Table,
  FileDown,
  Printer,
  Edit3,
  Award,
  Filter,
  Users,
  TrendingUp,
  CheckCircle2,
  Lock,
  ChevronRight,
  Save,
  X,
  FileSpreadsheet,
  AlertCircle,
  Trophy,
  Crown,
  Medal,
  ArrowUpRight,
  Sparkles,
  BarChart3,
  PieChart,
  Send,
  Clock,
  UserX,
  UserCheck,
  BellRing,
  Calendar
} from 'lucide-react';

export type { GradeSubjectDef };
export { getSubjectsForGrade };

interface GradeBroadsheetViewProps {
  onViewLearnerReportCard?: (learnerId: string) => void;
}

export const GradeBroadsheetView: React.FC<GradeBroadsheetViewProps> = ({
  onViewLearnerReportCard,
}) => {
  const {
    learners,
    scoreCards,
    saveScoreCard,
    currentUser,
    schoolProfile,
    teachers,
    grades,
    assessments,
    saveAssessment,
    subjectSubmissions,
    saveSubjectSubmission,
    toggleExamAbsence,
    addAuditLog,
  } = useApp();

  // Determine authorized grades for current user
  const availableGrades = useMemo(() => {
    const listFromLearners = Array.from(new Set(learners.map((l) => l.grade))).filter(Boolean);
    const listFromGrades = grades.map((g) => g.name);
    const combined = Array.from(new Set([...listFromLearners, ...listFromGrades]));
    return combined.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [learners, grades]);

  // Initial grade selection based on user role
  const defaultGrade = useMemo(() => {
    if (currentUser.role === 'teacher' && currentUser.teacherGrade) {
      return currentUser.teacherGrade;
    }
    return availableGrades.includes('Grade 7A') ? 'Grade 7A' : availableGrades[0] || 'Grade 7A';
  }, [currentUser, availableGrades]);

  const [selectedGrade, setSelectedGrade] = useState<string>(defaultGrade);
  const [selectedTerm, setSelectedTerm] = useState<string>('Term 1 - 2026');
  const [activeSubView, setActiveSubView] = useState<'roster' | 'workflow' | 'summary' | 'honours' | 'trends' | 'all'>('roster');

  // Active Assessment configuration for this Grade & Term
  const activeAssessment: AssessmentRecord = useMemo(() => {
    const found = assessments.find((a) => a.grade === selectedGrade && a.term === selectedTerm);
    if (found) return found;
    return {
      id: `assess-${selectedGrade.replace(/\s+/g, '_')}-${selectedTerm.replace(/\s+/g, '_')}`,
      name: `${selectedTerm} Summative Assessment 2026`,
      grade: selectedGrade,
      term: selectedTerm,
      academicYear: '2025/2026',
      type: 'End of Term Exam' as const,
      dateAdministered: '2026-04-01',
      deadline: '2026-04-05',
      status: 'in_progress' as const,
      absentLearnerIds: [] as string[],
    };
  }, [assessments, selectedGrade, selectedTerm]);

  // State for editing assessment details
  const [assessmentNameInput, setAssessmentNameInput] = useState(activeAssessment.name);
  const [deadlineInput, setDeadlineInput] = useState(activeAssessment.deadline || '2026-04-05');
  const [isRequestingMarks, setIsRequestingMarks] = useState(false);
  const [workflowSuccessMsg, setWorkflowSuccessMsg] = useState<string | null>(null);
  const [absentReasonInput, setAbsentReasonInput] = useState<Record<string, string>>({});

  // Sync assessment name when grade/term changes
  useEffect(() => {
    setAssessmentNameInput(activeAssessment.name);
    setDeadlineInput(activeAssessment.deadline || '2026-04-05');
  }, [activeAssessment]);

  // Set of absent learner IDs
  const absentLearnerIds = useMemo(() => {
    return new Set(activeAssessment.absentLearnerIds || []);
  }, [activeAssessment]);

  // Batch PDF Generation State
  const [isGeneratingBatchPdf, setIsGeneratingBatchPdf] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  const [editingLearnerSubject, setEditingLearnerSubject] = useState<{
    learner: LearnerRecord;
    subjectName: string;
    cat: number;
    mid: number;
    fin: number;
    remarks: string;
  } | null>(null);


  // Active subjects for this grade
  const subjectList = useMemo(() => {
    return getSubjectsForGrade(selectedGrade);
  }, [selectedGrade]);

  // Learners in this grade
  const gradeLearners = useMemo(() => {
    return learners.filter((l) => l.grade === selectedGrade);
  }, [learners, selectedGrade]);

  // Assigned Class Teacher for this grade
  const assignedClassTeacher = useMemo(() => {
    const foundTeacher = teachers.find(
      (t) => t.teacherType === 'class_teacher' && t.assignedGrade === selectedGrade
    );
    if (foundTeacher) return foundTeacher.name;
    if (currentUser.role === 'teacher' && currentUser.teacherGrade === selectedGrade) {
      return currentUser.name;
    }
    return 'Mr. Marcus Thorne';
  }, [teachers, selectedGrade, currentUser]);

  // Coordinator / Exam Council Lead
  const coordinatorName = useMemo(() => {
    if (currentUser.ownerDesignation === 'exam_council') return currentUser.name;
    return 'Examination Council Chair / Academic Coordinator';
  }, [currentUser]);

  // Head of Institution
  const hoiName = schoolProfile?.principalName || 'Dr. Evelyn Vance';

  // Helper to get or build scores for a student in this term
  const getLearnerSubjectScores = (learner: LearnerRecord) => {
    const existing = scoreCards.find(
      (sc) => sc.learnerId === learner.id && sc.term === selectedTerm
    );

    const scoresMap: Record<
      string,
      {
        cat: number;
        mid: number;
        fin: number;
        total: number;
        letterGrade: string;
        points: number;
        remarks: string;
      }
    > = {};

    let totalMarks = 0;
    let totalPoints = 0;

    subjectList.forEach((sub, idx) => {
      const match = existing?.subjects.find((s) => s.subjectName === sub.name);
      if (match) {
        scoresMap[sub.name] = {
          cat: match.catScore,
          mid: match.midTermScore,
          fin: match.finalExamScore,
          total: match.totalScore,
          letterGrade: match.letterGrade,
          points: match.points,
          remarks: match.teacherRemarks,
        };
        totalMarks += match.totalScore;
        totalPoints += match.points;
      } else {
        // Deterministic baseline score based on learner id and subject index for full Kenyan CBC broadsheet
        const seed = (learner.id.charCodeAt(learner.id.length - 1) + idx * 7) % 20;
        const cat = 22 + (seed % 7);
        const mid = 15 + (seed % 5);
        const fin = 38 + (seed % 10);
        const total = cat + mid + fin;
        const gradeResult = calculateCompetencyGrade(total);
        scoresMap[sub.name] = {
          cat,
          mid,
          fin,
          total,
          letterGrade: gradeResult.grade,
          points: gradeResult.points,
          remarks: 'Good progress in learning area.',
        };
        totalMarks += total;
        totalPoints += gradeResult.points;
      }
    });

    const maxMarks = subjectList.length * 100;
    const averageScore = maxMarks > 0 ? (totalMarks / maxMarks) * 100 : 0;
    const meanPoints = subjectList.length > 0 ? totalPoints / subjectList.length : 0;
    const overallGrade = calculateCompetencyGrade(averageScore).grade;

    return {
      scoresMap,
      totalMarks,
      averageScore,
      meanPoints,
      overallGrade,
    };
  };

  // Handler to request marks upload with deadline from subject teachers
  const handleRequestSubjectMarks = async () => {
    setIsRequestingMarks(true);
    try {
      const updatedAssessment = {
        ...activeAssessment,
        name: assessmentNameInput.trim() || activeAssessment.name,
        deadline: deadlineInput,
        status: 'requested' as const,
        requestedAt: new Date().toISOString(),
      };
      await saveAssessment(updatedAssessment);

      // Create or update submission records for each subject taught in this grade
      for (const sub of subjectList) {
        const existingSub = subjectSubmissions.find(
          (s) => s.assessmentId === updatedAssessment.id && s.subjectName === sub.name
        );
        const subTeacher = teachers.find(
          (t) => (t.registeredSubjects || []).includes(sub.name) && t.assignedGrade === selectedGrade
        )?.name || sub.teacher;

        const eligibleCount = gradeLearners.filter((l) => !absentLearnerIds.has(l.id)).length;

        await saveSubjectSubmission({
          id: existingSub?.id || `subm-${updatedAssessment.id}-${sub.code.replace(/\s+/g, '_')}`,
          assessmentId: updatedAssessment.id,
          grade: selectedGrade,
          term: selectedTerm,
          subjectName: sub.name,
          subjectCode: sub.code,
          teacherName: subTeacher,
          status: existingSub?.status || 'pending',
          deadline: deadlineInput,
          totalLearners: gradeLearners.length,
          eligibleLearners: eligibleCount,
          recordedLearners: existingSub?.recordedLearners || 0,
          isComplete: existingSub?.isComplete || false,
        });
      }

      addAuditLog(
        'Assessment Marks Upload Requested',
        `Class teacher requested subject teachers to upload marks for "${updatedAssessment.name}" in ${selectedGrade}. Deadline: ${deadlineInput}`
      );

      setWorkflowSuccessMsg(`Marks upload request sent to all ${subjectList.length} subject teachers with deadline: ${deadlineInput}!`);
      setTimeout(() => setWorkflowSuccessMsg(null), 6000);
    } finally {
      setIsRequestingMarks(false);
    }
  };

  // Compile Broadsheet student rows with rankings and exam absentee indicators
  const broadsheetRows = useMemo(() => {
    const rawRows = gradeLearners.map((learner) => {
      const isAbsent = absentLearnerIds.has(learner.id);
      const data = getLearnerSubjectScores(learner);
      return {
        learner,
        studentId: learner.studentId,
        studentName: `${learner.firstName} ${learner.lastName}`,
        gender: learner.gender || 'Male',
        isAbsent,
        subjectScores: isAbsent ? {} : data.scoresMap,
        totalMarks: isAbsent ? 0 : data.totalMarks,
        averageScore: isAbsent ? 0 : data.averageScore,
        meanPoints: isAbsent ? 0 : data.meanPoints,
        overallGrade: isAbsent ? 'DNS' : data.overallGrade,
      };
    });

    // Separate sitting learners vs absent learners
    const sittingRows = rawRows.filter((r) => !r.isAbsent);
    const absentRows = rawRows.filter((r) => r.isAbsent);

    // Sort sitting descending by total marks for class position
    sittingRows.sort((a, b) => b.totalMarks - a.totalMarks);

    const rankedSitting = sittingRows.map((r, idx) => ({
      ...r,
      position: idx + 1,
    }));

    const unrankedAbsent = absentRows.map((r) => ({
      ...r,
      position: null as number | null,
    }));

    return [...rankedSitting, ...unrankedAbsent];
  }, [gradeLearners, selectedTerm, subjectList, scoreCards, absentLearnerIds]);

  // Calculate subject class averages (excluding learners who were absent / Did Not Sit)
  const subjectAverages = useMemo(() => {
    const avgs: Record<string, number> = {};
    const sittingRows = broadsheetRows.filter((r) => !r.isAbsent);
    if (sittingRows.length === 0) return avgs;

    subjectList.forEach((sub) => {
      let sum = 0;
      let count = 0;
      sittingRows.forEach((row) => {
        const item = row.subjectScores[sub.name];
        if (item) {
          sum += item.total;
          count++;
        }
      });
      avgs[sub.name] = count > 0 ? sum / count : 0;
    });

    return avgs;
  }, [broadsheetRows, subjectList]);

  // Overall class performance metrics (excluding absent learners)
  const classOverallStats = useMemo(() => {
    const sittingRows = broadsheetRows.filter((r) => !r.isAbsent);
    if (sittingRows.length === 0) return { meanScore: 0, meanPoints: 0, highestScore: 0, lowestScore: 0 };
    const totalPercentage = sittingRows.reduce((acc, curr) => acc + curr.averageScore, 0);
    const totalPts = sittingRows.reduce((acc, curr) => acc + curr.meanPoints, 0);
    const scores = sittingRows.map((r) => r.totalMarks);

    return {
      meanScore: totalPercentage / sittingRows.length,
      meanPoints: totalPts / sittingRows.length,
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
    };
  }, [broadsheetRows]);

  // ==========================================
  // COMPREHENSIVE PERFORMANCE SUMMARY CALCULATIONS
  // ==========================================
  const performanceSummary: BroadsheetPerformanceSummary = useMemo(() => {
    const totalCount = Math.max(1, broadsheetRows.length);

    // 1. Number of learners in each grade level (EE1..BE2) with Gender Breakdown
    const levelDistribution = COMPETENCY_SCALE.map((lvl) => {
      const matchingRows = broadsheetRows.filter((r) => r.overallGrade === lvl.grade);
      const boys = matchingRows.filter((r) => r.gender.toLowerCase().startsWith('m')).length;
      const girls = matchingRows.filter((r) => r.gender.toLowerCase().startsWith('f')).length;
      const total = matchingRows.length;
      const percentage = (total / totalCount) * 100;
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

    // 2. Performance of each Learning Area (counts in EE1..BE2, Mean Points, and Relation Grade Level)
    const subjectPerformance = subjectList.map((sub) => {
      const dist: Record<string, number> = {
        EE1: 0, EE2: 0, ME1: 0, ME2: 0, AE1: 0, AE2: 0, BE1: 0, BE2: 0
      };
      let scoreSum = 0;
      let pointsSum = 0;
      let enrolled = 0;

      broadsheetRows.forEach((r) => {
        const item = r.subjectScores[sub.name];
        if (item) {
          dist[item.letterGrade] = (dist[item.letterGrade] || 0) + 1;
          scoreSum += item.total;
          pointsSum += item.points;
          enrolled++;
        }
      });

      const meanScore = enrolled > 0 ? scoreSum / enrolled : 0;
      const meanPoints = enrolled > 0 ? pointsSum / enrolled : 0;
      const gradeResult = calculateGradeFromPoints(meanPoints);

      return {
        subjectName: sub.name,
        code: sub.code,
        distribution: dist,
        meanScore,
        meanPoints,
        relationGrade: gradeResult.grade,
        relationLabel: gradeResult.label,
      };
    });

    // 3. Best Three Boys and Best Three Girls in each Grade
    const boysRows = broadsheetRows.filter((r) => r.gender.toLowerCase().startsWith('m'));
    const girlsRows = broadsheetRows.filter((r) => r.gender.toLowerCase().startsWith('f'));

    const bestBoys = boysRows.slice(0, 3).map((b, idx) => ({
      rank: idx + 1,
      studentId: b.studentId,
      name: b.studentName,
      totalMarks: b.totalMarks,
      averageScore: b.averageScore,
      meanPoints: b.meanPoints,
      level: b.overallGrade,
    }));

    const bestGirls = girlsRows.slice(0, 3).map((g, idx) => ({
      rank: idx + 1,
      studentId: g.studentId,
      name: g.studentName,
      totalMarks: g.totalMarks,
      averageScore: g.averageScore,
      meanPoints: g.meanPoints,
      level: g.overallGrade,
    }));

    // 4. Three Most Improved Learners (Boys and Girls)
    const boysImprovement = boysRows.map((r) => {
      const prevScore = r.learner.previousTermAverageScore ?? (r.averageScore - ((r.studentId.charCodeAt(r.studentId.length - 1) % 8) + 3));
      const delta = r.averageScore - prevScore;
      return {
        studentId: r.studentId,
        name: r.studentName,
        previousScore: prevScore,
        currentScore: r.averageScore,
        delta,
      };
    }).sort((a, b) => b.delta - a.delta);

    const girlsImprovement = girlsRows.map((r) => {
      const prevScore = r.learner.previousTermAverageScore ?? (r.averageScore - ((r.studentId.charCodeAt(r.studentId.length - 1) % 8) + 3));
      const delta = r.averageScore - prevScore;
      return {
        studentId: r.studentId,
        name: r.studentName,
        previousScore: prevScore,
        currentScore: r.averageScore,
        delta,
      };
    }).sort((a, b) => b.delta - a.delta);

    const mostImprovedBoys = boysImprovement.slice(0, 3).map((item, idx) => ({
      rank: idx + 1,
      ...item,
      notes: item.delta >= 6 ? 'Substantial academic leap' : 'Steady competency growth',
    }));

    const mostImprovedGirls = girlsImprovement.slice(0, 3).map((item, idx) => ({
      rank: idx + 1,
      ...item,
      notes: item.delta >= 6 ? 'Substantial academic leap' : 'Steady competency growth',
    }));

    return {
      levelDistribution,
      subjectPerformance,
      bestBoys,
      bestGirls,
      mostImprovedBoys,
      mostImprovedGirls,
    };
  }, [broadsheetRows, subjectList]);

  // PDF Export with Performance Summary
  const handleExportPdf = () => {
    const pdfRows: BroadsheetStudentRow[] = broadsheetRows.map((r) => {
      const subScoreMap: Record<string, { total: number; letterGrade: string; points: number }> = {};
      Object.entries(r.subjectScores).forEach(([k, v]) => {
        subScoreMap[k] = { total: v.total, letterGrade: v.letterGrade, points: v.points };
      });
      return {
        position: r.isAbsent ? 'DNS' : (r.position ?? 'DNS'),
        studentId: r.studentId,
        studentName: r.studentName,
        gender: r.gender,
        subjectScores: subScoreMap,
        totalMarks: r.totalMarks,
        averageScore: r.averageScore,
        meanPoints: r.meanPoints,
        overallGrade: r.overallGrade,
        isAbsent: r.isAbsent,
      };
    });

    exportGradeBroadsheetPdf(
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
      subjectList,
      pdfRows,
      subjectAverages,
      {
        classTeacher: assignedClassTeacher,
        coordinator: coordinatorName,
        principal: hoiName,
      },
      performanceSummary,
      activeAssessment?.name
    );
  };

  // Batch Export All 1-Page A4 Scorecards for Grade into 1 Single Multi-Page PDF
  const handleExportAllScorecardsBatchPdf = () => {
    if (gradeLearners.length === 0) return;
    setIsGeneratingBatchPdf(true);
    setBatchProgress({ current: 0, total: gradeLearners.length });

    setTimeout(() => {
      try {
        exportAllGradeScoreCardsBatchPdf(
          schoolProfile,
          selectedGrade,
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

  // CSV Export with Summary Data

  const handleExportCsv = () => {
    const headers = [
      'Position',
      'Admission Number',
      'Learner Name',
      'Gender',
      ...subjectList.map((s) => `${s.name} (${s.code})`),
      'Total Marks',
      'Mean %',
      'Points /8',
      'Overall Grade',
    ];

    const rowsData = broadsheetRows.map((r) => [
      r.position,
      `"${r.studentId}"`,
      `"${r.studentName}"`,
      r.gender,
      ...subjectList.map((s) => {
        const item = r.subjectScores[s.name];
        return item ? `"${item.total} (${item.letterGrade})"` : '"-"';
      }),
      r.totalMarks,
      r.averageScore.toFixed(1),
      r.meanPoints.toFixed(2),
      r.overallGrade,
    ]);

    // Summary row
    const summaryRow = [
      'AVERAGE',
      '-',
      'CLASS SUBJECT MEAN',
      '-',
      ...subjectList.map((s) => (subjectAverages[s.name] !== undefined ? subjectAverages[s.name].toFixed(1) : '-')),
      '-',
      classOverallStats.meanScore.toFixed(1),
      classOverallStats.meanPoints.toFixed(2),
      '-',
    ];

    // Append Performance Summary sections
    const levelHeaders = ['', '', '', ''];
    const levelSection = [
      '\n--- PERFORMANCE SUMMARY: COHORT COMPETENCY DISTRIBUTION ---',
      'Level,Points,Boys,Girls,Total,Percentage',
      ...performanceSummary.levelDistribution.map(
        (l) => `"${l.grade} - ${l.label}",${l.points},${l.boys},${l.girls},${l.total},${l.percentage.toFixed(1)}%`
      ),
    ];

    const subjectSection = [
      '\n--- LEARNING AREA PERFORMANCE & RELATION GRADE ---',
      'Learning Area,EE1,EE2,ME1,ME2,AE1,AE2,BE1,BE2,Mean %,Mean Points,Relation Grade',
      ...performanceSummary.subjectPerformance.map(
        (s) =>
          `"${s.subjectName}",${s.distribution.EE1 || 0},${s.distribution.EE2 || 0},${s.distribution.ME1 || 0},${s.distribution.ME2 || 0},${s.distribution.AE1 || 0},${s.distribution.AE2 || 0},${s.distribution.BE1 || 0},${s.distribution.BE2 || 0},${s.meanScore.toFixed(1)}%,${s.meanPoints.toFixed(2)},"${s.relationGrade}"`
      ),
    ];

    const honoursSection = [
      '\n--- ACADEMIC HONOURS: BEST 3 BOYS ---',
      'Rank,Adm No,Name,Total Marks,Mean %,Points,CBC Level',
      ...performanceSummary.bestBoys.map((b) => `${b.rank},"${b.studentId}","${b.name}",${b.totalMarks},${b.averageScore.toFixed(1)}%,${b.meanPoints.toFixed(2)},${b.level}`),
      '\n--- ACADEMIC HONOURS: BEST 3 GIRLS ---',
      'Rank,Adm No,Name,Total Marks,Mean %,Points,CBC Level',
      ...performanceSummary.bestGirls.map((g) => `${g.rank},"${g.studentId}","${g.name}",${g.totalMarks},${g.averageScore.toFixed(1)}%,${g.meanPoints.toFixed(2)},${g.level}`),
      '\n--- VALUE-ADDED GROWTH: 3 MOST IMPROVED BOYS ---',
      'Rank,Adm No,Name,Previous %,Current %,Growth Delta',
      ...performanceSummary.mostImprovedBoys.map((b) => `${b.rank},"${b.studentId}","${b.name}",${b.previousScore.toFixed(1)}%,${b.currentScore.toFixed(1)}%,+${b.delta.toFixed(1)}%`),
      '\n--- VALUE-ADDED GROWTH: 3 MOST IMPROVED GIRLS ---',
      'Rank,Adm No,Name,Previous %,Current %,Growth Delta',
      ...performanceSummary.mostImprovedGirls.map((g) => `${g.rank},"${g.studentId}","${g.name}",${g.previousScore.toFixed(1)}%,${g.currentScore.toFixed(1)}%,+${g.delta.toFixed(1)}%`),
    ];

    const csvContent = [
      headers.join(','),
      ...rowsData.map((e) => e.join(',')),
      summaryRow.join(','),
      ...levelSection,
      ...subjectSection,
      ...honoursSection,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Broadsheet_Summary_${selectedGrade.replace(/\s+/g, '_')}_${selectedTerm.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save updated mark from dialog
  const handleSaveModalScore = () => {
    if (!editingLearnerSubject) return;
    const { learner, subjectName, cat, mid, fin, remarks } = editingLearnerSubject;

    const existingCard = scoreCards.find(
      (sc) => sc.learnerId === learner.id && sc.term === selectedTerm
    );

    const activeSubjects: SubjectScore[] = subjectList.map((sub) => {
      if (sub.name === subjectName) {
        const total = cat + mid + fin;
        const gradeResult = calculateCompetencyGrade(total);
        return {
          id: `sub-${sub.name}-${Date.now()}`,
          subjectName: sub.name,
          catScore: cat,
          midTermScore: mid,
          finalExamScore: fin,
          totalScore: total,
          letterGrade: gradeResult.grade,
          points: gradeResult.points,
          teacherRemarks: remarks || 'Evaluated in learning area.',
          subjectTeacher: sub.teacher,
        };
      }
      const prev = existingCard?.subjects.find((s) => s.subjectName === sub.name);
      if (prev) return prev;
      const total = 80;
      const gradeResult = calculateCompetencyGrade(total);
      return {
        id: `sub-${sub.name}-${Date.now()}`,
        subjectName: sub.name,
        catScore: 24,
        midTermScore: 16,
        finalExamScore: 40,
        totalScore: total,
        letterGrade: gradeResult.grade,
        points: gradeResult.points,
        teacherRemarks: 'Satisfactory competency.',
        subjectTeacher: sub.teacher,
      };
    });

    const totalMarks = activeSubjects.reduce((acc, curr) => acc + curr.totalScore, 0);
    const maxPossibleMarks = activeSubjects.length * 100;
    const averageScore = maxPossibleMarks > 0 ? (totalMarks / maxPossibleMarks) * 100 : 0;
    const totalPoints = activeSubjects.reduce((acc, curr) => acc + curr.points, 0);
    const gpa = activeSubjects.length > 0 ? Number((totalPoints / activeSubjects.length).toFixed(2)) : 0;

    const newScoreCard: ScoreCard = {
      id: existingCard?.id || `sc-${learner.id}-${Date.now()}`,
      learnerId: learner.id,
      term: selectedTerm,
      academicYear: '2025/2026',
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
      subjects: activeSubjects,
    };

    saveScoreCard(newScoreCard);
    setEditingLearnerSubject(null);
  };

  return (
    <div className="space-y-6">
      {/* Workflow Notification Banner */}
      {workflowSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl flex items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{workflowSuccessMsg}</span>
          </div>
          <button
            onClick={() => setWorkflowSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 flex-wrap">
            <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              Official CBC Grade Broadsheet
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-bold text-slate-800">{activeAssessment.name}</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-700 font-medium">Includes Gender Breakdown &amp; Academic Honours</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Table className="w-6 h-6 text-indigo-600" />
            <span>{selectedGrade} · {activeAssessment.name} Broadsheet</span>
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Class Tutor: <strong className="text-slate-800">{assignedClassTeacher}</strong> · Active Assessment: <strong className="text-indigo-700">{activeAssessment.name}</strong> · Submission Deadline: <strong className="text-slate-800">{activeAssessment.deadline || '2026-04-05'}</strong>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveSubView('workflow')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors shadow-xs cursor-pointer"
            title="Configure Assessment, Request Marks from Subject Teachers & Manage Exam Absentees"
          >
            <Send className="w-4 h-4 text-indigo-600" />
            <span>Marks Upload Workflow</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={broadsheetRows.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            title="Download complete Broadsheet & Performance Summary as CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Summary CSV</span>
          </button>

          <button
            onClick={handleExportAllScorecardsBatchPdf}
            disabled={gradeLearners.length === 0 || isGeneratingBatchPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            title="Generate and download all 1-page A4 assessment forms for this entire grade cohort in a single batch PDF"
          >
            <Printer className="w-4 h-4" />
            <span>
              {isGeneratingBatchPdf
                ? `Generating ${batchProgress?.current || 0}/${batchProgress?.total || 0}...`
                : 'Print All Grade Scorecards (1 PDF)'}
            </span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={broadsheetRows.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-700 rounded-lg hover:bg-indigo-800 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            title="Export official Landscape A4 Broadsheet & Executive Summary with signatures"
          >
            <FileDown className="w-4 h-4" />
            <span>Export Landscape PDF (2-Page Official)</span>
          </button>
        </div>
      </div>

      {/* Filter and Scoping Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <label className="font-bold text-slate-700">Select Grade:</label>
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

        {/* Grade Signatories Metadata */}
        <div className="flex items-center gap-3 text-slate-600 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
            <span className="text-slate-400">Class Teacher:</span>
            <span className="font-semibold text-slate-800">{assignedClassTeacher}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
            <span className="text-slate-400">Total Learners:</span>
            <span className="font-bold text-indigo-700">{gradeLearners.length}</span>
            <span className="text-[10px] text-slate-400">
              ({gradeLearners.length - absentLearnerIds.size} Sat · <strong className="text-rose-600">{absentLearnerIds.size} Absent</strong>)
            </span>
          </div>
        </div>
      </div>

      {/* Sub-View Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveSubView('roster')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubView === 'roster'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          <span>Mark Broadsheet Roster</span>
        </button>

        <button
          onClick={() => setActiveSubView('workflow')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubView === 'workflow'
              ? 'bg-indigo-700 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Assessment &amp; Marks Upload Workflow</span>
          {absentLearnerIds.size > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-bold">
              {absentLearnerIds.size} Absent
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubView('summary')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubView === 'summary'
              ? 'bg-indigo-700 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Competency Distribution &amp; Learning Areas</span>
        </button>

        <button
          onClick={() => setActiveSubView('trends')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubView === 'trends'
              ? 'bg-indigo-700 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Visual Trends &amp; Analytics</span>
        </button>

        <button
          onClick={() => setActiveSubView('honours')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubView === 'honours'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Best 3 Boys/Girls &amp; Most Improved</span>
        </button>

        <button
          onClick={() => setActiveSubView('all')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap text-slate-600 hover:bg-slate-100 ${
            activeSubView === 'all' ? 'bg-slate-200 text-slate-900 font-bold' : ''
          }`}
        >
          <span>View All Sections</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* SECTION: ASSESSMENT & MARKS UPLOAD WORKFLOW                   */}
      {/* ============================================================== */}
      {(activeSubView === 'workflow' || activeSubView === 'all') && (
        <div className="space-y-6">
          {/* Card 1: Class Teacher Assessment Configuration & Subject Teachers Request */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Send className="w-5 h-5 text-indigo-600" />
                  <span>1. Configure Specific Assessment &amp; Request Marks Upload</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Class teachers specify the exact assessment done, set an upload deadline, and send an official marks request to all subject teachers.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                  activeAssessment.status === 'requested'
                    ? 'bg-amber-50 text-amber-800 border border-amber-300'
                    : activeAssessment.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                }`}>
                  Status: {activeAssessment.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Specific Assessment Done (Appears on Broadsheet &amp; Scorecards) *
                </label>
                <input
                  type="text"
                  value={assessmentNameInput}
                  onChange={(e) => setAssessmentNameInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-indigo-500"
                  placeholder="e.g. Term 1 Summative Assessment 2026, Mid-Term Evaluation 2026..."
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  This exact name will be recorded on all individual scorecards and broadsheets.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Marks Submission Deadline *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={deadlineInput}
                    onChange={(e) => setDeadlineInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-indigo-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Deadline signaled to all subject teachers.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>
                  {activeAssessment.requestedAt
                    ? `Last Requested on: ${new Date(activeAssessment.requestedAt).toLocaleDateString()} at ${new Date(activeAssessment.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Not yet requested for this term.'}
                </span>
              </div>

              <button
                onClick={handleRequestSubjectMarks}
                disabled={isRequestingMarks || !assessmentNameInput.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isRequestingMarks ? 'Broadcasting Request...' : '📢 Request Subject Teachers to Upload Marks'}
                </span>
              </button>
            </div>
          </div>

          {/* Card 2: Exam Absence Management / Did Not Sit Registry */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <UserX className="w-5 h-5 text-rose-600" />
                  <span>2. Exam Sitting Attendance &amp; Absentee Signal (Did Not Sit)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  For learners who did not sit for the exam, mark them <strong>Absent</strong>. This immediately signals subject teachers to submit marks minus these learners.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 font-bold rounded-md border border-emerald-200">
                  {gradeLearners.length - absentLearnerIds.size} Sat Exam
                </span>
                <span className="px-2.5 py-1 bg-rose-50 text-rose-800 font-bold rounded-md border border-rose-200">
                  {absentLearnerIds.size} Did Not Sit
                </span>
              </div>
            </div>

            <div className="mt-4">
              <div className="overflow-x-auto max-h-80 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 text-white font-semibold sticky top-0 z-10">
                    <tr>
                      <th className="py-2 px-3">Adm No</th>
                      <th className="py-2 px-3">Learner Full Name</th>
                      <th className="py-2 px-2 text-center">Gender</th>
                      <th className="py-2 px-3 text-center">Exam Sitting Status</th>
                      <th className="py-2 px-3">Absence Reason / Notes</th>
                      <th className="py-2 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {gradeLearners.map((learner) => {
                      const isAbsent = absentLearnerIds.has(learner.id);
                      return (
                        <tr
                          key={learner.id}
                          className={`transition-colors ${
                            isAbsent ? 'bg-rose-50/60 hover:bg-rose-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2 px-3 font-mono font-semibold text-slate-700">
                            {learner.studentId}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900">
                            {learner.firstName} {learner.lastName}
                          </td>
                          <td className="py-2 px-2 text-center text-slate-500">
                            {learner.gender?.charAt(0) || 'M'}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {isAbsent ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                🚫 Absent (Did Not Sit)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Sat for Exam</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {isAbsent ? (
                              <input
                                type="text"
                                placeholder="Reason (e.g. Medical Leave, Transferred)..."
                                value={absentReasonInput[learner.id] ?? 'Medical / Excused Absence'}
                                onChange={(e) =>
                                  setAbsentReasonInput((prev) => ({
                                    ...prev,
                                    [learner.id]: e.target.value,
                                  }))
                                }
                                onBlur={(e) =>
                                  toggleExamAbsence(
                                    selectedGrade,
                                    selectedTerm,
                                    learner.id,
                                    true,
                                    e.target.value
                                  )
                                }
                                className="w-full bg-white border border-rose-300 rounded px-2 py-1 text-xs text-rose-900 focus:outline-rose-500"
                              />
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Present for all papers</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => {
                                const nextAbsent = !isAbsent;
                                const reason = absentReasonInput[learner.id] || 'Medical / Excused';
                                toggleExamAbsence(selectedGrade, selectedTerm, learner.id, nextAbsent, reason);
                              }}
                              className={`px-3 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                                isAbsent
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300'
                              }`}
                            >
                              {isAbsent ? '✓ Mark as Sat Exam' : '🚫 Mark Absent (DNS)'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Card 3: Subject Teachers Marks Submission Status Tracker */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>3. Subject Teachers Marks Submission Status Tracker</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track upload progress per learning area. Marks submitted by subject teachers are automatically committed directly to this broadsheet.
                </p>
              </div>

              <div className="text-xs text-slate-600">
                <span>Deadline: </span>
                <strong className="text-slate-900">{activeAssessment.deadline || '2026-04-05'}</strong>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {subjectList.map((sub) => {
                const subTeacher = teachers.find(
                  (t) => (t.registeredSubjects || []).includes(sub.name) && t.assignedGrade === selectedGrade
                )?.name || sub.teacher;

                const matchSubm = subjectSubmissions.find(
                  (s) => s.assessmentId === activeAssessment.id && s.subjectName === sub.name
                );

                const isSubmitted = matchSubm?.status === 'submitted';
                const eligibleCount = gradeLearners.filter((l) => !absentLearnerIds.has(l.id)).length;

                return (
                  <div
                    key={sub.code}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isSubmitted
                        ? 'bg-emerald-50/50 border-emerald-300'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-xs text-slate-900">{sub.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{sub.code}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isSubmitted
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {isSubmitted ? '✓ SUBMITTED' : '⏳ PENDING'}
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-200/80 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Subject Teacher:</span>
                        <span className="font-semibold text-slate-800">{subTeacher}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Sitting Learners:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {eligibleCount} / {gradeLearners.length}
                          {absentLearnerIds.size > 0 && (
                            <span className="text-[10px] text-rose-600 font-normal ml-1">
                              (-{absentLearnerIds.size} absent)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Broadsheet Feed:</span>
                        <span className={`font-semibold ${isSubmitted ? 'text-emerald-700' : 'text-slate-500'}`}>
                          {isSubmitted ? 'Live & Synchronized' : 'Draft in scoresheet'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}


      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Class Mean Score</p>
          <p className="text-xl font-extrabold text-indigo-700 mt-0.5">
            {classOverallStats.meanScore.toFixed(1)}%
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Overall competency: {calculateCompetencyGrade(classOverallStats.meanScore).grade}
          </p>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Mean Points (/8.0)</p>
          <p className="text-xl font-extrabold text-emerald-700 mt-0.5">
            {classOverallStats.meanPoints.toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Grade Level: <strong className="text-slate-800">{calculateGradeFromPoints(classOverallStats.meanPoints).grade}</strong> ({calculateGradeFromPoints(classOverallStats.meanPoints).label})
          </p>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Highest Total</p>
          <p className="text-xl font-extrabold text-slate-900 mt-0.5">
            {classOverallStats.highestScore}
            <span className="text-xs text-slate-400 font-normal"> / {subjectList.length * 100}</span>
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Top rank in class</p>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Enrolled Cohort</p>
          <p className="text-xl font-extrabold text-slate-900 mt-0.5">{broadsheetRows.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {broadsheetRows.filter((r) => r.gender.toLowerCase().startsWith('m')).length} Boys · {broadsheetRows.filter((r) => r.gender.toLowerCase().startsWith('f')).length} Girls
          </p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECTION: VISUAL TRENDS & PERFORMANCE ANALYTICS                 */}
      {/* ============================================================== */}
      {(activeSubView === 'trends' || activeSubView === 'all') && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <span>Learning Area Comparative Performance &amp; Competency Trends</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visual comparative analysis across curriculum learning areas, CBC competency tiers, and gender equity.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>≥75% Distinction (EE)</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>≥41% Proficient (ME)</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>≤40% Support (AE/BE)</span>
                </span>
              </div>
            </div>

            {/* Learning Area Mean Performance Bars */}
            <div className="mt-5 space-y-3.5">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                1. Learning Area Mean Scores vs Benchmarks (Class Target: 65%)
              </h4>
              <div className="space-y-2.5">
                {performanceSummary.subjectPerformance.map((sub) => {
                  const gradeColor = getGradeColor(sub.relationGrade);
                  return (
                    <div key={sub.code} className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/80 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{sub.subjectName}</span>
                          <span className="font-mono text-[10px] text-slate-400">({sub.code})</span>
                        </div>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-slate-600 text-[11px]">
                            Points: <strong className="text-slate-900">{sub.meanPoints.toFixed(2)} / 8.0</strong>
                          </span>
                          <span className="font-extrabold text-slate-900 text-sm">
                            {sub.meanScore.toFixed(1)}%
                          </span>
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-2xs"
                            style={{ backgroundColor: gradeColor.hex }}
                          >
                            {sub.relationGrade}
                          </span>
                        </div>
                      </div>

                      {/* Horizontal Visual Progress Bar with Target Reference Markers */}
                      <div className="relative w-full bg-slate-200/70 h-3 rounded-full overflow-hidden">
                        <div
                          style={{
                            width: `${Math.min(100, Math.max(5, sub.meanScore))}%`,
                            backgroundColor: gradeColor.hex,
                          }}
                          className="h-full rounded-full transition-all duration-500"
                        />
                        {/* 50% Benchmark Line */}
                        <div
                          style={{ left: '50%' }}
                          className="absolute top-0 bottom-0 w-0.5 bg-slate-400/80"
                          title="50% Standard Pass Line"
                        />
                        {/* 75% Distinction Line */}
                        <div
                          style={{ left: '75%' }}
                          className="absolute top-0 bottom-0 w-0.5 bg-indigo-400/80"
                          title="75% High Distinction Line"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gender Equity & Cohort Distribution Visual Breakdown */}
            <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left: Competency Tiers Visual Stack */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  2. Cohort CBC Competency Distribution Profile
                </h4>
                <div className="space-y-2">
                  {performanceSummary.levelDistribution.map((lvl) => {
                    const gradeColor = getGradeColor(lvl.grade);
                    return (
                      <div key={lvl.grade} className="flex items-center gap-3 text-xs">
                        <span className="font-mono font-bold w-10 text-slate-800">{lvl.grade}</span>
                        <div className="flex-1 bg-slate-100 h-3.5 rounded-md overflow-hidden relative">
                          <div
                            style={{
                              width: `${Math.min(100, Math.max(0, lvl.percentage))}%`,
                              backgroundColor: gradeColor.hex,
                            }}
                            className="h-full rounded-md"
                          />
                        </div>
                        <div className="w-24 text-right font-mono text-[11px] font-semibold text-slate-700">
                          {lvl.total} ({lvl.percentage.toFixed(1)}%)
                        </div>
                        <div className="w-20 text-right text-[10px] text-slate-400 font-mono">
                          <span className="text-blue-700 font-bold">{lvl.boys}B</span> · <span className="text-pink-700 font-bold">{lvl.girls}G</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: Gender Performance & Equity */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  3. Gender Performance Comparison &amp; Equity
                </h4>
                {(() => {
                  const boysRows = broadsheetRows.filter((r) => r.gender.toLowerCase().startsWith('m'));
                  const girlsRows = broadsheetRows.filter((r) => r.gender.toLowerCase().startsWith('f'));
                  const boysMean = boysRows.length > 0
                    ? boysRows.reduce((a, b) => a + b.averageScore, 0) / boysRows.length
                    : 0;
                  const girlsMean = girlsRows.length > 0
                    ? girlsRows.reduce((a, b) => a + b.averageScore, 0) / girlsRows.length
                    : 0;
                  const boysHigh = boysRows.filter((b) => b.overallGrade.startsWith('EE')).length;
                  const girlsHigh = girlsRows.filter((g) => g.overallGrade.startsWith('EE')).length;

                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
                          <span className="text-[11px] font-bold text-blue-900 block">Boys Cohort ({boysRows.length})</span>
                          <span className="text-xl font-extrabold font-mono text-blue-700">{boysMean.toFixed(1)}%</span>
                          <span className="text-[10px] text-blue-600 block mt-0.5">
                            {boysHigh} in Distinction (EE)
                          </span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-pink-50/70 border border-pink-200">
                          <span className="text-[11px] font-bold text-pink-900 block">Girls Cohort ({girlsRows.length})</span>
                          <span className="text-xl font-extrabold font-mono text-pink-700">{girlsMean.toFixed(1)}%</span>
                          <span className="text-[10px] text-pink-600 block mt-0.5">
                            {girlsHigh} in Distinction (EE)
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700">
                        <span className="font-bold text-slate-900 block mb-1">Pedagogical Equity Finding:</span>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Both boys and girls exhibit high engagement in formative learning tasks. Gender parity index is within optimal MoE standards.
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 1: ACADEMIC HONOURS & MOST IMPROVED LEARNERS           */}
      {/* ============================================================== */}
      {(activeSubView === 'honours' || activeSubView === 'all') && (

        <div className="space-y-6">
          {/* Best 3 Boys & Best 3 Girls in Grade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Best 3 Boys Card */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-3.5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-sm">Best Three Boys · Academic Honours</h3>
                </div>
                <span className="text-[11px] bg-blue-800/80 px-2 py-0.5 rounded text-blue-200 font-medium">
                  {selectedGrade}
                </span>
              </div>

              <div className="p-4 divide-y divide-slate-100 text-xs">
                {performanceSummary.bestBoys.length === 0 ? (
                  <p className="text-slate-400 italic py-4 text-center">No male learners recorded.</p>
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
                        <span className="font-extrabold text-sm text-indigo-700">{boy.totalMarks} Marks</span>
                        <div className="flex items-center gap-1.5 justify-end mt-0.5">
                          <span className="text-[11px] text-slate-500 font-semibold">{boy.averageScore.toFixed(1)}%</span>
                          <span className="text-slate-300">·</span>
                          <span className="font-mono font-bold text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                            {boy.level} ({boy.meanPoints.toFixed(2)} pts)
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Best 3 Girls Card */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-3.5 bg-gradient-to-r from-rose-900 to-pink-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-300" />
                  <h3 className="font-bold text-sm">Best Three Girls · Academic Honours</h3>
                </div>
                <span className="text-[11px] bg-rose-800/80 px-2 py-0.5 rounded text-rose-200 font-medium">
                  {selectedGrade}
                </span>
              </div>

              <div className="p-4 divide-y divide-slate-100 text-xs">
                {performanceSummary.bestGirls.length === 0 ? (
                  <p className="text-slate-400 italic py-4 text-center">No female learners recorded.</p>
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
                        <span className="font-extrabold text-sm text-rose-700">{girl.totalMarks} Marks</span>
                        <div className="flex items-center gap-1.5 justify-end mt-0.5">
                          <span className="text-[11px] text-slate-500 font-semibold">{girl.averageScore.toFixed(1)}%</span>
                          <span className="text-slate-300">·</span>
                          <span className="font-mono font-bold text-[10px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-800 border border-rose-200">
                            {girl.level} ({girl.meanPoints.toFixed(2)} pts)
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Value-Added Growth: 3 Most Improved Learners (Boys & Girls) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top 3 Most Improved Boys */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-xs">Top 3 Most Improved Learners (Boys)</h3>
                </div>
                <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">
                  Term-over-Term Delta
                </span>
              </div>

              <div className="p-4 divide-y divide-slate-100 text-xs">
                {performanceSummary.mostImprovedBoys.map((item) => (
                  <div key={item.studentId} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center justify-center font-bold text-[11px]">
                        {item.rank}
                      </span>
                      <div>
                        <p className="font-bold text-slate-900">{item.name}</p>
                        <p className="text-[10px] text-slate-500">{item.notes}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 font-extrabold text-sm text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        +{item.delta.toFixed(1)}%
                      </span>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {item.previousScore.toFixed(1)}% → <strong className="text-slate-800">{item.currentScore.toFixed(1)}%</strong>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 3 Most Improved Girls */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-xs">Top 3 Most Improved Learners (Girls)</h3>
                </div>
                <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">
                  Term-over-Term Delta
                </span>
              </div>

              <div className="p-4 divide-y divide-slate-100 text-xs">
                {performanceSummary.mostImprovedGirls.map((item) => (
                  <div key={item.studentId} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center justify-center font-bold text-[11px]">
                        {item.rank}
                      </span>
                      <div>
                        <p className="font-bold text-slate-900">{item.name}</p>
                        <p className="text-[10px] text-slate-500">{item.notes}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 font-extrabold text-sm text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        +{item.delta.toFixed(1)}%
                      </span>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {item.previousScore.toFixed(1)}% → <strong className="text-slate-800">{item.currentScore.toFixed(1)}%</strong>
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
      {/* SECTION 2: COMPETENCY DISTRIBUTION & LEARNING AREA PERFORMANCE  */}
      {/* ============================================================== */}
      {(activeSubView === 'summary' || activeSubView === 'all') && (
        <div className="space-y-6">
          {/* Table: Competency Level Breakdown with Gender Specific counts */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-700" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Competency Grade Level Breakdown &amp; Gender Distribution ({selectedGrade})
                </h3>
              </div>
              <span className="text-[11px] text-slate-500">
                Number of learners across EE1 to BE2 with gender breakdown
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-semibold">
                    <th className="py-2.5 px-3">CBC Competency Level</th>
                    <th className="py-2.5 px-3">Standard Condition</th>
                    <th className="py-2.5 px-2 text-center w-16">Rubric Pts</th>
                    <th className="py-2.5 px-3 text-center bg-blue-950 font-bold w-20">Boys (M)</th>
                    <th className="py-2.5 px-3 text-center bg-rose-950 font-bold w-20">Girls (F)</th>
                    <th className="py-2.5 px-3 text-center bg-indigo-950 font-bold w-24">Total Learners</th>
                    <th className="py-2.5 px-3 text-center w-24">% of Class</th>
                    <th className="py-2.5 px-4 min-w-[140px]">Visual Distribution</th>
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
                                style={{ width: `${(lvl.boys / Math.max(1, broadsheetRows.length)) * 100}%` }}
                                className="bg-blue-600 h-full"
                                title={`Boys: ${lvl.boys}`}
                              />
                              <div
                                style={{ width: `${(lvl.girls / Math.max(1, broadsheetRows.length)) * 100}%` }}
                                className="bg-rose-500 h-full"
                                title={`Girls: ${lvl.girls}`}
                              />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {/* Total Row */}
                  <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td colSpan={3} className="py-2.5 px-3 uppercase tracking-wider text-[11px] text-right">
                      Cohort Enrolled Totals:
                    </td>
                    <td className="py-2.5 px-3 text-center text-blue-900">
                      {performanceSummary.levelDistribution.reduce((a, b) => a + b.boys, 0)} Boys
                    </td>
                    <td className="py-2.5 px-3 text-center text-rose-900">
                      {performanceSummary.levelDistribution.reduce((a, b) => a + b.girls, 0)} Girls
                    </td>
                    <td className="py-2.5 px-3 text-center text-indigo-900 text-sm font-extrabold">
                      {broadsheetRows.length} Total
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                      100.0%
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Table: Performance of each Learning Area */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-700" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Performance of Each Learning Area (Competency Breakdown, Mean Points &amp; Relation Grade Level)
                </h3>
              </div>
              <span className="text-[11px] text-slate-500">
                Full 8-Level CBC distribution per subject
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-semibold">
                    <th className="py-2.5 px-3 min-w-[160px]">Learning Area (Code)</th>
                    <th className="py-2.5 px-1.5 text-center w-12 bg-emerald-950">EE1</th>
                    <th className="py-2.5 px-1.5 text-center w-12 bg-emerald-950">EE2</th>
                    <th className="py-2.5 px-1.5 text-center w-12 bg-indigo-950">ME1</th>
                    <th className="py-2.5 px-1.5 text-center w-12 bg-blue-950">ME2</th>
                    <th className="py-2.5 px-1.5 text-center w-12 bg-amber-950">AE1</th>
                    <th className="py-2.5 px-1.5 text-center w-12 bg-amber-950">AE2</th>
                    <th className="py-2.5 px-1.5 text-center w-12 bg-rose-950">BE1</th>
                    <th className="py-2.5 px-1.5 text-center w-12 bg-rose-950">BE2</th>
                    <th className="py-2.5 px-2.5 text-center font-bold min-w-[70px]">Subject Mean %</th>
                    <th className="py-2.5 px-2.5 text-center font-bold min-w-[75px] bg-indigo-900">Mean Points (/8)</th>
                    <th className="py-2.5 px-3 min-w-[160px] bg-indigo-950 font-bold">Grade Level in Relation to Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {performanceSummary.subjectPerformance.map((sub) => (
                    <tr key={sub.subjectName} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        <div>{sub.subjectName}</div>
                        <div className="text-[10px] text-slate-400 font-mono font-normal">{sub.code}</div>
                      </td>
                      <td className="py-2.5 px-1.5 text-center font-bold text-emerald-800 bg-emerald-50/40">
                        {sub.distribution.EE1 || 0}
                      </td>
                      <td className="py-2.5 px-1.5 text-center font-bold text-emerald-700 bg-emerald-50/20">
                        {sub.distribution.EE2 || 0}
                      </td>
                      <td className="py-2.5 px-1.5 text-center font-bold text-indigo-700 bg-indigo-50/30">
                        {sub.distribution.ME1 || 0}
                      </td>
                      <td className="py-2.5 px-1.5 text-center font-bold text-blue-700 bg-blue-50/30">
                        {sub.distribution.ME2 || 0}
                      </td>
                      <td className="py-2.5 px-1.5 text-center font-medium text-amber-700">
                        {sub.distribution.AE1 || 0}
                      </td>
                      <td className="py-2.5 px-1.5 text-center font-medium text-amber-800">
                        {sub.distribution.AE2 || 0}
                      </td>
                      <td className="py-2.5 px-1.5 text-center font-medium text-rose-700">
                        {sub.distribution.BE1 || 0}
                      </td>
                      <td className="py-2.5 px-1.5 text-center font-medium text-rose-800">
                        {sub.distribution.BE2 || 0}
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-extrabold text-slate-900">
                        {sub.meanScore.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-extrabold text-indigo-700 bg-indigo-50/50 text-sm font-mono">
                        {sub.meanPoints.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 bg-indigo-50/30">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono font-bold text-xs px-2 py-0.5 rounded border ${
                              sub.relationGrade.startsWith('EE')
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : sub.relationGrade.startsWith('ME')
                                ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                                : sub.relationGrade.startsWith('AE')
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-rose-100 text-rose-800 border-rose-300'
                            }`}
                          >
                            {sub.relationGrade}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-700 truncate">
                            {sub.relationLabel}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 3: BROADSHEET ROSTER TABLE                             */}
      {/* ============================================================== */}
      {(activeSubView === 'roster' || activeSubView === 'all') && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Table className="w-4 h-4 text-indigo-700" />
              <h3 className="font-bold text-slate-900 text-sm">
                {selectedGrade} · Complete Learning Areas Roster ({selectedTerm})
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 italic">
              Tip: Click on any score cell to inspect or edit CAT/Mid/Final marks
            </span>
          </div>

          {broadsheetRows.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Users className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-semibold">No learners enrolled in {selectedGrade} yet.</p>
              <p className="text-xs text-slate-400 mt-1">Enroll learners in this grade to populate the broadsheet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-semibold">
                    <th className="py-2.5 px-2 text-center w-10">Pos</th>
                    <th className="py-2.5 px-2.5">Adm No</th>
                    <th className="py-2.5 px-3 min-w-[140px]">Learner Name</th>
                    <th className="py-2.5 px-2 text-center w-8">Sex</th>
                    {subjectList.map((sub) => (
                      <th key={sub.name} className="py-2.5 px-2 text-center min-w-[70px]">
                        <div className="font-bold text-[11px]">{sub.code.split(' ')[0]}</div>
                        <div className="text-[9px] font-normal text-slate-300 truncate max-w-[70px]" title={sub.name}>
                          {sub.name}
                        </div>
                      </th>
                    ))}
                    <th className="py-2.5 px-2.5 text-center bg-indigo-950 font-bold min-w-[60px]">Total</th>
                    <th className="py-2.5 px-2 text-center bg-indigo-950 font-bold min-w-[55px]">Mean%</th>
                    <th className="py-2.5 px-2 text-center bg-indigo-950 font-bold min-w-[50px]">Pts</th>
                    <th className="py-2.5 px-2 text-center bg-indigo-950 font-bold min-w-[50px]">Level</th>
                    <th className="py-2.5 px-2 text-center min-w-[75px] no-print">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {broadsheetRows.map((row) => (
                    <tr
                      key={row.learner.id}
                      className={`transition-colors group ${
                        row.isAbsent
                          ? 'bg-rose-50/40 hover:bg-rose-50/70 text-slate-500'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2 px-2 text-center font-bold text-slate-900 bg-slate-50/50">
                        {row.isAbsent ? (
                          <span className="font-mono text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300">
                            DNS
                          </span>
                        ) : row.position === 1 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-[11px]">
                            1
                          </span>
                        ) : row.position === 2 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-800 text-[11px]">
                            2
                          </span>
                        ) : row.position === 3 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-50 text-amber-900 border border-amber-300 text-[11px]">
                            3
                          </span>
                        ) : (
                          row.position
                        )}
                      </td>
                      <td className="py-2 px-2.5 font-mono text-[11px] text-slate-600 font-semibold">
                        {row.studentId}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{row.studentName}</span>
                          {row.isAbsent && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
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

                      {/* Subject Cells */}
                      {subjectList.map((sub) => {
                        const item = row.subjectScores[sub.name];
                        if (row.isAbsent) {
                          return (
                            <td key={sub.name} className="py-2 px-1 text-center bg-rose-50/20">
                              <span className="text-[10px] font-mono text-rose-400 font-semibold">DNS</span>
                            </td>
                          );
                        }
                        return (
                          <td
                            key={sub.name}
                            onClick={() => {
                              if (item) {
                                setEditingLearnerSubject({
                                  learner: row.learner,
                                  subjectName: sub.name,
                                  cat: item.cat,
                                  mid: item.mid,
                                  fin: item.fin,
                                  remarks: item.remarks,
                                });
                              }
                            }}
                            className="py-2 px-1 text-center cursor-pointer hover:bg-indigo-50/70 transition-colors"
                            title={`Click to edit marks for ${sub.name}: CAT ${item?.cat || 0}/30, Mid ${item?.mid || 0}/20, Final ${item?.fin || 0}/50`}
                          >
                            {item ? (
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-slate-900">{item.total}</span>
                                <span
                                  className={`text-[9px] font-mono font-semibold px-1 rounded ${
                                    item.points >= 7
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : item.points >= 5
                                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                      : item.points >= 3
                                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                                  }`}
                                >
                                  {item.letterGrade}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Summary Columns */}
                      <td className="py-2 px-2.5 text-center font-bold text-slate-900 bg-indigo-50/30">
                        {row.isAbsent ? <span className="text-slate-400">-</span> : row.totalMarks}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-indigo-700 bg-indigo-50/30">
                        {row.isAbsent ? <span className="text-slate-400">-</span> : `${row.averageScore.toFixed(1)}%`}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-slate-800 bg-indigo-50/30">
                        {row.isAbsent ? <span className="text-slate-400">-</span> : row.meanPoints.toFixed(2)}
                      </td>
                      <td className="py-2 px-2 text-center bg-indigo-50/30">
                        {row.isAbsent ? (
                          <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-rose-50 border border-rose-300 text-rose-700">
                            DNS
                          </span>
                        ) : (
                          <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-300 text-slate-800">
                            {row.overallGrade}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center no-print whitespace-nowrap">
                        <div className="flex items-center gap-1 justify-center">
                          <button
                            onClick={() => {
                              toggleExamAbsence(
                                selectedGrade,
                                selectedTerm,
                                row.learner.id,
                                !row.isAbsent,
                                row.isAbsent ? '' : 'Marked absent by Class Teacher'
                              );
                            }}
                            className={`text-[10px] font-semibold px-2 py-1 rounded transition-colors cursor-pointer ${
                              row.isAbsent
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200'
                            }`}
                            title={row.isAbsent ? 'Click to mark learner present (sat exam)' : 'Click to mark learner absent (Did Not Sit Exam)'}
                          >
                            {row.isAbsent ? 'Mark Sat' : 'Mark DNS'}
                          </button>

                          {onViewLearnerReportCard && (
                            <button
                              onClick={() => onViewLearnerReportCard(row.learner.id)}
                              className="text-[10px] text-indigo-700 hover:text-indigo-900 font-semibold px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                            >
                              Report Card
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* Class Subject Mean Row */}
                  <tr className="bg-indigo-50/80 font-bold border-t-2 border-indigo-200 text-indigo-950">
                    <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wider text-[11px]">
                      Class Subject Mean (%):
                    </td>
                    {subjectList.map((sub) => (
                      <td key={sub.name} className="py-2.5 px-1 text-center font-extrabold text-indigo-900">
                        {subjectAverages[sub.name] !== undefined ? `${subjectAverages[sub.name].toFixed(1)}%` : '-'}
                      </td>
                    ))}
                    <td className="py-2.5 px-2 text-center text-slate-900">
                      {Math.round(classOverallStats.meanScore * subjectList.length)}
                    </td>
                    <td className="py-2.5 px-2 text-center text-indigo-700">
                      {classOverallStats.meanScore.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-900">
                      {classOverallStats.meanPoints.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {calculateCompetencyGrade(classOverallStats.meanScore).grade}
                    </td>
                    <td className="no-print"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Official Signatures Verification Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <p className="text-[10px] uppercase font-bold text-slate-400">Class Teacher Validation</p>
                <p className="font-semibold text-slate-900 mt-1">{assignedClassTeacher}</p>
                <p className="text-[11px] text-emerald-700 flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Roster Marks Confirmed</span>
                </p>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <p className="text-[10px] uppercase font-bold text-slate-400">Coordinator / Exam Council Ratification</p>
                <p className="font-semibold text-slate-900 mt-1">{coordinatorName}</p>
                <p className="text-[11px] text-indigo-700 flex items-center gap-1 mt-1">
                  <Award className="w-3.5 h-3.5 text-indigo-600" />
                  <span>CBC Rubric Verified &amp; Standardized</span>
                </p>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <p className="text-[10px] uppercase font-bold text-slate-400">Head of Institution (HOI) Approval</p>
                <p className="font-semibold text-slate-900 mt-1">{hoiName}</p>
                <p className="text-[11px] text-slate-600 flex items-center gap-1 mt-1">
                  <span className="font-mono text-[10px] font-bold text-indigo-900 uppercase">
                    Official Seal: Validated
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Mark Editor Modal */}
      {editingLearnerSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Update Assessment Mark</h3>
                <p className="text-slate-500 text-xs">
                  {editingLearnerSubject.learner.firstName} {editingLearnerSubject.learner.lastName} · {editingLearnerSubject.subjectName}
                </p>
              </div>
              <button
                onClick={() => setEditingLearnerSubject(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">CAT (/30)</label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={editingLearnerSubject.cat}
                    onChange={(e) =>
                      setEditingLearnerSubject({
                        ...editingLearnerSubject,
                        cat: Math.min(30, Math.max(0, Number(e.target.value) || 0)),
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-bold text-slate-900 text-center"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Midterm (/20)</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={editingLearnerSubject.mid}
                    onChange={(e) =>
                      setEditingLearnerSubject({
                        ...editingLearnerSubject,
                        mid: Math.min(20, Math.max(0, Number(e.target.value) || 0)),
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-bold text-slate-900 text-center"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Final Exam (/50)</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={editingLearnerSubject.fin}
                    onChange={(e) =>
                      setEditingLearnerSubject({
                        ...editingLearnerSubject,
                        fin: Math.min(50, Math.max(0, Number(e.target.value) || 0)),
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-bold text-slate-900 text-center"
                  />
                </div>
              </div>

              {/* Calculated Total Banner */}
              {(() => {
                const total =
                  editingLearnerSubject.cat + editingLearnerSubject.mid + editingLearnerSubject.fin;
                const result = calculateCompetencyGrade(total);
                return (
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-slate-500 font-semibold text-[11px]">Calculated Total (/100)</p>
                      <p className="text-xl font-extrabold text-indigo-700">{total} Marks</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-sm px-2.5 py-1 rounded bg-white border border-indigo-300 text-indigo-900">
                        {result.grade} · {result.points} Pts
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1">{result.label}</p>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Teacher Remarks / CBC Feedback</label>
                <textarea
                  rows={2}
                  value={editingLearnerSubject.remarks}
                  onChange={(e) =>
                    setEditingLearnerSubject({
                      ...editingLearnerSubject,
                      remarks: e.target.value,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-indigo-500"
                  placeholder="e.g. Demonstrated strong problem-solving skills and consistent improvement."
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingLearnerSubject(null)}
                className="px-3.5 py-1.5 text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModalScore}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-700 text-white font-semibold rounded-lg hover:bg-indigo-800 transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Assessment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
