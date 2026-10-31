import React from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Lock, Unlock, FileText, CheckCircle2, XCircle, AlertTriangle, X, Crown, Smartphone } from 'lucide-react';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    currentDeviceId,
    currentDeviceName,
    ownerDeviceLock,
    forceRelockOwnerDevice,
    resendOwnerOtp,
  } = useApp();
  if (!isOpen) return null;

  const permissions = [
    {
      feature: 'View Learner Profiles & Classes',
      admin: true,
      teacher: true,
      bursar: true,
      parent: 'Own child only',
    },
    {
      feature: 'Decrypt Sensitive PII (Phone, ID, Address)',
      admin: true,
      teacher: 'Audited one-click emergency access',
      bursar: true,
      parent: 'Own records only',
    },
    {
      feature: 'Record Tuition Payments & Receipts',
      admin: true,
      teacher: false,
      bursar: true,
      parent: false,
    },
    {
      feature: 'Automated Reminders Dispatch & Templates',
      admin: true,
      teacher: false,
      bursar: true,
      parent: false,
    },
    {
      feature: 'Grade Entry & Score Card Generation',
      admin: true,
      teacher: true,
      bursar: false,
      parent: 'Read-only report cards',
    },
    {
      feature: 'Daily Attendance Register Marking',
      admin: true,
      teacher: true,
      bursar: false,
      parent: 'Read-only attendance',
    },
    {
      feature: 'Monthly Executive Financial Reports',
      admin: true,
      teacher: 'Academic summary only',
      bursar: true,
      parent: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Security Architecture & Role Permissions</h3>
              <p className="text-xs text-slate-500">AES-256-GCM Cryptographic Storage & Role-Based Access Control</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          {/* Encryption Spec */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-indigo-900 font-semibold text-sm">
              <Lock className="w-4 h-4 text-indigo-600" />
              <span>Data Protection & Privacy Standard</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              All parent contact information (National ID, telephone numbers, home address, banking & transaction codes)
              is stored with <strong>client-side AES-256-GCM encryption</strong> derived via <strong>PBKDF2 with 100,000 iterations</strong>.
              Unauthorized roles only view masked placeholders (e.g. <span className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">+254 ••• ••• 678</span>).
              Every decryption action is recorded to an immutable security audit log.
            </p>
          </div>

          {/* Current Role Status */}
          <div className="flex items-center justify-between p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-lg">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-indigo-800 font-semibold">Active Session</span>
              <p className="text-sm font-bold text-indigo-950">{currentUser.name}</p>
              <p className="text-xs text-indigo-700">{currentUser.title} · <span className="font-semibold uppercase">{currentUser.role}</span></p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 rounded text-xs font-mono font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                AUTH GRANTED
              </span>
            </div>
          </div>

          {/* Owner Account Single-Phone Device Lock Card */}
          <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                <Crown className="w-4 h-4 text-amber-600 fill-amber-500" />
                <span>Owner Account Single-Phone Lock Protection</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                1 ACTIVE PHONE ENFORCED
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white rounded-lg border border-amber-200 space-y-0.5">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Restricted Owner Phone</span>
                <p className="font-mono font-bold text-slate-900">07•••••185</p>
                <p className="text-[10px] text-emerald-700 font-medium">✓ Confidential &amp; Verified</p>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-amber-200 space-y-0.5">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Restricted National ID</span>
                <p className="font-mono font-bold text-slate-900">••••••96</p>
                <p className="text-[10px] text-emerald-700 font-medium">✓ Encrypted Credential</p>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-amber-200 space-y-0.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Current Device ID &amp; Type</span>
                  <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                    {currentDeviceName}
                  </span>
                </div>
                <p className="font-mono text-[11px] text-slate-700 truncate">{currentDeviceId}</p>
                <p className="text-[10px] text-slate-500">
                  {ownerDeviceLock?.activeDeviceId === currentDeviceId
                    ? '✓ This device holds the active single-phone lock.'
                    : 'Secondary / authorized session.'}
                </p>
              </div>
            </div>

            <div className="p-2.5 bg-amber-100/60 rounded-lg text-[11px] text-amber-950 leading-relaxed">
              <strong>Secondary Device Policy:</strong> If any second or third party attempts to log in to the Owner Account from another phone or browser, access is blocked until a 6-digit SMS OTP is sent to the Owner's registered phone and verified. Upon OTP verification, active access is transferred to the new device and revoked from the previous phone.
            </div>

            {currentUser.isOwner && (
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={async () => {
                    await forceRelockOwnerDevice();
                    alert(`Single-phone lock has been re-bound exclusively to this device: ${currentDeviceName}`);
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Re-Lock Exclusively to This Phone
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const res = await resendOwnerOtp();
                    if (res.success) {
                      alert(`Test OTP SMS dispatched to registered owner phone! Code: ${res.dispatchedOtpPreview}`);
                    } else {
                      alert(`Could not dispatch SMS: ${res.error}`);
                    }
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-amber-300 text-amber-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Test OTP Dispatch to Owner Phone
                </button>
              </div>
            )}
          </div>


          {/* Permissions Matrix */}
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-2.5">Role Access Control Matrix (RBAC)</h4>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 text-[11px] uppercase text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 border-b border-slate-200">System Capability</th>
                    <th className="py-2.5 px-2 border-b border-slate-200 text-center">Admin</th>
                    <th className="py-2.5 px-2 border-b border-slate-200 text-center">Teacher</th>
                    <th className="py-2.5 px-2 border-b border-slate-200 text-center">Bursar</th>
                    <th className="py-2.5 px-2 border-b border-slate-200 text-center">Parent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {permissions.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 px-3 font-medium text-slate-800">{p.feature}</td>
                      <td className="py-2 px-2 text-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                      </td>
                      <td className="py-2 px-2 text-center">
                        {p.teacher === true ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                        ) : p.teacher === false ? (
                          <XCircle className="w-4 h-4 text-slate-300 inline" />
                        ) : (
                          <span className="text-[10px] text-amber-700 font-medium">{p.teacher}</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {p.bursar === true ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                        ) : p.bursar === false ? (
                          <XCircle className="w-4 h-4 text-slate-300 inline" />
                        ) : (
                          <span className="text-[10px] text-amber-700 font-medium">{p.bursar}</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {p.parent === true ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                        ) : p.parent === false ? (
                          <XCircle className="w-4 h-4 text-slate-300 inline" />
                        ) : (
                          <span className="text-[10px] text-indigo-700 font-medium">{p.parent}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Close Security Matrix
          </button>
        </div>
      </div>
    </div>
  );
};

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose }) => {
  const { auditLogs } = useApp();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Security & Operational Audit Log</h3>
              <p className="text-xs text-slate-500">Chronological trail of role actions, fee transactions & data decryption</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <div className="divide-y divide-slate-100">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-900">{log.action}</span>
                    {log.securityFlag && (
                      <span className="text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                        PII Decrypted
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded uppercase">
                      {log.userRole}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{log.details}</p>
                  <p className="text-[11px] text-slate-400">By {log.userName}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                    {log.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">{auditLogs.length} events logged in session</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Close Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
};
