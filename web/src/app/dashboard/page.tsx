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
} from "@/lib/db";
import type { Item, Application, Profile } from "@/types";

export default function DashboardPage() {
  const [user, setUser] = useState<Profile | null>(null);
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [isAuth, setIsAuth] = useState(false);
  const [tab, setTab] = useState<"items" | "applications">("items");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const authUser = await getAuthUser();
      setIsAuth(!!authUser);

      const currentUser = await getCurrentUser();
      setUser(currentUser);

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

  if (loading || !user) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center text-neutral-400">
        加载中...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
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
                      </p>
                      {/* 提交反馈按钮（被选中且物品未完成时显示） */}
                      {app.status === "accepted" && app.item?.status !== 'completed' && (
                        <Link
                          href={`/feedback/new?item=${app.item_id}`}
                          className="mt-2 inline-flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600 font-medium"
                        >
                          ✍️ 提交感谢信 →
                        </Link>
                      )}
                      {/* 已提交反馈的提示 */}
                      {app.item?.status === 'completed' && (
                        <p className="mt-2 text-xs text-green-600 font-medium">
                          ✅ 已完成反馈
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
