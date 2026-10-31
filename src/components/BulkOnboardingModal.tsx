import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
  Download,
  Check,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { validateKenyanPhoneNumber } from '../services/cryptoService';

interface BulkOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

interface ParsedRosterRow {
  studentFirstName: string;
  studentLastName: string;
  grade: string;
  parentName: string;
  parentRelationship: 'Mother' | 'Father' | 'Guardian';
  parentPhone: string;
  parentNationalId: string;
  parentEmail: string;
  initialTuition: number;
  isValid: boolean;
  validationError?: string;
}

const SAMPLE_CSV = `FirstName,LastName,Grade,ParentName,Relationship,ParentPhone,NationalId,Email,Tuition
Brian,Kariuki,Grade 7A,Grace Kariuki,Mother,0722112233,ID-39102481,grace.k@outlook.com,1200
Joy,Chebet,Grade 7A,Philip Chebet,Father,0733889900,ID-28190241,p.chebet@safari.co.ke,1200
Samson,Otieno,Grade 6B,Mercy Otieno,Mother,0112445566,ID-44192019,mercy.otieno@gmail.com,1150
Faith,Wanjiku,Grade 5A,James Kamau,Father,0711556677,ID-19820491,j.kamau@finance.co.ke,1100`;

export const BulkOnboardingModal: React.FC<BulkOnboardingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { addLearnerWithParent, grades: configuredGrades } = useApp();

  const sampleCsv = React.useMemo(() => {
    const gNames = configuredGrades && configuredGrades.length >= 3
      ? configuredGrades.map((g) => g.name)
      : ['Grade 7', 'Grade 8', 'Grade 6', 'Grade 5'];
    return `FirstName,LastName,Grade,ParentName,Relationship,ParentPhone,NationalId,Email,Tuition
Brian,Kariuki,${gNames[0] || 'Grade 7'},Grace Kariuki,Mother,0722112233,ID-39102481,grace.k@outlook.com,1200
Joy,Chebet,${gNames[0] || 'Grade 7'},Philip Chebet,Father,0733889900,ID-28190241,p.chebet@safari.co.ke,1200
Samson,Otieno,${gNames[1] || 'Grade 8'},Mercy Otieno,Mother,0112445566,ID-44192019,mercy.otieno@gmail.com,1150
Faith,Wanjiku,${gNames[2] || 'Grade 6'},James Kamau,Father,0711556677,ID-19820491,j.kamau@finance.co.ke,1100`;
  }, [configuredGrades]);

  const [csvContent, setCsvContent] = useState(SAMPLE_CSV);
  const [parsedRows, setParsedRows] = useState<ParsedRosterRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'input' | 'preview' | 'completed'>('input');
  const [importedCount, setImportedCount] = useState(0);

  React.useEffect(() => {
    if (sampleCsv && csvContent === SAMPLE_CSV) {
      setCsvContent(sampleCsv);
    }
  }, [sampleCsv]);

  if (!isOpen) return null;

  const parseCsvText = (text: string) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const defaultGrade = configuredGrades?.[0]?.name || 'Grade 7';
    const rows: ParsedRosterRow[] = [];

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(',').map((c) => c.trim());
      const studentFirstName = cols[0] || '';
      const studentLastName = cols[1] || '';
      const grade = cols[2] || defaultGrade;
      const parentName = cols[3] || '';
      const rel = (cols[4] || 'Mother') as 'Mother' | 'Father' | 'Guardian';
      const parentPhone = cols[5] || '';
      const parentNationalId = cols[6] || `ID-${Math.floor(10000000 + Math.random() * 90000000)}`;
      const parentEmail = cols[7] || `${parentName.toLowerCase().replace(/\s+/g, '.')}@example.com`;
      const initialTuition = Number(cols[8]) || 1200;

      // Validate Phone strictly according to Kenyan 07... and 01... rule
      const phoneValidation = validateKenyanPhoneNumber(parentPhone);

      let isValid = true;
      let validationError: string | undefined = undefined;

      if (!studentFirstName || !studentLastName || !parentName) {
        isValid = false;
        validationError = 'Missing mandatory student or parent name';
      } else if (!phoneValidation.isValid) {
        isValid = false;
        validationError = phoneValidation.error;
      }

      rows.push({
        studentFirstName,
        studentLastName,
        grade,
        parentName,
        parentRelationship: rel,
        parentPhone: phoneValidation.cleanPhone || parentPhone,
        parentNationalId,
        parentEmail,
        initialTuition,
        isValid,
        validationError,
      });
    }

    return rows;
  };

  const handlePreview = () => {
    const parsed = parseCsvText(csvContent);
    setParsedRows(parsed);
    setStep('preview');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvContent(text);
      };
      reader.readAsText(file);
    }
  };

  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setIsProcessing(true);

    for (const row of validRows) {
      await addLearnerWithParent(
        {
          firstName: row.studentFirstName,
          lastName: row.studentLastName,
          grade: row.grade,
          dateOfBirth: '2013-05-10',
          gender: 'Female',
        },
        {
          fullName: row.parentName,
          relationship: row.parentRelationship,
          nationalId: row.parentNationalId,
          phone: row.parentPhone,
          email: row.parentEmail,
          homeAddress: 'Nairobi Metropolis',
          occupation: 'Professional',
          preferredChannel: 'sms',
        },
        row.initialTuition,
        'Term 2 - 2026',
        '2026-06-30'
      );
    }

    setIsProcessing(false);
    setImportedCount(validRows.length);
    setStep('completed');
    onSuccess(validRows.length);
  };

  const downloadSampleTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'academia_students_parents_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden text-slate-900 text-xs">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Bulk Learner & Parent Roster Onboarding
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800">
                  CSV / Excel Engine
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Populate entire student body & parents with automatic 07... / 01... verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          
          {step === 'input' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-slate-600">
                  Paste comma-separated rows or upload a CSV file with your school roster:
                </p>
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download Sample CSV</span>
                </button>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Upload CSV File from Device
                </label>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-700 cursor-pointer text-xs"
                />
              </div>

              <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg text-xs">
                <span className="font-bold text-indigo-900">Configured School Grades in System: </span>
                <span className="text-indigo-700">
                  {configuredGrades?.length > 0
                    ? configuredGrades.map((g) => g.name).join(' · ')
                    : 'Grades 1 through 9'}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Or Paste CSV Data Directly:
                </label>
                <textarea
                  rows={8}
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong>Phone Validation Requirement:</strong> All parent mobile phone numbers must start with <strong>07....</strong> or <strong>01....</strong> (10 digits). Rows with <code>+254...</code> will be automatically flagged for correction.
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handlePreview}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <span>Preview & Validate Roster</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">
                    Roster Validation Results ({parsedRows.filter((r) => r.isValid).length} Valid, {parsedRows.filter((r) => !r.isValid).length} Incomplete/Invalid)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Verify each student and parent record before committing to the school database.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                >
                  ← Edit CSV Text
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-slate-600">
                    <tr>
                      <th className="py-2 px-3">Student Name & Grade</th>
                      <th className="py-2 px-3">Parent / Guardian</th>
                      <th className="py-2 px-3">Registered Mobile Phone</th>
                      <th className="py-2 px-3">National ID</th>
                      <th className="py-2 px-3">Tuition</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/40'}>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-900">{row.studentFirstName} {row.studentLastName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{row.grade}</div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-medium text-slate-800">{row.parentName}</div>
                          <div className="text-[10px] text-slate-500">{row.parentRelationship}</div>
                        </td>
                        <td className="py-2 px-3 font-mono">
                          {row.parentPhone}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px]">
                          {row.parentNationalId}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-amber-700">
                          ${row.initialTuition}
                        </td>
                        <td className="py-2 px-3">
                          {row.isValid ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800 font-bold">
                              ✓ Valid
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-100 text-rose-800 font-bold" title={row.validationError}>
                              ⚠ {row.validationError}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <span className="text-slate-500 text-[11px]">
                  Only rows marked <strong>Valid</strong> will be registered.
                </span>

                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={isProcessing || parsedRows.filter((r) => r.isValid).length === 0}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Writing Records to Cloud Database...</span>
                    </>
                  ) : (
                    <>
                      <span>Import {parsedRows.filter((r) => r.isValid).length} Valid Students & Parents</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'completed' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Batch Onboarding Completed!
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto leading-relaxed">
                  Successfully imported <strong>{importedCount}</strong> new students and their registered parents into the active institutional directory.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Return to Directory
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
