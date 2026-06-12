"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getItem,
  getCurrentUser,
  getApplicationsForItem,
  createApplication,
  getFeedbackForItem,
  rateFeedback,
  selectApplicant,
} from "@/lib/db";
import type { Item, Application, Profile } from "@/types";

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Item | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [showApply, setShowApply] = useState(false);
  const [applyReason, setApplyReason] = useState("");
  const [applyAddress, setApplyAddress] = useState("");
  const [applyPhone, setApplyPhone] = useState("");
  const [applySubmitted, setApplySubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null); // applicationId being selected

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
        // 如果物品已完成，加载反馈
        if (found.status === 'completed') {
          setFeedback(await getFeedbackForItem(found.id));
        }
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

  const handleSelectApplicant = async (applicationId: string) => {
    if (!item || selecting) return;
    if (!confirm('确认选择这位申领者？其他申领者将会被婉拒。')) return;
    setSelecting(applicationId);
    try {
      await selectApplicant(applicationId, item.id);
      // Update local state
      setItem((prev) => prev ? { ...prev, status: 'selected' } : prev);
      setApplications((prev) =>
        prev.map((a) =>
          a.id === applicationId
            ? { ...a, status: 'accepted' }
            : { ...a, status: a.status === 'pending' ? 'rejected' : a.status }
        )
      );
    } catch (err) {
      console.error('Select error:', err);
      alert('操作失败，请重试');
    }
    setSelecting(null);
  };

  const handleApply = async (e: React.FormEvent) => {    e.preventDefault();
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
            申领者列表 ({applications.filter(a => a.status === 'pending').length} 人等待中)
          </h2>
          {item.status === 'selected' && (
            <div className="mb-4 bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-green-700">
              ✅ 已选定申领者，等待对方收货并提交反馈
            </div>
          )}
          <div className="space-y-3">
            {applications.map((app) => (
              <div
                key={app.id}
                className={`bg-white rounded-xl border p-4 transition-all ${
                  app.status === 'accepted'
                    ? 'border-green-300 bg-green-50/50'
                    : app.status === 'rejected'
                    ? 'border-neutral-100 opacity-50'
                    : 'border-neutral-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-200 text-neutral-500 text-xs flex items-center justify-center font-medium flex-shrink-0">
                    {app.applicant?.nickname?.[0] || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-neutral-900">
                        {app.applicant?.nickname}
                      </p>
                      {app.status === 'accepted' && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ 已选中</span>
                      )}
                      {app.status === 'rejected' && (
                        <span className="text-xs bg-neutral-100 text-neutral-400 px-2 py-0.5 rounded-full">已婉拒</span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 mb-2">
                      信用分 {app.applicant?.trust_score ?? 0} · 已完闭环 {app.applicant?.completed_cycles ?? 0} 次
                    </p>
                    <p className="text-sm text-neutral-600 leading-relaxed bg-neutral-50 rounded-lg p-3">
                      {app.reason}
                    </p>
                    <p className="text-xs text-neutral-400 mt-2">
                      收件：{app.address} · {app.phone}
                    </p>
                  </div>
                </div>

                {/* 选择按钮（仅物品 active 且此申领 pending 时显示） */}
                {item.status === 'active' && app.status === 'pending' && (
                  <button
                    onClick={() => handleSelectApplicant(app.id)}
                    disabled={selecting !== null}
                    className="mt-3 w-full py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {selecting === app.id ? '处理中...' : '选择 TA 作为受赠者'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Feedback display (giver only, after completed) */}
      {isGiver && feedback.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-bold text-neutral-900 mb-6">
            💝 收到的感谢信
          </h2>
          {feedback.map((fb) => (
            <div key={fb.id} className="bg-orange-50/50 rounded-2xl p-6 border border-orange-100">
              {/* 感谢信内容 */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 text-sm flex items-center justify-center font-medium flex-shrink-0">
                  {fb.applicant?.nickname?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900">
                    {fb.applicant?.nickname}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {new Date(fb.submitted_at || fb.created_at).toLocaleDateString('zh-CN')}
                  </p>
                </div>
                {/* 反馈质量标记 */}
                {fb.quality === 'good' && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    ✅ 优质反馈
                  </span>
                )}
                {fb.quality === 'poor' && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                    ⚠️ 反馈敷衍
                  </span>
                )}
              </div>

              <div className="bg-white rounded-xl p-4 text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap mb-4">
                {fb.thank_letter}
              </div>

              {/* 反馈图片 */}
              {fb.images && fb.images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {fb.images.map((img: any, i: number) => (
                    <div key={img.id} className="aspect-square rounded-lg overflow-hidden bg-neutral-100">
                      <img src={img.url} alt={`反馈照片 ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {/* 评价按钮（仅 pending 状态可评价） */}
              {fb.quality === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      await rateFeedback(fb.id, 'good', item.giver_id, fb.applicant_id, item.id);
                      setFeedback(prev => prev.map(f => f.id === fb.id ? { ...f, quality: 'good' } : f));
                    }}
                    className="flex-1 py-2 bg-green-50 text-green-700 rounded-lg text-sm hover:bg-green-100 transition-colors"
                  >
                    🌸 送小红花（优质反馈）
                  </button>
                  <button
                    onClick={async () => {
                      await rateFeedback(fb.id, 'poor', item.giver_id, fb.applicant_id, item.id);
                      setFeedback(prev => prev.map(f => f.id === fb.id ? { ...f, quality: 'poor' } : f));
                    }}
                    className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 transition-colors"
                  >
                    反馈敷衍
                  </button>
                </div>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
