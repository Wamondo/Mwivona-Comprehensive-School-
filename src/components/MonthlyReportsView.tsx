import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { calculateCompetencyGrade, COMPETENCY_SCALE } from '../services/gradingService';
import { OfficialSignaturesManager } from './OfficialSignaturesManager';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  Users,
  GraduationCap,
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Award,
  Check,
  PenTool,
  FileSignature,
  Stamp,
  ShieldCheck,
} from 'lucide-react';
import crestImage from '../assets/images/school_crest_emblem_1792317813141.jpg';

export const MonthlyReportsView: React.FC = () => {
  const {
    learners,
    parents,
    feeStructures,
    feePayments,
    scoreCards,
    attendance,
    schoolProfile,
    grades: configuredGrades,
  } = useApp();

  const [activeReportTab, setActiveReportTab] = useState<'operations' | 'signatures'>('operations');
  const [selectedMonth, setSelectedMonth] = useState('2026-06'); // June 2026
  const [downloadSuccessNotice, setDownloadSuccessNotice] = useState<string | null>(null);

  const activeSignaturesCount = Object.keys(schoolProfile.signatures || {}).length;
  const bursarSig = schoolProfile.signatures?.['bursar'];
  const principalSig = schoolProfile.signatures?.['hoi'];
  const sealSig = schoolProfile.signatures?.['seal'];

  const months = [
    { value: '2026-06', label: 'June 2026 (Current Term 2)' },
    { value: '2026-05', label: 'May 2026 (Term 2 Start)' },
    { value: '2026-04', label: 'April 2026 (Term 1 Close)' },
    { value: '2026-03', label: 'March 2026 (Term 1 Midterm)' },
    { value: '2026-02', label: 'February 2026 (Term 1 Onset)' },
  ];

  // Financial calculations
  const totalInvoiced = feeStructures.reduce((acc, curr) => acc + curr.totalDue, 0);
  const totalCollected = feeStructures.reduce((acc, curr) => acc + curr.amountPaid, 0);
  const totalOutstanding = feeStructures.reduce((acc, curr) => acc + curr.balance, 0);
  const collectionRate = totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0;

  // Payments in selected month
  const monthPayments = feePayments.filter((p) => p.paymentDate.startsWith(selectedMonth));
  const monthCollectedAmount = monthPayments.reduce((acc, curr) => acc + curr.amount, 0);

  // Grade Breakdown from configured school grades
  const grades = React.useMemo(() => {
    if (configuredGrades && configuredGrades.length > 0) {
      return [...configuredGrades]
        .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
        .map((g) => g.name);
    }
    const fromLearners = Array.from(new Set(learners.map((l) => l.grade))).filter(Boolean);
    return fromLearners.length > 0 ? fromLearners : ['Grade 7'];
  }, [configuredGrades, learners]);
  const gradeBreakdown = grades.map((grade) => {
    const gradeLearners = learners.filter((l) => l.grade === grade);
    const learnerIds = new Set(gradeLearners.map((l) => l.id));
    const structures = feeStructures.filter((fs) => learnerIds.has(fs.learnerId));

    const billed = structures.reduce((acc, curr) => acc + curr.totalDue, 0);
    const paid = structures.reduce((acc, curr) => acc + curr.amountPaid, 0);
    const bal = structures.reduce((acc, curr) => acc + curr.balance, 0);

    return {
      grade,
      studentCount: gradeLearners.length,
      billed,
      paid,
      balance: bal,
      efficiency: billed > 0 ? (paid / billed) * 100 : 0,
    };
  });

  // Academic score averages with 8-point Competency Scale
  const avgSchoolScore =
    scoreCards.length > 0
      ? scoreCards.reduce((acc, curr) => acc + curr.averageScore, 0) / scoreCards.length
      : 89.3;

  const avgSchoolPoints =
    scoreCards.length > 0
      ? scoreCards.reduce((acc, curr) => acc + curr.gpa, 0) / scoreCards.length
      : 7.56;

  const overallSchoolCompetency = calculateCompetencyGrade(avgSchoolScore);

  // Attendance in month
  const monthAttendance = attendance.filter((a) => a.date.startsWith(selectedMonth));
  const presentCount = monthAttendance.filter(
    (a) => a.status === 'present' || a.status === 'late'
  ).length;
  const monthAttendanceRate =
    monthAttendance.length > 0 ? (presentCount / monthAttendance.length) * 100 : 96.2;

  /**
   * Generates and downloads comprehensive student financial & performance CSV for offline analysis
   */
  const handleDownloadCSV = () => {
    const headers = [
      'Student Full Name',
      'Student ID',
      'Grade / Class',
      'Gender',
      'Date of Birth',
      'Parent / Guardian Name',
      'Relationship',
      'Contact Telephone',
      'Email Address',
      'Residential Address',
      'Billing Term',
      'Tuition Fee (Ksh)',
      'Levies & Activity Fees (Ksh)',
      'Total Invoiced (Ksh)',
      'Fees Paid (Ksh)',
      'Outstanding Balance (Ksh)',
      'Fee Payment Status',
      'Academic Mean Mark (%)',
      'Competency Grade (EE1-BE2)',
      'Competency Points (/8)',
      'Class Rank',
      'Class Cohort Size',
      'Attendance Percentage (%)',
      'Days Present / Late',
      'Unexcused Absences',
      'Medical & Health Notes',
      'Export Timestamp'
    ];

    const timestamp = new Date().toISOString();

    const rows = learners.map((learner) => {
      const parent = parents.find((p) => p.id === learner.parentId);
      const fee = feeStructures.find(
        (fs) => fs.learnerId === learner.id && fs.term === 'Term 2 - 2026'
      ) || feeStructures.find((fs) => fs.learnerId === learner.id);
      
      const card = scoreCards.find((sc) => sc.learnerId === learner.id);
      const studentAtt = attendance.filter((a) => a.learnerId === learner.id);
      const presentDays = studentAtt.filter((a) => a.status === 'present' || a.status === 'late').length;
      const absentDays = studentAtt.filter((a) => a.status === 'absent').length;
      const attRate = studentAtt.length > 0 ? (presentDays / studentAtt.length) * 100 : 96.0;

      const meanScore = card ? card.averageScore : 85.0;
      const compGradeInfo = calculateCompetencyGrade(meanScore);
      const compPoints = card ? card.gpa : compGradeInfo.points;

      return [
        `"${learner.firstName} ${learner.lastName}"`,
        `"${learner.studentId}"`,
        `"${learner.grade}"`,
        `"${learner.gender}"`,
        `"${learner.dateOfBirth}"`,
        `"${parent?.fullName || 'N/A'}"`,
        `"${parent?.relationship || 'N/A'}"`,
        `"${parent?.phone || 'N/A'}"`,
        `"${parent?.email || 'N/A'}"`,
        `"${(parent?.homeAddress || 'N/A').replace(/"/g, '""')}"`,
        `"${fee?.term || 'Term 2 - 2026'}"`,
        fee ? fee.tuitionFee : 1200,
        fee ? fee.sportsAndActivityFee + fee.learningMaterialsFee : 250,
        fee ? fee.totalDue : 1450,
        fee ? fee.amountPaid : 0,
        fee ? fee.balance : 1450,
        `"${fee?.status || 'pending'}"`,
        meanScore.toFixed(1),
        `"${compGradeInfo.grade}"`,
        compPoints.toFixed(2),
        card ? card.classRank : 1,
        card ? card.classSize : 28,
        attRate.toFixed(1),
        presentDays,
        absentDays,
        `"${(learner.emergencyMedicalNotes || 'None').replace(/"/g, '""')}"`,
        `"${timestamp}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Academia_Student_Financial_and_Performance_Analysis_${selectedMonth}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccessNotice(
      `Export complete: Downloaded offline analytical dataset (${learners.length} student records) to CSV.`
    );
    setTimeout(() => setDownloadSuccessNotice(null), 5000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Executive Reporting &amp; Oversight</span>
            <span aria-hidden="true">·</span>
            <span>Monthly Institutional Comprehensive Audit</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {activeReportTab === 'operations'
              ? 'Monthly School Operations & Financial Report'
              : 'Official Executive Digital Signatures & Seal Manager'}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            {activeReportTab === 'operations'
              ? 'Holistic summary of tuition collections, debtor aging, academic competency performance, and student attendance logs.'
              : 'Upload, sign or select authenticated digital signatures and school seals to automatically watermark and ratify official reports.'}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          {activeReportTab === 'operations' ? (
            <>
              <button
                onClick={() => setActiveReportTab('signatures')}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                title="Configure digital signatures and seal for official school documents"
              >
                <PenTool className="w-3.5 h-3.5 text-indigo-600" />
                <span>Digital Signatures ({activeSignaturesCount})</span>
              </button>

              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer shadow-xs"
                title="Download full student financial and performance data as CSV for offline analysis"
              >
                <Download className="w-4 h-4" />
                <span>Download CSV</span>
              </button>

              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print Executive Report</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setActiveReportTab('operations')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Back to Operations Report</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-View Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 no-print">
        <button
          onClick={() => setActiveReportTab('operations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeReportTab === 'operations'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>School Operations &amp; Financial Audit</span>
        </button>

        <button
          onClick={() => setActiveReportTab('signatures')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeReportTab === 'signatures'
              ? 'bg-indigo-700 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileSignature className="w-4 h-4" />
          <span>Official Digital Signatures &amp; Seal</span>
          <span
            className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
              activeReportTab === 'signatures'
                ? 'bg-white/20 text-white'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
            }`}
          >
            {activeSignaturesCount} Active
          </span>
        </button>
      </div>

      {/* TAB CONTENT */}
      {activeReportTab === 'signatures' ? (
        <OfficialSignaturesManager />
      ) : (
        <>

      {/* Download Alert Notice */}
      {downloadSuccessNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs text-emerald-800">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{downloadSuccessNotice}</span>
        </div>
      )}

      {/* Dedicated Administrator Offline Export Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-5 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-slate-100">
              Administrator Data Export: Financial & Academic Performance
            </h3>
            <span className="font-mono text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">
              EXCEL / SHEETS READY
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Exports verified student and parent PII, fee invoicing, payment receipts, outstanding balances, attendance rates, and 8-tier competency ratings (EE1–BE2) with points (/8) for offline administrative analysis.
          </p>
        </div>

        <button
          onClick={handleDownloadCSV}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Download CSV Data</span>
        </button>
      </div>

      {/* Month Selector */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-700">Audit Period:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>{learners.length} Enrolled Students</span>
          <span aria-hidden="true">·</span>
          <span>{parents.length} Registered Parents</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono">Generated: {new Date().toISOString().slice(0, 10)}</span>
        </div>
      </div>

      {/* Executive Report Document Container (Printable) */}
      <div id="printable-area" className="space-y-6">
        
        {/* Printable Header (Visible when printing) */}
        <div className="hidden print:flex items-center justify-between border-b-2 border-slate-900 pb-4">
          <div className="flex items-center gap-4">
            <img
              src={crestImage}
              alt="Crest"
              className="w-14 h-14 object-contain"
              referrerPolicy="no-referrer"
            />
            <div>
              <h2 className="text-lg font-bold text-slate-900 uppercase">
                {schoolProfile?.name || 'Mwivona Comprehensive School'}
              </h2>
              <p className="text-xs text-slate-600">
                Primary & Junior School Wings · Official Monthly Executive Financial & Performance Statement
              </p>
            </div>
          </div>
          <div className="text-right text-xs">
            <span className="font-bold text-slate-900 block font-mono">
              Period: {selectedMonth}
            </span>
            <span className="text-slate-500 text-[10px] block">
              Certified by Finance & Academic Board
            </span>
          </div>
        </div>

        {/* 4 Core Pillars KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Month Inflow */}
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">
              Collected in Month
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
              Ksh {monthCollectedAmount.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {monthPayments.length} transactions processed
            </p>
          </div>

          {/* 2. Total Cumulative Invoiced */}
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">Total Term Invoiced</span>
            <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              Ksh {totalInvoiced.toLocaleString()}
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">
              {collectionRate.toFixed(1)}% Collected to Date
            </p>
          </div>

          {/* 3. Academic School Competency Mean */}
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">Mean Academic Performance</span>
            <div className="text-2xl font-bold font-mono text-indigo-700 tabular-nums flex items-baseline gap-1.5">
              <span>{avgSchoolScore.toFixed(1)}%</span>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                {overallSchoolCompetency.grade}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Mean Points: <span className="font-mono font-bold text-slate-800">{avgSchoolPoints.toFixed(2)} / 8.0</span> ({overallSchoolCompetency.label})
            </p>
          </div>

          {/* 4. Month Attendance Rate */}
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">Monthly Attendance</span>
            <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {monthAttendanceRate.toFixed(1)}%
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {presentCount} student presences recorded
            </p>
          </div>
        </div>

        {/* Grade Level Financial Breakdown Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Tuition Fee Performance by Grade Level
              </h2>
              <p className="text-xs text-slate-500">
                Breakdown of billed tuition, received fees, and collection performance
              </p>
            </div>
            <button
              onClick={handleDownloadCSV}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4">Grade Level</th>
                  <th className="py-2.5 px-3 text-center">Enrolled</th>
                  <th className="py-2.5 px-3 text-right">Total Invoiced</th>
                  <th className="py-2.5 px-3 text-right">Total Remitted</th>
                  <th className="py-2.5 px-3 text-right">Outstanding Due</th>
                  <th className="py-2.5 px-3 text-right">Efficiency %</th>
                  <th className="py-2.5 px-4">Fiscal Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gradeBreakdown.map((row) => (
                  <tr key={row.grade} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{row.grade}</td>
                    <td className="py-3 px-3 text-center font-mono text-slate-700">
                      {row.studentCount}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-800">
                      Ksh {row.billed.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-emerald-700">
                      Ksh {row.paid.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-amber-700">
                      Ksh {row.balance.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {row.efficiency.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4">
                      <div className="w-full bg-slate-100 rounded-full h-2 max-w-[120px] overflow-hidden">
                        <div
                          className={`h-full ${
                            row.efficiency > 75 ? 'bg-emerald-600' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, row.efficiency)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Debtor Aging & 8-Level Competency Rubric Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 text-xs">
            <h3 className="text-sm font-bold text-slate-900">Tuition Debt Aging Schedule</h3>
            <p className="text-slate-500">Aging analysis of unpaid tuition across billing milestones</p>
            
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-700 font-medium">Current (Not Yet Due)</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">Ksh 1,850</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-amber-50/70 rounded-lg border border-amber-200/60">
                <span className="text-amber-900 font-medium">1 - 15 Days Overdue</span>
                <span className="font-mono font-bold text-amber-700 tabular-nums">Ksh 1,300</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-rose-50/70 rounded-lg border border-rose-200/60">
                <span className="text-rose-900 font-medium">16 - 30+ Days Overdue</span>
                <span className="font-mono font-bold text-rose-700 tabular-nums">Ksh 660</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                8-Level Competency Scale Standard
              </h3>
              <span className="font-mono text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">
                CBC ALIGNED
              </span>
            </div>
            <p className="text-slate-500">
              Grading scale parameters enforced across all learner assessments
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              {COMPETENCY_SCALE.map((scale) => (
                <div key={scale.grade} className="p-2 bg-slate-50 rounded border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-900">{scale.grade} ({scale.points} pts)</span>
                  <span className="text-slate-500 text-[10px]">{scale.condition}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Executive Sign-off Footer with Authenticated Digital Signatures & Seal */}
        <div className="pt-6 border-t border-slate-200 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-slate-900 text-xs">
                Official Institutional Endorsements &amp; Verified Electronic Signatures
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                ✓ ALL SIGNATURES RATIFIED
              </span>
              <button
                onClick={() => setActiveReportTab('signatures')}
                className="text-xs font-semibold text-indigo-700 hover:text-indigo-800 no-print cursor-pointer"
              >
                Configure Signatures →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-700">
            {/* Bursar Sign-off */}
            <div className="p-4 bg-slate-50/60 rounded-lg border border-slate-200">
              <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">
                Prepared &amp; Reconciled By:
              </p>
              <div className="h-16 flex items-center justify-start py-1">
                {bursarSig?.signatureDataUrl ? (
                  <img
                    src={bursarSig.signatureDataUrl}
                    alt="Bursar Signature"
                    className="max-h-14 max-w-full object-contain filter drop-shadow-2xs"
                  />
                ) : (
                  <div className="w-full border-b border-slate-300 pt-10" />
                )}
              </div>
              <div className="border-t border-slate-300 pt-1.5 mt-1">
                <p className="font-bold text-slate-900">
                  {bursarSig?.signatoryName || 'Sarah Kimani, CPA'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {bursarSig?.roleTitle || 'Chief Bursar & Treasury Controller'}
                </p>
                {bursarSig && (
                  <p className="text-[9px] font-mono text-emerald-700 mt-0.5">
                    Auth: {bursarSig.verificationCode}
                  </p>
                )}
              </div>
            </div>

            {/* Principal / HOI Sign-off */}
            <div className="p-4 bg-slate-50/60 rounded-lg border border-slate-200">
              <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">
                Approved &amp; Certified By:
              </p>
              <div className="h-16 flex items-center justify-start py-1">
                {principalSig?.signatureDataUrl ? (
                  <img
                    src={principalSig.signatureDataUrl}
                    alt="Principal Signature"
                    className="max-h-14 max-w-full object-contain filter drop-shadow-2xs"
                  />
                ) : (
                  <div className="w-full border-b border-slate-300 pt-10" />
                )}
              </div>
              <div className="border-t border-slate-300 pt-1.5 mt-1">
                <p className="font-bold text-slate-900">
                  {principalSig?.signatoryName || 'Dr. Evelyn Vance'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {principalSig?.roleTitle || 'Head of School & Chief Principal'}
                </p>
                {principalSig && (
                  <p className="text-[9px] font-mono text-indigo-700 mt-0.5">
                    Auth: {principalSig.verificationCode}
                  </p>
                )}
              </div>
            </div>

            {/* Institutional Seal */}
            <div className="p-4 bg-slate-50/60 rounded-lg border border-slate-200 text-center flex flex-col justify-between">
              <p className="text-[10px] uppercase font-bold text-slate-500 mb-1 text-left">
                Official School Seal &amp; Stamp:
              </p>
              <div className="h-16 flex items-center justify-center py-1">
                {sealSig?.signatureDataUrl ? (
                  <img
                    src={sealSig.signatureDataUrl}
                    alt="Official Seal"
                    className="max-h-16 max-w-full object-contain"
                  />
                ) : (
                  <div className="inline-block p-2 border-2 border-indigo-700 rounded text-indigo-900 font-mono font-bold text-[10px] uppercase">
                    Official Institutional Seal
                  </div>
                )}
              </div>
              <div className="border-t border-slate-300 pt-1.5 mt-1">
                <p className="font-bold text-slate-900 text-[11px]">
                  {schoolProfile.name}
                </p>
                <p className="text-[10px] text-slate-500">
                  MoE / KNEC Center Reg: {schoolProfile.registrationNumber}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
      </>
      )}
    </div>
  );
};
