"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ItemCard from "@/components/item-card";
import {
  getCurrentUser,
  getItemsByGiver,
  getApplicationsByUser,
  getAuthUser,
  signOut,
  isUserBlocked,
  checkFeedbackDeadline,
  updateApplicationReason,
  withdrawApplication,
} from "@/lib/db";
import type { Item, Application, Profile } from "@/types";

export default function DashboardPage() {
  const [user, setUser] = useState<Profile | null>(null);
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [isAuth, setIsAuth] = useState(false);
  const [tab, setTab] = useState<"items" | "applications">("items");
  const [loading, setLoading] = useState(true);
  const [blockInfo, setBlockInfo] = useState<{ blocked: boolean; until: string | null; reason: string } | null>(null);
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [editReason, setEditReason] = useState("");
  const [appActionLoading, setAppActionLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const authUser = await getAuthUser();
      setIsAuth(!!authUser);

      const currentUser = await getCurrentUser();
      setUser(currentUser);

      // 信用体系：懒检查反馈超时（可能触发拉黑），再获取最新拉黑状态
      try {
        await checkFeedbackDeadline(currentUser.id);
      } catch (_) {}
      setBlockInfo(await isUserBlocked(currentUser.id));

      const [items, apps] = await Promise.all([
        getItemsByGiver(currentUser.id),
        getApplicationsByUser(currentUser.id),
      ]);

      setMyItems(items);
      setMyApplications(apps);
      setLoading(false);
    };
    load();
  }, []);

  const handleSaveReason = async (appId: string) => {
    setAppActionLoading(true);
    try {
      await updateApplicationReason(appId, editReason);
      setMyApplications((prev) =>
        prev.map((a) =>
          a.id === appId ? { ...a, reason: editReason.trim(), edit_count: (a.edit_count || 0) + 1 } : a
        )
      );
      setEditingAppId(null);
      setEditReason("");
    } catch (err: any) {
      alert(err?.message || "修改失败");
    }
    setAppActionLoading(false);
  };

  const handleWithdraw = async (appId: string, itemId: string) => {
    if (!confirm("确认撤回这个申领吗？撤回后赠主将看不到你的申领。")) return;
    setAppActionLoading(true);
    try {
      await withdrawApplication(appId, itemId);
      setMyApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: "withdrawn" as const } : a))
      );
    } catch (err: any) {
      alert(err?.message || "撤回失败");
    }
    setAppActionLoading(false);
  };

  if (loading || !user) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center text-neutral-400">
        加载中...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Blocked Banner */}
      {blockInfo?.blocked && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-700 font-medium">
            🚫 账号当前被限制申领
            {blockInfo.until
              ? `（至 ${new Date(blockInfo.until).toLocaleDateString("zh-CN")}）`
              : "（永久限制）"}
          </p>
          {blockInfo.reason && (
            <p className="text-xs text-red-500 mt-1">原因：{blockInfo.reason}</p>
          )}
          <p className="text-xs text-red-400 mt-1">期间可浏览物品，但不能申领或许愿。</p>
        </div>
      )}

      {/* User Info */}
      <div className="flex items-center gap-4 mb-8 pb-6 border-b border-neutral-100">
        <div className="w-14 h-14 rounded-full bg-primary text-white text-2xl flex items-center justify-center font-bold">
          {user.nickname[0]}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-neutral-900">
            {user.nickname}
          </h1>
          <div className="flex items-center gap-3 text-sm text-neutral-500 mt-1">
            <span>信用分 {user.trust_score}</span>
            <span>·</span>
            <span>完成闭环 {user.completed_cycles} 次</span>
            <span>·</span>
            <span>已转赠 {user.total_given} 件</span>
            <span>·</span>
            <span>小红花 🌸{user.red_flowers}</span>
            {isAuth && (
              <>
                <span>·</span>
                <span className="text-green-600">✓ 已认证</span>
              </>
            )}
          </div>
        </div>
        <Link
          href="/settings"
          className="px-4 py-2 rounded-xl border border-neutral-200 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors flex-shrink-0"
        >
          编辑资料
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-neutral-100 mb-6">
        <button
          onClick={() => setTab("items")}
          className={`pb-3 text-sm font-medium transition-colors ${
            tab === "items"
              ? "text-primary border-b-2 border-primary"
              : "text-neutral-400 hover:text-neutral-600"
          }`}
        >
          我的物品 ({myItems.length})
        </button>
        <button
          onClick={() => setTab("applications")}
          className={`pb-3 text-sm font-medium transition-colors ${
            tab === "applications"
              ? "text-primary border-b-2 border-primary"
              : "text-neutral-400 hover:text-neutral-600"
          }`}
        >
          我的申领 ({myApplications.length})
        </button>
      </div>

      {/* My Items */}
      {tab === "items" && (
        <>
          {myItems.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📤</div>
              <p className="text-lg text-neutral-500">还没有发布过物品</p>
              <Link
                href="/items/new"
                className="inline-block mt-4 rounded-full bg-primary text-white px-6 py-2 text-sm font-medium hover:bg-primary-dark transition-colors"
              >
                发布第一件物品
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myItems.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </>
      )}

      {/* My Applications */}
      {tab === "applications" && (
        <>
          {myApplications.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-lg text-neutral-500">还没有申领过物品</p>
              <Link
                href="/browse"
                className="inline-block mt-4 rounded-full border border-neutral-300 text-neutral-600 px-6 py-2 text-sm font-medium hover:bg-neutral-50 transition-colors"
              >
                去浏览物品
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myApplications.map((app) => (
                <div
                  key={app.id}
                  className="bg-white rounded-xl border border-neutral-100 p-4"
                >
                  <div className="flex items-start gap-3">
                    {/* 物品小图 */}
                    <div className="w-14 h-14 rounded-lg bg-neutral-100 overflow-hidden flex-shrink-0">
                      {app.item?.images?.[0]?.url ? (
                        <img src={(app.item as any).images[0].url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Link
                          href={`/items/${app.item_id}`}
                          className="text-sm font-medium text-neutral-900 hover:text-primary transition-colors truncate"
                        >
                          {app.item?.title || '查看物品 →'}
                        </Link>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                            app.status === "pending"
                              ? "bg-amber-50 text-amber-600"
                              : app.status === "accepted"
                              ? "bg-green-50 text-green-600"
                              : app.status === "rejected"
                              ? "bg-neutral-100 text-neutral-500"
                              : "bg-red-50 text-red-500"
                          }`}
                        >
                          {app.status === "pending"
                            ? "等待中"
                            : app.status === "accepted"
                            ? "🎉 已选中"
                            : app.status === "rejected"
                            ? "未选中"
                            : app.status === "withdrawn"
                            ? "已撤回"
                            : "已取消"}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 line-clamp-2 mb-1">
                        {app.reason}
                      </p>
                      <p className="text-xs text-neutral-400">
                        提交于 {new Date(app.created_at).toLocaleDateString("zh-CN")}
                        {app.status === "pending" && ` · 可修改次数剩余 ${3 - (app.edit_count || 0)} 次`}
                      </p>
                      {/* 修改理由（pending 且未用完次数）*/}
                      {app.status === "pending" && editingAppId === app.id ? (
                        <div className="mt-2 space-y-2">
                          <textarea
                            value={editReason}
                            onChange={(e) => setEditReason(e.target.value)}
                            rows={3}
                            maxLength={500}
                            className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-xs focus:outline-none focus:border-orange-400 resize-none"
                            placeholder="修改申领理由（至少 30 字）"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveReason(app.id)}
                              disabled={appActionLoading || editReason.trim().length < 30}
                              className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs disabled:opacity-50"
                            >
                              保存
                            </button>
                            <button
                              onClick={() => {
                                setEditingAppId(null);
                                setEditReason("");
                              }}
                              className="px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-600"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* 撤回 + 修改按钮（仅 pending）*/}
                          {app.status === "pending" && (
                            <div className="flex gap-3 mt-2">
                              {(app.edit_count || 0) < 3 && (
                                <button
                                  onClick={() => {
                                    setEditingAppId(app.id);
                                    setEditReason(app.reason);
                                  }}
                                  className="text-xs text-neutral-500 hover:text-orange-500 transition-colors"
                                >
                                  ✏️ 修改理由
                                </button>
                              )}
                              <button
                                onClick={() => handleWithdraw(app.id, app.item_id)}
                                disabled={appActionLoading}
                                className="text-xs text-neutral-400 hover:text-red-500 transition-colors disabled:opacity-50"
                              >
                                撤回申领
                              </button>
                            </div>
                          )}
                        </>
                      )}
                      {/* 提交反馈按钮（被选中且物品未完成时显示） */}
                      {app.status === "accepted" && app.item?.status !== 'completed' && (
                        <Link
                          href={`/feedback/new?itemId=${app.item_id}`}
                          className="mt-2 inline-flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600 font-medium"
                        >
                          ✍️ 提交感谢信 →
                        </Link>
                      )}
                      {/* 已提交反馈的提示 */}
                      {app.item?.status === 'completed' && (
                        <p className="mt-2 text-xs text-green-600 font-medium">
                          ✅ 已完成闭环
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
