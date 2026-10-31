import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  ShieldCheck,
  Receipt,
  Clock,
  Sparkles,
  Lock,
  DollarSign
} from 'lucide-react';
import {
  initiateLipaNaMpesaStkPush,
  getMpesaConfig,
  saveMpesaConfig
} from '../services/mpesaDarajaService';
import { validateKenyanPhoneNumber } from '../services/cryptoService';

interface MpesaPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedLearnerId?: string;
  onPaymentSuccess?: (receiptNum: string, txnCode: string) => void;
}

export const MpesaPaymentModal: React.FC<MpesaPaymentModalProps> = ({
  isOpen,
  onClose,
  preSelectedLearnerId,
  onPaymentSuccess,
}) => {
  const {
    learners,
    parents,
    feeStructures,
    recordPayment,
    currentUser,
    getParentById,
    getLearnerById,
    schoolProfile,
  } = useApp();

  const [selectedLearnerId, setSelectedLearnerId] = useState<string>(
    preSelectedLearnerId || (learners[0]?.id || '')
  );

  const learner = getLearnerById(selectedLearnerId);
  const parent = learner ? getParentById(learner.parentId) : undefined;
  const currentStructure = feeStructures.find(
    (fs) => fs.learnerId === selectedLearnerId && fs.term === 'Term 2 - 2026'
  );

  const [phone, setPhone] = useState(parent?.phone || '0712345678');
  const [amount, setAmount] = useState<number>(currentStructure?.balance || 600);
  const [statusStep, setStatusStep] = useState<'input' | 'stk_sent' | 'completed'>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Result details
  const [txnCode, setTxnCode] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');

  // Sync phone when learner changes
  React.useEffect(() => {
    if (parent?.phone) {
      setPhone(parent.phone);
    }
    if (currentStructure?.balance) {
      setAmount(currentStructure.balance);
    }
  }, [selectedLearnerId, parent?.phone, currentStructure?.balance]);

  if (!isOpen) return null;

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const validation = validateKenyanPhoneNumber(phone);
    if (!validation.isValid) {
      setErrorMsg(
        validation.error ||
          'The phone number format should start with 07.... Or 01.... Not +2547.... nor +254.....'
      );
      return;
    }

    if (amount <= 0) {
      setErrorMsg('Please enter a valid tuition payment amount.');
      return;
    }

    setIsLoading(true);

    const res = await initiateLipaNaMpesaStkPush({
      phone: validation.cleanPhone!,
      amount,
      learnerId: selectedLearnerId,
      learnerName: learner ? `${learner.firstName} ${learner.lastName}` : 'Student',
      accountReference: learner?.studentId || 'FEES',
      term: 'Term 2 - 2026',
    });

    setIsLoading(false);

    if (res.success && res.transactionCode && res.receiptNumber) {
      setTxnCode(res.transactionCode);
      setReceiptNumber(res.receiptNumber);
      setStatusStep('stk_sent');
    } else {
      setErrorMsg(res.error || 'Failed to initiate M-Pesa STK push.');
    }
  };

  const handleSimulatePinEntered = () => {
    // Record payment in the application context & database
    const payment = recordPayment({
      learnerId: selectedLearnerId,
      term: 'Term 2 - 2026',
      amount: Number(amount),
      method: 'M-Pesa / Mobile Money',
      notes: `Lipa Na M-Pesa Online STK Push · Ref: ${txnCode}`,
    });

    setStatusStep('completed');
    if (onPaymentSuccess) {
      onPaymentSuccess(receiptNumber, txnCode);
    }
  };

  const handleClose = () => {
    setStatusStep('input');
    setErrorMsg(null);
    setIsLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden text-slate-900 text-xs">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-sm">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Lipa Na M-Pesa Online (STK Push)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                  Daraja C2B Active
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Safaricom automated mobile fees settlement & instant receipting
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4">
          
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: PAYMENT INPUT */}
          {statusStep === 'input' && (
            <form onSubmit={handleInitiate} className="space-y-4">
              
              {/* Target Learner Select */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Learner (Account Reference)
                </label>
                <select
                  value={selectedLearnerId}
                  onChange={(e) => setSelectedLearnerId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {learners.map((l) => {
                    const p = getParentById(l.parentId);
                    const fs = feeStructures.find((f) => f.learnerId === l.id && f.term === 'Term 2 - 2026');
                    return (
                      <option key={l.id} value={l.id}>
                        {l.firstName} {l.lastName} ({l.grade} · {l.studentId}) — Balance: Ksh {fs?.balance || 0}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Fee Summary Pill */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">
                    Current Term 2 Balance
                  </span>
                  <span className="text-base font-bold text-amber-700 font-mono">
                    Ksh {currentStructure?.balance || 0}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Registered Parent</span>
                  <span className="font-semibold text-slate-900">{parent?.fullName || 'Parent'}</span>
                </div>
              </div>

              {/* M-Pesa Phone Number */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  M-Pesa Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="0712345678 or 0110445566"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                  <span>Must start with <strong>07....</strong> or <strong>01....</strong> (10 digits)</span>
                  <span className="text-amber-700 font-mono font-semibold">No +254</span>
                </div>
              </div>

              {/* Amount to Pay */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Amount to Pay (Ksh) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending STK Push...</span>
                    </>
                  ) : (
                    <>
                      <span>Trigger M-Pesa STK Prompt</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: STK PUSH SENT - WAITING FOR PIN */}
          {statusStep === 'stk_sent' && (
            <div className="space-y-4 text-center py-2">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Smartphone className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900">
                  STK Push Prompt Dispatched!
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto leading-relaxed">
                  A payment prompt for <strong>Ksh {amount.toLocaleString()}</strong> has been sent to mobile phone <strong>{phone}</strong>.
                </p>
              </div>

              {/* Simulated Mobile Device Prompt Box */}
              <div className="bg-slate-900 text-white p-4 rounded-xl shadow-lg border border-slate-700 max-w-sm mx-auto text-left space-y-2">
                <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>SIMULATED SAFARICOM M-PESA POPUP</span>
                </div>
                <p className="text-xs font-mono leading-relaxed">
                  Do you want to pay <strong>Kshs {amount.toLocaleString()}</strong> to <strong>{schoolProfile?.name || 'Mwivona Comprehensive School'} Fees</strong> (Account: <strong>{learner?.studentId}</strong>)?
                </p>
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSimulatePinEntered}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded text-xs transition-colors cursor-pointer"
                  >
                    Simulate Enter PIN & Authorize →
                  </button>
                </div>
              </div>

              <div className="text-slate-400 text-[10px]">
                Paybill Shortcode: 522123 · Callback Webhook: Active
              </div>
            </div>
          )}

          {/* STEP 3: PAYMENT COMPLETED */}
          {statusStep === 'completed' && (
            <div className="text-center py-3 space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Payment Cleared & Receipt Issued!
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Tuition payment successfully recorded and balance updated in the cloud database.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-1.5 max-w-sm mx-auto">
                <div className="flex justify-between">
                  <span className="text-slate-500">M-Pesa Transaction Ref:</span>
                  <span className="font-mono font-bold text-emerald-700">{txnCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt Number:</span>
                  <span className="font-mono font-bold text-slate-900">{receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Paid:</span>
                  <span className="font-mono font-bold text-slate-900">Ksh {amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Student:</span>
                  <span className="font-semibold text-slate-800">{learner?.firstName} {learner?.lastName}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Close & Return to Ledger
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
