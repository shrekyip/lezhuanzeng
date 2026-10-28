'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ItemCard from '@/components/item-card';
import { getProfile, getItemsByGiver, getPublicFeedbackForGiver } from '@/lib/db';
import type { Profile, Item, Feedback } from '@/types';

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const p = await getProfile(id);
      setProfile(p || null);
      if (p) {
        const [items, feedbacks] = await Promise.all([
          getItemsByGiver(p.id),
          getPublicFeedbackForGiver(p.id),
        ]);
        // 只展示正在赠送中的物品
        setItems(items.filter((i) => i.status === 'active'));
        setFeedbacks(feedbacks);
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

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-neutral-400">
        用户不存在
      </div>
    );
  }

  // 信用等级文案
  const trustLevel =
    profile.trust_score >= 130
      ? { label: '社区之星', color: 'text-amber-600 bg-amber-50' }
      : profile.trust_score >= 100
        ? { label: '信用良好', color: 'text-green-600 bg-green-50' }
        : profile.trust_score >= 60
          ? { label: '信用一般', color: 'text-neutral-500 bg-neutral-100' }
          : { label: '信用偏低', color: 'text-red-500 bg-red-50' };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* 用户信息卡 */}
      <div className="bg-white rounded-2xl border border-neutral-100 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-primary text-white text-2xl flex items-center justify-center font-bold overflow-hidden flex-shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              profile.nickname[0] || '?'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-neutral-900">{profile.nickname}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full ${trustLevel.color}`}>
                {trustLevel.label}
              </span>
            </div>
            {profile.city && (
              <p className="text-sm text-neutral-500 mt-0.5">📍 {profile.city}</p>
            )}
            {profile.bio && (
              <p className="text-sm text-neutral-600 mt-2 leading-relaxed">{profile.bio}</p>
            )}
          </div>
        </div>

        {/* 数据统计 */}
        <div className="grid grid-cols-4 gap-2 mt-6 pt-6 border-t border-neutral-100">
          <div className="text-center">
            <p className="text-xl font-bold text-neutral-900">{profile.trust_score}</p>
            <p className="text-xs text-neutral-400 mt-0.5">信用分</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-neutral-900">{profile.completed_cycles}</p>
            <p className="text-xs text-neutral-400 mt-0.5">完成闭环</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-neutral-900">{profile.total_given}</p>
            <p className="text-xs text-neutral-400 mt-0.5">转赠物品</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-amber-500">🌸{profile.red_flowers}</p>
            <p className="text-xs text-neutral-400 mt-0.5">小红花</p>
          </div>
        </div>
      </div>

      {/* 正在赠送的物品 */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-neutral-900 mb-4">正在赠送 ({items.length})</h2>
        {items.length === 0 ? (
          <p className="text-sm text-neutral-400 py-6 text-center">暂无在赠物品</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* 收到的公开感谢信 */}
      <section>
        <h2 className="text-lg font-bold text-neutral-900 mb-4">收到的感谢 ({feedbacks.length})</h2>
        {feedbacks.length === 0 ? (
          <p className="text-sm text-neutral-400 py-6 text-center">暂无公开的感谢信</p>
        ) : (
          <div className="space-y-3">
            {feedbacks.map((fb) => (
              <div
                key={fb.id}
                className="bg-orange-50/50 rounded-2xl p-5 border border-orange-100"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 text-xs flex items-center justify-center font-medium">
                    {fb.applicant?.nickname?.[0] || '?'}
                  </div>
                  <p className="text-sm font-medium text-neutral-900">
                    {fb.applicant?.nickname}
                  </p>
                  <span className="text-xs text-neutral-400">
                    关于「{(fb.item as any)?.title || '一件物品'}」
                  </span>
                </div>
                <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap line-clamp-4">
                  {fb.thank_letter}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 返回 */}
      <div className="mt-8 text-center">
        <Link href="/browse" className="text-sm text-neutral-400 hover:text-neutral-600">
          ← 返回浏览
        </Link>
      </div>
    </div>
  );
}
