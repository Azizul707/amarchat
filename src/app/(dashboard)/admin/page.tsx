"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useAuth } from "@/hooks/use-auth";
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Loader2, 
  ShieldAlert,
  Search,
  Check,
  UserX
} from "lucide-react";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_approved: boolean;
  subscription_expires_at: string | null;
  created_at: string;
}

export default function AdminDashboardPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_admin_users");
      
      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to fetch user list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.email) {
      fetchUsers();
    }
  }, [profile]);

  const handleToggleApproval = async (userId: string, currentStatus: boolean) => {
    try {
      setUpdatingId(userId);
      const newStatus = !currentStatus;
      
      const { error } = await supabase.rpc("update_user_status", {
        target_user_id: userId,
        approve: newStatus,
        expiry_days: 30
      });

      if (error) throw error;

      toast.success(newStatus ? "User approved for 30 Days!" : "User subscription suspended.");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const getDaysRemainingInfo = (expiryDateString: string | null, isApproved: boolean) => {
    if (!isApproved || !expiryDateString) return { days: 0, status: "inactive" };
    
    const expiry = new Date(expiryDateString);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) {
      return { days: diffDays, status: "expired" };
    } else if (diffDays <= 5) {
      return { days: diffDays, status: "warning" };
    }
    return { days: diffDays, status: "active" };
  };

  const filteredUsers = users.filter((user) => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.full_name && user.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!loading && users.length === 0) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="h-16 w-16 text-red-500 mb-4 animate-bounce" />
        <h1 className="text-2xl font-black text-white">Security Access Denied</h1>
        <p className="text-zinc-400 mt-2 max-w-sm">
          You are not authorized to view this admin panel. Only the owner account can manage subscriptions.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-500" />
            amarchat Owner Dashboard
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage user approvals, subscriptions, and live active database connections.
          </p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search email or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:border-indigo-500 focus:outline-none transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-[#09090b]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/50 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                <th className="p-4">User Details</th>
                <th className="p-4">Created At</th>
                <th className="p-4">Remaining Period</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredUsers.map((user) => {
                const subInfo = getDaysRemainingInfo(user.subscription_expires_at, user.is_approved);
                
                // ইউজার আসলেই সচল কি না (is_approved = true এবং মেয়াদ ফিউচারে আছে)
                const isUserActive = user.is_approved && subInfo.status !== "inactive" && subInfo.status !== "expired";
                
                let rowStyle = "hover:bg-zinc-900/30 transition-colors";
                if (subInfo.status === "expired") {
                  rowStyle = "bg-red-500/5 border-l-4 border-red-500/80 hover:bg-red-500/10 transition-colors";
                } else if (!isUserActive) {
                  rowStyle = "bg-zinc-950/30 opacity-75 hover:bg-zinc-900/30 transition-colors";
                }

                return (
                  <tr key={user.id} className={rowStyle}>
                    <td className="p-4">
                      <div className="font-semibold text-white text-sm">{user.full_name || "New User"}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">{user.email}</div>
                    </td>

                    <td className="p-4 text-xs text-zinc-400">
                      {new Date(user.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    <td className="p-4">
                      {subInfo.status === "expired" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
                          <AlertTriangle className="h-3 w-3" />
                          Subscription Expired
                        </span>
                      ) : subInfo.status === "warning" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock className="h-3 w-3" />
                          {subInfo.days} Days left
                        </span>
                      ) : subInfo.status === "active" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="h-3 w-3" />
                          {subInfo.days} Days remaining
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-500">—</span>
                      )}
                    </td>

                    <td className="p-4">
                      {isUserActive ? (
                        <span className="text-xs font-bold text-emerald-500 bg-emerald-500/5 px-2 py-1 rounded-md border border-emerald-500/10">Active</span>
                      ) : (
                        <span className="text-xs font-bold text-red-500 bg-red-500/5 px-2 py-1 rounded-md border border-red-500/10">Inactive</span>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      {isUserActive ? (
                        <button
                          onClick={() => handleToggleApproval(user.id, true)}
                          disabled={updatingId === user.id}
                          className="px-3 py-1.5 text-xs font-bold text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/10 transition-all flex items-center gap-1 ml-auto disabled:opacity-50 cursor-pointer"
                        >
                          {updatingId === user.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserX className="h-3.5 w-3.5" />
                          )}
                          Suspend Account
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleApproval(user.id, false)}
                          disabled={updatingId === user.id}
                          className="px-3 py-1.5 text-xs font-bold text-emerald-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-all flex items-center gap-1 ml-auto disabled:opacity-50 cursor-pointer"
                        >
                          {updatingId === user.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-950" />
                          ) : (
                            <Check className="h-3.5 w-3.5 text-emerald-950" />
                          )}
                          Approve (30 Days)
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredUsers.length === 0 && (
            <div className="p-8 text-center text-sm text-zinc-500">
              No matching users found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}