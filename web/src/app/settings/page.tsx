'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, uploadItemImage } from '@/lib/db';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';

export default function SettingsPage() {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<Profile | null>(null);
  const [nickname, setNickname] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) return;
      setUser(u);
      setNickname(u.nickname || '');
      setCity(u.city || '');
      setBio(u.bio || '');
      setAvatarUrl(u.avatar_url || '');
    });
  }, []);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('头像不能超过 2MB');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const url = await uploadItemImage(file);
      setAvatarUrl(url);
    } catch (err: any) {
      setError(err?.message || '头像上传失败');
    }
    setUploading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!user) return;
    if (!nickname.trim()) {
      setError('昵称不能为空');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          nickname: nickname.trim(),
          city: city.trim(),
          bio: bio.trim(),
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateErr) throw updateErr;

      setMessage('资料已保存 ✓');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (err: any) {
      setError(err?.message || '保存失败，请重试');
    }
    setSaving(false);
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center text-neutral-400">
        加载中...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">编辑资料</h1>
      <p className="text-neutral-500 text-sm mb-8">
        昵称和介绍会展示在你的个人主页和申领列表中
      </p>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 头像 */}
        <div className="bg-white rounded-2xl p-6 border border-neutral-100">
          <label className="block text-sm font-medium text-neutral-700 mb-3">头像</label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-neutral-100 overflow-hidden flex-shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="头像" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl text-neutral-400 font-bold">
                  {nickname[0] || '?'}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 rounded-xl border border-neutral-200 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors disabled:opacity-60"
            >
              {uploading ? '上传中...' : '更换头像'}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* 基本信息 */}
        <div className="bg-white rounded-2xl p-6 border border-neutral-100 space-y-5">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              昵称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="怎么称呼你？"
              maxLength={20}
              className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">所在城市</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="如：深圳"
              maxLength={20}
              className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">个人介绍</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="一句话介绍自己，比如：喜欢极简生活，相信物品有它的旅程..."
              rows={3}
              maxLength={100}
              className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 text-sm resize-none"
            />
            <p className="text-xs text-neutral-400 mt-1">{bio.length}/100</p>
          </div>
        </div>

        {/* 保存 */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="flex-1 px-6 py-3 border border-neutral-200 text-neutral-600 rounded-xl hover:bg-neutral-50 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 font-medium"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>

        {message && (
          <div className="text-green-600 text-sm text-center">{message}</div>
        )}
        {error && (
          <div className="text-red-500 text-sm text-center">{error}</div>
        )}
      </form>
    </div>
  );
}
