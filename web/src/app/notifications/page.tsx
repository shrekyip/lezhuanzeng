"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getCurrentUser,
} from "@/lib/db";
import type { Notification, Profile } from "@/types";

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  new_application: { icon: "📋", color: "text-blue-600" },
  application_accepted: { icon: "🎉", color: "text-green-600" },
  application_rejected: { icon: "💭", color: "text-neutral-500" },
  item_shipped: { icon: "📦", color: "text-amber-600" },
  feedback_reminder: { icon: "⏰", color: "text-orange-600" },
  feedback_received: { icon: "💌", color: "text-pink-600" },
  trust_updated: { icon: "⭐", color: "text-yellow-600" },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    const data = await getUserNotifications(currentUser.id);
    setNotifications(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} 天前`;
    return date.toLocaleDateString("zh-CN");
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center py-20 text-neutral-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">通知</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-neutral-500 mt-1">
              {unreadCount} 条未读
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            全部已读
          </button>
        )}
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔔</div>
          <p className="text-lg text-neutral-500">暂无通知</p>
          <p className="text-sm text-neutral-400 mt-1">
            当有人申领你的物品或你的申领有更新时，你会在这里收到通知
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const config = TYPE_CONFIG[n.type] || {
              icon: "🔔",
              color: "text-neutral-600",
            };
            return (
              <div
                key={n.id}
                className={`p-4 rounded-xl border transition-colors cursor-pointer ${
                  n.is_read
                    ? "bg-white border-neutral-100"
                    : "bg-orange-50/50 border-orange-100"
                }`}
                onClick={() => {
                  if (!n.is_read) handleMarkRead(n.id);
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0 mt-0.5">
                    {config.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`text-sm font-medium ${
                          n.is_read ? "text-neutral-700" : "text-neutral-900"
                        }`}
                      >
                        {n.title}
                      </h3>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    {n.body && (
                      <p className="text-sm text-neutral-500 mt-1">{n.body}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-neutral-400">
                        {formatTime(n.created_at)}
                      </span>
                      {n.related_item_id && (
                        <Link
                          href={`/items/${n.related_item_id}`}
                          className="text-xs text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          查看物品 →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
