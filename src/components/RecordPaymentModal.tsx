import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FeePayment } from '../types';
import { CreditCard, CheckCircle2, X } from 'lucide-react';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLearnerId?: string;
  onPaymentSuccess?: (payment: FeePayment) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  initialLearnerId,
  onPaymentSuccess,
}) => {
  const {
    learners,
    parents,
    feeStructures,
    recordPayment,
  } = useApp();

  const [learnerId, setLearnerId] = useState(
    initialLearnerId || (learners[0] ? learners[0].id : '')
  );
  const [term, setTerm] = useState('Term 2 - 2026');
  const [amount, setAmount] = useState<number>(600);
  const [method, setMethod] = useState<'Bank Transfer' | 'M-Pesa / Mobile Money' | 'Card' | 'Cash'>(
    'M-Pesa / Mobile Money'
  );
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  // Selected student fee info
  const feeStructure = feeStructures.find(
    (fs) => fs.learnerId === learnerId && fs.term === term
  );
  const currentLearner = learners.find((l) => l.id === learnerId);
  const currentParent = parents.find((p) => p.id === currentLearner?.parentId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!learnerId || amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    const payment = recordPayment({
      learnerId,
      term,
      amount: Number(amount),
      method,
      notes,
    });

    onClose();
    if (onPaymentSuccess) {
      onPaymentSuccess(payment);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Record Tuition Payment</h3>
              <p className="text-xs text-slate-500">Issue official receipt and update fee ledger balance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Select Learner */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Select Enrolled Student:</label>
            <select
              value={learnerId}
              onChange={(e) => {
                setLearnerId(e.target.value);
                const fs = feeStructures.find(
                  (f) => f.learnerId === e.target.value && f.term === term
                );
                if (fs) setAmount(fs.balance > 0 ? fs.balance : 0);
              }}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {learners.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.firstName} {l.lastName} ({l.studentId} · {l.grade})
                </option>
              ))}
            </select>
          </div>

          {/* Term and Current Balance display */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Academic Term:</label>
              <select
                value={term}
                onChange={(e) => {
                  setTerm(e.target.value);
                  const fs = feeStructures.find(
                    (f) => f.learnerId === learnerId && f.term === e.target.value
                  );
                  if (fs) setAmount(fs.balance > 0 ? fs.balance : 0);
                }}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="Term 1 - 2026">Term 1 - 2026</option>
                <option value="Term 2 - 2026">Term 2 - 2026</option>
                <option value="Term 3 - 2026">Term 3 - 2026</option>
              </select>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Current Balance</span>
              <span className="text-base font-bold font-mono text-amber-700 tabular-nums">
                Ksh {feeStructure ? feeStructure.balance.toLocaleString() : '0'}
              </span>
            </div>
          </div>

          {/* Payment Amount */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Payment Amount (Kshs):</label>
            <input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
              className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Payment Method:</label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  'M-Pesa / Mobile Money',
                  'Bank Transfer',
                  'Card',
                  'Cash',
                ] as const
              ).map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                    method === m
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Payer Summary */}
          {currentParent && (
            <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 text-slate-700">
              <span className="text-[10px] uppercase font-bold text-indigo-700 block">
                Payer Details on Receipt
              </span>
              <p className="font-semibold">{currentParent.fullName} ({currentParent.relationship})</p>
              <p className="font-mono text-[11px] text-slate-500">{currentParent.phone}</p>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Receipt Notes / Reference Details:</label>
            <input
              type="text"
              placeholder="e.g. Standard Chartered bank slip #829104"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
            >
              Confirm & Issue Receipt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
