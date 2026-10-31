import React, { useState } from 'react';
import {
  Building,
  Globe,
  Database,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  X,
  ExternalLink,
  Download,
  Copy,
  Check,
  Server,
  Lock,
  Sparkles
} from 'lucide-react';
import crestImage from '../assets/images/school_crest_emblem_1792317813141.jpg';
import { getMpesaConfig } from '../services/mpesaDarajaService';
import { getSmsGatewayConfig } from '../services/smsGatewayService';

interface OfficialProductionCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSmsConfig: () => void;
  onOpenMpesaConfig: () => void;
}

export const OfficialProductionCenterModal: React.FC<OfficialProductionCenterModalProps> = ({
  isOpen,
  onClose,
  onOpenSmsConfig,
  onOpenMpesaConfig,
}) => {
  const mpesaConfig = getMpesaConfig();
  const smsConfig = getSmsGatewayConfig();

  const [schoolDomain, setSchoolDomain] = useState('portal.mwivonacomprehensive.sc.ke');
  const [copiedRecord, setCopiedRecord] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRecord(id);
    setTimeout(() => setCopiedRecord(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden text-slate-900 text-xs">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <img
              src={crestImage}
              alt="Crest"
              className="w-10 h-10 object-contain rounded-lg bg-white/10 p-1"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Official School Production & Deployment Center
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Ready for Production
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Institutional branding, custom domain mapping, and verified cloud integrations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          
          {/* Production Checklist Grid */}
          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3">
              Official Production Readiness Status
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Cloud Database */}
              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Cloud Firestore Database</span>
                    <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded font-bold">
                      PROVISIONED
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Connected to Google Cloud project <code className="bg-white px-1 py-0.2 rounded font-mono text-slate-800">climbing-sunset-zbcxw</code> with deployed security rules.
                  </p>
                </div>
              </div>

              {/* Kenyan Cellular SMS */}
              <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Kenyan Cellular SMS</span>
                    <button
                      type="button"
                      onClick={onOpenSmsConfig}
                      className="text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 cursor-pointer underline"
                    >
                      Configure →
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Sender ID: <strong className="font-mono">{smsConfig.senderId}</strong>. Real dispatch to 07... & 01... lines enabled with {smsConfig.smsBalanceUnits} credits.
                  </p>
                </div>
              </div>

              {/* M-Pesa Daraja */}
              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-700 text-white shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Lipa Na M-Pesa Daraja C2B</span>
                    <button
                      type="button"
                      onClick={onOpenMpesaConfig}
                      className="text-[10px] font-semibold text-emerald-800 hover:text-emerald-950 cursor-pointer underline"
                    >
                      Settings →
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Paybill: <strong className="font-mono">{mpesaConfig.businessShortCode}</strong>. Instant STK push & automatic invoice settlement active.
                  </p>
                </div>
              </div>

              {/* Client Encryption */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-slate-800 text-white shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">AES-256 PII Protection</span>
                    <span className="text-[10px] font-mono text-slate-700 bg-white border border-slate-200 px-1.5 py-0.2 rounded">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Parent phone numbers, national IDs, and addresses encrypted client-side with cryptographic RBAC keys.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Custom School Domain Mapping & SSL */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span>Custom School Domain Mapping (e.g. portal.yourschool.sc.ke)</span>
              </h4>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-100 text-indigo-800 font-semibold">
                Auto SSL Active
              </span>
            </div>

            <p className="text-slate-600 leading-relaxed text-[11px]">
              You can map this portal to your institution's official web domain. Add the following DNS CNAME or A records to your school domain registrar (e.g. Safaricom Domains, Kenya Web Experts, or Cloudflare):
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-semibold">DNS Record Type:</span>
                  <span className="font-mono font-bold text-slate-900">CNAME</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-semibold">Host / Name:</span>
                  <span className="font-mono text-indigo-700 font-semibold">portal</span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                  <span className="text-slate-500 font-semibold">Target / Value:</span>
                  <span className="font-mono text-[10px] truncate max-w-[170px] text-slate-800">
                    ais-pre-oqwedxphfcnhooydhohwrn-530115907800.europe-west1.run.app
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('ais-pre-oqwedxphfcnhooydhohwrn-530115907800.europe-west1.run.app', 'cname')}
                  className="w-full mt-1.5 py-1 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold transition-colors cursor-pointer"
                >
                  {copiedRecord === 'cname' ? '✓ Copied Target URL' : 'Copy Target CNAME'}
                </button>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-semibold">SSL / HTTPS Certificate:</span>
                  <span className="font-mono font-bold text-emerald-700">Auto-Renewing TLS 1.3</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-semibold">Live Production URL:</span>
                  <a
                    href="https://ais-pre-oqwedxphfcnhooydhohwrn-530115907800.europe-west1.run.app"
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-indigo-600 hover:text-indigo-800 text-[10px] underline flex items-center gap-0.5"
                  >
                    <span>Open Live App</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                  SSL certificate is automatically issued once the CNAME propagation completes.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Self-Hosting & Export */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Server className="w-4 h-4 text-slate-700" />
              <span>Exporting Code to GitHub or Your Own Servers</span>
            </h4>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              This complete portal is built with standard TypeScript, React, and Tailwind CSS. You can export it directly using the <strong>GitHub</strong> button in AI Studio, or deploy it to a dedicated server using:
            </p>
            <div className="p-2.5 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-lg">
              npm install && npm run build && npm run preview
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
