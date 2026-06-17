'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getCurrentUserId, getUserNotifications, markNotificationRead } from '@/lib/db';
import type { Notification } from '@/types';

export default function NotificationToast() {
  const [toast, setToast] = useState<Notification | null>(null);
  const [show, setShow] = useState(false);
  const [shownIds, setShownIds] = useState<Set<string>>(new Set());

  const checkNotifications = useCallback(async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      const notifications = await getUserNotifications(userId);
      const unread = notifications.filter((n) => !n.is_read);

      // 找第一个未展示过的未读通知
      const newNotif = unread.find((n) => !shownIds.has(n.id));
      if (newNotif) {
        setToast(newNotif);
        setShow(true);
        setShownIds((prev) => new Set(prev).add(newNotif.id));

        // 5秒后自动关闭
        setTimeout(() => {
          setShow(false);
        }, 5000);
      }
    } catch (err) {
      // 忽略轮询错误
    }
  }, [shownIds]);

  useEffect(() => {
    // 首次加载时初始化 shownIds（避免一进来就弹所有旧通知）
    const init = async () => {
      try {
        const userId = getCurrentUserId();
        if (!userId) return;
        const notifications = await getUserNotifications(userId);
        // 标记所有已有通知为"已展示"，这样只会弹新通知
        setShownIds(new Set(notifications.map((n) => n.id)));
      } catch (_) {}
    };
    init();

    // 每30秒轮询一次
    const interval = setInterval(checkNotifications, 30000);
    return () => clearInterval(interval);
  }, [checkNotifications]);

  const handleClose = async () => {
    setShow(false);
    if (toast) {
      try {
        await markNotificationRead(toast.id);
      } catch (_) {}
    }
  };

  const handleClick = async () => {
    setShow(false);
    if (toast) {
      try {
        await markNotificationRead(toast.id);
      } catch (_) {}
    }
  };

  if (!toast) return null;

  const typeIcon: Record<string, string> = {
    new_application: '📥',
    application_accepted: '🎉',
    application_rejected: '😔',
    item_shipped: '📦',
    feedback_received: '💌',
    feedback_reminder: '⏰',
    trust_updated: '⭐',
  };

  const icon = typeIcon[toast.type] || '🔔';

  return (
    <div
      className={`fixed top-20 right-4 z-50 max-w-sm w-full transition-all duration-300 ${
        show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-neutral-100 p-4 cursor-pointer hover:shadow-xl transition-shadow"
        onClick={handleClick}
      >
        <Link
          href={toast.related_item_id ? `/items/${toast.related_item_id}` : '/notifications'}
          className="block"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-neutral-900 text-sm mb-1">
                {toast.title}
              </p>
              <p className="text-neutral-600 text-xs line-clamp-2">
                {toast.body}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClose();
              }}
              className="flex-shrink-0 text-neutral-400 hover:text-neutral-600 text-lg leading-none w-5 h-5 flex items-center justify-center"
            >
              ×
            </button>
          </div>
          <p className="text-xs text-primary mt-2 text-right">
            点击查看 →
          </p>
        </Link>
      </div>
    </div>
  );
}
