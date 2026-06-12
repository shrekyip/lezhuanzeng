"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getCurrentUserId,
  setCurrentUserId,
  getCurrentUser,
  getProfiles,
  getUnreadCount,
  DEMO_USERS,
} from "@/lib/db";
import type { Profile } from "@/types";

export default function Navbar() {
  const [user, setUser] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [unread, setUnread] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [currentUser, allProfiles] = await Promise.all([
        getCurrentUser(),
        getProfiles(),
      ]);
      setUser(currentUser);
      setProfiles(allProfiles);
      setUnread(await getUnreadCount(currentUser.id));
      setMounted(true);
    };
    load();
  }, []);

  if (!mounted || !user) {
    return (
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-neutral-100">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-primary">
            乐转赠
          </Link>
        </div>
      </header>
    );
  }

  const switchUser = async (id: string) => {
    setCurrentUserId(id);
    const newUser = await getCurrentUser();
    setUser(newUser);
    setUnread(await getUnreadCount(newUser.id));
    setShowSwitcher(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-neutral-100">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-primary">
          乐转赠
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/browse"
            className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            浏览物品
          </Link>
          <Link
            href="/items/new"
            className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            发布物品
          </Link>
          <Link
            href="/notifications"
            className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors relative"
          >
            通知
            {unread > 0 && (
              <span className="absolute -top-1 -right-3 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                {unread}
              </span>
            )}
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            我的物品
          </Link>
        </nav>

        {/* User Switcher (MVP) */}
        <div className="relative">
          <button
            onClick={() => setShowSwitcher(!showSwitcher)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-neutral-200 hover:border-neutral-300 transition-colors text-sm"
          >
            <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center">
              {user.nickname[0]}
            </div>
            <span className="text-neutral-700">{user.nickname}</span>
            <svg
              className="w-3 h-3 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showSwitcher && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-neutral-100 py-2">
              <div className="px-3 py-1.5 text-xs text-neutral-400">
                MVP 测试用户切换
              </div>
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => switchUser(p.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-50 transition-colors ${
                    user.id === p.id ? "text-primary font-medium" : "text-neutral-700"
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-neutral-100 text-neutral-500 text-xs flex items-center justify-center shrink-0">
                    {p.nickname[0]}
                  </div>
                  {p.nickname}
                  {user.id === p.id && " ✓"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Nav */}
      <div className="md:hidden flex border-t border-neutral-100">
        <Link
          href="/browse"
          className="flex-1 text-center py-2.5 text-xs text-neutral-500"
        >
          浏览
        </Link>
        <Link
          href="/items/new"
          className="flex-1 text-center py-2.5 text-xs text-neutral-500"
        >
          发布
        </Link>
        <Link
          href="/notifications"
          className="flex-1 text-center py-2.5 text-xs text-neutral-500 relative"
        >
          通知
          {unread > 0 && (
            <span className="absolute top-1 right-1/4 w-2 h-2 rounded-full bg-red-500" />
          )}
        </Link>
        <Link
          href="/dashboard"
          className="flex-1 text-center py-2.5 text-xs text-neutral-500"
        >
          我的
        </Link>
      </div>
    </header>
  );
}
