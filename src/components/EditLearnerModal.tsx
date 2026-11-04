import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { LearnerRecord, ParentRecord } from '../types';
import {
  UserCheck,
  Shield,
  Lock,
  X,
  Save,
  AlertCircle,
  GraduationCap,
  Users,
  Phone,
  Mail,
  MapPin,
  CheckCircle2
} from 'lucide-react';
import { validateKenyanPhoneNumber } from '../services/cryptoService';

interface EditLearnerModalProps {
  isOpen: boolean;
  learner: LearnerRecord | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditLearnerModal: React.FC<EditLearnerModalProps> = ({
  isOpen,
  learner,
  onClose,
  onSuccess,
}) => {
  const { updateLearner, updateParent, parents, grades: configuredGrades } = useApp();

  // Sort available school grades
  const availableGrades = React.useMemo(() => {
    if (configuredGrades && configuredGrades.length > 0) {
      return [...configuredGrades].sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        return a.name.localeCompare(b.name);
      });
    }
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

  // Tab: 'learner' | 'parent'
  const [activeTab, setActiveTab] = useState<'learner' | 'parent'>('learner');

  // Learner fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [grade, setGrade] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'Female' | 'Male' | 'Other'>('Female');
  const [status, setStatus] = useState<'active' | 'graduated' | 'inactive'>('active');
  const [medicalNotes, setMedicalNotes] = useState('');

  // Parent fields
  const [matchedParent, setMatchedParent] = useState<ParentRecord | null>(null);
  const [parentName, setParentName] = useState('');
  const [relationship, setRelationship] = useState<'Mother' | 'Father' | 'Guardian'>('Mother');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [occupation, setOccupation] = useState('');
  const [preferredChannel, setPreferredChannel] = useState<'sms' | 'email' | 'call'>('sms');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state when learner prop changes
  useEffect(() => {
    if (learner) {
      setFirstName(learner.firstName || '');
      setLastName(learner.lastName || '');
      setStudentId(learner.studentId || '');
      setGrade(learner.grade || availableGrades[0]?.name || 'Grade 7');
      setDateOfBirth(learner.dateOfBirth || '2013-08-15');
      setGender(learner.gender || 'Female');
      setStatus(learner.status || 'active');
      setMedicalNotes(learner.emergencyMedicalNotes || '');

      const parent = parents.find((p) => p.id === learner.parentId);
      if (parent) {
        setMatchedParent(parent);
        setParentName(parent.fullName || '');
        setRelationship(parent.relationship || 'Mother');
        setNationalId(parent.nationalId || '');
        setPhone(parent.phone || '');
        setAlternatePhone(parent.alternatePhone || '');
        setEmail(parent.email || '');
        setAddress(parent.homeAddress || '');
        setOccupation(parent.occupation || '');
        setPreferredChannel(parent.preferredChannel || 'sms');
      } else {
        setMatchedParent(null);
      }

      setErrorMessage(null);
      setActiveTab('learner');
    }
  }, [learner, parents, availableGrades]);

  if (!isOpen || !learner) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('Student first name and last name are required.');
      return;
    }

    if (phone.trim()) {
      const validation = validateKenyanPhoneNumber(phone);
      if (!validation.isValid) {
        setErrorMessage(
          validation.error ||
            'Phone number format should start with 07.... or 01.... Not +254... (Example: 0712345678)'
        );
        setActiveTab('parent');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // 1. Update Learner Record
      updateLearner(learner.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        studentId: studentId.trim() || learner.studentId,
        grade,
        dateOfBirth,
        gender,
        status,
        emergencyMedicalNotes: medicalNotes.trim() ? medicalNotes.trim() : undefined,
      });

      // 2. Update Parent Record if parent exists
      if (matchedParent && parentName.trim()) {
        updateParent(matchedParent.id, {
          fullName: parentName.trim(),
          relationship,
          nationalId: nationalId.trim() || matchedParent.nationalId,
          phone: phone.trim() || matchedParent.phone,
          alternatePhone: alternatePhone.trim() ? alternatePhone.trim() : undefined,
          email: email.trim() || matchedParent.email,
          homeAddress: address.trim() || matchedParent.homeAddress,
          occupation: occupation.trim() || matchedParent.occupation,
          preferredChannel,
        });
      }

      setIsSubmitting(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error updating learner:', err);
      setIsSubmitting(false);
      setErrorMessage('Failed to save changes. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-900 animate-in fade-in">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Edit Registered Learner
                </h3>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                  HOI &amp; Owner Privileged
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Updating profile for <strong className="text-slate-700">{learner.firstName} {learner.lastName}</strong> ({learner.studentId})
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

        {/* Tab Navigation (Learner Profile vs Parent / Guardian Info) */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 text-xs font-semibold px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('learner')}
            className={`py-2 px-4 flex items-center gap-2 border-b-2 font-bold cursor-pointer transition-colors ${
              activeTab === 'learner'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Learner Demographics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('parent')}
            className={`py-2 px-4 flex items-center gap-2 border-b-2 font-bold cursor-pointer transition-colors ${
              activeTab === 'parent'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Parent &amp; Guardian Info</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === 'learner' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Student ID Number
                  </label>
                  <input
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assigned Grade / Class Cohort <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 cursor-pointer font-medium"
                  >
                    {availableGrades.map((g) => (
                      <option key={g.id || g.name} value={g.name}>
                        {g.name} ({g.tier})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    required
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'Female' | 'Male' | 'Other')}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 cursor-pointer"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Enrollment Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'graduated' | 'inactive')}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 cursor-pointer font-medium"
                  >
                    <option value="active">Active (Enrolled)</option>
                    <option value="graduated">Graduated</option>
                    <option value="inactive">Inactive / Transferred</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Emergency Medical / Special Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Mild asthmatic inhaler with class teacher, peanut allergy..."
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                />
              </div>
            </div>
          )}

          {activeTab === 'parent' && (
            <div className="space-y-4">
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="text-[11px] leading-relaxed">
                  Parent contact details are client-side encrypted and protected under institutional RBAC standards.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Parent / Guardian Full Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Relationship to Learner
                  </label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value as 'Mother' | 'Father' | 'Guardian')}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 cursor-pointer"
                  >
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                    <option value="Guardian">Guardian</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    National ID / Passport Number
                  </label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Registered Mobile Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="0712345678 or 0110445566"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Alternate Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="0722000000"
                    value={alternatePhone}
                    onChange={(e) => setAlternatePhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Residential Home Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 42 Acacia Boulevard, Westlands"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Occupation / Profession
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Civil Engineer, Accountant"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Preferred Notice Channel
                </label>
                <div className="flex items-center gap-4 pt-1">
                  {(['sms', 'email', 'call'] as const).map((channel) => (
                    <label key={channel} className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 capitalize">
                      <input
                        type="radio"
                        name="preferredChannel"
                        checked={preferredChannel === channel}
                        onChange={() => setPreferredChannel(channel)}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{channel === 'sms' ? 'Cellular SMS' : channel}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Changes sync instantly to Firestore database.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Learner Record</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
