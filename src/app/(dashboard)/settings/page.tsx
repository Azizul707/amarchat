'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Settings, MessageSquare, Tag, User, Lock, RefreshCw, Loader2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { WhatsAppConfig } from '@/components/settings/whatsapp-config';
import { TemplateManager } from '@/components/settings/template-manager';
import { TagManager } from '@/components/settings/tag-manager';
import { ProfileForm } from '@/components/settings/profile-form';
import { PasswordForm } from '@/components/settings/password-form';
import { SessionsCard } from '@/components/settings/sessions-card';

const TAB_VALUES = ['profile', 'whatsapp', 'templates', 'tags'] as const;
type TabValue = (typeof TAB_VALUES)[number];

function isTabValue(v: string | null): v is TabValue {
  return !!v && (TAB_VALUES as readonly string[]).includes(v);
}

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
        // পরিবর্তন: নিচে 'id' এর জায়গায় 'user_id' করা হয়েছে
        const { data, error } = await supabase
          .from('profiles')
          .select('is_approved, subscription_expires_at')
          .eq('user_id', user.id) // 👈 এখানে পরিবর্তন করা হয়েছে
          .maybeSingle();

        if (error) {
          console.error("Database query failed:", error.message);
          toast.error(`DB Query Fail: ${error.message}`);
          return;
        }

        if (data) {
          // ডাটা খুঁজে পেলে সাকসেস টোস্ট দেখাবে
          setLocalProfile(data);
        } else {
          // ডাটা না পেলে আইডি প্রিন্ট করে নোটিফিকেশন দেবে যাতে আমরা চেক করতে পারি
          console.log("Logged In User Auth ID is:", user.id);
        }
      }
    } catch (err: any) {
      console.error("System exception:", err);
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    setMounted(true); // মাউন্ট শেষ হলে ট্রু হবে
    getFreshStatus();
  }, []);

  const queryTab = searchParams.get('tab');
  const tab: TabValue = isTabValue(queryTab) ? queryTab : 'profile';

  const activeApproved = localProfile ? localProfile.is_approved : cachedProfile?.is_approved;
  const activeExpiry = localProfile ? localProfile.subscription_expires_at : cachedProfile?.subscription_expires_at;

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
          Manage your profile, WhatsApp® integration, message templates, and
          tags.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => onChange(v as TabValue)}>
        <TabsList className="bg-slate-900 border border-slate-700">
          <TabsTrigger
            value="profile"
            className="data-active:bg-slate-800 data-active:text-violet-400 text-slate-400"
          >
            <User className="size-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="whatsapp"
            className="data-active:bg-slate-800 data-active:text-violet-400 text-slate-400"
          >
            <Settings className="size-4" />
            WhatsApp Config
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="data-active:bg-slate-800 data-active:text-violet-400 text-slate-400"
          >
            <MessageSquare className="size-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger
            value="tags"
            className="data-active:bg-slate-800 data-active:text-violet-400 text-slate-400"
          >
            <Tag className="size-4" />
            Tags
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <ProfileForm />
          <PasswordForm />
          <SessionsCard />
        </TabsContent>

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