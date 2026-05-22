'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Loader2 } from 'lucide-react';

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
}

export interface Profile {
  id: string; // Generated profile primary key
  user_id: string; // Auth.users(id) - actual matching key
  workspace_id: string | null;
  is_approved: boolean;
  subscription_expires_at: string | null;
}

interface WorkspaceContextType {
  user: any | null;
  profile: Profile | null;
  workspace: Workspace | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // `@supabase/ssr` ব্যবহার করে ক্লায়েন্ট-সাইড ব্রাউজার ইনস্ট্যান্স তৈরি করা
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchSessionData = useCallback(async () => {
    setIsLoading(true);
    try {
      // ১. বর্তমান লগইন করা ইউজারের তথ্য আনা
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        setUser(null);
        setProfile(null);
        setWorkspace(null);
        setIsLoading(false);
        return;
      }

      setUser(currentUser);

      // ২. প্রোফাইল ইনফরমেশন রিট্রিভ করা (user_id দিয়ে ফিল্টার এবং .maybeSingle() ব্যবহার করা হয়েছে)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id, workspace_id, is_approved, subscription_expires_at')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (profileError) {
        console.error('Supabase Profile fetching error:', profileError);
        setProfile(null);
        setWorkspace(null);
        setIsLoading(false);
        return;
      }

      if (!profileData) {
        setProfile(null);
        setWorkspace(null);
        setIsLoading(false);
        return;
      }

      setProfile(profileData);

      // ৩. প্রোফাইলের সাথে সংযুক্ত সক্রিয় ওয়ার্কস্পেস লোড করা
      if (profileData.workspace_id) {
        const { data: workspaceData, error: workspaceError } = await supabase
          .from('workspaces')
          .select('id, name, owner_id')
          .eq('id', profileData.workspace_id)
          .maybeSingle();

        if (workspaceError) {
          console.error('Supabase Workspace fetching error:', workspaceError);
          setWorkspace(null);
        } else {
          setWorkspace(workspaceData);
        }
      } else {
        setWorkspace(null);
      }
    } catch (err) {
      console.error('Unexpected error in WorkspaceProvider:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    setMounted(true);
    fetchSessionData();

    // অথরাইজেশন স্টেট চেঞ্জ হলে গ্লোবাল স্টেট সিঙ্ক করা
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setWorkspace(null);
      } else if (event === 'SIGNED_IN') {
        fetchSessionData();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchSessionData, supabase]);

  const refresh = async () => {
    await fetchSessionData();
  };

  // React 19 / Next.js 16 হাইড্রেশন মিসম্যাচ রোধ করতে ক্লায়েন্ট মাউন্টিং শেষ না হওয়া পর্যন্ত ওয়েট করা
  if (!mounted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <WorkspaceContext.Provider value={{ user, profile, workspace, isLoading, refresh }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// অন্যান্য ফাইলে সহজে এই গ্লোবাল স্টেট ব্যবহার করার হুক
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}