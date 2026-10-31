import { CompetencyGrade } from '../types';

export interface CompetencyLevel {
  grade: CompetencyGrade;
  points: number;
  label: string;
  minMarks: number;
  condition: string;
  badgeClass: string;
  description: string;
}

export const COMPETENCY_SCALE: CompetencyLevel[] = [
  {
    grade: 'EE1',
    points: 8,
    label: 'Exceeding Expectations 1',
    minMarks: 90,
    condition: '>89 marks',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Mastery & Innovation: Consistently demonstrates outstanding conceptual depth and independent application.',
  },
  {
    grade: 'EE2',
    points: 7,
    label: 'Exceeding Expectations 2',
    minMarks: 75,
    condition: '>74 marks',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'High Distinction: Applies knowledge beyond grade-level expectations with minimal guidance.',
  },
  {
    grade: 'ME1',
    points: 6,
    label: 'Meeting Expectations 1',
    minMarks: 58,
    condition: '>57 marks',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Proficient / Commendable: Solid mastery of all core syllabus concepts and learning outcomes.',
  },
  {
    grade: 'ME2',
    points: 5,
    label: 'Meeting Expectations 2',
    minMarks: 41,
    condition: '>40 marks',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Satisfactory / Competent: Demonstrates baseline expected learning competencies effectively.',
  },
  {
    grade: 'AE1',
    points: 4,
    label: 'Approaching Expectations 1',
    minMarks: 31,
    condition: '>30 marks',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Developing / Progressing: Developing skills with occasional gaps; requires guided practice.',
  },
  {
    grade: 'AE2',
    points: 3,
    label: 'Approaching Expectations 2',
    minMarks: 21,
    condition: '>20 marks',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'Emerging: Beginning to grasp basic concepts; benefits from remedial scaffolding.',
  },
  {
    grade: 'BE1',
    points: 2,
    label: 'Below Expectations 1',
    minMarks: 11,
    condition: '>10 marks',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    description: 'Intervention Required: Demonstrates limited comprehension; targeted remedial intervention advised.',
  },
  {
    grade: 'BE2',
    points: 1,
    label: 'Below Expectations 2',
    minMarks: 0,
    condition: 'Otherwise (≤10 marks)',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
    description: 'Critical Support: Needs intensive individualized pedagogical assistance.',
  },
];

/**
 * Calculates competency grade and points from total marks (0 - 100)
 */
export function calculateCompetencyGrade(totalMarks: number): {
  grade: CompetencyGrade;
  points: number;
  label: string;
  condition: string;
  badgeClass: string;
} {
  const marks = Math.round(totalMarks);

  if (marks > 89) {
    const item = COMPETENCY_SCALE[0];
    return { grade: item.grade, points: item.points, label: item.label, condition: item.condition, badgeClass: item.badgeClass };
  }
  if (marks > 74) {
    const item = COMPETENCY_SCALE[1];
    return { grade: item.grade, points: item.points, label: item.label, condition: item.condition, badgeClass: item.badgeClass };
  }
  if (marks > 57) {
    const item = COMPETENCY_SCALE[2];
    return { grade: item.grade, points: item.points, label: item.label, condition: item.condition, badgeClass: item.badgeClass };
  }
  if (marks > 40) {
    const item = COMPETENCY_SCALE[3];
    return { grade: item.grade, points: item.points, label: item.label, condition: item.condition, badgeClass: item.badgeClass };
  }
  if (marks > 30) {
    const item = COMPETENCY_SCALE[4];
    return { grade: item.grade, points: item.points, label: item.label, condition: item.condition, badgeClass: item.badgeClass };
  }
  if (marks > 20) {
    const item = COMPETENCY_SCALE[5];
    return { grade: item.grade, points: item.points, label: item.label, condition: item.condition, badgeClass: item.badgeClass };
  }
  if (marks > 10) {
    const item = COMPETENCY_SCALE[6];
    return { grade: item.grade, points: item.points, label: item.label, condition: item.condition, badgeClass: item.badgeClass };
  }
  
  const item = COMPETENCY_SCALE[7];
  return { grade: item.grade, points: item.points, label: item.label, condition: item.condition, badgeClass: item.badgeClass };
}

/**
 * Calculates competency grade from mean points on the 8-point Kenyan CBC rubric
 */
export function calculateGradeFromPoints(points: number): {
  grade: CompetencyGrade;
  points: number;
  label: string;
  badgeClass: string;
} {
  const pts = Number(points) || 0;
  if (pts >= 7.5) return COMPETENCY_SCALE[0]; // EE1
  if (pts >= 6.5) return COMPETENCY_SCALE[1]; // EE2
  if (pts >= 5.5) return COMPETENCY_SCALE[2]; // ME1
  if (pts >= 4.5) return COMPETENCY_SCALE[3]; // ME2
  if (pts >= 3.5) return COMPETENCY_SCALE[4]; // AE1
  if (pts >= 2.5) return COMPETENCY_SCALE[5]; // AE2
  if (pts >= 1.5) return COMPETENCY_SCALE[6]; // BE1
  return COMPETENCY_SCALE[7]; // BE2
}

/**
 * Returns exact RGB & HEX colors for CBC Competency Grades for PDF and UI graphics
 */
export function getGradeColor(grade: string): { hex: string; rgb: [number, number, number] } {
  switch (grade) {
    case 'EE1':
      return { hex: '#059669', rgb: [5, 150, 105] }; // Emerald
    case 'EE2':
      return { hex: '#0d9488', rgb: [13, 148, 136] }; // Teal
    case 'ME1':
      return { hex: '#2563eb', rgb: [37, 99, 235] }; // Royal Blue
    case 'ME2':
      return { hex: '#4f46e5', rgb: [79, 70, 229] }; // Indigo
    case 'AE1':
      return { hex: '#d97706', rgb: [217, 119, 6] }; // Amber
    case 'AE2':
      return { hex: '#ea580c', rgb: [234, 88, 12] }; // Orange
    case 'BE1':
      return { hex: '#e11d48', rgb: [225, 29, 72] }; // Rose
    case 'BE2':
    default:
      return { hex: '#991b1b', rgb: [153, 27, 27] }; // Dark Red
  }
}

export interface GradeSubjectDef {
  name: string;
  code: string;
  maxScore: number;
  teacher: string;
}

export const getSubjectsForGrade = (gradeName: string): GradeSubjectDef[] => {
  const g = (gradeName || '').toLowerCase();
  if (
    g.includes('grade 7') ||
    g.includes('grade 8') ||
    g.includes('grade 9') ||
    g.includes('junior') ||
    g.includes('jss')
  ) {
    return [
      { name: 'English Language', code: '901 (ENG)', maxScore: 100, teacher: 'Ms. Clara Sterling' },
      { name: 'Kiswahili Lugha', code: '902 (KIS)', maxScore: 100, teacher: 'Mwl. Otieno' },
      { name: 'Mathematics', code: '903 (MAT)', maxScore: 100, teacher: 'Mr. Marcus Thorne' },
      { name: 'Kenyan Sign Language', code: '904 (KSL)', maxScore: 100, teacher: 'Ms. Faith Mwende' },
      { name: 'Integrated Science', code: '905 (ISC)', maxScore: 100, teacher: 'Dr. Arthur Pendelton' },
      { name: 'Agriculture', code: '906 (AGR)', maxScore: 100, teacher: 'Mr. David Mutiso' },
      { name: 'Social Studies', code: '907 (SST)', maxScore: 100, teacher: 'Mrs. Hannah Vance' },
      { name: 'CRE', code: '908 (CRE)', maxScore: 100, teacher: 'Rev. Daniel K.' },
      { name: 'IRE', code: '909 (IRE)', maxScore: 100, teacher: 'Ustadh Ali Hassan' },
      { name: 'HRE', code: '910 (HRE)', maxScore: 100, teacher: 'Pandit Rajesh Sharma' },
      { name: 'Creative Arts and Sports', code: '911 (CAS)', maxScore: 100, teacher: 'Mr. Kevin Ochieng' },
      { name: 'Pre-Technical Studies', code: '912 (PTS)', maxScore: 100, teacher: 'Mr. David Mutiso' },
    ];
  }
  if (
    g.includes('grade 4') ||
    g.includes('grade 5') ||
    g.includes('grade 6')
  ) {
    return [
      { name: 'English Language', code: '601 (ENG)', maxScore: 100, teacher: 'Ms. Clara Sterling' },
      { name: 'Kiswahili Lugha', code: '602 (KIS)', maxScore: 100, teacher: 'Mwl. Otieno' },
      { name: 'Mathematics', code: '603 (MAT)', maxScore: 100, teacher: 'Mr. Marcus Thorne' },
      { name: 'Science and Technology', code: '604 (SCI)', maxScore: 100, teacher: 'Dr. Arthur Pendelton' },
      { name: 'Agriculture', code: '605 (AGR)', maxScore: 100, teacher: 'Mr. David Mutiso' },
      { name: 'Social Studies', code: '606 (SST)', maxScore: 100, teacher: 'Mrs. Hannah Vance' },
      { name: 'CRE', code: '607 (CRE)', maxScore: 100, teacher: 'Rev. Daniel K.' },
      { name: 'IRE', code: '608 (IRE)', maxScore: 100, teacher: 'Ustadh Ali Hassan' },
      { name: 'HRE', code: '609 (HRE)', maxScore: 100, teacher: 'Pandit Rajesh Sharma' },
      { name: 'Creative Arts', code: '610 (ART)', maxScore: 100, teacher: 'Mrs. Hannah Vance' },
      { name: 'Physical and Health Education PHE', code: '611 (PHE)', maxScore: 100, teacher: 'Mr. Kevin Ochieng' },
      { name: 'Home Science', code: '612 (HSC)', maxScore: 100, teacher: 'Ms. Faith Mwende' },
    ];
  }
  // Lower Primary (Grades 1, 2, 3)
  return [
    { name: 'Mathematical Activities', code: '301 (MAT)', maxScore: 100, teacher: 'Mrs. Hannah Vance' },
    { name: 'English Language Activities', code: '302 (ENG)', maxScore: 100, teacher: 'Ms. Clara Sterling' },
    { name: 'Kiswahili Activities/ KSL Activities', code: '303 (KIS/KSL)', maxScore: 100, teacher: 'Mwl. Otieno' },
    { name: 'Environmental Activities', code: '304 (ENV)', maxScore: 100, teacher: 'Dr. Arthur Pendelton' },
    { name: 'Hygiene and Nutrition Activities', code: '305 (HNA)', maxScore: 100, teacher: 'Ms. Faith Mwende' },
    { name: 'Religious Education Activities (CRE, IRE, HRE)', code: '306 (REL)', maxScore: 100, teacher: 'Rev. Daniel K.' },
    { name: 'Movement and Creative Activities', code: '307 (MCA)', maxScore: 100, teacher: 'Mr. Kevin Ochieng' },
  ];
};

export interface ScoreCardVisualTrends {
  previousScore: number;
  currentScore: number;
  delta: number;
  isPositiveDelta: boolean;
  deltaPercentageStr: string;
  trajectoryLabel: string;
  competencyCounts: Record<CompetencyGrade, number>;
  categoryCounts: { EE: number; ME: number; AE: number; BE: number };
  topStrengthSubject?: { name: string; score: number; grade: CompetencyGrade; points: number };
  priorityGrowthSubject?: { name: string; score: number; grade: CompetencyGrade; points: number };
}

/**
 * Computes rich visual trends for a learner's Assessment Report Form / Scorecard
 */
export function calculateScoreCardVisualTrends(
  subjects: { subjectName: string; totalScore: number; letterGrade: CompetencyGrade; points: number }[],
  currentAverageScore: number,
  previousAverageScore?: number
): ScoreCardVisualTrends {
  const prevScore = previousAverageScore ?? Math.max(45, Math.min(95, currentAverageScore - 5.5));
  const delta = currentAverageScore - prevScore;
  const isPositiveDelta = delta >= 0;
  const deltaPercentageStr = `${isPositiveDelta ? '+' : ''}${delta.toFixed(1)}%`;
  
  let trajectoryLabel = 'Steady Academic Progression';
  if (delta >= 6) trajectoryLabel = 'Substantial Academic Leap ▲';
  else if (delta > 2) trajectoryLabel = 'Sustained Upward Trajectory ▲';
  else if (delta >= -2) trajectoryLabel = 'Stable Competency Mastery ➔';
  else trajectoryLabel = 'Requires Guided Remediation ▼';

  const competencyCounts: Record<CompetencyGrade, number> = {
    EE1: 0, EE2: 0, ME1: 0, ME2: 0, AE1: 0, AE2: 0, BE1: 0, BE2: 0,
  };

  const categoryCounts = { EE: 0, ME: 0, AE: 0, BE: 0 };

  subjects.forEach((s) => {
    competencyCounts[s.letterGrade] = (competencyCounts[s.letterGrade] || 0) + 1;
    if (s.letterGrade.startsWith('EE')) categoryCounts.EE++;
    else if (s.letterGrade.startsWith('ME')) categoryCounts.ME++;
    else if (s.letterGrade.startsWith('AE')) categoryCounts.AE++;
    else categoryCounts.BE++;
  });

  const sortedSubjects = [...subjects].sort((a, b) => b.totalScore - a.totalScore);
  const topStrength = sortedSubjects[0]
    ? {
        name: sortedSubjects[0].subjectName,
        score: sortedSubjects[0].totalScore,
        grade: sortedSubjects[0].letterGrade,
        points: sortedSubjects[0].points,
      }
    : undefined;

  const lowestSubject = sortedSubjects[sortedSubjects.length - 1];
  const priorityGrowth = lowestSubject
    ? {
        name: lowestSubject.subjectName,
        score: lowestSubject.totalScore,
        grade: lowestSubject.letterGrade,
        points: lowestSubject.points,
      }
    : undefined;

  return {
    previousScore: prevScore,
    currentScore: currentAverageScore,
    delta,
    isPositiveDelta,
    deltaPercentageStr,
    trajectoryLabel,
    competencyCounts,
    categoryCounts,
    topStrengthSubject: topStrength,
    priorityGrowthSubject: priorityGrowth,
  };
}

