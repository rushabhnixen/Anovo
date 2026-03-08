"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  getAdminStats,
  getAdminUsers,
  updateAdminUser,
  deleteAdminUser,
  AdminStatsResponse,
  UserResponse,
} from "@/lib/api";

export default function AdminPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [s, u] = await Promise.all([
        getAdminStats(token),
        getAdminUsers(token, 0, 100, search),
      ]);
      setStats(s);
      setUsers(u);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, search]);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.is_admin) {
      router.push("/");
      return;
    }
    fetchData();
  }, [authLoading, user, fetchData, router]);

  const toggleField = async (userId: number, field: "is_premium" | "is_admin", current: boolean) => {
    if (!token) return;
    try {
      const updated = await updateAdminUser(token, userId, { [field]: !current });
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      if (stats) {
        const diff = current ? -1 : 1;
        if (field === "is_premium") setStats({ ...stats, premium_users: stats.premium_users + diff });
        if (field === "is_admin") setStats({ ...stats, admin_users: stats.admin_users + diff });
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleDelete = async (userId: number, username: string) => {
    if (!token) return;
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      await deleteAdminUser(token, userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      if (stats) setStats({ ...stats, total_users: stats.total_users - 1 });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (authLoading || (!user?.is_admin && !error)) {
    return (
      <div className="max-w-6xl mx-auto py-8 text-center text-gray-400">Loading…</div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {error && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Users", value: stats.total_users, color: "text-blue-600 dark:text-blue-400" },
            { label: "Premium Users", value: stats.premium_users, color: "text-amber-600 dark:text-amber-400" },
            { label: "Admin Users", value: stats.admin_users, color: "text-brand-600 dark:text-brand-400" },
            { label: "History Entries", value: stats.total_history_entries, color: "text-green-600 dark:text-green-400" },
          ].map((card) => (
            <div key={card.label} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{card.label}</div>
              <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search users by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-80 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Users table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Premium</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Admin</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading…</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No users found</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="bg-white dark:bg-gray-950 hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-4 py-3 text-gray-500">{u.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{u.username}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u.email}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleField(u.id, "is_premium", u.is_premium)}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                        u.is_premium
                          ? "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                      }`}
                    >
                      {u.is_premium ? "Yes" : "No"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleField(u.id, "is_admin", u.is_admin)}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                        u.is_admin
                          ? "bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                      }`}
                    >
                      {u.is_admin ? "Yes" : "No"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(u.id, u.username)}
                      className="px-2 py-1 rounded text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
