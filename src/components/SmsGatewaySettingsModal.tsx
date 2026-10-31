import React, { useState } from 'react';
import {
  MessageSquare,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  Smartphone,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Sliders
} from 'lucide-react';
import {
  getSmsGatewayConfig,
  saveSmsGatewayConfig,
  dispatchRealSms,
  SmsGatewayConfig
} from '../services/smsGatewayService';
import { validateKenyanPhoneNumber } from '../services/cryptoService';

interface SmsGatewaySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SmsGatewaySettingsModal: React.FC<SmsGatewaySettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [config, setConfig] = useState<SmsGatewayConfig>(getSmsGatewayConfig());
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Live test SMS dispatch state
  const [testPhone, setTestPhone] = useState('0712345678');
  const [testMessage, setTestMessage] = useState(
    'Mwivona Comprehensive School: Official tuition fee statement and student score card are now available on the portal. Login with your registered phone number.'
  );
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveSmsGatewayConfig(config);
    setConfig(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSendTestSms = async () => {
    setTestError(null);
    setTestResult(null);

    const validation = validateKenyanPhoneNumber(testPhone);
    if (!validation.isValid) {
      setTestError(
        validation.error ||
          'The phone number format should start with 07.... Or 01.... Not +2547.... nor +254.....'
      );
      return;
    }

    setIsSendingTest(true);
    const res = await dispatchRealSms(validation.cleanPhone!, testMessage);
    setIsSendingTest(false);

    if (res.success) {
      setTestResult(res);
      setConfig(getSmsGatewayConfig()); // refresh balance
    } else {
      setTestError(res.error || 'Failed to dispatch SMS through the gateway.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden text-slate-900 text-xs">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-600">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Kenyan Cellular SMS Gateway Configuration
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                  Active Provider
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Direct cellular delivery to 07... & 01... numbers via Africa's Talking / Safaricom
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

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>SMS Gateway settings successfully saved to institutional configuration.</span>
            </div>
          )}

          {/* Configuration Form */}
          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Provider Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Primary SMS Aggregator
                </label>
                <select
                  value={config.provider}
                  onChange={(e) => setConfig({ ...config, provider: e.target.value as any })}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="africastalking">Africa's Talking (Kenya & East Africa)</option>
                  <option value="safaricom_bulk">Safaricom Bulk SMS Enterprise Gateway</option>
                  <option value="local_aggregator">Licensed CAK Bulk SMS Aggregator</option>
                </select>
              </div>

              {/* Official Sender ID */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Registered Alphanumeric Sender ID (Max 11 Chars)
                </label>
                <input
                  type="text"
                  maxLength={11}
                  required
                  value={config.senderId}
                  onChange={(e) => setConfig({ ...config, senderId: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. MWIVONA"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Appears as the sender on parents' phones instead of a random number.
                </p>
              </div>

              {/* API Username / Partner ID */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  API Username / Partner ID
                </label>
                <input
                  type="text"
                  required
                  value={config.usernameOrPartnerId}
                  onChange={(e) => setConfig({ ...config, usernameOrPartnerId: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* API Key */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  API Key / Secret Token
                </label>
                <input
                  type="password"
                  required
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Balance Badge & Save */}
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                  {config.smsBalanceUnits.toLocaleString()}
                </div>
                <div>
                  <div className="font-bold text-slate-900">Remaining Prepaid SMS Credits</div>
                  <div className="text-[11px] text-slate-500">
                    Sufficient for ~{config.smsBalanceUnits.toLocaleString()} parent fee reminder dispatches
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
              >
                Save Gateway Settings
              </button>
            </div>
          </form>

          {/* Test SMS Dispatcher */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Send className="w-4 h-4 text-emerald-600" />
                <span>Live Test Dispatch Tool</span>
              </h4>
              <span className="text-[11px] text-slate-500">Test actual cellular delivery</span>
            </div>

            {testError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{testError}</span>
              </div>
            )}

            {testResult && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>SMS Dispatched & Delivered!</span>
                  </span>
                  <span className="font-mono text-[10px] bg-emerald-200/80 px-2 py-0.5 rounded">
                    Carrier: {testResult.networkCarrier}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-700">
                  Recipient: <strong>{testResult.recipientPhone}</strong> · Message ID: {testResult.messageId} · Sender: {testResult.senderId}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Recipient Phone Number *
                </label>
                <input
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="0712345678 or 0110445566"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-amber-800 mt-1 block">Format: 07... or 01... (No +254)</span>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Message Content
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="flex-1 p-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleSendTestSms}
                    disabled={isSendingTest}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-60 shrink-0"
                  >
                    {isSendingTest ? 'Sending...' : 'Send SMS'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
