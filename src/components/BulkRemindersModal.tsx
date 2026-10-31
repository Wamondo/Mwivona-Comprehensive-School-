import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FeeStructure, LearnerRecord, ParentRecord } from '../types';
import {
  BellRing,
  Send,
  Mail,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  X,
  Sparkles,
  Info,
  Check,
  Smartphone,
  Calendar,
  DollarSign
} from 'lucide-react';
import { maskPhoneNumber, maskEmail } from '../services/cryptoService';

interface BulkRemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTerm: string;
  preSelectedLearnerId?: string;
  onSuccess: (message: string) => void;
}

export const BulkRemindersModal: React.FC<BulkRemindersModalProps> = ({
  isOpen,
  onClose,
  selectedTerm,
  preSelectedLearnerId,
  onSuccess,
}) => {
  const {
    feeStructures,
    learners,
    parents,
    sendBulkOverdueReminders,
    currentUser,
    isParentDecrypted,
  } = useApp();

  // Filter accounts with balance > 0 in this term
  const pendingStructures = feeStructures.filter(
    (fs) => fs.term === selectedTerm && fs.balance > 0
  );

  // Channels state
  const [selectedChannels, setSelectedChannels] = useState<('sms' | 'email')[]>(['sms', 'email']);
  
  // Tone / Urgency state
  const [urgencyLevel, setUrgencyLevel] = useState<'standard' | 'friendly' | 'final' | 'custom'>('standard');
  const [customTemplate, setCustomTemplate] = useState<string>(
    'OVERDUE REMINDER: Dear {ParentName}, tuition balance of {AmountDue} for {LearnerName} ({Grade}) was due on {DueDate}. Kindly remit payment via {Paybill}. Thank you.'
  );

  // Selected learner IDs
  const [selectedLearnerIds, setSelectedLearnerIds] = useState<string[]>(() => {
    if (preSelectedLearnerId) {
      return [preSelectedLearnerId];
    }
    // By default select all overdue in this term
    return pendingStructures.map((fs) => fs.learnerId);
  });

  const [previewTab, setPreviewTab] = useState<'sms' | 'email'>('sms');
  const [isSending, setIsSending] = useState(false);

  // Sync when preSelectedLearnerId changes or modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (preSelectedLearnerId) {
        setSelectedLearnerIds([preSelectedLearnerId]);
      } else {
        setSelectedLearnerIds(pendingStructures.map((fs) => fs.learnerId));
      }
    }
  }, [isOpen, preSelectedLearnerId, selectedTerm]);

  if (!isOpen) return null;

  const toggleChannel = (channel: 'sms' | 'email') => {
    if (selectedChannels.includes(channel)) {
      if (selectedChannels.length === 1) return; // Prevent unchecking all
      setSelectedChannels(selectedChannels.filter((c) => c !== channel));
    } else {
      setSelectedChannels([...selectedChannels, channel]);
    }
  };

  const toggleSelectLearner = (learnerId: string) => {
    if (selectedLearnerIds.includes(learnerId)) {
      setSelectedLearnerIds(selectedLearnerIds.filter((id) => id !== learnerId));
    } else {
      setSelectedLearnerIds([...selectedLearnerIds, learnerId]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedLearnerIds.length === pendingStructures.length) {
      setSelectedLearnerIds([]);
    } else {
      setSelectedLearnerIds(pendingStructures.map((fs) => fs.learnerId));
    }
  };

  // Selected accounts summary
  const selectedStructures = pendingStructures.filter((fs) =>
    selectedLearnerIds.includes(fs.learnerId)
  );
  const totalDebtNotified = selectedStructures.reduce((acc, curr) => acc + curr.balance, 0);

  // First selected recipient for live preview
  const previewStructure = selectedStructures[0] || pendingStructures[0];
  const previewLearner = learners.find((l) => l.id === previewStructure?.learnerId);
  const previewParent = parents.find((p) => p.id === previewLearner?.parentId);

  const getPreviewText = (learner?: LearnerRecord, parent?: ParentRecord, fee?: FeeStructure) => {
    if (!learner || !parent || !fee) return 'Select at least one recipient to preview message.';

    const amountStr = `Ksh ${fee.balance.toLocaleString()}`;
    const dueDateStr = fee.dueDate;

    if (urgencyLevel === 'custom') {
      return customTemplate
        .replace(/{ParentName}/g, parent.fullName)
        .replace(/{LearnerName}/g, `${learner.firstName} ${learner.lastName}`)
        .replace(/{Grade}/g, learner.grade)
        .replace(/{AmountDue}/g, amountStr)
        .replace(/{DueDate}/g, dueDateStr)
        .replace(/{Paybill}/g, `Paybill 28491 (A/C: ${learner.studentId})`);
    }

    if (urgencyLevel === 'final') {
      return `FINAL OVERDUE DEMAND: Dear ${parent.fullName}, outstanding tuition of ${amountStr} for ${learner.firstName} ${learner.lastName} (${learner.grade}) was due on ${dueDateStr}. Immediate settlement required to prevent academic service suspension.`;
    }

    if (urgencyLevel === 'friendly') {
      return `Friendly Tuition Reminder: Dear ${parent.fullName}, a tuition balance of ${amountStr} remains for ${learner.firstName} for ${selectedTerm} (due ${dueDateStr}). Settle via Paybill 28491. Thank you.`;
    }

    return `OVERDUE TUITION ALERT: Dear ${parent.fullName}, tuition balance of ${amountStr} for ${learner.firstName} ${learner.lastName} is overdue (was due ${dueDateStr}). Please remit via Paybill 28491 A/C: ${learner.studentId}.`;
  };

  const handleSend = () => {
    if (selectedLearnerIds.length === 0 || selectedChannels.length === 0) return;

    setIsSending(true);

    setTimeout(() => {
      const result = sendBulkOverdueReminders({
        learnerIds: selectedLearnerIds,
        term: selectedTerm,
        channels: selectedChannels,
        customMessageTemplate: urgencyLevel === 'custom' ? customTemplate : undefined,
        urgencyLevel: urgencyLevel === 'custom' ? 'standard' : urgencyLevel,
      });

      setIsSending(false);
      onSuccess(result.message);
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-linear-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <BellRing className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                <span>Send Bulk Overdue Tuition Reminders</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30 font-mono">
                  {selectedTerm}
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Direct automated SMS and Email notification dispatch to parents with outstanding balances
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wider">
                Recipients Selected
              </span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                {selectedLearnerIds.length} <span className="text-xs text-slate-500 font-normal">of {pendingStructures.length} accounts</span>
              </div>
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wider">
                Total Overdue Debt
              </span>
              <div className="text-xl font-bold font-mono text-amber-700 mt-0.5 tabular-nums">
                Ksh {totalDebtNotified.toLocaleString()}
              </div>
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wider">
                Delivery Channels
              </span>
              <div className="flex items-center gap-2 mt-1">
                {selectedChannels.includes('sms') && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                    <MessageSquare className="w-3 h-3" /> SMS
                  </span>
                )}
                {selectedChannels.includes('email') && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-100 text-indigo-800">
                    <Mail className="w-3 h-3" /> Email
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 1: Dispatch Channels */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
              1. Choose Notification Channels
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => toggleChannel('sms')}
                className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  selectedChannels.includes('sms')
                    ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    selectedChannels.includes('sms')
                      ? 'bg-indigo-600 text-white'
                      : 'border border-slate-300 bg-white'
                  }`}
                >
                  {selectedChannels.includes('sms') && <Check className="w-3.5 h-3.5 stroke-3" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                    <span>SMS Direct Dispatch</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    High-priority automated cellular SMS delivered directly to verified parent phone numbers.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => toggleChannel('email')}
                className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  selectedChannels.includes('email')
                    ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    selectedChannels.includes('email')
                      ? 'bg-indigo-600 text-white'
                      : 'border border-slate-300 bg-white'
                  }`}
                >
                  {selectedChannels.includes('email') && <Check className="w-3.5 h-3.5 stroke-3" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Mail className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Official Email Statement</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Formatted formal electronic tuition statement delivered to parent email inbox.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Tone & Urgency Presets */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
              2. Reminder Message Tone & Template
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {[
                { id: 'standard', label: 'Standard Alert', desc: 'Clear & formal overdue reminder' },
                { id: 'friendly', label: 'Friendly Notice', desc: 'Courteous balance reminder' },
                { id: 'final', label: 'Final Demand', desc: 'Urgent service suspension alert' },
                { id: 'custom', label: 'Custom Template', desc: 'Fully editable message' },
              ].map((tone) => (
                <button
                  key={tone.id}
                  type="button"
                  onClick={() => setUrgencyLevel(tone.id as any)}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                    urgencyLevel === tone.id
                      ? 'bg-indigo-50 border-indigo-600 text-indigo-950 font-semibold'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="font-semibold">{tone.label}</div>
                  <div className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5">
                    {tone.desc}
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Template Editor */}
            {urgencyLevel === 'custom' && (
              <div className="space-y-2 mb-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">Custom Template Content:</span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    <span>Placeholders available below</span>
                  </div>
                </div>
                <textarea
                  rows={3}
                  value={customTemplate}
                  onChange={(e) => setCustomTemplate(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-md font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {['{ParentName}', '{LearnerName}', '{Grade}', '{AmountDue}', '{DueDate}', '{Paybill}'].map((ph) => (
                    <button
                      key={ph}
                      type="button"
                      onClick={() => setCustomTemplate((prev) => prev + ` ${ph}`)}
                      className="px-2 py-0.5 bg-white border border-slate-200 hover:border-indigo-400 rounded text-slate-600 font-mono text-[10px] cursor-pointer"
                    >
                      + {ph}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Live Preview Tab */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                3. Live Delivery Preview (Simulated Dispatch)
              </label>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewTab('sms')}
                  className={`px-2.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                    previewTab === 'sms' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  SMS View
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('email')}
                  className={`px-2.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                    previewTab === 'email' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Email View
                </button>
              </div>
            </div>

            {previewLearner && previewParent && previewStructure ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                {previewTab === 'sms' ? (
                  <div className="p-4 bg-slate-900 text-white font-mono text-xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2 mb-3">
                      <span>Sender: MWIVONA-NOTIFY</span>
                      <span>
                        To: {isParentDecrypted(previewParent.id) ? previewParent.phone : maskPhoneNumber(previewParent.phone)} ({previewParent.fullName})
                      </span>
                    </div>
                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 text-slate-100 leading-relaxed max-w-lg">
                      {getPreviewText(previewLearner, previewParent, previewStructure)}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                      <span>Gateway: Route 100% Instant SMS Gateway (2-way delivery receipt enabled)</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-white border border-slate-200 text-xs">
                    <div className="border-b border-slate-100 pb-2 mb-3 text-slate-600 space-y-1">
                      <div>
                        <span className="font-semibold text-slate-700">From:</span> Bursar Office &lt;bursar@mwivonacomprehensive.sc.ke&gt;
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">To:</span> {previewParent.fullName} &lt;{isParentDecrypted(previewParent.id) ? previewParent.email : maskEmail(previewParent.email)}&gt;
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Subject:</span> Official Tuition Fee Overdue Statement - {previewLearner.firstName} {previewLearner.lastName}
                      </div>
                    </div>
                    <div className="space-y-2 text-slate-800 py-1">
                      <p className="font-semibold">Dear {previewParent.fullName},</p>
                      <p className="leading-relaxed">
                        {getPreviewText(previewLearner, previewParent, previewStructure)}
                      </p>
                      <div className="my-3 p-3 bg-slate-50 rounded border border-slate-200">
                        <div className="font-semibold text-slate-900 mb-1">Fee Account Summary:</div>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>Learner: {previewLearner.firstName} {previewLearner.lastName} ({previewLearner.studentId})</div>
                          <div>Class: {previewLearner.grade}</div>
                          <div>Total Due: Kshs {previewStructure.totalDue.toLocaleString()}</div>
                          <div className="font-bold text-amber-700">Outstanding Balance: Kshs {previewStructure.balance.toLocaleString()}</div>
                        </div>
                      </div>
                      <p className="text-slate-500 text-[11px]">
                        Kind regards,<br />
                        Bursar Office & Treasury Accounts<br />
                        Mwivona Comprehensive School
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                No pending or overdue accounts selected. Please select at least one recipient below.
              </div>
            )}
          </div>

          {/* Section 4: Target Recipients Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                4. Select Recipient Parents ({selectedLearnerIds.length} of {pendingStructures.length} Selected)
              </label>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                {selectedLearnerIds.length === pendingStructures.length ? 'Deselect All' : 'Select All Overdue'}
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-2 px-3 w-8">
                      <input
                        type="checkbox"
                        checked={selectedLearnerIds.length === pendingStructures.length && pendingStructures.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-2 px-3">Student & Grade</th>
                    <th className="py-2 px-3">Parent & Contact</th>
                    <th className="py-2 px-3 text-right">Balance Due</th>
                    <th className="py-2 px-3">Due Date</th>
                    <th className="py-2 px-3">Channel Pref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {pendingStructures.map((fs) => {
                    const learner = learners.find((l) => l.id === fs.learnerId);
                    const parent = parents.find((p) => p.id === learner?.parentId);
                    const isSelected = selectedLearnerIds.includes(fs.learnerId);
                    const isOverdue = new Date(fs.dueDate) < new Date('2026-06-18');

                    return (
                      <tr
                        key={fs.id}
                        onClick={() => toggleSelectLearner(fs.learnerId)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-50/40 hover:bg-indigo-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectLearner(fs.learnerId)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">
                            {learner?.firstName} {learner?.lastName}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {learner?.studentId} · {learner?.grade}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-800">{parent?.fullName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {parent ? (isParentDecrypted(parent.id) ? parent.phone : maskPhoneNumber(parent.phone)) : ''}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700 tabular-nums">
                          Ksh {fs.balance.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                              isOverdue ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'text-slate-600'
                            }`}
                          >
                            {fs.dueDate}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="capitalize text-[11px] font-medium text-slate-600">
                            {parent?.preferredChannel || 'SMS'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {selectedLearnerIds.length > 0 ? (
              <span>
                Ready to dispatch to <strong className="text-slate-800">{selectedLearnerIds.length}</strong> parents ({selectedChannels.join(' & ').toUpperCase()})
              </span>
            ) : (
              <span className="text-amber-700 font-medium">Please select at least one recipient parent</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || selectedLearnerIds.length === 0 || selectedChannels.length === 0}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              {isSending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Dispatching Reminders...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send {selectedLearnerIds.length} Overdue Reminders Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
