import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Calendar,
  Check,
  AlertCircle,
  Clock,
  ShieldAlert,
  User,
  Search,
  Award,
  BarChart3,
  TrendingUp,
  Sun,
  Sunset,
  Sparkles,
  Filter,
  Layers,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock3,
  AlertTriangle,
} from 'lucide-react';
import { AttendanceStatus, AttendanceSession, AttendanceRecord } from '../types';

interface AttendanceRegisterViewProps {
  initialLearnerId?: string;
}

// Helper to calculate the 5 school days (Monday to Friday) for any given date
function getSchoolWeekDays(dateStr: string): string[] {
  const [y, m, d] = dateStr.split('-').map(Number);
  const curr = new Date(y, m - 1, d);
  const day = curr.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diffToMon = curr.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(curr.getFullYear(), curr.getMonth(), diffToMon);
  const days: string[] = [];
  for (let i = 0; i < 5; i++) {
    const next = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i);
    const mm = String(next.getMonth() + 1).padStart(2, '0');
    const dd = String(next.getDate()).padStart(2, '0');
    days.push(`${next.getFullYear()}-${mm}-${dd}`);
  }
  return days;
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const AttendanceRegisterView: React.FC<AttendanceRegisterViewProps> = ({
  initialLearnerId,
}) => {
  const {
    learners,
    parents,
    attendance,
    recordSingleAttendance,
    batchMarkClassAttendance,
    currentUser,
    grades: configuredGrades,
  } = useApp();

  const isParent = currentUser.role === 'parent';
  const isClassTeacher = currentUser.role === 'teacher' && currentUser.teacherType === 'class_teacher';

  const grades = useMemo(() => {
    if (isClassTeacher && currentUser.teacherGrade) {
      return [currentUser.teacherGrade];
    }
    if (configuredGrades && configuredGrades.length > 0) {
      return [...configuredGrades]
        .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
        .map((g) => g.name);
    }
    const fromLearners = Array.from(new Set(learners.map((l) => l.grade))).filter(Boolean);
    return fromLearners.length > 0 ? fromLearners : ['Grade 7'];
  }, [isClassTeacher, currentUser.teacherGrade, configuredGrades, learners]);

  const defaultGrade = isClassTeacher && currentUser.teacherGrade ? currentUser.teacherGrade : (grades[0] || 'Grade 7');

  const parentLearner = learners.find(
    (l) => l.id === currentUser.learnerId || (currentUser.parentId && l.parentId === currentUser.parentId)
  );
  const defaultStudentId = isParent
    ? parentLearner?.id || ''
    : initialLearnerId || (learners[0] ? learners[0].id : '');

  // Main navigation tabs: Daily, Weekly Matrix (10 sessions), Term & Annual Analytics, or Student Profile
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'analytics' | 'student'>(
    isParent ? 'student' : 'daily'
  );

  const [selectedDate, setSelectedDate] = useState('2026-06-26');
  const [selectedGrade, setSelectedGrade] = useState(defaultGrade);
  const [selectedStudentId, setSelectedStudentId] = useState(defaultStudentId);
  const [sessionFilter, setSessionFilter] = useState<'both' | 'morning' | 'afternoon'>('both');
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  // Learners for selected grade
  const classLearners = useMemo(() => {
    return learners.filter((l) => l.grade === selectedGrade);
  }, [learners, selectedGrade]);

  // Current school week (Monday to Friday: 5 days × 2 sessions = 10 sessions/week)
  const currentWeekDays = useMemo(() => {
    return getSchoolWeekDays(selectedDate);
  }, [selectedDate]);

  // Attendance lookup map for selected date: `${learnerId}_morning` and `${learnerId}_afternoon`
  const dateSessionMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendance
      .filter((a) => a.date === selectedDate)
      .forEach((a) => {
        const session = a.session || 'morning';
        map.set(`${a.learnerId}_${session}`, a);
      });
    return map;
  }, [attendance, selectedDate]);

  // Handle single attendance toggle
  const handleSetSessionStatus = (
    learnerId: string,
    session: AttendanceSession,
    status: AttendanceStatus,
    reason?: string
  ) => {
    recordSingleAttendance({
      learnerId,
      date: selectedDate,
      session,
      status,
      ...(reason ? { reason } : status === 'absent' ? { reason: 'Unverified session absence' } : {}),
    });
  };

  // Quick Action: Mark All for selected session or both
  const handleBatchMark = (status: AttendanceStatus, session: 'morning' | 'afternoon' | 'both') => {
    batchMarkClassAttendance(selectedDate, selectedGrade, status, session);
    const sessText = session === 'both' ? 'Both Morning & Afternoon (2 Sessions)' : `${session} Session`;
    setActionSuccessNotice(`Marked all ${classLearners.length} learners as ${status.toUpperCase()} for ${sessText}.`);
    setTimeout(() => setActionSuccessNotice(null), 3500);
  };

  // Day Statistics (2 Sessions/Learner)
  const dayStats = useMemo(() => {
    const totalPossibleSessions = classLearners.length * 2;
    let morningPresent = 0;
    let afternoonPresent = 0;
    let morningAbsent = 0;
    let afternoonAbsent = 0;

    classLearners.forEach((l) => {
      const m = dateSessionMap.get(`${l.id}_morning`);
      const a = dateSessionMap.get(`${l.id}_afternoon`);
      const mStatus = m ? m.status : 'present';
      const aStatus = a ? a.status : 'present';

      if (mStatus === 'present' || mStatus === 'late' || mStatus === 'excused') morningPresent++;
      else morningAbsent++;

      if (aStatus === 'present' || aStatus === 'late' || aStatus === 'excused') afternoonPresent++;
      else afternoonAbsent++;
    });

    const totalAttendedSessions = morningPresent + afternoonPresent;
    const dayAttendanceRate = totalPossibleSessions > 0 ? (totalAttendedSessions / totalPossibleSessions) * 100 : 100;

    return {
      totalPossibleSessions,
      totalAttendedSessions,
      morningPresent,
      afternoonPresent,
      morningAbsent,
      afternoonAbsent,
      dayAttendanceRate,
    };
  }, [classLearners, dateSessionMap]);

  // Weekly Statistics (10 Sessions/Learner: 5 days × 2 sessions)
  const weeklyLearnerData = useMemo(() => {
    return classLearners.map((learner) => {
      let sessionsAttended = 0;
      let sessionsAbsent = 0;
      const dayBreakdown: { date: string; dayName: string; morning: AttendanceStatus; afternoon: AttendanceStatus }[] = [];

      currentWeekDays.forEach((dayStr, idx) => {
        const mRec = attendance.find((a) => a.learnerId === learner.id && a.date === dayStr && (a.session === 'morning' || !a.session));
        const aRec = attendance.find((a) => a.learnerId === learner.id && a.date === dayStr && a.session === 'afternoon');

        const mStat: AttendanceStatus = mRec ? mRec.status : 'present';
        const aStat: AttendanceStatus = aRec ? aRec.status : 'present';

        if (mStat === 'present' || mStat === 'late' || mStat === 'excused') sessionsAttended++;
        else sessionsAbsent++;

        if (aStat === 'present' || aStat === 'late' || aStat === 'excused') sessionsAttended++;
        else sessionsAbsent++;

        dayBreakdown.push({
          date: dayStr,
          dayName: DAY_NAMES[idx] || `Day ${idx + 1}`,
          morning: mStat,
          afternoon: aStat,
        });
      });

      const weeklyRate = (sessionsAttended / 10) * 100;

      return {
        learner,
        sessionsAttended,
        sessionsAbsent,
        weeklyRate,
        dayBreakdown,
      };
    });
  }, [classLearners, currentWeekDays, attendance]);

  const classWeeklyAverageRate = useMemo(() => {
    if (weeklyLearnerData.length === 0) return 100;
    const sum = weeklyLearnerData.reduce((acc, curr) => acc + curr.weeklyRate, 0);
    return sum / weeklyLearnerData.length;
  }, [weeklyLearnerData]);

  // Term & Annual Statistics (Term Sessions & Year Sessions)
  // Standard CBC Term: 13 weeks = 130 sessions per term
  // Standard Academic Year: 3 terms = 390 sessions per year
  const STANDARD_TERM_SESSIONS = 130;
  const STANDARD_YEAR_SESSIONS = 390;

  const termAndAnnualData = useMemo(() => {
    return classLearners.map((learner) => {
      const records = attendance.filter((a) => a.learnerId === learner.id);
      const recordedCount = records.length; // sessions recorded
      const presentCount = records.filter((a) => a.status === 'present').length;
      const lateCount = records.filter((a) => a.status === 'late').length;
      const excusedCount = records.filter((a) => a.status === 'excused').length;
      const absentCount = records.filter((a) => a.status === 'absent').length;

      const totalEffectiveAttended = presentCount + lateCount + excusedCount;
      const termRate = recordedCount > 0 ? (totalEffectiveAttended / recordedCount) * 100 : 96.5;

      // Projecting annual sessions based on term regularity
      const annualProjectedAttended = Math.round((termRate / 100) * STANDARD_YEAR_SESSIONS);

      return {
        learner,
        recordedSessions: recordedCount,
        presentSessions: presentCount,
        lateSessions: lateCount,
        excusedSessions: excusedCount,
        absentSessions: absentCount,
        attendedSessions: totalEffectiveAttended,
        termRate,
        termRemainingSessions: Math.max(0, STANDARD_TERM_SESSIONS - recordedCount),
        annualProjectedAttended,
        annualRate: termRate,
      };
    });
  }, [classLearners, attendance]);

  const classTermAverageRate = useMemo(() => {
    if (termAndAnnualData.length === 0) return 96.5;
    const sum = termAndAnnualData.reduce((acc, curr) => acc + curr.termRate, 0);
    return sum / termAndAnnualData.length;
  }, [termAndAnnualData]);

  // Selected Student Drill-down Data
  const currentStudent = learners.find((l) => l.id === selectedStudentId);
  const studentRecords = useMemo(() => {
    return attendance.filter((a) => a.learnerId === selectedStudentId);
  }, [attendance, selectedStudentId]);

  const studentSummary = useMemo(() => {
    const total = studentRecords.length;
    const morningRecords = studentRecords.filter((a) => a.session === 'morning' || !a.session);
    const afternoonRecords = studentRecords.filter((a) => a.session === 'afternoon');

    const mPresent = morningRecords.filter((a) => a.status === 'present' || a.status === 'late' || a.status === 'excused').length;
    const aPresent = afternoonRecords.filter((a) => a.status === 'present' || a.status === 'late' || a.status === 'excused').length;

    const totalAttended = mPresent + aPresent;
    const rate = total > 0 ? (totalAttended / total) * 100 : 97.2;

    return {
      totalSessions: total,
      morningSessions: morningRecords.length,
      morningPresent: mPresent,
      morningRate: morningRecords.length > 0 ? (mPresent / morningRecords.length) * 100 : 98,
      afternoonSessions: afternoonRecords.length,
      afternoonPresent: aPresent,
      afternoonRate: afternoonRecords.length > 0 ? (aPresent / afternoonRecords.length) * 100 : 96.5,
      rate,
      annualProjected: Math.round((rate / 100) * STANDARD_YEAR_SESSIONS),
    };
  }, [studentRecords]);

  return (
    <div className="space-y-6 text-xs">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Comprehensive Attendance Registry</span>
            <span aria-hidden="true">·</span>
            <span className="text-indigo-600 font-semibold">Morning & Afternoon Dual Sessions</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Attendance Command Center (2 Sessions / Day)
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            10 sessions weekly · 130 sessions per term · 390 sessions per year · Real-time regularity tracking
          </p>
        </div>

        {/* View Mode Switcher */}
        {!isParent && (
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start md:self-auto text-xs">
            <button
              onClick={() => setActiveTab('daily')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                activeTab === 'daily'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Daily (2 Sessions)</span>
            </button>
            <button
              onClick={() => setActiveTab('weekly')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                activeTab === 'weekly'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Weekly Matrix (10 Sessions)</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Term & Year Analytics</span>
            </button>
            <button
              onClick={() => setActiveTab('student')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                activeTab === 'student'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Student Profile</span>
            </button>
          </div>
        )}
      </div>

      {actionSuccessNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{actionSuccessNotice}</span>
          </div>
          <button
            onClick={() => setActionSuccessNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* MODE 1: DAILY CLASS REGISTER (2 SESSIONS PER LEARNER PER DAY) */}
      {activeTab === 'daily' && !isParent && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Roll Call Date */}
              <div className="flex items-center gap-2 text-xs">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-slate-700">Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Grade Selector */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
                {grades.map((grade) => (
                  <button
                    key={grade}
                    onClick={() => setSelectedGrade(grade)}
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                      selectedGrade === grade
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {grade}
                  </button>
                ))}
              </div>

              {/* Session Filter */}
              <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                <span className="text-slate-400 font-medium">Session Focus:</span>
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-[11px]">
                  <button
                    onClick={() => setSessionFilter('both')}
                    className={`px-2 py-1 rounded cursor-pointer font-medium ${
                      sessionFilter === 'both' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600'
                    }`}
                  >
                    Both (Dual)
                  </button>
                  <button
                    onClick={() => setSessionFilter('morning')}
                    className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer font-medium ${
                      sessionFilter === 'morning' ? 'bg-white text-amber-700 shadow-xs font-bold' : 'text-slate-600'
                    }`}
                  >
                    <Sun className="w-3 h-3 text-amber-500" />
                    <span>Morning</span>
                  </button>
                  <button
                    onClick={() => setSessionFilter('afternoon')}
                    className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer font-medium ${
                      sessionFilter === 'afternoon' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600'
                    }`}
                  >
                    <Sunset className="w-3 h-3 text-indigo-500" />
                    <span>Afternoon</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Batch Actions */}
            {(currentUser.role === 'admin' || currentUser.role === 'teacher') && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBatchMark('present', 'both')}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                  title="Mark all registered learners as present for both morning and afternoon sessions"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Mark Both Present (Full Day)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchMark('present', 'morning')}
                  className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                >
                  <Sun className="w-3 h-3 text-amber-600" />
                  <span>AM Present</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchMark('present', 'afternoon')}
                  className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                >
                  <Sunset className="w-3 h-3 text-indigo-600" />
                  <span>PM Present</span>
                </button>
              </div>
            )}
          </div>

          {/* Daily 2-Session KPI Summary Card */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">Total Day Sessions</span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                {dayStats.totalAttendedSessions} / {dayStats.totalPossibleSessions}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">2 sessions per learner daily</p>
            </div>

            <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-amber-800 uppercase font-semibold flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-amber-600" />
                  Morning Session
                </span>
                <span className="text-xs font-bold text-amber-700">
                  {classLearners.length > 0 ? ((dayStats.morningPresent / classLearners.length) * 100).toFixed(0) : 100}%
                </span>
              </div>
              <div className="text-xl font-bold font-mono text-amber-900 mt-0.5">
                {dayStats.morningPresent} / {classLearners.length}
              </div>
              <p className="text-[11px] text-amber-700 mt-0.5">{dayStats.morningAbsent} absent in morning</p>
            </div>

            <div className="p-3.5 bg-indigo-50/60 border border-indigo-200/80 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-indigo-800 uppercase font-semibold flex items-center gap-1">
                  <Sunset className="w-3.5 h-3.5 text-indigo-600" />
                  Afternoon Session
                </span>
                <span className="text-xs font-bold text-indigo-700">
                  {classLearners.length > 0 ? ((dayStats.afternoonPresent / classLearners.length) * 100).toFixed(0) : 100}%
                </span>
              </div>
              <div className="text-xl font-bold font-mono text-indigo-900 mt-0.5">
                {dayStats.afternoonPresent} / {classLearners.length}
              </div>
              <p className="text-[11px] text-indigo-700 mt-0.5">{dayStats.afternoonAbsent} absent in afternoon</p>
            </div>

            <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl">
              <span className="text-[11px] text-emerald-800 uppercase font-semibold">Daily Attendance Rate</span>
              <div className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
                {dayStats.dayAttendanceRate.toFixed(1)}%
              </div>
              <p className="text-[11px] text-emerald-700 mt-0.5">Dual-session average</p>
            </div>
          </div>

          {/* Daily Dual Session Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  {selectedGrade} Daily Register · {selectedDate}
                </h2>
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-semibold text-[10px]">
                  2 Sessions / Learner
                </span>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {classLearners.length} learners · {classLearners.length * 2} daily sessions
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 w-48">Learner</th>
                    <th className="py-2.5 px-3 w-28">UPI / Adm No</th>
                    {(sessionFilter === 'both' || sessionFilter === 'morning') && (
                      <th className="py-2.5 px-3 bg-amber-50/50 border-r border-slate-200">
                        <div className="flex items-center gap-1 text-amber-900 font-bold">
                          <Sun className="w-3.5 h-3.5 text-amber-600" />
                          <span>Morning Session (🌅)</span>
                        </div>
                      </th>
                    )}
                    {(sessionFilter === 'both' || sessionFilter === 'afternoon') && (
                      <th className="py-2.5 px-3 bg-indigo-50/50 border-r border-slate-200">
                        <div className="flex items-center gap-1 text-indigo-900 font-bold">
                          <Sunset className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Afternoon Session (🌇)</span>
                        </div>
                      </th>
                    )}
                    <th className="py-2.5 px-3 w-32 text-center">Day Total (Sessions / 2)</th>
                    <th className="py-2.5 px-3 w-32">Daily Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classLearners.map((learner) => {
                    const morningRec = dateSessionMap.get(`${learner.id}_morning`);
                    const afternoonRec = dateSessionMap.get(`${learner.id}_afternoon`);

                    const mStatus: AttendanceStatus = morningRec ? morningRec.status : 'present';
                    const aStatus: AttendanceStatus = afternoonRec ? afternoonRec.status : 'present';

                    const mAttended = mStatus === 'present' || mStatus === 'late' || mStatus === 'excused';
                    const aAttended = aStatus === 'present' || aStatus === 'late' || aStatus === 'excused';
                    const attendedCount = (mAttended ? 1 : 0) + (aAttended ? 1 : 0);
                    const dayPercentage = (attendedCount / 2) * 100;

                    return (
                      <tr key={learner.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {learner.firstName} {learner.lastName}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">
                          {learner.studentId}
                        </td>

                        {/* Morning Session Column */}
                        {(sessionFilter === 'both' || sessionFilter === 'morning') && (
                          <td className="py-2.5 px-3 bg-amber-50/20 border-r border-slate-100">
                            <div className="flex items-center gap-1.5">
                              <select
                                value={mStatus}
                                onChange={(e) =>
                                  handleSetSessionStatus(learner.id, 'morning', e.target.value as AttendanceStatus)
                                }
                                className={`px-2 py-1 rounded text-[11px] font-bold uppercase cursor-pointer border ${
                                  mStatus === 'present'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : mStatus === 'late'
                                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                                    : mStatus === 'excused'
                                    ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                                    : 'bg-rose-50 text-rose-800 border-rose-300'
                                }`}
                              >
                                <option value="present">Present</option>
                                <option value="absent">Absent</option>
                                <option value="late">Late</option>
                                <option value="excused">Excused</option>
                              </select>
                              {morningRec?.reason && (
                                <span className="text-[10px] text-slate-400 italic truncate max-w-[120px]" title={morningRec.reason}>
                                  ({morningRec.reason})
                                </span>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Afternoon Session Column */}
                        {(sessionFilter === 'both' || sessionFilter === 'afternoon') && (
                          <td className="py-2.5 px-3 bg-indigo-50/20 border-r border-slate-100">
                            <div className="flex items-center gap-1.5">
                              <select
                                value={aStatus}
                                onChange={(e) =>
                                  handleSetSessionStatus(learner.id, 'afternoon', e.target.value as AttendanceStatus)
                                }
                                className={`px-2 py-1 rounded text-[11px] font-bold uppercase cursor-pointer border ${
                                  aStatus === 'present'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : aStatus === 'late'
                                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                                    : aStatus === 'excused'
                                    ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                                    : 'bg-rose-50 text-rose-800 border-rose-300'
                                }`}
                              >
                                <option value="present">Present</option>
                                <option value="absent">Absent</option>
                                <option value="late">Late</option>
                                <option value="excused">Excused</option>
                              </select>
                              {afternoonRec?.reason && (
                                <span className="text-[10px] text-slate-400 italic truncate max-w-[120px]" title={afternoonRec.reason}>
                                  ({afternoonRec.reason})
                                </span>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Day Total Sessions */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold font-mono text-[11px] ${
                              attendedCount === 2
                                ? 'bg-emerald-100 text-emerald-800'
                                : attendedCount === 1
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {attendedCount} / 2 Sessions ({dayPercentage}%)
                          </span>
                        </td>

                        {/* Quick Action */}
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => {
                              handleSetSessionStatus(learner.id, 'morning', 'present');
                              handleSetSessionStatus(learner.id, 'afternoon', 'present');
                            }}
                            className="px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded cursor-pointer"
                          >
                            Mark Full Day Present
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
      )}

      {/* MODE 2: WEEKLY 10-SESSION MATRIX (5 DAYS × 2 SESSIONS = 10 SESSIONS / WEEK) */}
      {activeTab === 'weekly' && !isParent && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Weekly Session Matrix · 10 Sessions Per Learner
              </h2>
              <p className="text-xs text-slate-500">
                Week: {currentWeekDays[0]} to {currentWeekDays[4]} (Monday through Friday · AM & PM Sessions)
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-900 font-bold">
                Class Weekly Average: {classWeeklyAverageRate.toFixed(1)}% (
                {((classWeeklyAverageRate / 100) * 10).toFixed(1)} / 10 Sessions)
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-center">
                  <tr>
                    <th className="py-2.5 px-3 text-left w-44">Learner</th>
                    {DAY_NAMES.map((dName, idx) => (
                      <th key={dName} colSpan={2} className="py-2 px-2 border-l border-slate-200 bg-slate-50">
                        <div className="font-bold text-slate-800">{dName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{currentWeekDays[idx]?.slice(5)}</div>
                      </th>
                    ))}
                    <th className="py-2.5 px-3 border-l border-slate-200 w-32">Week Sessions (Out of 10)</th>
                    <th className="py-2.5 px-3 w-28">Weekly %</th>
                  </tr>
                  <tr className="bg-slate-50 text-[10px] text-slate-500 border-t border-slate-200">
                    <th className="py-1 px-3 text-left">Sub-Session:</th>
                    {DAY_NAMES.map((dName) => (
                      <React.Fragment key={`${dName}-sub`}>
                        <th className="py-1 px-1 border-l border-slate-200 font-mono text-amber-700">AM</th>
                        <th className="py-1 px-1 font-mono text-indigo-700">PM</th>
                      </React.Fragment>
                    ))}
                    <th colSpan={2} className="border-l border-slate-200">Weekly Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {weeklyLearnerData.map((row) => (
                    <tr key={row.learner.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        <div>{row.learner.firstName} {row.learner.lastName}</div>
                        <span className="text-[10px] font-mono text-slate-400">{row.learner.studentId}</span>
                      </td>

                      {row.dayBreakdown.map((day) => {
                        const isAmPresent = day.morning === 'present' || day.morning === 'late' || day.morning === 'excused';
                        const isPmPresent = day.afternoon === 'present' || day.afternoon === 'late' || day.afternoon === 'excused';

                        return (
                          <React.Fragment key={`${row.learner.id}-${day.date}`}>
                            <td className="py-2 px-1 text-center border-l border-slate-100">
                              <span
                                className={`inline-block w-5 h-5 leading-5 rounded text-[10px] font-bold font-mono ${
                                  isAmPresent ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}
                                title={`Morning: ${day.morning}`}
                              >
                                {isAmPresent ? 'P' : 'A'}
                              </span>
                            </td>
                            <td className="py-2 px-1 text-center">
                              <span
                                className={`inline-block w-5 h-5 leading-5 rounded text-[10px] font-bold font-mono ${
                                  isPmPresent ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-100 text-rose-800'
                                }`}
                                title={`Afternoon: ${day.afternoon}`}
                              >
                                {isPmPresent ? 'P' : 'A'}
                              </span>
                            </td>
                          </React.Fragment>
                        );
                      })}

                      <td className="py-2.5 px-3 border-l border-slate-200 text-center font-mono font-bold text-slate-900">
                        {row.sessionsAttended} / 10
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                            row.weeklyRate >= 90
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : row.weeklyRate >= 70
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {row.weeklyRate.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: TERM & ANNUAL SESSION ANALYTICS (OVERALL, AVERAGE, PERCENTAGES) */}
      {activeTab === 'analytics' && !isParent && (
        <div className="space-y-4">
          {/* Analytics KPI Header */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">Standard Term Sessions</span>
              <div className="text-2xl font-bold font-mono text-indigo-700 mt-1">
                {STANDARD_TERM_SESSIONS} Sessions
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">13 weeks × 10 sessions/week</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">Standard Year Sessions</span>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {STANDARD_YEAR_SESSIONS} Sessions
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">3 terms × 130 sessions</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">Class Term Average</span>
              <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                {classTermAverageRate.toFixed(1)}%
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Across all enrolled learners</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">Projected Annual Avg</span>
              <div className="text-2xl font-bold font-mono text-indigo-700 mt-1">
                {Math.round((classTermAverageRate / 100) * STANDARD_YEAR_SESSIONS)} / {STANDARD_YEAR_SESSIONS}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Sessions attended per learner</p>
            </div>
          </div>

          {/* Full Term & Annual Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Term & Annual Session Standings · {selectedGrade}
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                Formula: (Present + Late + Excused) / Total Sessions
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Learner</th>
                    <th className="py-2.5 px-3">UPI ID</th>
                    <th className="py-2.5 px-3 text-center">Sessions Logged</th>
                    <th className="py-2.5 px-3 text-center text-emerald-800">Present (Sessions)</th>
                    <th className="py-2.5 px-3 text-center text-amber-800">Late / Excused</th>
                    <th className="py-2.5 px-3 text-center text-rose-800">Absent</th>
                    <th className="py-2.5 px-3 text-center font-bold">Term Rate (%)</th>
                    <th className="py-2.5 px-3 text-center font-bold">Annual Regularity (Out of 390)</th>
                    <th className="py-2.5 px-4 text-center">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {termAndAnnualData.map((row) => (
                    <tr key={row.learner.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                        {row.learner.firstName} {row.learner.lastName}
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-[11px]">
                        {row.learner.studentId}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-700">
                        {row.recordedSessions} / {STANDARD_TERM_SESSIONS}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-700">
                        {row.presentSessions}
                      </td>
                      <td className="py-3 px-3 text-center text-amber-700">
                        {row.lateSessions + row.excusedSessions}
                      </td>
                      <td className="py-3 px-3 text-center text-rose-700">
                        {row.absentSessions}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded font-bold text-[11px] ${
                            row.termRate >= 95
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : row.termRate >= 85
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {row.termRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-indigo-700 font-bold">
                        {row.annualProjectedAttended} / {STANDARD_YEAR_SESSIONS} ({row.annualRate.toFixed(1)}%)
                      </td>
                      <td className="py-3 px-4 text-center font-sans">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-semibold text-[10px]">
                          {row.termRate >= 95 ? 'Exemplary' : row.termRate >= 85 ? 'Consistent' : 'Intervention'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODE 4: STUDENT PROFILE DRILLDOWN */}
      {(activeTab === 'student' || isParent) && (
        <div className="space-y-4">
          {/* Student Selector */}
          {!isParent && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-slate-700">Select Learner:</span>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold cursor-pointer"
                >
                  {learners.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.firstName} {l.lastName} ({l.studentId}) - {l.grade}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Grade: <span className="font-bold text-slate-900">{currentStudent?.grade}</span>
              </div>
            </div>
          )}

          {/* Student Profile Card */}
          {currentStudent && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white border border-slate-200 rounded-xl">
                <span className="text-[11px] text-slate-500 uppercase font-semibold">Overall Attendance</span>
                <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                  {studentSummary.rate.toFixed(1)}%
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {studentSummary.morningPresent + studentSummary.afternoonPresent} sessions attended
                </p>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-xl">
                <div className="flex items-center gap-1.5 text-[11px] text-amber-700 uppercase font-semibold">
                  <Sun className="w-3.5 h-3.5 text-amber-600" />
                  Morning Regularity
                </div>
                <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                  {studentSummary.morningRate.toFixed(1)}%
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {studentSummary.morningPresent} / {studentSummary.morningSessions} Morning Sessions
                </p>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-xl">
                <div className="flex items-center gap-1.5 text-[11px] text-indigo-700 uppercase font-semibold">
                  <Sunset className="w-3.5 h-3.5 text-indigo-600" />
                  Afternoon Regularity
                </div>
                <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                  {studentSummary.afternoonRate.toFixed(1)}%
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {studentSummary.afternoonPresent} / {studentSummary.afternoonSessions} Afternoon Sessions
                </p>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-xl">
                <span className="text-[11px] text-slate-500 uppercase font-semibold">Annual Projected</span>
                <div className="text-2xl font-bold font-mono text-indigo-700 mt-1">
                  {studentSummary.annualProjected} / {STANDARD_YEAR_SESSIONS}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Total sessions in 2026</p>
              </div>
            </div>
          )}

          {/* Student Session Logs Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Logged Sessions History · {currentStudent?.firstName} {currentStudent?.lastName}
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                {studentRecords.length} recorded session entries
              </span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2 px-4">Date</th>
                    <th className="py-2 px-3">Session</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-4">Reason / Notes</th>
                    <th className="py-2 px-4">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-800">
                        {rec.date}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            rec.session === 'afternoon'
                              ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {rec.session === 'afternoon' ? (
                            <>
                              <Sunset className="w-3 h-3 text-indigo-600" />
                              <span>Afternoon</span>
                            </>
                          ) : (
                            <>
                              <Sun className="w-3 h-3 text-amber-600" />
                              <span>Morning</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            rec.status === 'present'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : rec.status === 'late'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : rec.status === 'excused'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {rec.reason || 'Regular verified session presence'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 font-medium">
                        {rec.markedBy || 'Class Teacher'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
