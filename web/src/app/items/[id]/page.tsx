"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getItem,
  getCurrentUser,
  getApplicationsForItem,
  createApplication,
} from "@/lib/db";
import type { Item, Application, Profile } from "@/types";

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Item | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [showApply, setShowApply] = useState(false);
  const [applyReason, setApplyReason] = useState("");
  const [applyAddress, setApplyAddress] = useState("");
  const [applyPhone, setApplyPhone] = useState("");
  const [applySubmitted, setApplySubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [found, user] = await Promise.all([
        getItem(id),
        getCurrentUser(),
      ]);
      setItem(found || null);
      setCurrentUser(user);
      if (found) {
        setApplications(await getApplicationsForItem(found.id));
      }
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-neutral-400">
        加载中...
      </div>
    );
  }

  if (!item || !currentUser) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-neutral-400">
        物品不存在或已下架
      </div>
    );
  }

  const isGiver = currentUser.id === item.giver_id;
  const hasApplied = applications.some(
    (a) => a.applicant_id === currentUser.id
  );
  const imgUrl = item.images?.[0]?.url;

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (applyReason.trim().length < 30) return;

    setSubmitting(true);
    try {
      await createApplication({
        item_id: item.id,
        applicant_id: currentUser.id,
        reason: applyReason,
        address: applyAddress,
        phone: applyPhone,
      });
      setApplySubmitted(true);
      setApplications(await getApplicationsForItem(item.id));
    } catch (err) {
      console.error('Apply error:', err);
      alert('申领失败，请稍后重试');
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back Link */}
      <Link
        href="/browse"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-600 mb-6 transition-colors"
      >
        ← 返回浏览
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* Left: Images */}
        <div className="md:col-span-3">
          <div className="aspect-[4/3] bg-neutral-100 rounded-xl overflow-hidden">
            {imgUrl ? (
              <img
                src={imgUrl}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl text-neutral-300">
                📦
              </div>
            )}
          </div>
        </div>

        {/* Right: Info */}
        <div className="md:col-span-2">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-xs bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">
              {item.category_name}
            </span>
            <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
              {item.condition}
            </span>
          </div>

          <h1 className="text-xl font-bold text-neutral-900 mb-2">
            {item.title}
          </h1>

          <div className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
            <div className="w-6 h-6 rounded-full bg-neutral-200 text-neutral-500 text-[10px] flex items-center justify-center font-medium">
              {item.giver?.nickname?.[0] || "?"}
            </div>
            <span>{item.giver?.nickname}</span>
            {item.city && (
              <>
                <span className="text-neutral-300">·</span>
                <span>📍 {item.city}</span>
              </>
            )}
          </div>

          <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-wrap mb-6">
            {item.description}
          </p>

          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-6">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-neutral-50 text-neutral-400 px-2 py-0.5 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Status / Action */}
          {item.status !== "active" ? (
            <div className="bg-neutral-50 rounded-xl p-4 text-center">
              <span className="text-sm text-neutral-500">
                此物品{item.status === "selected" ? "已被选受赠者" : "已完成转赠"}
              </span>
            </div>
          ) : isGiver ? (
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-sm text-amber-700 font-medium mb-2">
                这是你发布的物品
              </p>
              {applications.length > 0 && (
                <p className="text-sm text-amber-600">
                  {applications.filter((a) => a.status === "pending").length} 人正在申领
                </p>
              )}
            </div>
          ) : hasApplied || applySubmitted ? (
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-sm text-green-700 font-medium">
                ✅ 已提交申领
              </p>
              <p className="text-xs text-green-500 mt-1">
                等待赠主选择中
              </p>
            </div>
          ) : (
            <button
              onClick={() => setShowApply(true)}
              className="w-full rounded-full bg-primary text-white py-3 text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm"
            >
              申领此物品
            </button>
          )}

          {/* Apply Form */}
          {showApply && !hasApplied && !applySubmitted && (
            <form onSubmit={handleApply} className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">
                  申领理由
                </label>
                <textarea
                  placeholder="说说你为什么需要这个物品，打算怎么使用它？（至少30字）"
                  value={applyReason}
                  onChange={(e) => setApplyReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-primary transition-colors resize-none"
                  rows={4}
                />
                <p className="text-xs text-neutral-400 mt-1">
                  {applyReason.length}/30字
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">
                    收件地址
                  </label>
                  <input
                    type="text"
                    placeholder="省市区+详细地址"
                    value={applyAddress}
                    onChange={(e) => setApplyAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-primary transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">
                    手机号
                  </label>
                  <input
                    type="tel"
                    placeholder="收货联系电话"
                    value={applyPhone}
                    onChange={(e) => setApplyPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-primary transition-colors"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={applyReason.trim().length < 30 || !applyAddress || !applyPhone || submitting}
                className="w-full rounded-full bg-primary text-white py-2.5 text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "提交中..." : "提交申领"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Application list (giver only) */}
      {isGiver && applications.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-bold text-neutral-900 mb-4">
            申领者列表 ({applications.filter(a => a.status === 'pending').length})
          </h2>
          <div className="space-y-3">
            {applications
              .filter((a) => a.status === "pending")
              .map((app) => (
                <div
                  key={app.id}
                  className="bg-white rounded-xl border border-neutral-100 p-4"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-neutral-200 text-neutral-500 text-xs flex items-center justify-center font-medium">
                      {app.applicant?.nickname?.[0] || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {app.applicant?.nickname}
                      </p>
                      <p className="text-xs text-neutral-400">
                        信用分 {app.applicant?.trust_score} · 已完闭环{" "}
                        {app.applicant?.completed_cycles}次
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-600 leading-relaxed bg-neutral-50 rounded-lg p-3">
                    {app.reason}
                  </p>
                  <p className="text-xs text-neutral-400 mt-2">
                    地址：{app.address} · 电话：{app.phone}
                  </p>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
