import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserPlus, Shield, Lock, X } from 'lucide-react';
import { validateKenyanPhoneNumber } from '../services/cryptoService';

interface EnrollLearnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EnrollLearnerModal: React.FC<EnrollLearnerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { addLearnerWithParent, grades: configuredGrades } = useApp();

  // Sort and synchronize available school grades from School Academic Setup
  const availableGrades = React.useMemo(() => {
    if (configuredGrades && configuredGrades.length > 0) {
      return [...configuredGrades].sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        return a.name.localeCompare(b.name);
      });
    }
    // Fallback standard grades if none configured
    return [
      { id: 'g-1', name: 'Grade 1', level: 1, tier: 'Lower Primary' as const },
      { id: 'g-2', name: 'Grade 2', level: 2, tier: 'Lower Primary' as const },
      { id: 'g-3', name: 'Grade 3', level: 3, tier: 'Lower Primary' as const },
      { id: 'g-4', name: 'Grade 4', level: 4, tier: 'Upper Primary' as const },
      { id: 'g-5', name: 'Grade 5', level: 5, tier: 'Upper Primary' as const },
      { id: 'g-6', name: 'Grade 6', level: 6, tier: 'Upper Primary' as const },
      { id: 'g-7', name: 'Grade 7', level: 7, tier: 'Junior School' as const },
      { id: 'g-8', name: 'Grade 8', level: 8, tier: 'Junior School' as const },
      { id: 'g-9', name: 'Grade 9', level: 9, tier: 'Junior School' as const },
    ];
  }, [configuredGrades]);

  // Learner fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [grade, setGrade] = useState(() => availableGrades[0]?.name || 'Grade 7');
  const [dateOfBirth, setDateOfBirth] = useState('2013-08-15');
  const [gender, setGender] = useState<'Female' | 'Male' | 'Other'>('Female');
  const [medicalNotes, setMedicalNotes] = useState('');

  // Keep selected grade valid and synchronized when available grades change
  React.useEffect(() => {
    if (availableGrades.length > 0) {
      if (!grade || !availableGrades.some((g) => g.name === grade)) {
        setGrade(availableGrades[0].name);
      }
    }
  }, [availableGrades, grade]);

  // Parent fields (Sensitive & Encrypted)
  const [parentName, setParentName] = useState('');
  const [relationship, setRelationship] = useState<'Mother' | 'Father' | 'Guardian'>('Mother');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [occupation, setOccupation] = useState('');
  const [preferredChannel, setPreferredChannel] = useState<'sms' | 'email' | 'call'>('sms');

  // Tuition info
  const [tuitionFee, setTuitionFee] = useState(1200);
  const [dueDate, setDueDate] = useState('2026-06-30');

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !parentName || !phone || !email) {
      alert('Please fill in all mandatory fields.');
      return;
    }

    const validation = validateKenyanPhoneNumber(phone);
    if (!validation.isValid) {
      alert(validation.error || 'The phone number format should start with 07.... Or 01.... Not +2547.... nor +254.....');
      return;
    }

    setIsSubmitting(true);

    try {
      await addLearnerWithParent(
        {
          firstName,
          lastName,
          grade,
          dateOfBirth,
          gender,
          ...(medicalNotes.trim() ? { emergencyMedicalNotes: medicalNotes.trim() } : {}),
        },
        {
          fullName: parentName,
          relationship,
          nationalId: nationalId || `ID-${Math.floor(10000000 + Math.random() * 90000000)}`,
          phone,
          ...(alternatePhone.trim() ? { alternatePhone: alternatePhone.trim() } : {}),
          email,
          homeAddress: address || 'Nairobi Metropolis',
          occupation: occupation || 'Professional',
          preferredChannel,
        },
        Number(tuitionFee),
        'Term 2 - 2026',
        dueDate
      );

      setIsSubmitting(false);
      onClose();
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      alert('Error creating encrypted student record.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Enroll Learner & Register Parent</h3>
              <p className="text-xs text-slate-500">
                Encrypted PII storage with automated fee structure & reminder queue onboarding
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          {/* Section 1: Learner Information */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-indigo-900 border-b border-slate-100 pb-1">
              1. Learner Profile
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">First Name *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Samuel"
                  className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Last Name *</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Kamau"
                  className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">Grade / Class *</label>
                  <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                    {availableGrades.length} Configured
                  </span>
                </div>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-medium"
                  required
                >
                  {availableGrades.map((g) => (
                    <option key={g.id || g.name} value={g.name}>
                      {g.name} ({g.tier})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Date of Birth</label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">
                Emergency Medical Notes & Allergies (Optional):
              </label>
              <input
                type="text"
                placeholder="e.g. Mild asthma (uses ventolin inhaler), allergic to penicillin"
                value={medicalNotes}
                onChange={(e) => setMedicalNotes(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Section 2: Parent Information with Encryption Notice */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-600" />
                <span>2. Parent / Guardian Records (AES-256 Encrypted)</span>
              </h4>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                PII ENCRYPTION ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mary Wanjiku Kamau"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Relationship *</label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value as any)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Mother">Mother</option>
                  <option value="Father">Father</option>
                  <option value="Guardian">Guardian</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">Primary Telephone * (Encrypted)</label>
                  <span className="text-[10px] text-amber-700 font-mono">07... or 01... only</span>
                </div>
                <input
                  type="tel"
                  required
                  placeholder="0712345678 or 0110445566"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-400">Must start with 07 or 01 (10 digits). Do not use +254.</p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Email Address * (Encrypted)</label>
                <input
                  type="email"
                  required
                  placeholder="parent.name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">National ID / Passport #</label>
                <input
                  type="text"
                  placeholder="ID-82910412"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Occupation / Employer</label>
                <input
                  type="text"
                  placeholder="e.g. Telecom Engineer"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Residential Address (Encrypted)</label>
              <input
                type="text"
                placeholder="e.g. 52 Kileleshwa Heights, Nairobi"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">
                Automated Payment Reminder Channel:
              </label>
              <div className="flex items-center gap-3">
                {(['sms', 'email', 'call'] as const).map((ch) => (
                  <label key={ch} className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                    <input
                      type="radio"
                      name="preferredChannel"
                      checked={preferredChannel === ch}
                      onChange={() => setPreferredChannel(ch)}
                    />
                    <span className="capitalize">{ch}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Initial Tuition Configuration */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-indigo-900 border-b border-slate-100 pb-1">
              3. Tuition Billing & Term Due Date
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Base Tuition Fee (Ksh):</label>
                <input
                  type="number"
                  min="0"
                  value={tuitionFee}
                  onChange={(e) => setTuitionFee(Number(e.target.value))}
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-400">
                  +Ksh 2,500 standard activity & learning materials included automatically.
                </span>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Payment Due Date:</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
            >
              {isSubmitting ? 'Encrypting & Enrolling...' : 'Enroll Student & Encrypt Records'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
