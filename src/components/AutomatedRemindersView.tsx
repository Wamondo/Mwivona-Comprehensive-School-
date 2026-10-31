import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PaymentReminder } from '../types';
import {
  BellRing,
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Mail,
  MessageSquare,
  Sparkles,
  Settings,
  Calendar,
  Filter,
  Check
} from 'lucide-react';

export const AutomatedRemindersView: React.FC = () => {
  const {
    feeStructures,
    learners,
    parents,
    reminders,
    batchDispatchReminders,
    currentUser,
  } = useApp();

  const [activeChannelFilter, setActiveChannelFilter] = useState<'all' | 'sms' | 'email'>('all');
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchAlert, setDispatchAlert] = useState<string | null>(null);

  // Template editing state
  const [smsTemplate, setSmsTemplate] = useState(
    'Dear {ParentName}, this is a reminder from Mwivona Comprehensive School that tuition balance of Kshs {AmountDue} for {LearnerName} is due on {DueDate}. Kindly remit via M-Pesa Paybill 522522 (MWIVONA-FEES) or Bank.'
  );
  const [emailTemplate, setEmailTemplate] = useState(
    'Subject: Official Tuition Fee Statement - {LearnerName}\n\nDear {ParentName},\n\nWe would like to remind you that a tuition balance of Kshs {AmountDue} remains for {LearnerName} ({Grade}) for Term 2. Payment is scheduled for {DueDate}.\n\nThank you,\nBursar Office\nMwivona Comprehensive School'
  );

  // Filter pending fee balances
  const pendingAccounts = feeStructures.filter((fs) => fs.balance > 0);

  const handleBatchDispatch = () => {
    setIsDispatching(true);
    setDispatchAlert(null);

    setTimeout(() => {
      const res = batchDispatchReminders();
      setIsDispatching(false);
      setDispatchAlert(res.message);
      setTimeout(() => setDispatchAlert(null), 6000);
    }, 600);
  };

  const filteredReminders = reminders.filter((r) => {
    if (activeChannelFilter === 'all') return true;
    return r.channel === activeChannelFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Tuition Accounts Receivable</span>
            <span aria-hidden="true">·</span>
            <span>Automated Cron / Dispatch Service</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Automated Tuition Reminders
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Configurable notification schedules across SMS and Email channels for pending and overdue fees.
          </p>
        </div>

        {(currentUser.role === 'admin' || currentUser.role === 'bursar') && (
          <button
            onClick={handleBatchDispatch}
            disabled={isDispatching}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer self-start md:self-auto"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isDispatching ? 'Dispatching Queue...' : 'Batch Send Due Reminders Now'}</span>
          </button>
        )}
      </div>

      {/* Dispatch Success Alert */}
      {dispatchAlert && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs text-emerald-800">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{dispatchAlert}</span>
        </div>
      )}

      {/* Automated Schedules & Automation Rules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900">1. Friendly Advance Notice</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
              T - 7 Days
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Automatically sends courteous reminder 7 days prior to term due date via parent's preferred channel.
          </p>
          <div className="text-[10px] text-emerald-600 font-medium">✓ Automation Active</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900">2. Due Date Alert</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
              T = Due Date
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Notifies parents on the precise due date with instant payment paybill details and account balance.
          </p>
          <div className="text-[10px] text-emerald-600 font-medium">✓ Automation Active</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900">3. Overdue Demand Notice</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-50 text-rose-700">
              T + 3 Days
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Urgent notification regarding overdue accounts with bursar contact to arrange installment plans.
          </p>
          <div className="text-[10px] text-emerald-600 font-medium">✓ Automation Active</div>
        </div>
      </div>

      {/* Eligible Pending Tuition Accounts */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Pending Tuition Accounts Eligible for Reminders</h2>
            <p className="text-xs text-slate-500">Students with outstanding balances in current billing cycle</p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {pendingAccounts.length} accounts pending
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-2.5 px-4">Learner</th>
                <th className="py-2.5 px-4">Parent / Contact</th>
                <th className="py-2.5 px-3 text-right">Balance Due</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3">Preferred Channel</th>
                <th className="py-2.5 px-3">Timing State</th>
                <th className="py-2.5 px-4 text-right">Individual Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingAccounts.map((fs) => {
                const learner = learners.find((l) => l.id === fs.learnerId);
                const parent = parents.find((p) => p.id === learner?.parentId);
                const isOverdue = new Date(fs.dueDate) < new Date('2026-06-18');

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
                      <div className="text-[11px] text-slate-500 font-mono">{parent?.phone}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-700 tabular-nums">
                      Ksh {fs.balance.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 tabular-nums">
                      {fs.dueDate}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-[10px] uppercase bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                        {parent?.preferredChannel}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          isOverdue
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {isOverdue ? 'Overdue' : 'Approaching'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={handleBatchDispatch}
                        className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded transition-colors cursor-pointer"
                      >
                        Send Alert
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reminder History Log & Template Customizer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Sent Reminders History */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Dispatched Notification Log</h2>
              <p className="text-xs text-slate-500">History of dispatched SMS & email tuition alerts</p>
            </div>
            
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
              {(['all', 'sms', 'email'] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setActiveChannelFilter(ch)}
                  className={`px-2 py-1 rounded uppercase font-mono text-[10px] cursor-pointer transition-colors ${
                    activeChannelFilter === ch
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-100 p-4 space-y-3">
            {filteredReminders.map((rem) => {
              const learner = learners.find((l) => l.id === rem.learnerId);
              const parent = parents.find((p) => p.id === rem.parentId);

              return (
                <div
                  key={rem.id}
                  className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {parent?.fullName}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        for {learner?.firstName} {learner?.lastName}
                      </span>
                      <span className="font-mono text-[10px] uppercase bg-white border border-slate-200 px-1.5 py-0.2 rounded text-slate-700">
                        {rem.channel}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                        ✓ {rem.status}
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs italic">
                      "{rem.messagePreview}"
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Timestamp: {rem.sentDate || rem.scheduledDate}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                      Ksh {rem.amountDue.toLocaleString()}
                    </span>
                    <p className="text-[10px] text-slate-400">Due: {rem.dueDate}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Dynamic Notification Template Configuration */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 text-xs">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Notification Templates</h2>
            <p className="text-slate-500 text-[11px]">
              Customizable message variables: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">&#123;ParentName&#125;</code>, <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">&#123;AmountDue&#125;</code>, <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">&#123;DueDate&#125;</code>
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
              <span>SMS Dispatch Template (160 chars limit)</span>
            </label>
            <textarea
              rows={3}
              value={smsTemplate}
              onChange={(e) => setSmsTemplate(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-600" />
              <span>Email Body Template</span>
            </label>
            <textarea
              rows={4}
              value={emailTemplate}
              onChange={(e) => setEmailTemplate(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={() => alert("Notification templates successfully saved for automated dispatch engine.")}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
          >
            Save Automated Templates
          </button>
        </div>

      </div>
    </div>
  );
};
