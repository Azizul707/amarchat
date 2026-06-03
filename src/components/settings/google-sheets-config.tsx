"use client";

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, FileSpreadsheet, Clipboard, Check, ExternalLink } from 'lucide-react';

export function GoogleSheetsConfig() {
  const [sheetId, setSheetId] = useState('');
  const [appsScriptUrl, setAppsScriptUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // গুগল অ্যাপস স্ক্রিপ্ট কোড ব্লকের টেক্সট
  const appsScriptCode = `function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Orders");
  var data = JSON.parse(e.postData.contents);
  
  sheet.appendRow([
    data.customer_name,
    data.address,
    data.mobile,
    data.product_sku_or_name,
    data.size || "",
    data.color || "",
    data.quantity || 1,
    new Date().toISOString()
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({status: "success"}))
    .setMimeType(ContentService.MimeType.JSON);
}`;

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/settings/integrations');
        if (res.ok) {
          const result = await res.json();
          if (result.data) {
            setSheetId(result.data.google_sheet_id || '');
            setAppsScriptUrl(result.data.apps_script_url || '');
          }
        }
      } catch (err) {
        console.error('Failed to load Google Sheets config:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetId.trim()) {
      toast.error('Google Sheet ID is required.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/settings/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          google_sheet_id: sheetId.trim(),
          apps_script_url: appsScriptUrl.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      toast.success('Google Sheets configurations saved successfully!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to save configurations: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopied(true);
    toast.success('Apps Script code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 flex justify-center py-12">
        <Loader2 className="animate-spin text-indigo-500 h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      
      {/* LEFT & MIDDLE: Google Sheets Form */}
      <form onSubmit={handleSave} className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
            <span>Google Sheets Sync Configuration</span>
          </h3>
          <p className="text-sm text-slate-400">
            {'Connect your custom Google Sheets to store real-time orders and fetch active product catalogues.'}
          </p>
        </div>

        <div className="space-y-4 max-w-xl">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Spreadsheet ID</label>
            <input 
              type="text" 
              value={sheetId} 
              onChange={(e) => setSheetId(e.target.value)} 
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors font-mono" 
              placeholder="e.g. 1aBCDeFGhiJKlMnOpQrStUvWxYz12345"
              required
            />
            <p className="text-[10px] text-slate-500 font-sans leading-normal">
              {'📌 Find the long string in your Google Sheet URL: /spreadsheets/d/[SPREADSHEET_ID]/edit'}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Google Apps Script Web App URL (For Orders)</label>
            <input 
              type="text" 
              value={appsScriptUrl} 
              onChange={(e) => setAppsScriptUrl(e.target.value)} 
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors font-mono" 
              placeholder="e.g. https://script.google.com/macros/s/.../exec"
            />
            <p className="text-[10px] text-slate-500 font-sans leading-normal">
              {'📌 Paste your deployed Apps Script URL. Leave empty if you only want to use product searches.'}
            </p>
          </div>
        </div>

        <div className="pt-2">
          <button 
            type="submit" 
            disabled={saving}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Sheet Credentials'}
          </button>
        </div>
      </form>

      {/* RIGHT COLUMN: Instructions Box (Aligned with WhatsApp Config design) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-6">
        <h4 className="text-sm font-bold text-white tracking-wide">Google Sheets Setup</h4>
        
        <div className="space-y-4">
          <div className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white text-[10px] font-bold">1</span>
            <div className="space-y-1">
              <h5 className="text-xs font-semibold text-slate-200">{'Create Two Sheet Tabs'}</h5>
              <p className="text-[11px] text-slate-400 leading-normal">
                {'Name one tab '}<strong>{'Inventory'}</strong>{' and the second tab '}<strong>{'Orders'}</strong>{' exactly (case-sensitive).'}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white text-[10px] font-bold">2</span>
            <div className="space-y-1">
              <h5 className="text-xs font-semibold text-slate-200">{'Set Up Headers'}</h5>
              <p className="text-[11px] text-slate-400 leading-normal">
                <strong>{'Inventory: '}</strong>{'SKU, Product_Name, Price, Image_URL'}<br />
                <strong>{'Orders: '}</strong>{'Name, Address, Mobile, Product_SKU'}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white text-[10px] font-bold">3</span>
            <div className="space-y-1">
              <h5 className="text-xs font-semibold text-slate-200">{'Share with Service Account'}</h5>
              <p className="text-[11px] text-slate-400 leading-normal">
                {'Click Share on your sheet and invite our Service Account as '}<strong>{'Editor'}</strong>{':'}
              </p>
              <div className="mt-1.5 p-2 bg-slate-950 border border-slate-850 rounded text-[9px] font-mono text-emerald-400 break-all select-all">
                {'amarchat-service-account@amarchat-425409.iam.gserviceaccount.com'}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white text-[10px] font-bold">4</span>
            <div className="space-y-1 w-full">
              <h5 className="text-xs font-semibold text-slate-200">{'Deploy Google Apps Script'}</h5>
              <p className="text-[11px] text-slate-400 leading-normal">
                {'Go to Extensions > Apps Script, paste the code below, and deploy it as a Web App (Access: Anyone).'}
              </p>
              
              <div className="relative mt-2 rounded bg-slate-950 border border-slate-850 p-2">
                <pre className="text-[8px] font-mono text-slate-400 overflow-x-auto max-h-36 scrollbar-thin">
                  {appsScriptCode}
                </pre>
                <button
                  onClick={handleCopyCode}
                  className="absolute top-1 right-1 p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
                  title="Copy Code"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Clipboard className="h-3 w-3" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-850">
          <a 
            href="https://docs.google.com/spreadsheets" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
          >
            <span>{'Go to Google Sheets'}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

    </div>
  );
}