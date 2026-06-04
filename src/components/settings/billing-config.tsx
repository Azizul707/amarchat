"use client";

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Wallet, CheckCircle2, Clock, XCircle, ShieldCheck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PaymentRequest {
  id: string;
  payment_method: string;
  sender_number: string;
  transaction_id: string;
  selected_plan: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface BillingConfigProps {
  isApproved?: boolean;
}

export function BillingConfig({ isApproved = false }: BillingConfigProps) {
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'nagad'>('bkash');
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'SaaS Pro' | 'DFY Elite'>('SaaS Pro');
  
  const [history, setHistory] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      // **ডাইনামিক ক্যাশ বাস্টিং ট্র্যাকার** (Date.now() যুক্ত করে ব্রাউজার ও সিডিএন ক্যাশ ধ্বংস করা হলো)
      const res = await fetch(`/api/settings/billing?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (res.ok) {
        const result = await res.json();
        if (result.data) {
          setHistory(result.data);
        }
      }
    } catch (err) {
      console.error('Failed to load billing history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderNumber.trim()) {
      toast.error('Sender mobile number is required.');
      return;
    }
    if (!transactionId.trim()) {
      toast.error('Transaction ID (TxnID) is required.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/settings/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method: paymentMethod,
          sender_number: senderNumber.trim(),
          transaction_id: transactionId.trim(),
          selected_plan: selectedPlan,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      toast.success('Payment verification request submitted successfully!');
      setSenderNumber('');
      setTransactionId('');
      await fetchHistory();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const effectiveStatus = isApproved ? 'approved' : status;

    switch (effectiveStatus) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" /> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="h-3 w-3" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="h-3 w-3" /> Verification Pending
          </span>
        );
    }
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
      
      {/* LEFT & MIDDLE: Billing Form & History Table */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Payment Submission Form */}
        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Wallet className="h-5 w-5 text-purple-400" />
              <span>Verify Manual Payment Request</span>
            </h3>
            <p className="text-sm text-slate-400">
              {'Submit your Transaction ID after sending the subscription fee to activate your workspace.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Choose Subscription Plan</label>
              <Select
                value={selectedPlan}
                onValueChange={(val) => setSelectedPlan(val as 'SaaS Pro' | 'DFY Elite')}
              >
                <SelectTrigger className="w-full bg-slate-950 border-slate-800 text-white text-sm h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="SaaS Pro" className="text-white focus:bg-slate-800">SaaS Pro (৳999/month)</SelectItem>
                  <SelectItem value="DFY Elite" className="text-white focus:bg-slate-800">DFY Elite (৳9,999/month)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Payment Channel</label>
              <Select
                value={paymentMethod}
                onValueChange={(val) => setPaymentMethod(val as 'bkash' | 'nagad')}
              >
                <SelectTrigger className="w-full bg-slate-950 border-slate-800 text-white text-sm h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="bkash" className="text-white focus:bg-slate-800">bKash (Personal)</SelectItem>
                  <SelectItem value="nagad" className="text-white focus:bg-slate-800">Nagad (Personal)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Your Sender Mobile Number</label>
              <input 
                type="text" 
                value={senderNumber} 
                onChange={(e) => setSenderNumber(e.target.value)} 
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors h-10" 
                placeholder="e.g., 01903042944"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Transaction ID (TxnID)</label>
              <input 
                type="text" 
                value={transactionId} 
                onChange={(e) => setTransactionId(e.target.value)} 
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors font-mono h-10 uppercase" 
                placeholder="e.g., KDL99J3K"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={saving}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Verifying...' : 'Submit Verification Request'}
            </button>
          </div>
        </form>

        {/* Payment History Log Table */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
          <h3 className="text-base font-semibold text-white">Your Payment Request Logs</h3>
          
          {history.length === 0 ? (
            <p className="text-sm text-slate-400">No payment requests submitted yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold">
                    <th className="py-3 px-4">Plan Selected</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Sender Mobile</th>
                    <th className="py-3 px-4">Transaction ID</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {history.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-900/20 text-slate-300">
                      <td className="py-3 px-4 font-semibold text-white">{req.selected_plan}</td>
                      <td className="py-3 px-4 capitalize">{req.payment_method}</td>
                      <td className="py-3 px-4">{req.sender_number}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-400 select-all uppercase">{req.transaction_id}</td>
                      <td className="py-3 px-4">{getStatusBadge(req.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* RIGHT COLUMN: Interactive Setup / Payment Instructions */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-6">
        <h4 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-purple-400 animate-pulse" />
          <span>Activation Instructions</span>
        </h4>
        
        <div className="space-y-4">
          <div className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white text-[10px] font-bold">1</span>
            <div className="space-y-1">
              <h5 className="text-xs font-semibold text-slate-200">{'Choose Your Plan'}</h5>
              <p className="text-[11px] text-slate-400 leading-normal">
                {'Select your preferred plan: '}<strong>{'SaaS Pro'}</strong>{' (৳999/month) or '}<strong>{'DFY Elite'}</strong>{' (৳9,999/month).'}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white text-[10px] font-bold">2</span>
            <div className="space-y-1">
              <h5 className="text-xs font-semibold text-slate-200">{'Send Subscription Fee'}</h5>
              <p className="text-[11px] text-slate-400 leading-normal">
                {'Perform a '}<strong>{'Send Money'}</strong>{' (or Cash Out) to our personal bKash or Nagad number:'}
              </p>
              <div className="mt-1.5 p-2 bg-slate-950 border border-slate-850 rounded text-center text-sm font-bold text-rose-500 tracking-wider select-all border-dashed border-rose-500/40">
                {'01903042944'}
              </div>
              <p className="text-[9px] text-slate-500 text-center">{'bKash / Nagad (Personal)'}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white text-[10px] font-bold">3</span>
            <div className="space-y-1">
              <h5 className="text-xs font-semibold text-slate-200">{'Copy Transaction ID'}</h5>
              <p className="text-[11px] text-slate-400 leading-normal">
                {'Copy the unique Transaction ID (TxnID) from your bKash/Nagad app or the confirmation SMS.'}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white text-[10px] font-bold">4</span>
            <div className="space-y-1">
              <h5 className="text-xs font-semibold text-slate-200">{'Submit Verification Form'}</h5>
              <p className="text-[11px] text-slate-400 leading-normal">
                {'Fill out the form on the left, click Submit, and wait. Our admin team will verify and activate your workspace within 24 hours.'}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-850 text-[10px] text-slate-500 leading-normal font-sans">
          📌 নোট: আপনি যদি আপনার অ্যাকাউন্টটি দ্রুত সচল করতে চান, তবে ফর্ম সাবমিট করার পর পেমেন্টের স্ক্রিনশট ও নিবন্ধিত ইমেইল সহ আমাদের টেলিগ্রাম গ্রুপে জানাতে পারেন।
        </div>
      </div>

    </div>
  );
}