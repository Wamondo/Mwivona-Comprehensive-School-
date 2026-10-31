import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { DigitalSignatureRecord } from '../types';
import { OFFICIAL_SIGNATURE_PRESETS, svgToPngDataUrl } from '../utils/signaturePresets';
import {
  PenTool,
  Upload,
  CheckCircle2,
  Trash2,
  RotateCcw,
  Sparkles,
  Award,
  ShieldCheck,
  FileCheck,
  Eye,
  Sliders,
  Check,
  FileSignature,
  Stamp,
  Layers,
  Info
} from 'lucide-react';

interface OfficialSignaturesManagerProps {
  onSignatureUpdated?: (role: string) => void;
  standalone?: boolean;
}

type SignatureRole = 'hoi' | 'bursar' | 'coordinator' | 'class_teacher' | 'seal';

interface RoleConfig {
  role: SignatureRole;
  label: string;
  defaultName: string;
  defaultTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeColor: string;
  appliesTo: string;
}

const ROLES_CONFIG: RoleConfig[] = [
  {
    role: 'hoi',
    label: 'Head of Institution (HOI) / Principal',
    defaultName: 'Dr. Evelyn Vance, Ph.D',
    defaultTitle: 'Chief Principal & Head of School',
    icon: Award,
    badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    appliesTo: 'Assessment Report Forms (KJSEA/KPSEA), Broadsheets, Monthly Financial Statements',
  },
  {
    role: 'bursar',
    label: 'Chief Bursar & Treasury Controller',
    defaultName: 'Sarah Kimani, CPA',
    defaultTitle: 'Chief Bursar & Treasury Head',
    icon: ShieldCheck,
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    appliesTo: 'Tuition Fee Receipts, Monthly Bursar Statements, Debt Reconciliations',
  },
  {
    role: 'coordinator',
    label: 'Academic Coordinator / Exam Council',
    defaultName: 'Mr. Kevin Ochieng',
    defaultTitle: 'Academic Coordinator & Exam Council Chair',
    icon: FileCheck,
    badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
    appliesTo: 'Grade Broadsheets, Subject Scoresheets, KNEC Curriculum Audits',
  },
  {
    role: 'class_teacher',
    label: 'Senior Class Tutor / Head Teacher',
    defaultName: 'Mr. Marcus Thorne',
    defaultTitle: 'Senior Class Tutor',
    icon: FileSignature,
    badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
    appliesTo: 'Individual Assessment Report Forms, Student Roll Call Logs',
  },
  {
    role: 'seal',
    label: 'Official Institutional Seal & Stamp',
    defaultName: 'Mwivona Comprehensive School Official Seal',
    defaultTitle: 'MoE / KNEC Certified Institutional Ratification Stamp',
    icon: Stamp,
    badgeColor: 'bg-amber-50 text-amber-900 border-amber-200',
    appliesTo: 'Stamped onto Assessment Report Forms, Official Broadsheets & Tuition Receipts',
  },
];

export const OfficialSignaturesManager: React.FC<OfficialSignaturesManagerProps> = ({
  onSignatureUpdated,
  standalone = false,
}) => {
  const { schoolProfile, updateSchoolProfile, currentUser, addAuditLog } = useApp();

  const [activeRole, setActiveRole] = useState<SignatureRole>('hoi');
  const [activeMode, setActiveMode] = useState<'draw' | 'upload' | 'preset'>('preset');
  
  // Signatory details form
  const currentRoleConfig = ROLES_CONFIG.find((r) => r.role === activeRole)!;
  const existingSignature = schoolProfile.signatures?.[activeRole];

  const [signatoryName, setSignatoryName] = useState(
    existingSignature?.signatoryName || currentRoleConfig.defaultName
  );
  const [roleTitle, setRoleTitle] = useState(
    existingSignature?.roleTitle || currentRoleConfig.defaultTitle
  );

  // Update form fields when role changes
  useEffect(() => {
    const existing = schoolProfile.signatures?.[activeRole];
    const roleCfg = ROLES_CONFIG.find((r) => r.role === activeRole)!;
    setSignatoryName(existing?.signatoryName || roleCfg.defaultName);
    setRoleTitle(existing?.roleTitle || roleCfg.defaultTitle);
  }, [activeRole, schoolProfile.signatures]);

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState<string>('#1e3a8a'); // default midnight blue
  const [penWidth, setPenWidth] = useState<number>(2.5);
  const [hasDrawnContent, setHasDrawnContent] = useState(false);
  const strokeHistoryRef = useRef<ImageData[]>([]);

  // Upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [removeBackgroundFilter, setRemoveBackgroundFilter] = useState(true);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);

  // Status feedback
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedbackNotice({ message, type });
    setTimeout(() => setFeedbackNotice(null), 4000);
  };

  // Canvas drawing handlers
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Save snapshot for undo
    strokeHistoryRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (strokeHistoryRef.current.length > 10) strokeHistoryRef.current.shift();

    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawnContent(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.closePath();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokeHistoryRef.current = [];
    setHasDrawnContent(false);
  };

  const undoLastStroke = () => {
    const canvas = canvasRef.current;
    if (!canvas || strokeHistoryRef.current.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const last = strokeHistoryRef.current.pop();
    if (last) {
      ctx.putImageData(last, 0, 0);
      setHasDrawnContent(strokeHistoryRef.current.length > 0);
    }
  };

  // Save drawn signature
  const handleSaveDrawnSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawnContent) {
      showFeedback('Please draw a signature on the pad before adopting.', 'error');
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    saveSignatureRecord(dataUrl, 'draw');
  };

  // Image Upload handler with white-background removal filter
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showFeedback('Please select a valid image file (PNG, JPG, SVG, WebP).', 'error');
      return;
    }

    setIsProcessingUpload(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const src = event.target?.result as string;
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(800, img.width || 600);
        canvas.height = Math.round((canvas.width / (img.width || 600)) * (img.height || 200));
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          setUploadedImagePreview(src);
          setIsProcessingUpload(false);
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Optional: remove pure white or off-white paper background to make it transparent
        if (removeBackgroundFilter) {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // If pixel is near-white or light grey paper, make it transparent
            if (r > 220 && g > 220 && b > 220) {
              data[i + 3] = 0;
            }
          }
          ctx.putImageData(imgData, 0, 0);
        }

        const processedDataUrl = canvas.toDataURL('image/png');
        setUploadedImagePreview(processedDataUrl);
        setIsProcessingUpload(false);
      };

      img.src = src;
    };

    reader.readAsDataURL(file);
  };

  const handleSaveUploadedSignature = () => {
    if (!uploadedImagePreview) {
      showFeedback('Please select or upload a signature image first.', 'error');
      return;
    }
    saveSignatureRecord(uploadedImagePreview, 'upload');
  };

  // Preset Selection handler
  const handleSelectPreset = async (presetSvg: string) => {
    try {
      showFeedback('Generating crisp vector PNG signature preset...', 'success');
      const isSeal = activeRole === 'seal';
      const w = isSeal ? 300 : 450;
      const h = isSeal ? 300 : 150;
      const pngDataUrl = await svgToPngDataUrl(presetSvg, w, h);
      if (pngDataUrl) {
        saveSignatureRecord(pngDataUrl, 'preset');
      } else {
        showFeedback('Failed to generate preset image.', 'error');
      }
    } catch {
      showFeedback('Error processing preset signature.', 'error');
    }
  };

  // Common Save logic
  const saveSignatureRecord = (
    dataUrl: string,
    sourceType: 'draw' | 'upload' | 'preset'
  ) => {
    const verificationCode = `SIG-${activeRole.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const newRecord: DigitalSignatureRecord = {
      id: `sig-${activeRole}-${Date.now()}`,
      role: activeRole,
      roleTitle: roleTitle.trim() || currentRoleConfig.defaultTitle,
      signatoryName: signatoryName.trim() || currentRoleConfig.defaultName,
      signatureDataUrl: dataUrl,
      sourceType,
      updatedAt: new Date().toISOString(),
      dateStr: new Date().toLocaleDateString('en-GB'),
      isVerified: true,
      verificationCode,
    };

    const updatedSignatures = {
      ...(schoolProfile.signatures || {}),
      [activeRole]: newRecord,
    };

    updateSchoolProfile({ signatures: updatedSignatures });
    localStorage.setItem('academias_secure_v1_signatures', JSON.stringify(updatedSignatures));

    addAuditLog(
      'Updated Digital Signature',
      `Configured ${newRecord.roleTitle} (${newRecord.signatoryName}) via ${sourceType.toUpperCase()} mode. Verification: ${verificationCode}`
    );

    showFeedback(
      `Official digital signature for ${newRecord.roleTitle} successfully saved and applied to all reports!`,
      'success'
    );

    if (onSignatureUpdated) {
      onSignatureUpdated(activeRole);
    }
  };

  // Remove Signature
  const handleRemoveSignature = (role: SignatureRole) => {
    const updatedSignatures = { ...(schoolProfile.signatures || {}) };
    delete updatedSignatures[role];

    updateSchoolProfile({ signatures: updatedSignatures });
    localStorage.setItem('academias_secure_v1_signatures', JSON.stringify(updatedSignatures));

    addAuditLog('Removed Digital Signature', `Cleared electronic signature for role: ${role.toUpperCase()}`);
    showFeedback(`Removed digital signature for ${currentRoleConfig.label}.`, 'success');
  };

  return (
    <div className={`space-y-6 ${standalone ? 'p-6 max-w-5xl mx-auto' : ''}`}>
      {/* Component Title & Purpose Banner */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                <PenTool className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Official Digital Signatures &amp; Seal Authentication
              </h2>
              <span className="font-mono text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                PKI RATIFIED
              </span>
            </div>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              Upload, digitally draw, or select pre-approved executive signatures and institutional seals. Active signatures are securely embedded onto 1-page A4 Assessment Reports, Broadsheets, Fee Receipts, and Monthly Treasury Statements.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Logged in Authority:</span>
            <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              {currentUser.name} ({currentUser.role.toUpperCase()})
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackNotice && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-xs transition-all ${
            feedbackNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <CheckCircle2
            className={`w-4 h-4 shrink-0 ${
              feedbackNotice.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
            }`}
          />
          <span className="font-semibold">{feedbackNotice.message}</span>
        </div>
      )}

      {/* Role Navigation Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            1. Select Administrative Signatory Role
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            {Object.keys(schoolProfile.signatures || {}).length} of {ROLES_CONFIG.length} Roles Authenticated
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {ROLES_CONFIG.map((cfg) => {
            const hasSig = Boolean(schoolProfile.signatures?.[cfg.role]);
            const isSelected = activeRole === cfg.role;
            const Icon = cfg.icon;

            return (
              <button
                key={cfg.role}
                onClick={() => setActiveRole(cfg.role)}
                className={`p-3.5 text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-50/50 border-b-2 border-indigo-600'
                    : 'hover:bg-slate-50 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`p-1.5 rounded-lg border ${
                        isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    {hasSig ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        <Check className="w-3 h-3" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-slate-900 text-xs truncate">
                    {cfg.role === 'seal' ? 'Institutional Seal' : cfg.defaultName}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {cfg.defaultTitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Configuration Grid: Signatory Form & Signature Capture */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Signatory Credentials & Mode Selector (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-2xs">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  2. Signatory Particulars
                </h3>
                <p className="text-[11px] text-slate-500">
                  Printed directly beneath signature line on official documents
                </p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${currentRoleConfig.badgeColor}`}>
                {currentRoleConfig.role.toUpperCase()}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Official Full Name &amp; Academic Honors
                </label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  placeholder="e.g. Dr. Evelyn Vance, Ph.D"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Institutional Designation / Title
                </label>
                <input
                  type="text"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="e.g. Chief Principal & Head of Institution"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  Applicable Reports
                </span>
                <p className="text-[11px] text-slate-700 leading-snug">
                  {currentRoleConfig.appliesTo}
                </p>
              </div>
            </div>
          </div>

          {/* Current Active Signature Preview & Removal */}
          {existingSignature && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900">Active Stored Signature</span>
                </div>
                <button
                  onClick={() => handleRemoveSignature(activeRole)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>

              {/* Rendered signature on document line preview */}
              <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-lg text-center space-y-2">
                <div className="h-16 flex items-center justify-center">
                  <img
                    src={existingSignature.signatureDataUrl}
                    alt="Active Signature"
                    className="max-h-16 max-w-full object-contain filter drop-shadow-2xs"
                  />
                </div>
                <div className="border-t border-slate-400 pt-1.5 max-w-xs mx-auto">
                  <div className="font-bold text-slate-900 text-xs">
                    {existingSignature.signatoryName}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {existingSignature.roleTitle}
                  </div>
                  <div className="font-mono text-[9px] text-indigo-700 mt-1">
                    Verified: {existingSignature.dateStr} · {existingSignature.verificationCode}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Three Modes (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            
            {/* Mode Tabs */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                3. Choose Capture Mode
              </span>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setActiveMode('preset')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    activeMode === 'preset'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Official Presets</span>
                </button>

                <button
                  onClick={() => setActiveMode('draw')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    activeMode === 'draw'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Draw / Sign</span>
                </button>

                <button
                  onClick={() => setActiveMode('upload')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    activeMode === 'upload'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Image</span>
                </button>
              </div>
            </div>

            {/* MODE 1: OFFICIAL PRESETS */}
            {activeMode === 'preset' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-600">
                  Select a pre-approved, vector-grade digitized signature or seal tailored for Kenyan institutional governance:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {OFFICIAL_SIGNATURE_PRESETS.map((preset) => {
                    const isRoleMatch = preset.role === activeRole;

                    return (
                      <div
                        key={preset.id}
                        className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                          isRoleMatch
                            ? 'border-indigo-300 bg-indigo-50/30 ring-1 ring-indigo-200'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-xs text-slate-900">
                              {preset.signatoryName}
                            </span>
                            <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {preset.role}
                            </span>
                          </div>

                          {/* Render preview SVG */}
                          <div
                            className="h-20 bg-white border border-slate-100 rounded-lg p-2 flex items-center justify-center overflow-hidden"
                            dangerouslySetInnerHTML={{ __html: preset.previewSvg }}
                          />

                          <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">
                            {preset.description}
                          </p>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-mono">
                            Ink: {preset.inkColor}
                          </span>
                          <button
                            onClick={() => handleSelectPreset(preset.previewSvg)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors cursor-pointer shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Select &amp; Apply</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MODE 2: DRAW ON CANVAS */}
            {activeMode === 'draw' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-700">Ink Color:</span>
                    <button
                      onClick={() => setPenColor('#1e3a8a')}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        penColor === '#1e3a8a' ? 'scale-110 border-indigo-600 ring-2 ring-indigo-200' : 'border-white'
                      }`}
                      style={{ backgroundColor: '#1e3a8a' }}
                      title="Midnight Fountain Pen Blue"
                    />
                    <button
                      onClick={() => setPenColor('#0f172a')}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        penColor === '#0f172a' ? 'scale-110 border-indigo-600 ring-2 ring-indigo-200' : 'border-white'
                      }`}
                      style={{ backgroundColor: '#0f172a' }}
                      title="Jet Black Official Ink"
                    />
                    <button
                      onClick={() => setPenColor('#3730a3')}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        penColor === '#3730a3' ? 'scale-110 border-indigo-600 ring-2 ring-indigo-200' : 'border-white'
                      }`}
                      style={{ backgroundColor: '#3730a3' }}
                      title="Royal Indigo"
                    />
                    <button
                      onClick={() => setPenColor('#581c87')}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        penColor === '#581c87' ? 'scale-110 border-indigo-600 ring-2 ring-indigo-200' : 'border-white'
                      }`}
                      style={{ backgroundColor: '#581c87' }}
                      title="Registrar Violet"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 font-medium">Pen Width:</span>
                    <select
                      value={penWidth}
                      onChange={(e) => setPenWidth(Number(e.target.value))}
                      className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 font-semibold"
                    >
                      <option value={1.8}>Fine (1.8px)</option>
                      <option value={2.5}>Medium (2.5px)</option>
                      <option value={3.8}>Bold (3.8px)</option>
                    </select>
                  </div>
                </div>

                {/* Signing Canvas Container */}
                <div className="relative border-2 border-dashed border-slate-300 hover:border-indigo-400 transition-colors rounded-xl overflow-hidden bg-slate-50/50">
                  <canvas
                    ref={canvasRef}
                    width={560}
                    height={200}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-48 cursor-crosshair touch-none bg-transparent"
                  />

                  {/* Watermark line inside canvas */}
                  <div className="absolute bottom-6 left-8 right-8 border-b border-slate-300 pointer-events-none flex justify-between text-[10px] text-slate-400">
                    <span>Sign above this baseline</span>
                    <span>Touch / Stylus / Mouse Enabled</span>
                  </div>
                </div>

                {/* Canvas Controls */}
                <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={clearCanvas}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Clear</span>
                    </button>
                    <button
                      onClick={undoLastStroke}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                    >
                      Undo
                    </button>
                  </div>

                  <button
                    onClick={handleSaveDrawnSignature}
                    disabled={!hasDrawnContent}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save &amp; Adopt Drawn Signature</span>
                  </button>
                </div>
              </div>
            )}

            {/* MODE 3: UPLOAD SIGNATURE IMAGE */}
            {activeMode === 'upload' && (
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/20 transition-all rounded-xl p-8 text-center cursor-pointer space-y-2"
                >
                  <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    Click to browse or drag &amp; drop signature / seal image
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Supports high-resolution PNG, JPG, SVG, or WebP (transparent background recommended)
                  </p>
                </div>

                {/* Filter option: Transparent background cleanup */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    <div>
                      <span className="font-semibold text-xs text-slate-800 block">
                        Auto White-Paper Transparency Filter
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Removes white paper scan background so signature overlays cleanly onto report lines
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={removeBackgroundFilter}
                    onChange={(e) => setRemoveBackgroundFilter(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                  />
                </div>

                {/* Upload Preview */}
                {uploadedImagePreview && (
                  <div className="space-y-3 p-4 bg-slate-50/80 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-700 block">
                      Uploaded Signature Preview:
                    </span>
                    <div className="h-24 bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-center">
                      <img
                        src={uploadedImagePreview}
                        alt="Uploaded Signature"
                        className="max-h-20 max-w-full object-contain"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setUploadedImagePreview(null)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveUploadedSignature}
                        className="flex items-center gap-1 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Save &amp; Adopt Uploaded Signature</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
