'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { 
  Settings, 
  MessageSquare, 
  Tag, 
  User, 
  Lock, 
  RefreshCw, 
  Loader2, 
  Briefcase, 
  Users, 
  Plus, 
  ShieldCheck, 
  ShieldAlert, 
  Zap, 
  Brain,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useWorkspace } from '@/providers/workspace-provider';
import { toast } from 'sonner';
import { WhatsAppConfig } from '@/components/settings/whatsapp-config';
import { TemplateManager } from '@/components/settings/template-manager';
import { TagManager } from '@/components/settings/tag-manager';
import { ProfileForm } from '@/components/settings/profile-form';
import { PasswordForm } from '@/components/settings/password-form';
import { SessionsCard } from '@/components/settings/sessions-card';
import { GoogleSheetsConfig } from '@/components/settings/google-sheets-config';
import { cn } from '@/lib/utils';

// নলেজ বেস কম্পোনেন্ট ইম্পোর্ট
import KnowledgeBaseSettings from './knowledge-base/page';

const TAB_VALUES = ['profile', 'workspace', 'team', 'ai', 'kb', 'whatsapp', 'sheets', 'templates', 'tags'] as const;
type TabValue = (typeof TAB_VALUES)[number];

function isTabValue(v: string | null): v is TabValue {
  return !!v && (TAB_VALUES as readonly string[]).includes(v);
}

// ==================== WORKSPACE FORM COMPONENT ====================
function WorkspaceForm() {
  const { workspace, refresh } = useWorkspace();
  const [name, setName] = useState('');
  const [updating, setUpdating] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (workspace?.name) {
      setName(workspace.name);
    }
  }, [workspace]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;
    if (!name.trim()) {
      toast.error('Workspace name cannot be empty');
      return;
    }

    try {
      setUpdating(true);
      const { error } = await supabase
        .from('workspaces')
        .update({ name: name.trim() })
        .eq('id', workspace.id);

      if (error) {
        toast.error(`Failed to update workspace: ${error.message}`);
        return;
      }

      toast.success('Workspace name updated successfully!');
      await refresh();
    } catch (err) {
      console.error('Workspace Update Error:', err);
      toast.error('An unexpected error occurred.');
    } finally {
      setUpdating(false);
    }
  };

  if (!workspace) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 flex justify-center py-12">
        <Loader2 className="animate-spin text-indigo-500 h-6 w-6" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-white">Workspace Details</h3>
        <p className="text-sm text-slate-400">Configure your business brand name for this isolated multi-tenant workspace.</p>
      </div>

      <div className="space-y-4 max-w-md">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">Workspace ID</label>
          <input 
            type="text" 
            value={workspace.id} 
            disabled 
            className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-500 cursor-not-allowed select-all" 
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">Workspace Name</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="w-full px-3 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors" 
            placeholder="e.g. My Awesome Business"
          />
        </div>
      </div>

      <div className="pt-2">
        <button 
          type="submit" 
          disabled={updating || name.trim() === workspace.name}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {updating ? 'Saving...' : 'Save Workspace Name'}
        </button>
      </div>
    </form>
  );
}

// ==================== TEAM MANAGER COMPONENT ====================
interface TeamMember {
  profile_id: string;
  user_id: string;
  email: string;
  is_approved: boolean;
}

function TeamForm() {
  const { workspace } = useWorkspace();
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchMembers = useCallback(async () => {
    if (!workspace) return;
    try {
      setLoadingMembers(true);
      const { data, error } = await supabase.rpc('get_workspace_agents', {
        target_workspace_id: workspace.id
      });

      if (error) {
        console.error('Error fetching members:', error.message);
        return;
      }

      if (data) {
        setMembers(data as TeamMember[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  }, [workspace, supabase]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;
    if (!email.trim()) {
      toast.error('Please enter a valid email address.');
      return;
    }

    try {
      setAdding(true);
      const { data, error } = await supabase.rpc('add_agent_by_email', {
        target_email: email.trim().toLowerCase(),
        target_workspace_id: workspace.id
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data) {
        toast.success(`Agent ${email} successfully connected to your workspace!`);
        setEmail('');
        await fetchMembers();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to add agent.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleAddAgent} className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-5">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-400" />
            <span>Connect Workspace Agents</span>
          </h3>
          <p className="text-sm text-slate-400">Invite or link your team members to this workspace by their registered email.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-end gap-3 max-w-lg">
          <div className="space-y-2 flex-1 w-full">
            <label className="text-xs font-semibold text-slate-300">Agent Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors" 
              placeholder="e.g. agent.name@example.com"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={adding}
            className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {adding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Add Agent
          </button>
        </div>
        
        <p className="text-xs text-amber-500 leading-normal font-sans">
          📌 নোট: এজেন্টকে আমাদের প্ল্যাটফর্ম অবশ্যই আগে একটি অ্যাকাউন্ট তৈরি (Sign Up) করতে হবে। অন্যথায় ইমেইলটি ডাটাবেসে খুঁজে পাওয়া যাবে না।
        </p>
      </form>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">Current Active Agents</h3>
        
        {loadingMembers ? (
          <div className="flex justify-center py-6">
            <Loader2 className="animate-spin text-indigo-500 h-6 w-6" />
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-slate-400">No agents linked to this workspace yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold">
                  <th className="py-3 px-4">Agent Email</th>
                  <th className="py-3 px-4">User ID</th>
                  <th className="py-3 px-4">Role/Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {members.map((member) => (
                  <tr key={member.profile_id} className="hover:bg-slate-900/20 text-slate-300">
                    <td className="py-3 px-4 font-medium">{member.email}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500 select-all">{member.user_id}</td>
                    <td className="py-3 px-4">
                      {member.is_approved ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <ShieldCheck className="h-3 w-3" /> Approved Agent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <ShieldAlert className="h-3 w-3" /> Approval Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== AI CONFIGURATION COMPONENT ====================
function AIForm() {
  const [apiKey, setApiKey] = useState('');
  const [prompt, setPrompt] = useState('You are a helpful customer service assistant.');
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [model, setModel] = useState('gpt-4o-mini');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/settings/ai');
        if (res.ok) {
          const data = await res.json();
          if (data.apiKey) setApiKey(data.apiKey);
          if (data.prompt) setPrompt(data.prompt);
          if (data.baseUrl) setBaseUrl(data.baseUrl);
          if (data.model) setModel(data.model);
        }
      } catch (err) {
        console.error('Failed to load AI config:', err);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/settings/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          prompt: prompt.trim(),
          baseUrl: baseUrl.trim(),
          model: model.trim(),
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      toast.success('AI configurations updated successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(err);
      toast.error(`Failed to update AI configurations: ${errorMessage}`);
    } finally {
      setSaving(false);
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
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Zap className="h-5 w-5 text-indigo-400 animate-pulse" />
          <span>Universal AI Chatbot Configuration</span>
        </h3>
        <p className="text-sm text-slate-400">Configure your chatbot API endpoints. Supports OpenAI, OpenRouter, DeepSeek, or any custom provider.</p>
      </div>

      <div className="space-y-4 max-w-xl">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">AI API Key (BYOK)</label>
          <input 
            type="password" 
            value={apiKey} 
            onChange={(e) => setApiKey(e.target.value)} 
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors" 
            placeholder="OpenAI, OpenRouter, or DeepSeek API Key"
          />
          <p className="text-[10px] text-slate-500 font-sans leading-normal">
            📌 আপনার অ্যাক্সেস কি-টি ডাটাবেসে সম্পূর্ণ এনক্রিপ্ট অবস্থায় সুরক্ষিত থাকবে।
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">API Base URL (Endpoint Path)</label>
          <input 
            type="text" 
            value={baseUrl} 
            onChange={(e) => setBaseUrl(e.target.value)} 
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors font-mono" 
            placeholder="e.g., https://api.openai.com/v1"
          />
          <p className="text-[10px] text-slate-500 font-sans leading-normal">
            📌 ডাইনামিক বেস url। OpenAI এর জন্য `https://api.openai.com/v1` and OpenRouter এর জন্য `https://openrouter.ai/api/v1` ব্যবহার করুন।
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">AI Model Name</label>
          <input 
            type="text" 
            value={model} 
            onChange={(e) => setModel(e.target.value)} 
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors font-mono" 
            placeholder="e.g., gpt-4o-mini or google/gemini-2.5-flash"
          />
          <p className="text-[10px] text-slate-500 font-sans leading-normal">
            📌 আপনার প্রোভাইডার প্যানেল থেকে সঠিক মডেলের নামটি লিখুন (যেমন: OpenAI এর জন্য `gpt-4o-mini` এবং OpenRouter এর জেমিনির জন্য `google/gemini-2.5-flash`)।
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">AI System Instructions (Prompt)</label>
          <textarea 
            rows={5}
            value={prompt} 
            onChange={(e) => setPrompt(e.target.value)} 
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none leading-relaxed" 
            placeholder="You are a helpful customer service assistant for my business..."
          />
        </div>
      </div>

      <div className="pt-2">
        <button 
          type="submit" 
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Saving...' : 'Save AI Configurations'}
        </button>
      </div>
    </form>
  );
}

// ==================== LOCKED TAB CARD COMPONENT ====================
function LockedTabCard({ title, onRefresh, checking }: { title: string; onRefresh: () => void; checking: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-red-500/10 bg-slate-950/40 p-8 md:p-12 text-center shadow-lg">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-red-500/5 blur-3xl pointer-events-none" />
      
      <div className="relative z-10 max-w-md mx-auto space-y-5">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto animate-pulse">
          <Lock className="size-6" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white tracking-tight">
            {title} is Locked
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            হোয়াটসঅ্যাপ ইন্টিগ্রেশন, ব্রডকাস্ট টেমপ্লেট এবং অটোমেশন ফিচারগুলো ব্যবহার করতে একটি সক্রিয় সাবস্ক্রিপশন প্রয়োজন। আপনার অ্যাকাউন্টটি বর্তমানে ইন-অ্যাক্টিভ বা পেন্ডিং অবস্থায় আছে।
          </p>
        </div>

        <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-left text-xs text-slate-400 leading-normal">
          <span className="font-bold text-amber-500 block mb-1">💡 পেমেন্ট ক্লিয়ার করেছেন?</span>
          আপনি যদি অলরেডি বিকাশ/নগদে সাবস্ক্রিপশন পেমেন্ট করে থাকেন, তবে দয়া করে অ্যাডমিন কর্তৃক এপ্রুভালের জন্য অপেক্ষা করুন। খুব দ্রুত অ্যাকাউন্ট সচল করতে আমাদের সাথে সরাসরি যোগাযোগ করতে পারেন।
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <a 
            href="https://t.me/aamarchat"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-black bg-indigo-500 hover:bg-indigo-400 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            Contact Support
          </a>
          <button
            onClick={onRefresh}
            disabled={checking}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-zinc-300 border border-zinc-800 hover:bg-zinc-900 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {checking ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Check Status
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN SETTINGS PAGE ====================
export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile: cachedProfile } = useAuth();
  const [localProfile, setLocalProfile] = useState<{ is_approved: boolean; subscription_expires_at: string | null } | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [mounted, setMounted] = useState(false);

  const queryTab = searchParams.get('tab');
  const initialTab: TabValue = isTabValue(queryTab) ? queryTab : 'profile';
  const [tab, setTab] = useState<TabValue>(initialTab);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const getFreshStatus = useCallback(async () => {
    try {
      setCheckingStatus(true);
      const { data: { user: freshUser }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error("Auth Session Error:", authError);
        return;
      }
      
      if (freshUser) {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_approved, subscription_expires_at')
          .eq('user_id', freshUser.id)
          .maybeSingle();

        if (error) {
          console.error("Database query failed:", error.message);
          toast.error(`DB Query Fail: ${error.message}`);
          return;
        }

        if (data) {
          setLocalProfile(data);
        } else {
          console.log("Logged In User Auth ID is:", freshUser.id);
        }
      }
    } catch (err) {
      console.error("System exception:", err);
    } finally {
      setCheckingStatus(false);
    }
  }, [supabase]);

  useEffect(() => {
    setMounted(true);
    getFreshStatus();
  }, [getFreshStatus]);

  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (isTabValue(currentTab)) {
      setTab(currentTab);
    }
  }, [searchParams]);

  const activeApproved = localProfile ? localProfile.is_approved : (cachedProfile as unknown as { is_approved?: boolean })?.is_approved;
  const activeExpiry = localProfile ? localProfile.subscription_expires_at : (cachedProfile as unknown as { subscription_expires_at?: string | null })?.subscription_expires_at;

  const isOwner = !!activeApproved;

  useEffect(() => {
    if (mounted && !isOwner && ['workspace', 'team', 'ai', 'kb', 'whatsapp', 'sheets'].includes(tab)) {
      setTab('profile');
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', 'profile');
      router.replace(`/settings?${params.toString()}`, { scroll: false });
    }
  }, [tab, isOwner, mounted, router, searchParams]);

  const isSubscriptionActive = 
    !!activeApproved && 
    !!activeExpiry && 
    new Date(activeExpiry).getTime() > new Date().getTime();
  
  const isLocked = !isSubscriptionActive;

  const onChange = (next: TabValue) => {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    router.replace(`/settings?${params.toString()}`, { scroll: false });
  };

  const handleRefreshStatus = async () => {
    await getFreshStatus();
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your profile, team members, WhatsApp® integration, AI chatbots, and message templates.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Settings Secondary Sidebar */}
        <div className="w-full md:w-56 shrink-0 bg-slate-900/30 border border-slate-800 rounded-xl p-2 flex flex-col gap-1">
          
          {/* General Settings Category */}
          <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase px-3 py-1.5 block">
            General Settings
          </span>
          
          <button
            onClick={() => onChange('profile')}
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left w-full cursor-pointer",
              tab === 'profile'
                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                : "text-slate-400 hover:bg-slate-900/60 hover:text-white border border-transparent"
            )}
          >
            <User className="size-4" />
            <span>Profile Settings</span>
          </button>

          {isOwner && (
            <>
              <button
                onClick={() => onChange('workspace')}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left w-full cursor-pointer",
                  tab === 'workspace'
                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    : "text-slate-400 hover:bg-slate-900/60 hover:text-white border border-transparent"
                )}
              >
                <Briefcase className="size-4" />
                <span>Workspace Details</span>
              </button>

              <button
                onClick={() => onChange('team')}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left w-full cursor-pointer",
                  tab === 'team'
                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    : "text-slate-400 hover:bg-slate-900/60 hover:text-white border border-transparent"
                )}
              >
                <Users className="size-4" />
                <span>Team Management</span>
              </button>

              {/* AI & Automation Category */}
              <div className="my-1 border-t border-slate-850" />
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase px-3 py-1.5 block">
                AI & Automation
              </span>

              <button
                onClick={() => onChange('ai')}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left w-full cursor-pointer",
                  tab === 'ai'
                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    : "text-slate-400 hover:bg-slate-900/60 hover:text-white border border-transparent"
                )}
              >
                <Zap className="size-4" />
                <span>AI Chatbot Setup</span>
              </button>

              <button
                onClick={() => onChange('kb')}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left w-full cursor-pointer",
                  tab === 'kb'
                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    : "text-slate-400 hover:bg-slate-900/60 hover:text-white border border-transparent"
                )}
              >
                <Brain className="size-4" />
                <span>AI Sales Training</span>
              </button>

              <button
                onClick={() => onChange('whatsapp')}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left w-full cursor-pointer",
                  tab === 'whatsapp'
                    ? "bg-purple-500/10 text-purple-400 border border-violet-500/20"
                    : "text-slate-400 hover:bg-slate-900/60 hover:text-white border border-transparent"
                )}
              >
                <Settings className="size-4" />
                <span>WhatsApp Config</span>
              </button>

              {/* NEW GOOGLE SHEETS TAB */}
              <button
                onClick={() => onChange('sheets')}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left w-full cursor-pointer",
                  tab === 'sheets'
                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    : "text-slate-400 hover:bg-slate-900/60 hover:text-white border border-transparent"
                )}
              >
                <FileSpreadsheet className="size-4" />
                <span>Google Sheets</span>
              </button>
            </>
          )}

          {/* CRM Properties Category */}
          <div className="my-1 border-t border-slate-850" />
          <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase px-3 py-1.5 block">
            CRM Properties
          </span>

          <button
            onClick={() => onChange('templates')}
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left w-full cursor-pointer",
              tab === 'templates'
                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                : "text-slate-400 hover:bg-slate-900/60 hover:text-white border border-transparent"
            )}
          >
            <MessageSquare className="size-4" />
            <span>Broadcast Templates</span>
          </button>

          <button
            onClick={() => onChange('tags')}
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left w-full cursor-pointer",
              tab === 'tags'
                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                : "text-slate-400 hover:bg-slate-900/60 hover:text-white border border-transparent"
            )}
          >
            <Tag className="size-4" />
            <span>Tag Manager</span>
          </button>
        </div>

        {/* Active Settings Tab Content Area */}
        <div className="flex-1 w-full space-y-6">
          {tab === 'profile' && (
            <div className="space-y-6">
              <ProfileForm />
              <PasswordForm />
              <SessionsCard />
            </div>
          )}

          {tab === 'workspace' && isOwner && (
            <WorkspaceForm />
          )}

          {tab === 'team' && isOwner && (
            <TeamForm />
          )}

          {tab === 'ai' && isOwner && (
            <AIForm />
          )}

          {tab === 'kb' && isOwner && (
            <>
              {!mounted || checkingStatus ? (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                </div>
              ) : isLocked ? (
                <LockedTabCard 
                  title="AI Training (Knowledge Base)" 
                  onRefresh={handleRefreshStatus}
                  checking={checkingStatus}
                />
              ) : (
                <KnowledgeBaseSettings />
              )}
            </>
          )}

          {tab === 'whatsapp' && isOwner && (
            <>
              {!mounted || checkingStatus ? (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                </div>
              ) : isLocked ? (
                <LockedTabCard 
                  title="WhatsApp Integration" 
                  onRefresh={handleRefreshStatus}
                  checking={checkingStatus}
                />
              ) : (
                <WhatsAppConfig />
              )}
            </>
          )}

          {tab === 'sheets' && isOwner && (
            <>
              {!mounted || checkingStatus ? (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                </div>
              ) : isLocked ? (
                <LockedTabCard 
                  title="Google Sheets Sync" 
                  onRefresh={handleRefreshStatus}
                  checking={checkingStatus}
                />
              ) : (
                <GoogleSheetsConfig />
              )}
            </>
          )}

          {tab === 'templates' && (
            <>
              {!mounted || checkingStatus ? (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                </div>
              ) : isLocked ? (
                <LockedTabCard 
                  title="Template Manager" 
                  onRefresh={handleRefreshStatus}
                  checking={checkingStatus}
                />
              ) : (
                <TemplateManager />
              )}
            </>
          )}

          {tab === 'tags' && (
            <>
              {!mounted || checkingStatus ? (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                </div>
              ) : isLocked ? (
                <LockedTabCard 
                  title="Tag Manager" 
                  onRefresh={handleRefreshStatus}
                  checking={checkingStatus}
                />
              ) : (
                <TagManager />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}