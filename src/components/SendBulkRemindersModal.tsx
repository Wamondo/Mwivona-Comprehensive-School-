import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Send,
  MessageSquare,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Users,
  CheckSquare,
  Square,
  DollarSign,
  Calendar,
  X,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { maskPhoneNumber, maskEmail } from '../services/cryptoService';

interface SendBulkRemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTerm: string;
  initialLearnerId?: string;
  onDispatchComplete?: (stats: { sentSmsCount: number; sentEmailCount: number; totalDebtNotified: number }) => void;
}

export const SendBulkRemindersModal: React.FC<SendBulkRemindersModalProps> = ({
  isOpen,
  onClose,
  selectedTerm,
  initialLearnerId,
  onDispatchComplete,
}) => {
  const {
    learners,
    parents,
    feeStructures,
    sendBulkOverdueReminders,
    isParentDecrypted,
  } = useApp();

  // Find all accounts with unpaid balances for the term
  const eligibleAccounts = useMemo(() => {
    return feeStructures
      .filter((fs) => fs.term === selectedTerm && fs.balance > 0)
      .map((fs) => {
        const learner = learners.find((l) => l.id === fs.learnerId);
        const parent = parents.find((p) => p.id === learner?.parentId);
        const isOverdue = new Date(fs.dueDate) < new Date('2026-06-18');
        return {
          feeStructure: fs,
          learner,
          parent,
          isOverdue,
        };
      })
      .filter((item) => item.learner && item.parent);
  }, [feeStructures, selectedTerm, learners, parents]);

  // Selected student IDs (default: if initialLearnerId is passed, just that one, else all overdue accounts)
  const [selectedLearnerIds, setSelectedLearnerIds] = useState<string[]>(() => {
    if (initialLearnerId) return [initialLearnerId];
    return eligibleAccounts.map((a) => a.learner!.id);
  });

  // Channels
  const [sendSms, setSendSms] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);

  // Template tone
  const [urgencyTone, setUrgencyTone] = useState<'standard' | 'friendly' | 'final' | 'custom'>('standard');

  const [customTemplate, setCustomTemplate] = useState(
    'OVERDUE TUITION ALERT: Dear {ParentName}, tuition balance of {AmountDue} for {LearnerName} ({Grade}) is past due date ({DueDate}). Please remit via Paybill 28491 to clear the account.'
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<{
    sentSmsCount: number;
    sentEmailCount: number;
    totalRecipients: number;
    totalDebtNotified: number;
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const toggleSelectAll = () => {
    if (selectedLearnerIds.length === eligibleAccounts.length) {
      setSelectedLearnerIds([]);
    } else {
      setSelectedLearnerIds(eligibleAccounts.map((a) => a.learner!.id));
    }
  };

  const toggleLearner = (id: string) => {
    if (selectedLearnerIds.includes(id)) {
      setSelectedLearnerIds((prev) => prev.filter((i) => i !== id));
    } else {
      setSelectedLearnerIds((prev) => [...prev, id]);
    }
  };

  // Selected summary
  const selectedAccounts = eligibleAccounts.filter((a) =>
    selectedLearnerIds.includes(a.learner!.id)
  );
  const totalDebtSelected = selectedAccounts.reduce(
    (acc, curr) => acc + curr.feeStructure.balance,
    0
  );

  // Live preview for first selected student
  const previewTarget = selectedAccounts[0] || eligibleAccounts[0];
  const previewMessage = previewTarget
    ? (urgencyTone === 'custom'
        ? customTemplate
        : urgencyTone === 'final'
        ? 'FINAL OVERDUE DEMAND: Dear {ParentName}, outstanding tuition of {AmountDue} for {LearnerName} ({Grade}) was due on {DueDate}. Immediate settlement required to prevent academic service suspension.'
        : urgencyTone === 'friendly'
        ? 'Friendly Tuition Reminder: Dear {ParentName}, a tuition balance of {AmountDue} remains for {LearnerName} for {Term} (due {DueDate}). Settle via Paybill 28491. Thank you.'
        : 'OVERDUE TUITION ALERT: Dear {ParentName}, tuition balance of {AmountDue} for {LearnerName} is overdue (was due {DueDate}). Please remit via Paybill 28491 A/C: {StudentId}.'
      )
        .replace(/{ParentName}/g, previewTarget.parent?.fullName || 'Parent')
        .replace(/{LearnerName}/g, `${previewTarget.learner?.firstName} ${previewTarget.learner?.lastName}`)
        .replace(/{Grade}/g, previewTarget.learner?.grade || 'Grade')
        .replace(/{AmountDue}/g, `Ksh ${previewTarget.feeStructure.balance.toLocaleString()}`)
        .replace(/{DueDate}/g, previewTarget.feeStructure.dueDate)
        .replace(/{Term}/g, selectedTerm)
        .replace(/{StudentId}/g, previewTarget.learner?.studentId || 'STU')
    : 'No recipient selected';

  const handleExecuteDispatch = () => {
    if (selectedLearnerIds.length === 0) {
      alert('Please select at least one student account to notify.');
      return;
    }
    if (!sendSms && !sendEmail) {
      alert('Please select at least one delivery channel (SMS or Email).');
      return;
    }

    setIsSubmitting(true);

    const channels: ('sms' | 'email')[] = [];
    if (sendSms) channels.push('sms');
    if (sendEmail) channels.push('email');

    setTimeout(() => {
      const res = sendBulkOverdueReminders({
        learnerIds: selectedLearnerIds,
        term: selectedTerm,
        channels,
        customMessageTemplate: urgencyTone === 'custom' ? customTemplate : undefined,
        urgencyLevel: urgencyTone !== 'custom' ? urgencyTone : 'standard',
      });

      setIsSubmitting(false);
      setDispatchResult(res);

      if (onDispatchComplete) {
        onDispatchComplete({
          sentSmsCount: res.sentSmsCount,
          sentEmailCount: res.sentEmailCount,
          totalDebtNotified: res.totalDebtNotified,
        });
      }
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Send Bulk Overdue Tuition Reminders
              </h3>
              <p className="text-xs text-slate-500">
                Direct SMS and Email automated dispatch to parents with pending or overdue balances ({selectedTerm})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dispatch Confirmation State */}
        {dispatchResult ? (
          <div className="p-8 space-y-6 text-center">
            <div className="w-14 h-14 bg-emerald-100 border border-emerald-300 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-bold text-slate-900">
                Reminders Successfully Dispatched!
              </h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                {dispatchResult.message}
              </p>
            </div>

            {/* Delivery Stats Grid */}
            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-left">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">SMS Sent</span>
                <span className="text-base font-bold font-mono text-indigo-700 tabular-nums">
                  {dispatchResult.sentSmsCount}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Emails Sent</span>
                <span className="text-base font-bold font-mono text-emerald-700 tabular-nums">
                  {dispatchResult.sentEmailCount}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Debt Notified</span>
                <span className="text-base font-bold font-mono text-amber-700 tabular-nums">
                  ${dispatchResult.totalDebtNotified.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pt-4 flex justify-center">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Return to Tuition Ledger
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 overflow-y-auto space-y-5">
            {/* 1. Recipient Selection Checklist */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    1. Select Parent Recipients ({selectedLearnerIds.length} Selected)
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Accounts with active balances in {selectedTerm}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  {selectedLearnerIds.length === eligibleAccounts.length ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Deselect All</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5" />
                      <span>Select All ({eligibleAccounts.length})</span>
                    </>
                  )}
                </button>
              </div>

              {/* Recipient Cards Checklist */}
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto bg-slate-50/50">
                {eligibleAccounts.map((item) => {
                  const isChecked = selectedLearnerIds.includes(item.learner!.id);
                  const isDecrypted = isParentDecrypted(item.parent!.id);

                  return (
                    <div
                      key={item.learner!.id}
                      onClick={() => toggleLearner(item.learner!.id)}
                      className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isChecked ? 'bg-indigo-50/50' : 'hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent div
                          className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">
                              {item.parent!.fullName}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-600 text-[11px]">
                              for {item.learner!.firstName} {item.learner!.lastName} ({item.learner!.grade})
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Tel: {isDecrypted ? item.parent!.phone : maskPhoneNumber(item.parent!.phone)} · {isDecrypted ? item.parent!.email : maskEmail(item.parent!.email)}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-amber-700 tabular-nums">
                          Ksh {item.feeStructure.balance.toLocaleString()}
                        </span>
                        <div className="text-[10px] text-slate-400">
                          Due: {item.feeStructure.dueDate}{' '}
                          {item.isOverdue && (
                            <span className="text-rose-600 font-semibold">(Overdue)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selection Summary Pill */}
              <div className="flex items-center justify-between p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-900 text-xs">
                <span>Selected Audience: <strong>{selectedLearnerIds.length}</strong> parent accounts</span>
                <span className="font-mono font-bold text-indigo-950">
                  Total Outstanding: Ksh {totalDebtSelected.toLocaleString()}
                </span>
              </div>
            </div>

            {/* 2. Channel Selection */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                2. Automated Dispatch Channels
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`p-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-colors ${
                    sendSms
                      ? 'border-indigo-600 bg-indigo-50/40 text-indigo-950 font-semibold'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={sendSms}
                    onChange={(e) => setSendSms(e.target.checked)}
                    className="h-4 w-4 rounded text-indigo-600"
                  />
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-600" />
                    <div>
                      <span className="block text-xs">SMS Text Message</span>
                      <span className="block text-[10px] text-slate-500 font-normal">
                        Instant mobile alert with Paybill #
                      </span>
                    </div>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-colors ${
                    sendEmail
                      ? 'border-indigo-600 bg-indigo-50/40 text-indigo-950 font-semibold'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="h-4 w-4 rounded text-indigo-600"
                  />
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-indigo-600" />
                    <div>
                      <span className="block text-xs">Official Email Statement</span>
                      <span className="block text-[10px] text-slate-500 font-normal">
                        Formal notice with itemized breakdown
                      </span>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* 3. Message Tone / Template */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                3. Notification Urgency & Template
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'standard', label: 'Standard Notice', desc: 'Overdue with Paybill info' },
                  { id: 'friendly', label: 'Friendly Reminder', desc: 'Gentle follow-up' },
                  { id: 'final', label: 'Final Demand', desc: '48h Clearance warning' },
                  { id: 'custom', label: 'Custom Text', desc: 'Compose message' },
                ].map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setUrgencyTone(t.id as any)}
                    className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                      urgencyTone === t.id
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="block text-xs">{t.label}</span>
                    <span className="block text-[10px] text-slate-400 font-normal">{t.desc}</span>
                  </button>
                ))}
              </div>

              {urgencyTone === 'custom' && (
                <div className="space-y-1 pt-1">
                  <textarea
                    rows={3}
                    value={customTemplate}
                    onChange={(e) => setCustomTemplate(e.target.value)}
                    placeholder="Use {ParentName}, {LearnerName}, {Grade}, {AmountDue}, {DueDate}"
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* 4. Live Message Preview Box */}
            <div className="p-3.5 bg-slate-100 rounded-lg border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Rendered Message Sample (Preview for first recipient):</span>
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  {previewTarget?.parent?.fullName || 'Parent'}
                </span>
              </div>
              <p className="text-xs text-slate-800 italic bg-white p-2.5 rounded border border-slate-200 leading-relaxed font-sans">
                "{previewMessage}"
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Audit logged under <strong className="font-mono">RBAC Policy</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDispatch}
                  disabled={isSubmitting || selectedLearnerIds.length === 0}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {isSubmitting
                      ? 'Dispatching Automated Notices...'
                      : `Send ${selectedLearnerIds.length} Bulk Overdue Reminders`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
