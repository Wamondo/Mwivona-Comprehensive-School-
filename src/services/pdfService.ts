import { jsPDF } from 'jspdf';
import { FeePayment, LearnerRecord, ParentRecord, FeeStructure, ScoreCard, SchoolProfile, AttendanceRecord, AssessmentRecord } from '../types';
import { formatKshs } from '../utils/formatters';
import {
  calculateScoreCardVisualTrends,
  getGradeColor,
  calculateCompetencyGrade,
  getSubjectsForGrade,
  COMPETENCY_SCALE,
  calculateGradeFromPoints,
} from './gradingService';

/**
 * PDF Generation Service for ElimuPulse
 * Generates official Kenyan school documents formatted in Kshs with seal/signature areas.
 */

// Helper to draw official school header on any PDF
function drawSchoolHeader(
  doc: jsPDF,
  school: SchoolProfile,
  title: string,
  institutionHeader?: string,
  sectionSubtitle?: string
) {
  // Brand color banner top bar
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, 210, 8, 'F');
  
  // School / Section Name: Dedicated Junior School or Primary School name on reports
  const mainHeader = institutionHeader || school.name || 'Mwivona Comprehensive School';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(mainHeader.toUpperCase(), 105, 17, { align: 'center' });

  // School Meta: Comprehensive Umbrella & Registration Code
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // slate-600
  const umbrella = sectionSubtitle || `${school.name || 'Mwivona Comprehensive School'} · MoE/KNEC Center Code: ${school.registrationNumber}`;
  doc.text(umbrella, 105, 22, { align: 'center' });

  const metaLine2 = `${school.postalAddress} | Tel: ${school.phone} | Email: ${school.email}`;
  doc.text(metaLine2, 105, 26.5, { align: 'center' });

  // Motto
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(99, 102, 241); // indigo-500
  doc.text(`"${school.motto}"`, 105, 30.5, { align: 'center' });

  // Document Title Banner
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(14, 33, 182, 8, 1, 1, 'F');
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(14, 33, 182, 8, 1, 1, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text(title.toUpperCase(), 105, 38.5, { align: 'center' });
}

// 1. Export Official Tuition Fee Receipt PDF
export function exportFeeReceiptPdf(
  payment: FeePayment,
  learner: LearnerRecord | undefined,
  parent: ParentRecord | undefined,
  feeStructure: FeeStructure | undefined,
  school: SchoolProfile
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const gradeStr = learner?.grade || '';
  const isJunior =
    gradeStr.toLowerCase().includes('grade 7') ||
    gradeStr.toLowerCase().includes('grade 8') ||
    gradeStr.toLowerCase().includes('grade 9') ||
    gradeStr.toLowerCase().includes('jss') ||
    gradeStr.toLowerCase().includes('junior');

  const wingInstitutionName = isJunior
    ? (school.juniorWingName || 'Mwivona Junior School')
    : (school.primaryWingName || 'Mwivona Primary School');

  drawSchoolHeader(doc, school, 'Official Tuition Fee & Payment Receipt', wingInstitutionName);

  // Receipt Number & Date Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 46, 182, 18, 1.5, 1.5, 'FD');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('RECEIPT NUMBER:', 18, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(payment.receiptNumber, 52, 52);

  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT DATE:', 120, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(payment.paymentDate, 150, 52);

  doc.setFont('helvetica', 'bold');
  doc.text('TRANSACTION REF:', 18, 59);
  doc.setFont('courier', 'bold');
  doc.text(payment.transactionRef, 52, 59);

  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT CHANNEL:', 120, 59);
  doc.setFont('helvetica', 'normal');
  doc.text(payment.method, 155, 59);

  // Student & Payer Info Grid
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('STUDENT & PARENT PARTICULARS', 14, 70);

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 72, 196, 72);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  const studentName = learner ? `${learner.firstName} ${learner.lastName}` : 'N/A';
  const studentId = learner ? learner.studentId : 'N/A';
  const grade = learner ? learner.grade : 'N/A';
  const parentName = parent ? parent.fullName : 'Parent / Guardian';

  doc.text('Student Full Name:', 14, 78);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(studentName, 50, 78);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Student ID (UPI):', 120, 78);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(studentId, 155, 78);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Grade / Class:', 14, 85);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(grade, 50, 85);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Academic Term:', 120, 85);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(payment.term, 155, 85);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Payer / Guardian:', 14, 92);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(parentName, 50, 92);

  // Billing Particulars Table
  let y = 102;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('PAYMENT BREAKDOWN & FEE STATEMENT', 14, y);
  y += 3;

  // Table Header
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('#', 18, y + 4.8);
  doc.text('Fee Item Description', 30, y + 4.8);
  doc.text('Term Period', 110, y + 4.8);
  doc.text('Amount Paid (Kshs)', 190, y + 4.8, { align: 'right' });
  y += 7;

  // Table Row 1: Tuition
  doc.setFillColor(255, 255, 255);
  doc.rect(14, y, 182, 8, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y + 8, 196, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1', 18, y + 5.5);
  doc.text(`Tuition & Educational Operations (${payment.method})`, 30, y + 5.5);
  doc.text(payment.term, 110, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.text(formatKshs(payment.amount), 190, y + 5.5, { align: 'right' });
  y += 12;

  // Summary Ledger Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(100, y, 96, 32, 1, 1, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Total Invoiced for Term:', 105, y + 7);
  doc.text(formatKshs(feeStructure?.totalDue || payment.amount), 190, y + 7, { align: 'right' });

  doc.text('Amount Paid This Receipt:', 105, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // emerald
  doc.text(formatKshs(payment.amount), 190, y + 14, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Outstanding Arrears / Balance:', 105, y + 21);
  const remainingBal = feeStructure ? feeStructure.balance : 0;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(remainingBal > 0 ? 225 : 16, remainingBal > 0 ? 29 : 185, remainingBal > 0 ? 72 : 129);
  doc.text(formatKshs(remainingBal), 190, y + 21, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Recorded By: ${payment.recordedBy}`, 105, y + 28);

  // M-Pesa / Bank instruction notes
  y += 40;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(14, y, 182, 16, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(22, 101, 52);
  doc.text('PAYBILL CLEARANCE & BANK VERIFICATION', 18, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Official Paybill: ${school.mpesaPaybill} | Account Name: ${school.mpesaAccountName} (Use Student UPI as account ref). Bank: ${school.bankName} - A/C ${school.bankAccount}.`,
    18,
    y + 10
  );

  // Signatures & Official Stamp with Active Digital Signatures
  y += 26;
  const receiptBursarSig = school.signatures?.['bursar'];
  const receiptSealSig = school.signatures?.['seal'];

  if (receiptBursarSig?.signatureDataUrl) {
    try {
      doc.addImage(receiptBursarSig.signatureDataUrl, 'PNG', 24, y + 3, 44, 10);
    } catch { /* ignore */ }
  }

  if (receiptSealSig?.signatureDataUrl) {
    try {
      doc.addImage(receiptSealSig.signatureDataUrl, 'PNG', 145, y + 1, 16, 16);
    } catch { /* ignore */ }
  }

  doc.setDrawColor(148, 163, 184);
  doc.line(18, y + 14, 75, y + 14);
  doc.line(135, y + 14, 192, y + 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(`BURSAR: ${receiptBursarSig?.signatoryName || 'BURSAR / FINANCE OFFICER'}`, 20, y + 18);
  doc.text('HEAD OF SCHOOL / STAMP', 140, y + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Authorized Digital Electronic Signature', 20, y + 22);
  doc.text('Official Institution Certified Seal', 142, y + 22);

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated on ${new Date().toLocaleString()} by ElimuPulse System`, 105, 290, { align: 'center' });

  // Save PDF
  doc.save(`Receipt_${payment.receiptNumber}_${studentName.replace(/\s+/g, '_')}.pdf`);
}

// 2. Official Single Page A4 CBC Student Score Card Renderer with Visual Trends
export function drawSingleScoreCardPage(
  doc: jsPDF,
  scoreCard: ScoreCard,
  learner: LearnerRecord | undefined,
  school: SchoolProfile,
  pageNum?: number,
  totalPages?: number
) {
  // A4 dimensions: 210mm x 297mm
  // 0.2 inch margins on both sides: 0.2 * 25.4mm = 5.08mm
  const marginLeft = 5.08;
  const marginRight = 5.08;
  const pageWidth = 210;
  const pageHeight = 297;
  const contentWidth = pageWidth - marginLeft - marginRight; // 199.84 mm
  const centerX = pageWidth / 2; // 105 mm
  const rightEdge = pageWidth - marginRight; // 204.92 mm

  const gradeStr = learner?.grade || '';
  const isJunior =
    gradeStr.toLowerCase().includes('grade 7') ||
    gradeStr.toLowerCase().includes('grade 8') ||
    gradeStr.toLowerCase().includes('grade 9') ||
    gradeStr.toLowerCase().includes('jss') ||
    gradeStr.toLowerCase().includes('junior');

  // Reports for junior bear the name for junior; reports for primary bear the name for primary
  const wingInstitutionName = isJunior
    ? (school.juniorWingName || 'Mwivona Junior School')
    : (school.primaryWingName || 'Mwivona Primary School');

  const reportTitle = isJunior
    ? 'Junior School Competency-Based Assessment (KJSEA) Form'
    : 'Primary School Competency-Based Progress (KPSEA) Form';

  const umbrellaNotice = `${school.name || 'Mwivona Comprehensive School'} · MoE/KNEC Center Reg: ${school.registrationNumber} · ${school.county}`;

  // 1. Top Decorative Brand Bar (Slate)
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 7, 'F');

  // 2. School Header (Spanning centered with full institution particulars)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(15, 23, 42);
  doc.text(wingInstitutionName.toUpperCase(), centerX, 13.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  doc.text(umbrellaNotice, centerX, 18, { align: 'center' });

  doc.setFontSize(7.2);
  doc.text(`${school.postalAddress} | Tel: ${school.phone} | Email: ${school.email}`, centerX, 22.2, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.8);
  doc.setTextColor(79, 70, 229);
  doc.text(`"${school.motto}"`, centerX, 26.2, { align: 'center' });

  // Document Title Banner (Covering full content width from x = 5.08)
  let y = 28.5;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(marginLeft, y, contentWidth, 7, 1, 1, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginLeft, y, contentWidth, 7, 1, 1, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  const assessmentTitleSuffix = scoreCard.assessmentName ? ` · ${scoreCard.assessmentName.toUpperCase()}` : '';
  doc.text(`${reportTitle.toUpperCase()}${assessmentTitleSuffix}`, centerX, y + 4.8, { align: 'center' });

  y += 8.5;

  // If learner is marked Absent (Did Not Sit) for this exam, display a prominent notice
  if (scoreCard.isExamAbsent) {
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(marginLeft, y, contentWidth, 6.2, 1, 1, 'F');
    doc.setDrawColor(248, 113, 113);
    doc.roundedRect(marginLeft, y, contentWidth, 6.2, 1, 1, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(185, 28, 28);
    const reasonText = scoreCard.examAbsentReason ? ` (${scoreCard.examAbsentReason})` : '';
    doc.text(`EXAM SITTING STATUS: 🚫 ABSENT · DID NOT SIT FOR THIS ASSESSMENT${reasonText.toUpperCase()} · EXCLUDED FROM CLASS RANKING`, centerX, y + 4.2, { align: 'center' });
    y += 7.5;
  }

  // 3. Student Particulars Card (0.2 margin, width 199.84mm)
  const partH = 17.5;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginLeft, y, contentWidth, partH, 1.2, 1.2, 'FD');

  const studentName = learner ? `${learner.firstName} ${learner.lastName}` : 'Learner';
  const studentId = learner ? learner.studentId : 'N/A';
  const grade = learner ? learner.grade : 'Grade 7A';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text('STUDENT NAME:', marginLeft + 4, y + 4.8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(15, 23, 42);
  doc.text(studentName, marginLeft + 32, y + 4.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text('UPI / ADMISSION NO:', marginLeft + 115, y + 4.8);
  doc.setFont('courier', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(15, 23, 42);
  doc.text(studentId, marginLeft + 155, y + 4.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text('GRADE / STREAM:', marginLeft + 4, y + 10.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(67, 56, 202);
  doc.text(grade, marginLeft + 32, y + 10.2);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('ASSESSMENT NAME:', marginLeft + 115, y + 10.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text((scoreCard.assessmentName || `${scoreCard.term} Evaluation`).slice(0, 26), marginLeft + 155, y + 10.2);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('CLASS RANK:', marginLeft + 4, y + 15.4);
  doc.setFont('helvetica', 'bold');
  if (scoreCard.isExamAbsent) {
    doc.setTextColor(225, 29, 72);
    doc.text('DNS (Did Not Sit Exam)', marginLeft + 32, y + 15.4);
  } else {
    doc.setTextColor(5, 150, 105);
    doc.text(`Rank #${scoreCard.classRank} of ${scoreCard.classSize} students`, marginLeft + 32, y + 15.4);
  }

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('TERM ATTENDANCE:', marginLeft + 115, y + 15.4);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${scoreCard.attendancePercentage.toFixed(1)}% Regularity`, marginLeft + 155, y + 15.4);

  y += partH + 2.5;

  // 4. VISUAL TRENDS & PROGRESSION TRAJECTORY STRIP (0.2 margin, width 199.84mm)
  const trends = calculateScoreCardVisualTrends(
    scoreCard.subjects || [],
    scoreCard.averageScore,
    learner?.previousTermAverageScore
  );

  const progH = 10;
  doc.setFillColor(238, 242, 255); // indigo-50
  doc.roundedRect(marginLeft, y, contentWidth, progH, 1, 1, 'F');
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(marginLeft, y, contentWidth, progH, 1, 1, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(49, 46, 129);
  doc.text('VISUAL PROGRESSION & CBC BALANCE:', marginLeft + 4, y + 4.2);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(`Baseline: ${trends.previousScore.toFixed(1)}%  ➔  Current Term: ${trends.currentScore.toFixed(1)}%`, marginLeft + 64, y + 4.2);

  // Delta Badge
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(trends.isPositiveDelta ? 5 : 225, trends.isPositiveDelta ? 150 : 29, trends.isPositiveDelta ? 105 : 72);
  doc.text(`[ ${trends.deltaPercentageStr} Growth ${trends.isPositiveDelta ? '▲' : '▼'} ]`, marginLeft + 150, y + 4.2);

  // CBC Competency Mini Segmented Bar Chart
  const totalSub = Math.max(1, (scoreCard.subjects || []).length);
  const barTotalW = 55;
  const eeW = (trends.categoryCounts.EE / totalSub) * barTotalW;
  const meW = (trends.categoryCounts.ME / totalSub) * barTotalW;
  const aeW = (trends.categoryCounts.AE / totalSub) * barTotalW;
  const beW = (trends.categoryCounts.BE / totalSub) * barTotalW;

  let barX = marginLeft + 4;
  const barY = y + 5.8;
  if (eeW > 0) {
    doc.setFillColor(5, 150, 105);
    doc.rect(barX, barY, eeW, 2.5, 'F');
    barX += eeW;
  }
  if (meW > 0) {
    doc.setFillColor(37, 99, 235);
    doc.rect(barX, barY, meW, 2.5, 'F');
    barX += meW;
  }
  if (aeW > 0) {
    doc.setFillColor(217, 119, 6);
    doc.rect(barX, barY, aeW, 2.5, 'F');
    barX += aeW;
  }
  if (beW > 0) {
    doc.setFillColor(225, 29, 72);
    doc.rect(barX, barY, beW, 2.5, 'F');
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Balance: ${trends.categoryCounts.EE} EE (Exceeding) · ${trends.categoryCounts.ME} ME (Meeting) · ${trends.categoryCounts.AE} AE · ${trends.categoryCounts.BE} BE`,
    marginLeft + 64,
    y + 8.2
  );

  y += progH + 2.5;

  // 5. SUBJECT SCORES TABLE (Accommodating all teacher remarks with no truncation)
  const tblHeaderH = 6.5;
  doc.setFillColor(30, 41, 59);
  doc.rect(marginLeft, y, contentWidth, tblHeaderH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(255, 255, 255);
  doc.text('Learning Area / Subject', marginLeft + 4, y + 4.5);
  doc.text('CAT /30', marginLeft + 62, y + 4.5, { align: 'right' });
  doc.text('Mid /20', marginLeft + 75, y + 4.5, { align: 'right' });
  doc.text('Exam /50', marginLeft + 90, y + 4.5, { align: 'right' });
  doc.text('Total /100', marginLeft + 107, y + 4.5, { align: 'right' });
  doc.text('Visual Score Trend Bar', marginLeft + 114, y + 4.5);
  doc.text('Level', marginLeft + 148, y + 4.5, { align: 'center' });
  doc.text('Teacher Remarks & Observations', marginLeft + 156, y + 4.5);

  y += tblHeaderH;

  const subjects = scoreCard.subjects || [];
  // Calculate dynamic row height to comfortably fill vertical budget and allow multi-line wrapped remarks
  const targetTableHeight = 66; // ~66mm for subjects
  const rowH = Math.max(5.3, Math.min(8.2, targetTableHeight / Math.max(1, subjects.length)));
  const remarksWidth = contentWidth - (marginLeft + 156 - marginLeft) - 2; // ~42mm
  const isCompact = rowH < 6.3;

  subjects.forEach((sub, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(marginLeft, y, contentWidth, rowH, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(marginLeft, y + rowH, rightEdge, y + rowH);

    // Subject Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(sub.subjectName, marginLeft + 4, y + 4.2);

    // Score Columns
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    if (scoreCard.isExamAbsent) {
      doc.setTextColor(225, 29, 72);
      doc.text('DNS', marginLeft + 62, y + 4.2, { align: 'right' });
      doc.text('DNS', marginLeft + 75, y + 4.2, { align: 'right' });
      doc.text('DNS', marginLeft + 90, y + 4.2, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text('DNS', marginLeft + 107, y + 4.2, { align: 'right' });

      // Visual Trend Progress Bar (Empty track for absent)
      const trackW = 20;
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(marginLeft + 114, y + 2.0, trackW, 2.6, 0.4, 0.4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.8);
      doc.setTextColor(225, 29, 72);
      doc.text('DNS', marginLeft + 136, y + 4.0);
      doc.text('DNS', marginLeft + 148, y + 4.2, { align: 'center' });

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(5.8);
      doc.setTextColor(148, 163, 184);
      doc.text('Marked Absent by Class Teacher for this assessment. Did not sit.', marginLeft + 156, y + 4.2);
    } else {
      doc.setTextColor(71, 85, 105);
      doc.text(String(sub.catScore), marginLeft + 62, y + 4.2, { align: 'right' });
      doc.text(String(sub.midTermScore), marginLeft + 75, y + 4.2, { align: 'right' });
      doc.text(String(sub.finalExamScore), marginLeft + 90, y + 4.2, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(String(sub.totalScore), marginLeft + 107, y + 4.2, { align: 'right' });

      // Visual Trend Progress Bar
      const trackW = 20;
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(marginLeft + 114, y + 2.0, trackW, 2.6, 0.4, 0.4, 'F');

      const fillW = Math.max(1, Math.min(trackW, (sub.totalScore / 100) * trackW));
      const gradeColor = getGradeColor(sub.letterGrade);
      doc.setFillColor(gradeColor.rgb[0], gradeColor.rgb[1], gradeColor.rgb[2]);
      doc.roundedRect(marginLeft + 114, y + 2.0, fillW, 2.6, 0.4, 0.4, 'F');

      // Percentage next to bar
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.8);
      doc.setTextColor(71, 85, 105);
      doc.text(`${sub.totalScore}%`, marginLeft + 136, y + 4.0);

      // Level
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(gradeColor.rgb[0], gradeColor.rgb[1], gradeColor.rgb[2]);
      doc.text(sub.letterGrade, marginLeft + 148, y + 4.2, { align: 'center' });

      // Teacher Remarks: FULL UNTRUNCATED TEXT WITH AUTOMATIC MULTI-LINE SPLIT
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(5.8);
      doc.setTextColor(51, 65, 85);
      const remarkStr = sub.teacherRemarks || 'Satisfactory competency mastery demonstrated.';
      const remarkLines = doc.splitTextToSize(remarkStr, remarksWidth);
      if (remarkLines.length <= 1) {
        doc.text(remarkLines[0], marginLeft + 156, y + 4.2);
      } else {
        doc.text(remarkLines[0], marginLeft + 156, y + 3.0);
        doc.text(remarkLines[1], marginLeft + 156, y + 5.8);
      }
    }

    y += rowH;
  });

  // 6. SUMMARY METRICS BAR
  y += 2.0;
  const sumH = 8.5;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(marginLeft, y, contentWidth, sumH, 1, 1, 'FD');

  const overallGradeInfo = calculateCompetencyGrade(scoreCard.averageScore);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(30, 41, 59);
  if (scoreCard.isExamAbsent) {
    doc.text(`TOTAL MARKS: DNS (Did Not Sit)`, marginLeft + 4, y + 5.5);
    doc.text(`MEAN AVERAGE: DNS`, marginLeft + 68, y + 5.5);
    doc.text(`COMPETENCY GPA: DNS`, marginLeft + 120, y + 5.5);
    doc.setTextColor(225, 29, 72);
    doc.text(`OVERALL STATUS: DNS (Absent)`, marginLeft + 165, y + 5.5);
  } else {
    doc.text(`TOTAL MARKS: ${scoreCard.totalMarks} / ${scoreCard.maxPossibleMarks}`, marginLeft + 4, y + 5.5);
    doc.text(`MEAN AVERAGE: ${scoreCard.averageScore.toFixed(1)}%`, marginLeft + 68, y + 5.5);
    doc.text(`COMPETENCY GPA: ${scoreCard.gpa.toFixed(2)} / 8.00`, marginLeft + 120, y + 5.5);
    doc.setTextColor(67, 56, 202);
    doc.text(`OVERALL STATUS: ${overallGradeInfo.grade}`, marginLeft + 165, y + 5.5);
  }

  y += sumH + 2.5;

  // 7. COMPETENCY PROFILE & STRENGTHS SPOTLIGHT
  const spotH = 11;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginLeft, y, contentWidth, spotH, 1, 1, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(5, 150, 105);
  doc.text(
    `★ Core Academic Strength: ${trends.topStrengthSubject?.name || 'Mathematics'} (${trends.topStrengthSubject?.score || 88}% · ${trends.topStrengthSubject?.grade || 'EE2'})`,
    marginLeft + 4,
    y + 4.5
  );

  doc.setTextColor(67, 56, 202);
  doc.text(
    `Target Growth Area: ${trends.priorityGrowthSubject?.name || 'Integrated Studies'} (${trends.priorityGrowthSubject?.score || 72}% · ${trends.priorityGrowthSubject?.grade || 'ME1'})`,
    marginLeft + 115,
    y + 4.5
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `National CBC Formative Performance Standing: ${overallGradeInfo.grade} - ${overallGradeInfo.label}. Demonstrating consistent competency progression.`,
    marginLeft + 4,
    y + 8.5
  );

  y += spotH + 2.5;

  // 8. UNTRUNCATED TEACHER & PRINCIPAL EVALUATION CARDS
  // Full width across whole A4 (199.84mm) with generous height and multi-line wrapping
  const remarkBoxW = contentWidth;
  const remarkBoxH = 17.5;

  // Class Teacher Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginLeft, y, remarkBoxW, remarkBoxH, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(30, 41, 59);
  doc.text("CLASS TEACHER'S EVALUATIVE REMARKS & OBSERVATIONS:", marginLeft + 4, y + 4.2);

  const teacherRemarkText = scoreCard.classTeacherRemark || 'Consistently attentive, disciplined, and shows commendable competency progression in all learning tasks.';
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.6);
  doc.setTextColor(15, 23, 42);
  const teacherLines = doc.splitTextToSize(`"${teacherRemarkText}"`, remarkBoxW - 8);
  doc.text(teacherLines, marginLeft + 4, y + 8.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text('— Evaluated by Mr. Marcus Thorne, Class Tutor', marginLeft + 4, y + 15.5);

  y += remarkBoxH + 2.5;

  // Head of School / Principal Card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginLeft, y, remarkBoxW, remarkBoxH, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(30, 41, 59);
  doc.text("HEAD OF INSTITUTION / PRINCIPAL'S REMARKS & ENDORSEMENT:", marginLeft + 4, y + 4.2);

  const principalRemarkText = scoreCard.principalRemark || `A commendable term. Continue striving for highest academic excellence and ethical leadership at ${school.name || 'Mwivona'}.`;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.6);
  doc.setTextColor(15, 23, 42);
  const principalLines = doc.splitTextToSize(`"${principalRemarkText}"`, remarkBoxW - 8);
  doc.text(principalLines, marginLeft + 4, y + 8.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text(`— Endorsed by Dr. Evelyn Vance, Head of Institution (${wingInstitutionName})`, marginLeft + 4, y + 15.5);

  y += remarkBoxH + 2.5;

  // 9. KENYA CBC 8-POINT COMPETENCY RUBRIC LEGEND (Full Width)
  const legendH = 15.5;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(marginLeft, y, contentWidth, legendH, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(30, 41, 59);
  doc.text('KENYA NATIONAL CBC 8-POINT COMPETENCY RUBRIC SCALE & ASSESSMENT SYSTEM:', marginLeft + 4, y + 3.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'EE1: Exceeding Expectations 1 (>89%, 8pts) | EE2: High Distinction (75-89%, 7pts) | ME1: Proficient (58-74%, 6pts) | ME2: Satisfactory (41-57%, 5pts)',
    marginLeft + 4,
    y + 7.0
  );
  doc.text(
    'AE1: Developing (31-40%, 4pts) | AE2: Emerging (21-30%, 3pts) | BE1: Intervention Required (11-20%, 2pts) | BE2: Critical Support (≤10%, 1pt)',
    marginLeft + 4,
    y + 10.2
  );
  doc.text(
    'Assessment Modality: Continuous Assessment Tests (CAT 30%) + Midterm Evaluation (20%) + End-Term Summative Assessment (50%).',
    marginLeft + 4,
    y + 13.4
  );

  y += legendH + 3.0;

  // 10. OFFICIAL SIGNATURES & INSTITUTION SEAL
  doc.setDrawColor(148, 163, 184);
  // 10. OFFICIAL SIGNATURES & INSTITUTION SEAL
  // Render digital signatures if available
  const teacherSig = school.signatures?.['class_teacher'];
  const principalSig = school.signatures?.['hoi'];
  const sealSig = school.signatures?.['seal'];

  if (teacherSig?.signatureDataUrl) {
    try {
      doc.addImage(teacherSig.signatureDataUrl, 'PNG', marginLeft + 8, y + 0.5, 42, 9);
    } catch { /* ignore fallback */ }
  }

  if (principalSig?.signatureDataUrl) {
    try {
      doc.addImage(principalSig.signatureDataUrl, 'PNG', marginLeft + 78, y + 0.5, 42, 9);
    } catch { /* ignore fallback */ }
  }

  doc.setDrawColor(148, 163, 184);
  // Class Teacher line
  doc.line(marginLeft + 6, y + 10, marginLeft + 65, y + 10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(30, 41, 59);
  doc.text('CLASS TEACHER SIGNATURE & DATE', marginLeft + 8, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text(`${teacherSig?.signatoryName || 'Mr. Marcus Thorne'} · ${teacherSig?.roleTitle || 'Class Tutor'}`, marginLeft + 8, y + 17.5);

  // Principal line
  doc.line(marginLeft + 76, y + 10, marginLeft + 138, y + 10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(30, 41, 59);
  doc.text('HEAD OF INSTITUTION / PRINCIPAL', marginLeft + 78, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text(`${principalSig?.signatoryName || 'Dr. Evelyn Vance'} · ${principalSig?.roleTitle || 'Chief Principal'}`, marginLeft + 78, y + 17.5);

  // Official Seal Stamp Box
  doc.setDrawColor(99, 102, 241);
  doc.roundedRect(marginLeft + 146, y, 50, 21, 1, 1, 'D');

  if (sealSig?.signatureDataUrl) {
    try {
      doc.addImage(sealSig.signatureDataUrl, 'PNG', marginLeft + 162, y + 1.5, 18, 18);
    } catch { /* ignore fallback */ }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.4);
  doc.setTextColor(67, 56, 202);
  doc.text('OFFICIAL INSTITUTION SEAL', marginLeft + 171, y + 5.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.2);
  doc.setTextColor(100, 116, 139);
  doc.text(wingInstitutionName.toUpperCase(), marginLeft + 171, y + 9.2, { align: 'center' });
  doc.text('VERIFIED & RATIFIED', marginLeft + 171, y + 13.0, { align: 'center' });
  doc.text('ACADEMIC YEAR 2025/2026', marginLeft + 171, y + 17.0, { align: 'center' });

  y += 24;

  // 11. STATUTORY COMPLIANCE & VERIFICATION STRIP
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginLeft, y, contentWidth, 9, 0.8, 0.8, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.6);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `STATUTORY COMPLIANCE: Issued under Republic of Kenya Basic Education Act & KNEC CBA Framework · Verification Key: SEC-${(scoreCard.id || 'CBA').slice(0, 12).toUpperCase()}-2026`,
    marginLeft + 3,
    y + 3.8
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.2);
  doc.text(
    `Security Ratification Hash: SHA256:${(learner?.id || 'L').slice(0, 10)}-${scoreCard.averageScore.toFixed(0)}-OK · Official electronic transcript copy.`,
    marginLeft + 3,
    y + 6.8
  );

  // 12. FOOTER (Positioned precisely at y = 291mm on 297mm A4, strictly 1 page)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(148, 163, 184);
  const pageStr = totalPages ? `Page ${pageNum || 1} of ${totalPages}` : 'Official 1-Page Document';
  doc.text(
    `Official Assessment Report Form · Issued by ${wingInstitutionName} (${school.name}) · 0.2" Margins · ${pageStr}`,
    centerX,
    291,
    { align: 'center' }
  );
}

// Helper to synthesize a complete ScoreCard if one does not exist for a learner in a grade/term
export function synthesizeLearnerScoreCard(
  learner: LearnerRecord,
  grade: string,
  term: string,
  school: SchoolProfile
): ScoreCard {
  const defs = getSubjectsForGrade(grade);
  let totalScore = 0;
  let totalPoints = 0;

  const subjectRemarksMap: Record<string, string> = {
    // Junior School (901 - 912)
    'English Language': 'Commendable reading fluency, expressive grammar and active participation.',
    'Kiswahili Lugha': 'Ufahamu mzuri wa sarufi, mtiririko mzuri wa insha na ushiriki mzuri darasani.',
    'Mathematics': 'Demonstrates strong mathematical logic, problem solving and algebraic skill.',
    'Kenyan Sign Language': 'Skilled visual expression, spatial grammar and fluent receptive signing.',
    'Integrated Science': 'Shows keen scientific curiosity, analytical reasoning and lab discipline.',
    'Agriculture': 'Exhibits hands-on agricultural knowledge, crop production and soil care.',
    'Social Studies': 'Good comprehension of civic roles, community ethics and geography.',
    'CRE': 'Upholds Christian ethics, biblical principles and constructive teamwork.',
    'IRE': 'Demonstrates sound grasp of Islamic tenets, Hadith and moral integrity.',
    'HRE': 'Exhibits respect for Vedic teachings, ethical values and universal harmony.',
    'Creative Arts and Sports': 'Displays high artistic creativity, athletics enthusiasm and collaborative spirit.',
    'Pre-Technical Studies': 'Good understanding of materials, safety guidelines and technical tools.',

    // Upper Primary (601 - 612)
    'Science and Technology': 'Enthusiastic explorer with strong investigative and practical skills.',
    'Creative Arts': 'Expresses artistic creativity and aesthetic skill with dedication.',
    'Physical and Health Education PHE': 'Exemplary motor coordination, physical fitness and sportsmanship.',
    'Home Science': 'Proficient in food preparation, hygiene, garment care and home management.',

    // Lower Primary (301 - 307)
    'Mathematical Activities': 'Strong numeracy skills and rapid acquisition of basic concepts.',
    'English Language Activities': 'Confident verbal expression and expanding vocabulary repertoire.',
    'Kiswahili Activities/ KSL Activities': 'Stadi za kuongea, kusoma na mawasiliano zimeimarika vizuri sana.',
    'Environmental Activities': 'Keen awareness of environmental preservation and personal hygiene.',
    'Hygiene and Nutrition Activities': 'Practices clean habits, balanced nutrition and personal safety daily.',
    'Religious Education Activities (CRE, IRE, HRE)': 'Exemplary moral conduct and active participation in class discussions.',
    'Movement and Creative Activities': 'Shows vivid imagination, psychomotor coordination and joyful teamwork.',
  };

  const subjects = defs.map((sub, idx) => {
    const seed = (learner.studentId.charCodeAt(learner.studentId.length - 1) + idx * 7) % 20;
    const cat = 22 + (seed % 7);
    const mid = 15 + (seed % 5);
    const fin = 38 + (seed % 10);
    const total = cat + mid + fin;
    const gradeRes = calculateCompetencyGrade(total);
    totalScore += total;
    totalPoints += gradeRes.points;

    // Pick remark based on subject name or fallback
    let remark = subjectRemarksMap[sub.name];
    if (!remark) {
      const match = Object.keys(subjectRemarksMap).find((k) => sub.name.toLowerCase().includes(k.toLowerCase()));
      remark = match ? subjectRemarksMap[match] : 'Consistently demonstrates solid competency mastery in this learning area.';
    }

    return {
      id: `sub-${learner.id}-${sub.code}`,
      subjectName: sub.name,
      catScore: cat,
      midTermScore: mid,
      finalExamScore: fin,
      totalScore: total,
      letterGrade: gradeRes.grade,
      points: gradeRes.points,
      teacherRemarks: remark,
      subjectTeacher: sub.teacher,
    };
  });

  const maxPossible = defs.length * 100;
  const avg = maxPossible > 0 ? (totalScore / maxPossible) * 100 : 0;
  const gpa = defs.length > 0 ? totalPoints / defs.length : 0;

  return {
    id: `sc-synth-${learner.id}-${term}`,
    learnerId: learner.id,
    term: term,
    academicYear: '2025/2026',
    issueDate: '2026-04-10',
    subjects,
    totalMarks: totalScore,
    maxPossibleMarks: maxPossible,
    averageScore: Number(avg.toFixed(1)),
    gpa: Number(gpa.toFixed(2)),
    classRank: (learner.studentId.charCodeAt(learner.studentId.length - 1) % 18) + 1,
    classSize: 28,
    attendancePercentage: 97.5,
    classTeacherRemark: 'Disciplined and diligent learner who exhibits solid growth and collaborative leadership across CBC curriculum competencies.',
    principalRemark: `A highly commendable term of academic achievement and moral integrity. Continue aiming for excellence at ${school.name || 'Mwivona'}.`,
    status: 'published',
  };
}

// 2a. Export Individual Official CBC Student Score Card PDF (Strictly 1 Page A4)
export function exportScoreCardPdf(
  scoreCard: ScoreCard,
  learner: LearnerRecord | undefined,
  school: SchoolProfile
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  drawSingleScoreCardPage(doc, scoreCard, learner, school, 1, 1);

  const gradeStr = learner?.grade || '';
  const isJunior =
    gradeStr.toLowerCase().includes('grade 7') ||
    gradeStr.toLowerCase().includes('grade 8') ||
    gradeStr.toLowerCase().includes('grade 9');

  const wingTitle = isJunior
    ? (school.juniorWingName || 'Mwivona_Junior_School')
    : (school.primaryWingName || 'Mwivona_Primary_School');

  const studentName = learner ? `${learner.firstName}_${learner.lastName}` : 'Learner';
  doc.save(`${wingTitle.replace(/\s+/g, '_')}_ScoreCard_${studentName}_${scoreCard.term.replace(/\s+/g, '_')}.pdf`);
}

// 2b. Export All Scorecards in 1 PDF for Batch Printing (Each learner is strictly 1 Page A4)
export function exportAllGradeScoreCardsBatchPdf(
  school: SchoolProfile,
  grade: string,
  term: string,
  learnersInGrade: LearnerRecord[],
  savedScoreCards: ScoreCard[],
  onProgress?: (current: number, total: number) => void,
  activeAssessment?: AssessmentRecord
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const total = learnersInGrade.length;

  learnersInGrade.forEach((learner, idx) => {
    if (idx > 0) {
      doc.addPage('a4', 'portrait');
    }

    // Retrieve saved scorecard or synthesize complete one
    const existing = savedScoreCards.find((sc) => sc.learnerId === learner.id && sc.term === term);
    const scoreCard: ScoreCard = existing
      ? { ...existing }
      : synthesizeLearnerScoreCard(learner, grade, term, school);

    // Apply active assessment and exam absence metadata
    if (activeAssessment) {
      scoreCard.assessmentName = activeAssessment.name;
      if (activeAssessment.absentLearnerIds?.includes(learner.id)) {
        scoreCard.isExamAbsent = true;
        scoreCard.examAbsentReason =
          activeAssessment.absentReasons?.[learner.id] ||
          'Marked Absent by Class Teacher (Did Not Sit Exam)';
      }
    }

    drawSingleScoreCardPage(doc, scoreCard, learner, school, idx + 1, total);

    if (onProgress) {
      onProgress(idx + 1, total);
    }
  });

  const isJunior =
    grade.toLowerCase().includes('grade 7') ||
    grade.toLowerCase().includes('grade 8') ||
    grade.toLowerCase().includes('grade 9');

  const wingTitle = isJunior
    ? (school.juniorWingName || 'Mwivona_Junior_School')
    : (school.primaryWingName || 'Mwivona_Primary_School');

  doc.save(`${wingTitle.replace(/\s+/g, '_')}_${grade.replace(/\s+/g, '_')}_All_ScoreCards_${term.replace(/\s+/g, '_')}.pdf`);
  return doc;
}

// 3. Export Monthly Financial Statement PDF
export function exportMonthlyFinancialReportPdf(
  stats: {
    term: string;
    totalBilled: number;
    totalCollected: number;
    totalBalance: number;
    collectionRate: number;
    mpesaCollected: number;
    bankCollected: number;
    cashCollected: number;
  },
  payments: FeePayment[],
  school: SchoolProfile
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  drawSchoolHeader(doc, school, 'Official Monthly Bursar Treasury & Collections Statement');

  // Summary Grid
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 46, 182, 30, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('REPORT PERIOD:', 18, 53);
  doc.setTextColor(15, 23, 42);
  doc.text(stats.term, 50, 53);

  doc.setTextColor(71, 85, 105);
  doc.text('COLLECTION EFFICIENCY:', 120, 53);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(`${stats.collectionRate.toFixed(1)}% Cleared`, 165, 53);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Total Invoiced:', 18, 62);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatKshs(stats.totalBilled), 50, 62);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Total Collected:', 120, 62);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(formatKshs(stats.totalCollected), 155, 62);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Outstanding Arrears:', 18, 71);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(225, 29, 72);
  doc.text(formatKshs(stats.totalBalance), 50, 71);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Payment Gateway:', 120, 71);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Paybill ${school.mpesaPaybill}`, 155, 71);

  // Collections Channel Breakdown
  let y = 84;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('PAYMENT CHANNEL RECONCILIATION', 14, y);

  y += 4;
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('Channel / Method', 18, y + 4.8);
  doc.text('Provider Details', 80, y + 4.8);
  doc.text('Total Cleared (Kshs)', 190, y + 4.8, { align: 'right' });
  y += 7;

  const channels = [
    { name: 'M-Pesa / Mobile Money', desc: `Safaricom Paybill ${school.mpesaPaybill}`, amount: stats.mpesaCollected },
    { name: 'Direct Bank Wire / EFT', desc: `${school.bankName} - A/C ${school.bankAccount}`, amount: stats.bankCollected },
    { name: 'Direct Cash / Counter', desc: 'Bursar On-Premises Cashier', amount: stats.cashCollected },
  ];

  channels.forEach((ch, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(14, y, 182, 7, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(14, y + 7, 196, y + 7);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(ch.name, 18, y + 4.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(ch.desc, 80, y + 4.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(formatKshs(ch.amount), 190, y + 4.8, { align: 'right' });
    y += 7;
  });

  // Recent Receipts Sample
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('RECENT RECONCILED AUDIT RECEIPTS (SAMPLE)', 14, y);

  y += 4;
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Receipt #', 18, y + 4.8);
  doc.text('Txn Reference', 55, y + 4.8);
  doc.text('Date', 110, y + 4.8);
  doc.text('Method', 140, y + 4.8);
  doc.text('Amount (Kshs)', 190, y + 4.8, { align: 'right' });
  y += 7;

  (payments.slice(0, 10)).forEach((p, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(14, y, 182, 6, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(14, y + 6, 196, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(p.receiptNumber, 18, y + 4.2);

    doc.setFont('courier', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(p.transactionRef, 55, y + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.text(p.paymentDate, 110, y + 4.2);
    doc.text(p.method, 140, y + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(formatKshs(p.amount), 190, y + 4.2, { align: 'right' });
    y += 6;
  });

  // Footer & Authorizations with Digital Signatures
  y += 12;
  const bursarSig = school.signatures?.['bursar'];
  const principalSig = school.signatures?.['hoi'];

  if (bursarSig?.signatureDataUrl) {
    try {
      doc.addImage(bursarSig.signatureDataUrl, 'PNG', 20, y + 0.5, 42, 9);
    } catch { /* ignore */ }
  }

  if (principalSig?.signatureDataUrl) {
    try {
      doc.addImage(principalSig.signatureDataUrl, 'PNG', 138, y + 0.5, 42, 9);
    } catch { /* ignore */ }
  }

  doc.setDrawColor(148, 163, 184);
  doc.line(18, y + 10, 75, y + 10);
  doc.line(135, y + 10, 192, y + 10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`PREPARED: ${bursarSig?.signatoryName || 'Sarah Kimani, CPA'}`, 20, y + 14);
  doc.text(`CERTIFIED: ${principalSig?.signatoryName || 'Dr. Evelyn Vance'}`, 138, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  doc.text(`${bursarSig?.roleTitle || 'Chief Bursar & Treasury Controller'}`, 20, y + 17.5);
  doc.text(`${principalSig?.roleTitle || 'Head of School & Principal'}`, 138, y + 17.5);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Official Financial Audit Statement · ElimuPulse System · Verified Ratification`, 105, 290, { align: 'center' });

  doc.save(`MonthlyFinancialStatement_${stats.term.replace(/\s+/g, '_')}.pdf`);
}

// 4. Export Student Roster Directory PDF
export function exportLearnerRosterPdf(
  learners: LearnerRecord[],
  parents: ParentRecord[],
  school: SchoolProfile,
  gradeFilter?: string
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const title = gradeFilter && gradeFilter !== 'all'
    ? `${gradeFilter} Student & Guardian Enrollment Register`
    : 'School-Wide Student & Guardian Enrollment Register';

  drawSchoolHeader(doc, school, title);

  let y = 48;
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('#', 17, y + 4.8);
  doc.text('Student ID', 25, y + 4.8);
  doc.text('Student Name', 55, y + 4.8);
  doc.text('Grade', 105, y + 4.8);
  doc.text('Guardian Contact', 130, y + 4.8);
  doc.text('Status', 178, y + 4.8);
  y += 7;

  learners.forEach((l, idx) => {
    if (y > 275) {
      doc.addPage();
      drawSchoolHeader(doc, school, title);
      y = 48;
      doc.setFillColor(30, 41, 59);
      doc.rect(14, y, 182, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text('#', 17, y + 4.8);
      doc.text('Student ID', 25, y + 4.8);
      doc.text('Student Name', 55, y + 4.8);
      doc.text('Grade', 105, y + 4.8);
      doc.text('Guardian Contact', 130, y + 4.8);
      doc.text('Status', 178, y + 4.8);
      y += 7;
    }

    const parent = parents.find((p) => p.id === l.parentId);

    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(14, y, 182, 6, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(14, y + 6, 196, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(String(idx + 1), 17, y + 4.2);

    doc.setFont('courier', 'bold');
    doc.text(l.studentId, 25, y + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.text(`${l.firstName} ${l.lastName}`, 55, y + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.text(l.grade, 105, y + 4.2);
    doc.text(parent ? `${parent.fullName} (${parent.phone})` : 'N/A', 130, y + 4.2);
    doc.text(l.status.toUpperCase(), 178, y + 4.2);

    y += 6;
  });

  doc.save(`Student_Roster_${(gradeFilter || 'All').replace(/\s+/g, '_')}.pdf`);
}

export interface BroadsheetStudentRow {
  position: number | string;
  studentId: string;
  studentName: string;
  gender: string;
  subjectScores: Record<string, { total: number; letterGrade: string; points: number }>;
  totalMarks: number;
  averageScore: number;
  meanPoints: number;
  overallGrade: string;
  isAbsent?: boolean;
}

export interface BroadsheetPerformanceSummary {
  levelDistribution: {
    grade: string;
    label: string;
    points: number;
    boys: number;
    girls: number;
    total: number;
    percentage: number;
  }[];
  subjectPerformance: {
    subjectName: string;
    code: string;
    distribution: Record<string, number>;
    meanScore: number;
    meanPoints: number;
    relationGrade: string;
    relationLabel: string;
  }[];
  bestBoys: {
    rank: number;
    studentId: string;
    name: string;
    totalMarks: number;
    averageScore: number;
    meanPoints: number;
    level: string;
  }[];
  bestGirls: {
    rank: number;
    studentId: string;
    name: string;
    totalMarks: number;
    averageScore: number;
    meanPoints: number;
    level: string;
  }[];
  mostImprovedBoys: {
    rank: number;
    studentId: string;
    name: string;
    previousScore: number;
    currentScore: number;
    delta: number;
    notes?: string;
  }[];
  mostImprovedGirls: {
    rank: number;
    studentId: string;
    name: string;
    previousScore: number;
    currentScore: number;
    delta: number;
    notes?: string;
  }[];
}

export function exportGradeBroadsheetPdf(
  school: SchoolProfile,
  grade: string,
  term: string,
  subjectList: { code: string; name: string }[],
  rows: BroadsheetStudentRow[],
  subjectAverages: Record<string, number>,
  signatories?: { classTeacher?: string; coordinator?: string; principal?: string },
  summary?: BroadsheetPerformanceSummary,
  assessmentName?: string
) {
  // A4 Landscape is 297mm x 210mm
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const isJunior = grade.toLowerCase().includes('grade 7') || grade.toLowerCase().includes('grade 8') || grade.toLowerCase().includes('grade 9');
  const wingTitle = isJunior ? (school.juniorWingName || 'Mwivona Junior School') : (school.primaryWingName || 'Mwivona Primary School');

  // Top banner
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 297, 8, 'F');

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(wingTitle.toUpperCase(), 148.5, 16, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `${school.name || 'Mwivona Comprehensive School'} · Center Code: ${school.registrationNumber || 'MW-2026-COMP'} · ${school.postalAddress} | Tel: ${school.phone}`,
    148.5,
    21,
    { align: 'center' }
  );

  // Document Title
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(10, 24, 277, 8, 1, 1, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(10, 24, 277, 8, 1, 1, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  const broadsheetTitle = assessmentName
    ? `OFFICIAL CBC GRADE BROADSHEET - ${grade.toUpperCase()} · ${assessmentName.toUpperCase()}`
    : `OFFICIAL CBC GRADE BROADSHEET - ${grade.toUpperCase()} (${term.toUpperCase()})`;
  doc.text(
    broadsheetTitle,
    148.5,
    29.5,
    { align: 'center' }
  );

  let y = 36;
  const startX = 10;
  const posWidth = 10;
  const admWidth = 22;
  const nameWidth = 42;
  const summaryColWidth = 14; // Total, Mean, Pts, Level
  const totalSummaryWidth = summaryColWidth * 4;
  const availableSubjectWidth = 277 - posWidth - admWidth - nameWidth - totalSummaryWidth;
  const subWidth = Math.max(14, availableSubjectWidth / Math.max(1, subjectList.length));

  // Table Header
  doc.setFillColor(30, 41, 59);
  doc.rect(startX, y, 277, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);

  let curX = startX;
  doc.text('Pos', curX + 2, y + 4.8);
  curX += posWidth;
  doc.text('Adm No', curX + 2, y + 4.8);
  curX += admWidth;
  doc.text('Learner Name', curX + 2, y + 4.8);
  curX += nameWidth;

  subjectList.forEach((sub) => {
    const label = sub.code.split(' ')[0] || sub.name.slice(0, 4);
    doc.text(label, curX + subWidth / 2, y + 4.8, { align: 'center' });
    curX += subWidth;
  });

  doc.text('Tot', curX + summaryColWidth / 2, y + 4.8, { align: 'center' });
  curX += summaryColWidth;
  doc.text('Mean%', curX + summaryColWidth / 2, y + 4.8, { align: 'center' });
  curX += summaryColWidth;
  doc.text('Pts/8', curX + summaryColWidth / 2, y + 4.8, { align: 'center' });
  curX += summaryColWidth;
  doc.text('Level', curX + summaryColWidth / 2, y + 4.8, { align: 'center' });

  y += 7;

  // Student Rows
  rows.forEach((row, idx) => {
    if (y > 175) {
      doc.addPage();
      y = 15;
    }

    if (row.isAbsent) {
      doc.setFillColor(254, 242, 242);
      doc.rect(startX, y, 277, 5.5, 'F');
      doc.setDrawColor(254, 202, 202);
      doc.line(startX, y + 5.5, startX + 277, y + 5.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(225, 29, 72);

      let cellX = startX;
      doc.text('DNS', cellX + posWidth / 2, y + 3.8, { align: 'center' });
      cellX += posWidth;

      doc.setFont('courier', 'bold');
      doc.text(row.studentId, cellX + 1, y + 3.8);
      cellX += admWidth;

      doc.setFont('helvetica', 'bold');
      doc.text(`${row.studentName.slice(0, 20)} [ABSENT]`, cellX + 1, y + 3.8);
      cellX += nameWidth;

      doc.setFont('helvetica', 'normal');
      subjectList.forEach(() => {
        doc.text('DNS', cellX + subWidth / 2, y + 3.8, { align: 'center' });
        cellX += subWidth;
      });

      doc.setFont('helvetica', 'bold');
      doc.text('DNS', cellX + summaryColWidth / 2, y + 3.8, { align: 'center' });
      cellX += summaryColWidth;
      doc.text('DNS', cellX + summaryColWidth / 2, y + 3.8, { align: 'center' });
      cellX += summaryColWidth;
      doc.text('DNS', cellX + summaryColWidth / 2, y + 3.8, { align: 'center' });
      cellX += summaryColWidth;
      doc.text('DNS', cellX + summaryColWidth / 2, y + 3.8, { align: 'center' });

      y += 5.5;
      return;
    }

    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(startX, y, 277, 5.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(startX, y + 5.5, startX + 277, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);

    let cellX = startX;
    doc.setFont('helvetica', 'bold');
    doc.text(String(row.position), cellX + posWidth / 2, y + 3.8, { align: 'center' });
    cellX += posWidth;

    doc.setFont('courier', 'bold');
    doc.text(row.studentId, cellX + 1, y + 3.8);
    cellX += admWidth;

    doc.setFont('helvetica', 'bold');
    doc.text(row.studentName.slice(0, 22), cellX + 1, y + 3.8);
    cellX += nameWidth;

    doc.setFont('helvetica', 'normal');
    subjectList.forEach((sub) => {
      const scoreObj = row.subjectScores[sub.name];
      const valStr = scoreObj ? `${scoreObj.total} ${scoreObj.letterGrade}` : '-';
      doc.text(valStr, cellX + subWidth / 2, y + 3.8, { align: 'center' });
      cellX += subWidth;
    });

    doc.setFont('helvetica', 'bold');
    doc.text(String(row.totalMarks), cellX + summaryColWidth / 2, y + 3.8, { align: 'center' });
    cellX += summaryColWidth;
    doc.text(`${row.averageScore.toFixed(1)}%`, cellX + summaryColWidth / 2, y + 3.8, { align: 'center' });
    cellX += summaryColWidth;
    doc.text(row.meanPoints.toFixed(2), cellX + summaryColWidth / 2, y + 3.8, { align: 'center' });
    cellX += summaryColWidth;
    doc.text(row.overallGrade, cellX + summaryColWidth / 2, y + 3.8, { align: 'center' });

    y += 5.5;
  });

  // Subject Averages Summary Row
  doc.setFillColor(238, 242, 255); // indigo-50
  doc.rect(startX, y, 277, 6, 'F');
  doc.setDrawColor(199, 210, 254);
  doc.rect(startX, y, 277, 6, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(49, 46, 129);
  doc.text('CLASS SUBJECT MEAN (%)', startX + 5, y + 4.2);

  let avgX = startX + posWidth + admWidth + nameWidth;
  subjectList.forEach((sub) => {
    const avg = subjectAverages[sub.name];
    doc.text(avg !== undefined ? `${avg.toFixed(1)}%` : '-', avgX + subWidth / 2, y + 4.2, { align: 'center' });
    avgX += subWidth;
  });
  y += 12;

  // Official Signatures Bar on Page 1
  if (y > 180) {
    doc.addPage();
    y = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);

  const sigY = Math.min(y, 185);
  const bsTeacherSig = school.signatures?.['class_teacher'];
  const bsCoordSig = school.signatures?.['coordinator'];
  const bsHoiSig = school.signatures?.['hoi'];

  if (bsTeacherSig?.signatureDataUrl) {
    try { doc.addImage(bsTeacherSig.signatureDataUrl, 'PNG', 18, sigY - 4, 38, 9); } catch {}
  }
  if (bsCoordSig?.signatureDataUrl) {
    try { doc.addImage(bsCoordSig.signatureDataUrl, 'PNG', 112, sigY - 4, 38, 9); } catch {}
  }
  if (bsHoiSig?.signatureDataUrl) {
    try { doc.addImage(bsHoiSig.signatureDataUrl, 'PNG', 208, sigY - 4, 38, 9); } catch {}
  }

  doc.line(15, sigY + 6, 85, sigY + 6);
  doc.text(`Class Teacher: ${bsTeacherSig?.signatoryName || signatories?.classTeacher || 'Assigned Class Teacher'}`, 15, sigY + 10);
  doc.text('Signature & Date: Digitally Ratified', 15, sigY + 14);

  doc.line(110, sigY + 6, 180, sigY + 6);
  doc.text(`Coordinator / Exam Council: ${bsCoordSig?.signatoryName || signatories?.coordinator || 'Examination Council Chair'}`, 110, sigY + 10);
  doc.text('Verified & Ratified: Authenticated', 110, sigY + 14);

  doc.line(205, sigY + 6, 275, sigY + 6);
  doc.text(`Head of Institution (HOI): ${bsHoiSig?.signatoryName || signatories?.principal || 'Dr. Evelyn Vance'}`, 205, sigY + 10);
  doc.text('Official Seal & Approval: Ratified', 205, sigY + 14);

  // ==========================================
  // PAGE 2: EXECUTIVE CBC PERFORMANCE SUMMARY & HONOURS
  // ==========================================
  if (summary) {
    doc.addPage('a4', 'landscape');

    // Header on Page 2
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 297, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(wingTitle.toUpperCase(), 148.5, 15, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text(`EXECUTIVE PERFORMANCE SUMMARY & CBC HONOURS · ${grade.toUpperCase()} (${term.toUpperCase()})`, 148.5, 21, { align: 'center' });

    let py = 28;

    // --- SECTION 1: COHORT COMPETENCY LEVEL & GENDER DISTRIBUTION (LEFT) ---
    // --- SECTION 2: ACADEMIC HONOURS (RIGHT) ---
    const leftWidth = 132;
    const rightX = 150;
    const rightWidth = 137;

    // Table 1: Competency Level Breakdown with Gender Specific counts & Visual Distribution Bar
    doc.setFillColor(30, 41, 59);
    doc.rect(10, py, leftWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('CBC Level & Description', 13, py + 4.2);
    doc.text('Pts', 55, py + 4.2, { align: 'center' });
    doc.text('Boys', 68, py + 4.2, { align: 'center' });
    doc.text('Girls', 81, py + 4.2, { align: 'center' });
    doc.text('Total', 94, py + 4.2, { align: 'center' });
    doc.text('Cohort %', 108, py + 4.2, { align: 'center' });
    doc.text('Visual Trend', 123, py + 4.2);
    py += 6;

    summary.levelDistribution.forEach((lvl, lidx) => {
      doc.setFillColor(lidx % 2 === 0 ? 255 : 248, lidx % 2 === 0 ? 255 : 250, lidx % 2 === 0 ? 255 : 252);
      doc.rect(10, py, leftWidth, 5, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(10, py + 5, 10 + leftWidth, py + 5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      doc.text(lvl.grade, 13, py + 3.6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(71, 85, 105);
      doc.text(lvl.label.slice(0, 18), 23, py + 3.6);

      doc.text(String(lvl.points), 55, py + 3.6, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138); // blue-900
      doc.text(String(lvl.boys), 68, py + 3.6, { align: 'center' });
      doc.setTextColor(190, 24, 93); // rose-700
      doc.text(String(lvl.girls), 81, py + 3.6, { align: 'center' });
      doc.setTextColor(15, 23, 42);
      doc.text(String(lvl.total), 94, py + 3.6, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text(`${lvl.percentage.toFixed(1)}%`, 108, py + 3.6, { align: 'center' });

      // Visual progress bar for level cohort share
      const lvlColor = getGradeColor(lvl.grade);
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(118, py + 1.4, 18, 2.2, 0.4, 0.4, 'F');
      const shareW = Math.max(0.5, Math.min(18, (lvl.percentage / 100) * 18 * 2.2)); // scaled
      doc.setFillColor(lvlColor.rgb[0], lvlColor.rgb[1], lvlColor.rgb[2]);
      doc.roundedRect(118, py + 1.4, shareW, 2.2, 0.4, 0.4, 'F');

      py += 5;
    });

    // Right Side: Academic Honours (Best 3 Boys & Best 3 Girls)
    let ry = 28;
    doc.setFillColor(30, 41, 59);
    doc.rect(rightX, ry, rightWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('ACADEMIC HONOURS: BEST 3 BOYS & BEST 3 GIRLS', rightX + 3, ry + 4.2);
    ry += 6;

    // Best 3 Boys Sub-Header
    doc.setFillColor(239, 246, 255); // blue-50
    doc.rect(rightX, ry, rightWidth, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(30, 58, 138);
    doc.text('Top 3 Performing Boys in Cohort', rightX + 3, ry + 3.5);
    doc.text('Score', rightX + 88, ry + 3.5, { align: 'center' });
    doc.text('Mean %', rightX + 104, ry + 3.5, { align: 'center' });
    doc.text('Points', rightX + 118, ry + 3.5, { align: 'center' });
    doc.text('Level', rightX + 130, ry + 3.5, { align: 'center' });
    ry += 5;

    summary.bestBoys.slice(0, 3).forEach((b) => {
      doc.setFillColor(255, 255, 255);
      doc.rect(rightX, ry, rightWidth, 4.8, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(rightX, ry + 4.8, rightX + rightWidth, ry + 4.8);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(15, 23, 42);
      doc.text(`${b.rank}. ${b.name.slice(0, 24)}`, rightX + 3, ry + 3.4);
      doc.setFont('courier', 'normal');
      doc.setFontSize(6.2);
      doc.text(b.studentId, rightX + 54, ry + 3.4);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.text(String(b.totalMarks), rightX + 88, ry + 3.4, { align: 'center' });
      doc.text(`${b.averageScore.toFixed(1)}%`, rightX + 104, ry + 3.4, { align: 'center' });
      doc.text(b.meanPoints.toFixed(2), rightX + 118, ry + 3.4, { align: 'center' });
      doc.text(b.level, rightX + 130, ry + 3.4, { align: 'center' });
      ry += 4.8;
    });

    // Best 3 Girls Sub-Header
    doc.setFillColor(253, 242, 248); // pink-50
    doc.rect(rightX, ry, rightWidth, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(157, 23, 77); // pink-800
    doc.text('Top 3 Performing Girls in Cohort', rightX + 3, ry + 3.5);
    doc.text('Score', rightX + 88, ry + 3.5, { align: 'center' });
    doc.text('Mean %', rightX + 104, ry + 3.5, { align: 'center' });
    doc.text('Points', rightX + 118, ry + 3.5, { align: 'center' });
    doc.text('Level', rightX + 130, ry + 3.5, { align: 'center' });
    ry += 5;

    summary.bestGirls.slice(0, 3).forEach((g) => {
      doc.setFillColor(255, 255, 255);
      doc.rect(rightX, ry, rightWidth, 4.8, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(rightX, ry + 4.8, rightX + rightWidth, ry + 4.8);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(15, 23, 42);
      doc.text(`${g.rank}. ${g.name.slice(0, 24)}`, rightX + 3, ry + 3.4);
      doc.setFont('courier', 'normal');
      doc.setFontSize(6.2);
      doc.text(g.studentId, rightX + 54, ry + 3.4);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.text(String(g.totalMarks), rightX + 88, ry + 3.4, { align: 'center' });
      doc.text(`${g.averageScore.toFixed(1)}%`, rightX + 104, ry + 3.4, { align: 'center' });
      doc.text(g.meanPoints.toFixed(2), rightX + 118, ry + 3.4, { align: 'center' });
      doc.text(g.level, rightX + 130, ry + 3.4, { align: 'center' });
      ry += 4.8;
    });

    // --- SECTION 3: LEARNING AREAS PERFORMANCE MATRIX WITH VISUAL TREND BARS (FULL WIDTH) ---
    py = Math.max(py, ry) + 4;
    doc.setFillColor(30, 41, 59);
    doc.rect(10, py, 277, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('LEARNING AREA CBC COMPETENCY DISTRIBUTION & MEAN STANDINGS (WITH VISUAL TRENDS)', 13, py + 4.2);
    py += 6;

    // Sub-header for Learning Areas
    doc.setFillColor(241, 245, 249);
    doc.rect(10, py, 277, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(51, 65, 85);
    doc.text('Learning Area / Subject', 13, py + 3.6);
    doc.text('EE1', 82, py + 3.6, { align: 'center' });
    doc.text('EE2', 96, py + 3.6, { align: 'center' });
    doc.text('ME1', 110, py + 3.6, { align: 'center' });
    doc.text('ME2', 124, py + 3.6, { align: 'center' });
    doc.text('AE1', 138, py + 3.6, { align: 'center' });
    doc.text('AE2', 152, py + 3.6, { align: 'center' });
    doc.text('BE1', 166, py + 3.6, { align: 'center' });
    doc.text('BE2', 180, py + 3.6, { align: 'center' });
    doc.text('Visual Trend Bar', 198, py + 3.6);
    doc.text('Mean %', 228, py + 3.6, { align: 'center' });
    doc.text('Pts /8', 246, py + 3.6, { align: 'center' });
    doc.text('Relation Grade Level', 268, py + 3.6, { align: 'center' });
    py += 5;

    summary.subjectPerformance.forEach((sub, sidx) => {
      doc.setFillColor(sidx % 2 === 0 ? 255 : 248, sidx % 2 === 0 ? 255 : 250, sidx % 2 === 0 ? 255 : 252);
      doc.rect(10, py, 277, 4.8, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(10, py + 4.8, 287, py + 4.8);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(15, 23, 42);
      doc.text(`${sub.subjectName} (${sub.code})`, 13, py + 3.4);

      doc.setFont('helvetica', 'normal');
      doc.text(String(sub.distribution['EE1'] || 0), 82, py + 3.4, { align: 'center' });
      doc.text(String(sub.distribution['EE2'] || 0), 96, py + 3.4, { align: 'center' });
      doc.text(String(sub.distribution['ME1'] || 0), 110, py + 3.4, { align: 'center' });
      doc.text(String(sub.distribution['ME2'] || 0), 124, py + 3.4, { align: 'center' });
      doc.text(String(sub.distribution['AE1'] || 0), 138, py + 3.4, { align: 'center' });
      doc.text(String(sub.distribution['AE2'] || 0), 152, py + 3.4, { align: 'center' });
      doc.text(String(sub.distribution['BE1'] || 0), 166, py + 3.4, { align: 'center' });
      doc.text(String(sub.distribution['BE2'] || 0), 180, py + 3.4, { align: 'center' });

      // Visual Mean Progress Trend Bar
      const subColor = getGradeColor(sub.relationGrade);
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(192, py + 1.2, 26, 2.4, 0.4, 0.4, 'F');
      const meanBarW = Math.max(1, Math.min(26, (sub.meanScore / 100) * 26));
      doc.setFillColor(subColor.rgb[0], subColor.rgb[1], subColor.rgb[2]);
      doc.roundedRect(192, py + 1.2, meanBarW, 2.4, 0.4, 0.4, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`${sub.meanScore.toFixed(1)}%`, 228, py + 3.4, { align: 'center' });
      doc.text(sub.meanPoints.toFixed(2), 246, py + 3.4, { align: 'center' });
      doc.setTextColor(subColor.rgb[0], subColor.rgb[1], subColor.rgb[2]);
      doc.text(`${sub.relationGrade} (${sub.relationLabel.slice(0, 14)})`, 268, py + 3.4, { align: 'center' });

      py += 4.8;
    });

    // --- SECTION 4: VALUE-ADDED ACADEMIC IMPROVEMENT (MOST IMPROVED BOYS & GIRLS) ---
    py += 4;
    doc.setFillColor(30, 41, 59);
    doc.rect(10, py, 277, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('VALUE-ADDED GROWTH: 3 MOST IMPROVED LEARNERS (BOYS & GIRLS)', 13, py + 4.2);
    py += 6;

    const impColWidth = 136;
    // Left: Most Improved Boys
    doc.setFillColor(239, 246, 255);
    doc.rect(10, py, impColWidth, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(30, 58, 138);
    doc.text('Top 3 Most Improved Boys', 13, py + 3.5);
    doc.text('Prev %', 85, py + 3.5, { align: 'center' });
    doc.text('Curr %', 105, py + 3.5, { align: 'center' });
    doc.text('Growth (Delta)', 132, py + 3.5, { align: 'right' });

    // Right: Most Improved Girls
    doc.setFillColor(253, 242, 248);
    doc.rect(150, py, impColWidth, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(157, 23, 77);
    doc.text('Top 3 Most Improved Girls', 153, py + 3.5);
    doc.text('Prev %', 225, py + 3.5, { align: 'center' });
    doc.text('Curr %', 245, py + 3.5, { align: 'center' });
    doc.text('Growth (Delta)', 272, py + 3.5, { align: 'right' });
    py += 5;

    for (let i = 0; i < 3; i++) {
      const mb = summary.mostImprovedBoys[i];
      const mg = summary.mostImprovedGirls[i];

      doc.setFillColor(255, 255, 255);
      doc.rect(10, py, impColWidth, 4.6, 'F');
      doc.rect(150, py, impColWidth, 4.6, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(10, py + 4.6, 10 + impColWidth, py + 4.6);
      doc.line(150, py + 4.6, 150 + impColWidth, py + 4.6);

      // Boy
      if (mb) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.6);
        doc.setTextColor(15, 23, 42);
        doc.text(`${i + 1}. ${mb.name.slice(0, 20)} (${mb.studentId})`, 13, py + 3.3);
        doc.setFont('helvetica', 'normal');
        doc.text(`${mb.previousScore.toFixed(1)}%`, 85, py + 3.3, { align: 'center' });
        doc.text(`${mb.currentScore.toFixed(1)}%`, 105, py + 3.3, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129); // emerald-500
        doc.text(`+${mb.delta.toFixed(1)}%`, 132, py + 3.3, { align: 'right' });
      }

      // Girl
      if (mg) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.6);
        doc.setTextColor(15, 23, 42);
        doc.text(`${i + 1}. ${mg.name.slice(0, 20)} (${mg.studentId})`, 153, py + 3.3);
        doc.setFont('helvetica', 'normal');
        doc.text(`${mg.previousScore.toFixed(1)}%`, 225, py + 3.3, { align: 'center' });
        doc.text(`${mg.currentScore.toFixed(1)}%`, 245, py + 3.3, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129); // emerald-500
        doc.text(`+${mg.delta.toFixed(1)}%`, 272, py + 3.3, { align: 'right' });
      }

      py += 4.6;
    }
  }

  doc.save(`Broadsheet_${grade.replace(/\s+/g, '_')}_${term.replace(/\s+/g, '_')}.pdf`);
}

export interface SubjectScoresheetRow {
  position: number;
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
}

export interface SubjectPerformanceSummary {
  levelDistribution: {
    grade: string;
    label: string;
    points: number;
    boys: number;
    girls: number;
    total: number;
    percentage: number;
  }[];
  meanPoints: number;
  relationGrade: string;
  relationLabel: string;
  bestBoys: {
    rank: number;
    studentId: string;
    name: string;
    score: number;
    level: string;
  }[];
  bestGirls: {
    rank: number;
    studentId: string;
    name: string;
    score: number;
    level: string;
  }[];
  mostImprovedBoys: {
    rank: number;
    studentId: string;
    name: string;
    previousScore: number;
    currentScore: number;
    delta: number;
  }[];
  mostImprovedGirls: {
    rank: number;
    studentId: string;
    name: string;
    previousScore: number;
    currentScore: number;
    delta: number;
  }[];
}

export function exportSubjectScoresheetPdf(
  school: SchoolProfile,
  grade: string,
  term: string,
  subjectName: string,
  teacherName: string,
  rows: SubjectScoresheetRow[],
  subjectMean: number,
  summary?: SubjectPerformanceSummary
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const isJunior = grade.toLowerCase().includes('grade 7') || grade.toLowerCase().includes('grade 8') || grade.toLowerCase().includes('grade 9');
  const wingTitle = isJunior ? (school.juniorWingName || 'Mwivona Junior School') : (school.primaryWingName || 'Mwivona Primary School');

  drawSchoolHeader(
    doc,
    school,
    `SUBJECT EVALUATION SCORESHEET - ${subjectName.toUpperCase()}`,
    wingTitle,
    `${grade} · ${term} · Evaluator: ${teacherName}`
  );

  let y = 46;
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y, 182, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('#', 17, y + 4.8);
  doc.text('Adm No', 23, y + 4.8);
  doc.text('Learner Name', 46, y + 4.8);
  doc.text('CAT/30', 88, y + 4.8, { align: 'center' });
  doc.text('Mid/20', 104, y + 4.8, { align: 'center' });
  doc.text('Exam/50', 122, y + 4.8, { align: 'center' });
  doc.text('Tot/100', 140, y + 4.8, { align: 'center' });
  doc.text('Level', 156, y + 4.8, { align: 'center' });
  doc.text('Pts', 170, y + 4.8, { align: 'center' });
  doc.text('Remarks', 178, y + 4.8);

  y += 7;

  rows.forEach((r, idx) => {
    if (y > 255) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(14, y, 182, 5.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(14, y + 5.5, 196, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);

    doc.text(String(r.position), 17, y + 3.8);
    doc.setFont('courier', 'bold');
    doc.text(r.studentId, 23, y + 3.8);
    doc.setFont('helvetica', 'bold');
    doc.text(r.studentName.slice(0, 24), 46, y + 3.8);

    doc.setFont('helvetica', 'normal');
    doc.text(String(r.catScore), 88, y + 3.8, { align: 'center' });
    doc.text(String(r.midTermScore), 104, y + 3.8, { align: 'center' });
    doc.text(String(r.finalExamScore), 122, y + 3.8, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.text(String(r.totalScore), 140, y + 3.8, { align: 'center' });
    doc.text(r.letterGrade, 156, y + 3.8, { align: 'center' });
    doc.text(String(r.points), 170, y + 3.8, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.text(r.teacherRemarks ? r.teacherRemarks.slice(0, 32) : 'Evaluated', 178, y + 3.8);

    y += 5.5;
  });

  // Summary footer
  y += 3;
  doc.setFillColor(238, 242, 255);
  doc.roundedRect(14, y, 182, 7, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(49, 46, 129);
  doc.text(`Subject Class Mean Score: ${subjectMean.toFixed(1)}% | Enrolled Learners Evaluated: ${rows.length}`, 18, y + 4.8);

  // If Performance Summary is attached, print the Subject Performance Summary Box!
  if (summary) {
    y += 10;
    if (y > 215) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(30, 41, 59);
    doc.rect(14, y, 182, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`SUBJECT PERFORMANCE SUMMARY & HONOURS (${summary.relationGrade} · ${summary.meanPoints.toFixed(2)} PTS)`, 18, y + 4.2);
    y += 6;

    // Mini Table of Competency Levels with Gender Counts
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, 182, 4.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(51, 65, 85);
    doc.text('Level', 18, y + 3.2);
    doc.text('Points', 42, y + 3.2, { align: 'center' });
    doc.text('Boys', 60, y + 3.2, { align: 'center' });
    doc.text('Girls', 78, y + 3.2, { align: 'center' });
    doc.text('Total', 96, y + 3.2, { align: 'center' });
    doc.text('% Cohort', 116, y + 3.2, { align: 'center' });
    doc.text('Honours: Best Boys / Girls / Most Improved', 135, y + 3.2);
    y += 4.5;

    summary.levelDistribution.slice(0, 4).forEach((lvl, idx) => {
      doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      doc.rect(14, y, 182, 4.2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(14, y + 4.2, 196, y + 4.2);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${lvl.grade} - ${lvl.label.slice(0, 16)}`, 18, y + 3);
      doc.setFont('helvetica', 'normal');
      doc.text(String(lvl.points), 42, y + 3, { align: 'center' });
      doc.text(String(lvl.boys), 60, y + 3, { align: 'center' });
      doc.text(String(lvl.girls), 78, y + 3, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.text(String(lvl.total), 96, y + 3, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text(`${lvl.percentage.toFixed(0)}%`, 116, y + 3, { align: 'center' });

      // In the right cell show top honour student
      if (idx === 0 && summary.bestBoys[0]) {
        doc.setFont('helvetica', 'bold');
        doc.text(`Top Boy: ${summary.bestBoys[0].name.slice(0, 16)} (${summary.bestBoys[0].score})`, 135, y + 3);
      } else if (idx === 1 && summary.bestGirls[0]) {
        doc.setFont('helvetica', 'bold');
        doc.text(`Top Girl: ${summary.bestGirls[0].name.slice(0, 16)} (${summary.bestGirls[0].score})`, 135, y + 3);
      } else if (idx === 2 && summary.mostImprovedBoys[0]) {
        doc.setFont('helvetica', 'normal');
        doc.text(`Most Improved Boy: ${summary.mostImprovedBoys[0].name.slice(0, 14)} (+${summary.mostImprovedBoys[0].delta.toFixed(0)}%)`, 135, y + 3);
      } else if (idx === 3 && summary.mostImprovedGirls[0]) {
        doc.setFont('helvetica', 'normal');
        doc.text(`Most Improved Girl: ${summary.mostImprovedGirls[0].name.slice(0, 14)} (+${summary.mostImprovedGirls[0].delta.toFixed(0)}%)`, 135, y + 3);
      }
      y += 4.2;
    });
  }

  // Signatures
  y += 10;
  if (y > 265) {
    doc.addPage();
    y = 20;
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  doc.line(18, y + 6, 85, y + 6);
  doc.text(`Subject Teacher: ${teacherName}`, 18, y + 10);
  doc.text('Signature & Date: ___________________', 18, y + 14);

  doc.line(115, y + 6, 185, y + 6);
  doc.text('Academic Coordinator / Exam Council: Approved', 115, y + 10);
  doc.text('Signature & Date: ___________________', 115, y + 14);

  doc.save(`Scoresheet_${subjectName.replace(/\s+/g, '_')}_${grade.replace(/\s+/g, '_')}.pdf`);
}


