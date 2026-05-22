'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Settings, MessageSquare, Tag, User, Lock, RefreshCw, Loader2, Briefcase, Users, Plus, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
// গ্লোবাল ওয়ার্কস্পেস স্টেট হুক ইম্পোর্ট
import { useWorkspace } from '@/providers/workspace-provider';
import { toast } from 'sonner';
import { WhatsAppConfig } from '@/components/settings/whatsapp-config';
import { TemplateManager } from '@/components/settings/template-manager';
import { TagManager } from '@/components/settings/tag-manager';
import { ProfileForm } from '@/components/settings/profile-form';
import { PasswordForm } from '@/components/settings/password-form';
import { SessionsCard } from '@/components/settings/sessions-card';

// ট্যাব ভ্যালুতে 'workspace' এবং 'team' ট্যাবটি টাইপ-সেফ উপায়ে যুক্ত করা হয়েছে
const TAB_VALUES = ['profile', 'workspace', 'team', 'whatsapp', 'templates', 'tags'] as const;
type TabValue = (typeof TAB_VALUES)[number];

function isTabValue(v: string | null): v is TabValue {
  return !!v && (TAB_VALUES as readonly string[]).includes(v);
}

// ==================== WORKSPACE FORM COMPONENT ====================
// ইউজারদের নিজস্ব ওয়ার্কস্পেস রিনেম করার জন্য ইনলাইন প্রিমিয়াম কার্ড ফর্ম
function WorkspaceForm() {
  const { workspace, refresh } = useWorkspace();
  const [name, setName] = useState('');
  const [updating, setUpdating] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // গ্লোবাল ওয়ার্কস্পেস ডাটা পরিবর্তন হলে স্টেট সিঙ্ক করা
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
      // গ্লোবাল কনটেক্সট রিফ্রেশ করা যাতে হেডারে নাম সাথে সাথে আপডেট হয়
      await refresh();
    } catch (err) {
      console.error('Workspace Update Error:', err);
      toast.error('An unexpected error occurred while updating workspace.');
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
        {/* অনন্য ওয়ার্কস্পেস আইডি (শুধুমাত্র দেখার জন্য) */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">Workspace ID</label>
          <input 
            type="text" 
            value={workspace.id} 
            disabled 
            className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-500 cursor-not-allowed select-all" 
          />
        </div>

        {/* ওয়ার্কস্পেসের নাম ইনপুট ফিল্ড */}
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

  // বর্তমান ওয়ার্কস্পেসের মেম্বারদের ডাটা লোড করার সিকিউরড ফাংশন
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

  // ইমেইল দিয়ে এজেন্ট ইনভাইট বা কানেক্ট করার লজিক
  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;
    if (!email.trim()) {
      toast.error('Please enter a valid email address.');
      return;
    }

    try {
      setAdding(true);
      // RPC ফাংশন কল করা
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
        // লিস্ট পুনরায় রিফ্রেশ করা
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
      {/* ১. ইনভাইটেশন কার্ড ফর্ম */}
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
          📌 নোট: এজেন্টকে আমাদের প্ল্যাটফর্মে অবশ্যই আগে একটি অ্যাকাউন্ট তৈরি (Sign Up) করতে হবে। অন্যথায় ইমেইলটি ডাটাবেসে খুঁজে পাওয়া যাবে না।
        </p>
      </form>

      {/* ২. মেম্বারদের তালিকা টেবিল */}
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
            href="https://t.me/your_support_link"
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
  const [mounted, setMounted] = useState(false); // সার্ভার এবং ক্লায়েন্ট সিঙ্ক নিশ্চিত করার স্টেট

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const getFreshStatus = async () => {
    try {
      setCheckingStatus(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error("Auth Session Error:", authError);
        return;
      }
      
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_approved, subscription_expires_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error("Database query failed:", error.message);
          toast.error(`DB Query Fail: ${error.message}`);
          return;
        }

        if (data) {
          setLocalProfile(data);
        } else {
          console.log("Logged In User Auth ID is:", user.id);
        }
      }
    } catch (err) {
      console.error("System exception:", err);
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    getFreshStatus();
  }, []);

  const queryTab = searchParams.get('tab');
  const tab: TabValue = isTabValue(queryTab) ? queryTab : 'profile';

  const activeApproved = localProfile ? localProfile.is_approved : (cachedProfile as unknown as { is_approved?: boolean })?.is_approved;
  const activeExpiry = localProfile ? localProfile.subscription_expires_at : (cachedProfile as unknown as { subscription_expires_at?: string | null })?.subscription_expires_at;

  const isSubscriptionActive = 
    !!activeApproved && 
    !!activeExpiry && 
    new Date(activeExpiry).getTime() > new Date().getTime();
  
  const isLocked = !isSubscriptionActive;

  const onChange = (next: TabValue) => {
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
          Manage your profile, workspace settings, WhatsApp® integration, message templates, and
          tags.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => onChange(v as TabValue)}>
        <TabsList className="bg-slate-900 border border-slate-700 flex flex-wrap">
          {/* প্রোফাইল ট্যাব (সর্বদা আনলকড) */}
          <TabsTrigger
            value="profile"
            className="data-active:bg-slate-800 data-active:text-violet-400 text-slate-400"
          >
            <User className="size-4" />
            Profile
          </TabsTrigger>

          {/* নতুন ওয়ার্কস্পেস সেটিংস ট্যাব (সর্বদা আনলকড, যাতে অ্যাকাউন্ট পেন্ডিং থাকা অবস্থায়ও কোম্পানি সেটআপ করা যায়) */}
          <TabsTrigger
            value="workspace"
            className="data-active:bg-slate-800 data-active:text-violet-400 text-slate-400"
          >
            <Briefcase className="size-4" />
            Workspace
          </TabsTrigger>

          {/* টিম ট্যাব (এজেন্ট ও মেম্বার কানেক্ট করার জন্য নতুন যোগ করা হয়েছে) */}
          <TabsTrigger
            value="team"
            className="data-active:bg-slate-800 data-active:text-violet-400 text-slate-400"
          >
            <Users className="size-4" />
            Team
          </TabsTrigger>

          {/* হোয়াটসঅ্যাপ সেটিংস ট্যাব */}
          <TabsTrigger
            value="whatsapp"
            className="data-active:bg-slate-800 data-active:text-violet-400 text-slate-400"
          >
            <Settings className="size-4" />
            WhatsApp Config
          </TabsTrigger>

          {/* ব্রডকাস্ট টেমপ্লেট ট্যাব */}
          <TabsTrigger
            value="templates"
            className="data-active:bg-slate-800 data-active:text-violet-400 text-slate-400"
          >
            <MessageSquare className="size-4" />
            Templates
          </TabsTrigger>

          {/* ট্যাগ ম্যানেজার ট্যাব */}
          <TabsTrigger
            value="tags"
            className="data-active:bg-slate-800 data-active:text-violet-400 text-slate-400"
          >
            <Tag className="size-4" />
            Tags
          </TabsTrigger>
        </TabsList>

        {/* PROFILE TAB CONTENT */}
        <TabsContent value="profile" className="space-y-6">
          <ProfileForm />
          <PasswordForm />
          <SessionsCard />
        </TabsContent>

        {/* NEW WORKSPACE TAB CONTENT */}
        <TabsContent value="workspace" className="space-y-6">
          <WorkspaceForm />
        </TabsContent>

        {/* NEW TEAM TAB CONTENT */}
        <TabsContent value="team" className="space-y-6">
          <TeamForm />
        </TabsContent>

        {/* WHATSAPP TAB CONTENT */}
        <TabsContent value="whatsapp">
          {/* মাউন্ট হওয়া এবং ডাটা লোড হওয়ার আগ পর্যন্ত উভয় এন্ডে একই লোডার দেখাবে, যা Hydration Mismatch রোধ করবে */}
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
        </TabsContent>

        {/* TEMPLATES TAB CONTENT */}
        <TabsContent value="templates">
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
        </TabsContent>

        {/* TAGS TAB CONTENT */}
        <TabsContent value="tags">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}