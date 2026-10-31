import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FeePayment, FeeStructure } from '../types';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  Printer,
  Download,
  Receipt,
  FileCheck,
  Building,
  Calendar,
  X,
  BellRing,
  Send,
  CheckCircle2,
  MessageSquare,
  Mail,
  Smartphone
} from 'lucide-react';
import crestImage from '../assets/images/school_crest_emblem_1792317813141.jpg';
import { BulkRemindersModal } from './BulkRemindersModal';
import { MpesaPaymentModal } from './MpesaPaymentModal';

interface TuitionFeesViewProps {
  onOpenRecordPaymentModal: (learnerId?: string) => void;
  selectedLearnerFilter?: string;
}

export const TuitionFeesView: React.FC<TuitionFeesViewProps> = ({
  onOpenRecordPaymentModal,
  selectedLearnerFilter,
}) => {
  const {
    learners,
    parents,
    feeStructures,
    feePayments,
    currentUser,
    schoolProfile,
  } = useApp();

  const [selectedTerm, setSelectedTerm] = useState('Term 2 - 2026');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeReceiptPayment, setActiveReceiptPayment] = useState<FeePayment | null>(null);

  // Bulk automated reminder states
  const [isBulkReminderOpen, setIsBulkReminderOpen] = useState(false);
  const [reminderTargetLearnerId, setReminderTargetLearnerId] = useState<string | undefined>(undefined);
  const [bulkReminderNotice, setBulkReminderNotice] = useState<string | null>(null);

  // Lipa Na M-Pesa STK Push modal states
  const [isMpesaModalOpen, setIsMpesaModalOpen] = useState(false);
  const [mpesaLearnerId, setMpesaLearnerId] = useState<string | undefined>(undefined);

  const terms = ['Term 1 - 2026', 'Term 2 - 2026', 'Term 3 - 2026'];

  // Current term fee structures
  const currentStructures = feeStructures.filter((fs) => fs.term === selectedTerm);

  // Overdue calculations
  const overdueStructures = currentStructures.filter(
    (fs) => fs.balance > 0 && new Date(fs.dueDate) < new Date('2026-06-18')
  );
  const pendingWithBalanceStructures = currentStructures.filter((fs) => fs.balance > 0);
  const overdueCount = overdueStructures.length;
  const totalOverdueAmount = overdueStructures.reduce((acc, curr) => acc + curr.balance, 0);

  // Totals
  const termTotalBilled = currentStructures.reduce((acc, curr) => acc + curr.totalDue, 0);
  const termTotalCollected = currentStructures.reduce((acc, curr) => acc + curr.amountPaid, 0);
  const termTotalBalance = currentStructures.reduce((acc, curr) => acc + curr.balance, 0);
  const collectionPercentage =
    termTotalBilled > 0 ? (termTotalCollected / termTotalBilled) * 100 : 0;

  const handleOpenReminders = (learnerId?: string) => {
    setReminderTargetLearnerId(learnerId);
    setIsBulkReminderOpen(true);
  };

  // Filtered fee ledger
  const filteredStructures = currentStructures.filter((fs) => {
    const learner = learners.find((l) => l.id === fs.learnerId);
    const parent = parents.find((p) => p.id === learner?.parentId);

    if (currentUser.role === 'parent') {
      if (fs.learnerId !== currentUser.learnerId && (!learner || learner.parentId !== currentUser.parentId)) {
        return false;
      }
    }

    if (currentUser.role === 'teacher' && currentUser.teacherType === 'class_teacher' && currentUser.teacherGrade) {
      if (learner && learner.grade !== currentUser.teacherGrade) {
        return false;
      }
    }

    if (selectedLearnerFilter && fs.learnerId !== selectedLearnerFilter) {
      return false;
    }

    const matchesSearch =
      !searchQuery ||
      (learner && `${learner.firstName} ${learner.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (learner && learner.studentId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (parent && parent.fullName.toLowerCase().includes(searchQuery.toLowerCase()));

    const isOverdue = new Date(fs.dueDate) < new Date('2026-06-18') && fs.balance > 0;
    const computedStatus = fs.balance <= 0 ? 'paid' : isOverdue ? 'overdue' : 'partial';

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'paid' && computedStatus === 'paid') ||
      (statusFilter === 'partial' && computedStatus === 'partial') ||
      (statusFilter === 'overdue' && computedStatus === 'overdue');

    return matchesSearch && matchesStatus;
  });

  // Filtered payments history
  const filteredPayments = feePayments.filter((p) => {
    const learner = learners.find((l) => l.id === p.learnerId);
    if (currentUser.role === 'parent') {
      return p.learnerId === currentUser.learnerId || (currentUser.parentId && learner?.parentId === currentUser.parentId);
    }
    if (currentUser.role === 'teacher' && currentUser.teacherType === 'class_teacher' && currentUser.teacherGrade) {
      return learner?.grade === currentUser.teacherGrade;
    }
    if (selectedLearnerFilter) {
      return p.learnerId === selectedLearnerFilter;
    }
    return true;
  });

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Bursar Accounts & Treasury</span>
            <span aria-hidden="true">·</span>
            <span>Ledger Standard IFRS-EDU</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Tuition Fee Billing & Payment Ledger
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Real-time fee structures, automated receipt generation, balance aging, and transaction history.
          </p>
        </div>

        {(currentUser.role === 'admin' || currentUser.role === 'bursar') && (
          <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
            <button
              onClick={() => handleOpenReminders()}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors cursor-pointer shadow-xs"
              title="Send bulk automated SMS or email reminders to parents with overdue or pending balances"
            >
              <BellRing className="w-3.5 h-3.5 text-amber-600" />
              <span>Send Bulk Reminders</span>
              {pendingWithBalanceStructures.length > 0 && (
                <span className="px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded-full font-mono text-[10px] font-bold">
                  {pendingWithBalanceStructures.length} Due
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setMpesaLearnerId(undefined);
                setIsMpesaModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer shadow-xs"
              title="Trigger Safaricom Lipa Na M-Pesa Online STK push to parent phone"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Lipa Na M-Pesa (STK Push)</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs"
              title="Export complete fee ledger to PDF or print"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Export PDF Ledger</span>
            </button>

            <button
              onClick={() => onOpenRecordPaymentModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Payment & Issue Receipt</span>
            </button>
          </div>
        )}
      </div>

      {/* Dispatched Bulk Reminder Success Banner */}
      {bulkReminderNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 animate-in fade-in duration-200 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{bulkReminderNotice}</span>
          </div>
          <button
            onClick={() => setBulkReminderNotice(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1 rounded hover:bg-emerald-100/60 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Overdue Tuition Alert Notice */}
      {overdueCount > 0 && (currentUser.role === 'admin' || currentUser.role === 'bursar') && (
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5 text-amber-950">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>{overdueCount} accounts</strong> have past-due tuition balances totaling{' '}
              <strong className="font-mono text-amber-800 font-bold">Ksh {totalOverdueAmount.toLocaleString()}</strong> for {selectedTerm}.
            </span>
          </div>
          <button
            onClick={() => handleOpenReminders()}
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-md shadow-xs transition-colors cursor-pointer self-start sm:self-auto text-xs"
          >
            <Send className="w-3 h-3" />
            <span>Dispatch Overdue Reminders</span>
          </button>
        </div>
      )}

      {/* Term Financial KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 block mb-1">Total Tuition Invoiced</span>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            Ksh {termTotalBilled.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-1">{selectedTerm}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 block mb-1">Fees Collected to Date</span>
          <div className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
            Ksh {termTotalCollected.toLocaleString()}
          </div>
          <p className="text-xs text-emerald-600 font-medium mt-1">
            {collectionPercentage.toFixed(1)}% Collection Efficiency
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 block mb-1">Outstanding Balance</span>
          <div className="text-2xl font-bold font-mono text-amber-700 tabular-nums">
            Ksh {termTotalBalance.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-1">Pending parent remittance</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 block mb-1">Total Receipts Issued</span>
          <div className="text-2xl font-bold font-mono text-indigo-700 tabular-nums">
            {filteredPayments.length}
          </div>
          <p className="text-xs text-slate-500 mt-1">Verified transactions</p>
        </div>
      </div>

      {/* Term Selector & Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Term Switcher Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {terms.map((term) => (
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

        {/* Status Filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
            {['all', 'paid', 'partial', 'overdue'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded capitalize transition-colors cursor-pointer ${
                  statusFilter === status
                    ? 'bg-white text-slate-900 shadow-xs font-medium'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Filter ledger..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Student Tuition Fee Accounts ({selectedTerm})
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            {filteredStructures.length} student records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-2.5 px-4">Learner</th>
                <th className="py-2.5 px-4">Parent / Payer</th>
                <th className="py-2.5 px-3 text-right">Tuition</th>
                <th className="py-2.5 px-3 text-right">Activities</th>
                <th className="py-2.5 px-3 text-right">Total Due</th>
                <th className="py-2.5 px-3 text-right">Paid to Date</th>
                <th className="py-2.5 px-3 text-right">Balance</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3">Status</th>
                {(currentUser.role === 'admin' || currentUser.role === 'bursar') && (
                  <th className="py-2.5 px-4 text-right">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStructures.map((fs) => {
                const learner = learners.find((l) => l.id === fs.learnerId);
                const parent = parents.find((p) => p.id === learner?.parentId);
                const isOverdue = new Date(fs.dueDate) < new Date('2026-06-18') && fs.balance > 0;

                return (
                  <tr key={fs.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {learner?.firstName} {learner?.lastName}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {learner?.studentId} · {learner?.grade}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{parent?.fullName}</div>
                      <div className="text-[11px] text-slate-500">{parent?.relationship}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                      Ksh {fs.tuitionFee.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-500">
                      Ksh {(fs.sportsAndActivityFee + fs.learningMaterialsFee).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      Ksh {fs.totalDue.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-700">
                      Ksh {fs.amountPaid.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold">
                      <span className={fs.balance > 0 ? 'text-amber-700' : 'text-slate-400'}>
                        Ksh {fs.balance.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                      {fs.dueDate}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase font-mono ${
                          fs.balance <= 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isOverdue
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {fs.balance <= 0 ? 'Paid' : isOverdue ? 'Overdue' : 'Partial'}
                      </span>
                    </td>
                    {(currentUser.role === 'admin' || currentUser.role === 'bursar') && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {fs.balance > 0 && (
                            <button
                              onClick={() => handleOpenReminders(fs.learnerId)}
                              title="Send direct SMS/Email reminder to parent"
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded transition-colors cursor-pointer"
                            >
                              <BellRing className="w-3 h-3 text-amber-600" />
                              <span>Remind</span>
                            </button>
                          )}
                          {fs.balance > 0 && (
                            <button
                              onClick={() => {
                                setMpesaLearnerId(fs.learnerId);
                                setIsMpesaModalOpen(true);
                              }}
                              title="Prompt Lipa Na M-Pesa STK push on parent phone"
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded transition-colors cursor-pointer"
                            >
                              M-Pesa
                            </button>
                          )}
                          {fs.balance > 0 ? (
                            <button
                              onClick={() => onOpenRecordPaymentModal(fs.learnerId)}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors cursor-pointer"
                            >
                              Pay Due
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-600 font-medium">Cleared</span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historical Payment Receipts Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Official Payment Transaction Receipts</h2>
            <p className="text-xs text-slate-500">Verified payment receipts with transaction reference tracking</p>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {filteredPayments.length} transactions recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-2.5 px-4">Receipt #</th>
                <th className="py-2.5 px-4">Transaction Ref</th>
                <th className="py-2.5 px-4">Student & Payer</th>
                <th className="py-2.5 px-3">Term</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3">Payment Method</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.map((p) => {
                const learner = learners.find((l) => l.id === p.learnerId);
                const parent = parents.find((pr) => pr.id === p.parentId);

                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-indigo-700">
                      {p.receiptNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                      {p.transactionRef}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {learner?.firstName} {learner?.lastName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Paid by {parent?.fullName || 'Parent'}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{p.term}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 tabular-nums">
                      Ksh {p.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                        {p.method}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 tabular-nums">
                      {p.paymentDate}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setActiveReceiptPayment(p)}
                        className="flex items-center gap-1 ml-auto px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                      >
                        <Receipt className="w-3.5 h-3.5 text-slate-500" />
                        <span>View Receipt</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Printable Receipt Modal */}
      {activeReceiptPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full flex flex-col overflow-hidden">
            {/* Action Bar (Not printed) */}
            <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 no-print">
              <span className="text-xs font-semibold text-slate-700">Official Receipt Preview</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintReceipt}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setActiveReceiptPayment(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Receipt Layout */}
            <div id="printable-area" className="p-8 space-y-6 bg-white text-slate-900 text-xs">
              {/* Receipt Header */}
              {(() => {
                const receiptLearner = learners.find((l) => l.id === activeReceiptPayment.learnerId);
                const isJun = receiptLearner ? (
                  receiptLearner.grade.toLowerCase().includes('grade 7') ||
                  receiptLearner.grade.toLowerCase().includes('grade 8') ||
                  receiptLearner.grade.toLowerCase().includes('grade 9') ||
                  receiptLearner.grade.toLowerCase().includes('junior')
                ) : false;
                const wingTitle = isJun 
                  ? (schoolProfile?.juniorWingName || 'Mwivona Junior School') 
                  : (schoolProfile?.primaryWingName || 'Mwivona Primary School');

                return (
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={crestImage}
                        alt="School Crest"
                        className="w-14 h-14 object-contain"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h2 className="text-base font-bold tracking-tight text-slate-900 uppercase">
                          {wingTitle}
                        </h2>
                        <p className="text-[11px] text-indigo-700 font-semibold">
                          {schoolProfile?.name || 'Mwivona Comprehensive School'} · Bursar Treasury Office
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {schoolProfile?.postalAddress || 'P.O. Box 120 - 50307, Luanda, Kenya'} · Phone: {schoolProfile?.phone || '0711002233'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-xs font-bold text-indigo-700 block">
                        {activeReceiptPayment.receiptNumber}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Ref: {activeReceiptPayment.transactionRef}
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        Date: {activeReceiptPayment.paymentDate}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Payer and Student Box */}
              {(() => {
                const learner = learners.find((l) => l.id === activeReceiptPayment.learnerId);
                const parent = parents.find((p) => p.id === activeReceiptPayment.parentId);

                return (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                        Received From (Payer)
                      </span>
                      <p className="font-bold text-sm text-slate-900">{parent?.fullName}</p>
                      <p className="text-[11px] text-slate-600">Relationship: {parent?.relationship}</p>
                      <p className="text-[11px] font-mono text-slate-500">{parent?.phone}</p>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                        For Student / Beneficiary
                      </span>
                      <p className="font-bold text-sm text-slate-900">
                        {learner?.firstName} {learner?.lastName}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Student ID: <span className="font-mono">{learner?.studentId}</span>
                      </p>
                      <p className="text-[11px] text-slate-600">Grade: {learner?.grade}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Payment Details Breakdown */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-[11px] uppercase font-semibold text-slate-600">
                    <tr>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3">Term</th>
                      <th className="py-2 px-3">Payment Channel</th>
                      <th className="py-2 px-3 text-right">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    <tr>
                      <td className="py-3 px-3 font-medium text-slate-900">
                        Tuition & Educational Levies
                      </td>
                      <td className="py-3 px-3 text-slate-600">{activeReceiptPayment.term}</td>
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {activeReceiptPayment.method}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums text-sm">
                        Ksh {activeReceiptPayment.amount.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Outstanding Balance Note */}
              {(() => {
                const fs = feeStructures.find(
                  (f) =>
                    f.learnerId === activeReceiptPayment.learnerId &&
                    f.term === activeReceiptPayment.term
                );
                return (
                  <div className="flex items-center justify-between p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 text-xs">
                    <span className="text-slate-600">Remaining Term Balance:</span>
                    <span className="font-mono font-bold text-indigo-900 text-sm tabular-nums">
                      Ksh {fs ? fs.balance.toLocaleString() : '0'}
                    </span>
                  </div>
                );
              })()}

              {/* Signatures & Stamp */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-[11px]">
                <div>
                  <p className="text-slate-500 mb-6">Recorded By Authority:</p>
                  <p className="font-semibold text-slate-900">{activeReceiptPayment.recordedBy}</p>
                  <p className="text-slate-400">Finance & Accounts Office</p>
                </div>
                <div className="text-right">
                  <div className="inline-block p-2 border-2 border-dashed border-emerald-600 rounded text-emerald-800 font-mono font-bold text-[10px] uppercase tracking-wider mb-2">
                    ✓ Verified Paid & Cleared
                  </div>
                  <p className="text-slate-400">Official Electronic School Seal</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end no-print">
              <button
                onClick={() => setActiveReceiptPayment(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Reminders Modal */}
      <BulkRemindersModal
        isOpen={isBulkReminderOpen}
        onClose={() => {
          setIsBulkReminderOpen(false);
          setReminderTargetLearnerId(undefined);
        }}
        selectedTerm={selectedTerm}
        preSelectedLearnerId={reminderTargetLearnerId}
        onSuccess={(msg) => {
          setBulkReminderNotice(msg);
          setTimeout(() => {
            setBulkReminderNotice(null);
          }, 8000);
        }}
      />

      {/* Lipa Na M-Pesa Online (STK Push) Modal */}
      <MpesaPaymentModal
        isOpen={isMpesaModalOpen}
        onClose={() => {
          setIsMpesaModalOpen(false);
          setMpesaLearnerId(undefined);
        }}
        preSelectedLearnerId={mpesaLearnerId}
        onPaymentSuccess={(recNum, txnCode) => {
          setBulkReminderNotice(`M-Pesa payment cleared! Receipt #${recNum} issued for transaction ${txnCode}.`);
          setTimeout(() => setBulkReminderNotice(null), 8000);
        }}
      />
    </div>
  );
};
