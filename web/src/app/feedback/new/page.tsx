'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createFeedback, uploadFeedbackImage, getItemById, getCurrentUser } from '@/lib/db';
import Navbar from '@/components/navbar';

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 1024 * 1024; // 1MB

export default function NewFeedbackPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [itemId, setItemId] = useState<string>('');
  const [item, setItem] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 引导式表单状态
  const [answers, setAnswers] = useState({
    location: '',      // 物品现在放在哪里？
    firstUse: '',      // 第一次用它是什么时候？
    story: '',         // 有没有什么想对赠与者说的话？
    difference: '',     // 这件物品给你的生活带来了什么改变？
  });
  const [images, setImages] = useState<{ file: File; preview: string; compressed?: boolean }[]>([]);
  const [compressing, setCompressing] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('item');
    if (id) {
      setItemId(id);
      loadData(id);
    } else {
      setError('缺少物品参数');
      setLoading(false);
    }
  }, []);

  async function loadData(id: string) {
    try {
      const [data, user] = await Promise.all([getItemById(id), getCurrentUser()]);
      if (data) {
        setItem(data);
      } else {
        setError('物品不存在');
      }
      setCurrentUser(user);
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function compressImage(file: File): Promise<File> {
    if (file.size <= MAX_IMAGE_SIZE) return file;

    return new Promise((resolve) => {
      const img = new window.Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      img.onload = () => {
        let { width, height } = img;
        const MAX_DIMENSION = 1600;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = (height / width) * MAX_DIMENSION;
            width = MAX_DIMENSION;
          } else {
            width = (width / height) * MAX_DIMENSION;
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.8;
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) { resolve(file); return; }
              if (blob.size <= MAX_IMAGE_SIZE || quality <= 0.1) {
                resolve(new File([blob], file.name, { type: 'image/jpeg' }));
              } else {
                quality -= 0.1;
                tryCompress();
              }
            },
            'image/jpeg',
            quality
          );
        };
        tryCompress();
      };

      img.src = URL.createObjectURL(file);
    });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) return;

    setCompressing(true);
    const newImages: { file: File; preview: string; compressed?: boolean }[] = [];

    for (let i = 0; i < Math.min(files.length, remaining); i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const compressed = await compressImage(file);
      const preview = URL.createObjectURL(compressed);
      newImages.push({
        file: compressed,
        preview,
        compressed: compressed.size < file.size,
      });
    }

    setImages((prev) => [...prev, ...newImages]);
    setCompressing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeImage(index: number) {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleAnswerChange(field: string, value: string) {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  }

  function generateThankLetter(): string {
    const parts = [];
    if (answers.location) parts.push(`这件物品现在放在${answers.location}。`);
    if (answers.firstUse) parts.push(`${answers.firstUse}`);
    if (answers.difference) parts.push(`它${answers.difference}`);
    if (answers.story) parts.push(answers.story);
    return parts.join('\n\n');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!itemId) {
      setError('物品信息缺失');
      return;
    }

    const thankLetter = generateThankLetter();
    if (!thankLetter.trim()) {
      setError('请填写至少一项内容');
      return;
    }

    setSubmitting(true);
    try {
      // 用 demo 用户（无真实登录）
      if (!currentUser) {
        setError('用户信息加载中，请稍后重试');
        setSubmitting(false);
        return;
      }

      // 创建反馈
      const feedback = await createFeedback({
        itemId,
        applicantId: currentUser.id,
        giverId: item.giver_id,
        thankLetter,
      });

      // 上传图片
      for (let i = 0; i < images.length; i++) {
        await uploadFeedbackImage(feedback.id, images[i].file, i);
      }

      // 跳转至成功页
      router.push('/feedback/success');
    } catch (err: any) {
      setError(err.message || '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center text-neutral-400">
          加载中...
        </div>
      </div>
    );
  }

  if (error && !item) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="text-red-500 mb-4">{error}</div>
          <Link href="/dashboard" className="text-orange-500 hover:underline">
            返回我的申领
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">
            ✍️ 写感谢信
          </h1>
          <p className="text-neutral-500">
            你的反馈是赠与者继续分享的动力 💝
          </p>
        </div>

        {/* 物品信息 */}
        {item && (
          <div className="bg-white rounded-2xl p-4 mb-8 border border-neutral-100 flex items-center gap-4">
            <div className="w-16 h-16 bg-neutral-100 rounded-xl overflow-hidden flex-shrink-0">
              {item.images?.[0]?.url && (
                <img
                  src={item.images[0].url}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-neutral-900 truncate">{item.title}</div>
              <div className="text-sm text-neutral-500 mt-1">
                赠与者：{item.giver?.nickname || '匿名用户'}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 引导式问题 */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-100 space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                📍 这件物品现在放在哪里？
              </label>
              <p className="text-xs text-neutral-400 mb-2">
                比如：书桌上、床头柜、厨房架子上... 让赠与者想象它的新家
              </p>
              <input
                type="text"
                value={answers.location}
                onChange={(e) => handleAnswerChange('location', e.target.value)}
                placeholder="写下它的新位置..."
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                🎯 第一次用它是什么时候？感觉如何？
              </label>
              <p className="text-xs text-neutral-400 mb-2">
                第一次使用的瞬间往往最难忘
              </p>
              <textarea
                value={answers.firstUse}
                onChange={(e) => handleAnswerChange('firstUse', e.target.value)}
                placeholder="描述一下第一次使用的情景..."
                rows={3}
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 text-sm resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                ✨ 这件物品给你的生活带来了什么改变？
              </label>
              <p className="text-xs text-neutral-400 mb-2">
                哪怕是很小的改变也值得分享
              </p>
              <textarea
                value={answers.difference}
                onChange={(e) => handleAnswerChange('difference', e.target.value)}
                placeholder="比如：现在每天早上都能看到它，心情很好..."
                rows={3}
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 text-sm resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                💌 有什么想对赠与者说的？
              </label>
              <p className="text-xs text-neutral-400 mb-2">
                随意写，赠与者会很开心收到你的消息
              </p>
              <textarea
                value={answers.story}
                onChange={(e) => handleAnswerChange('story', e.target.value)}
                placeholder="写一句谢谢，或者分享一个小故事..."
                rows={4}
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 text-sm resize-none"
              />
            </div>
          </div>

          {/* 照片上传 */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-100">
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              📷 上传使用照片（选填，最多 5 张）
            </label>
            <p className="text-xs text-neutral-400 mb-4">
              照片会仅对赠与者可见。建议拍一下物品在新家的样子 🏠
            </p>

            {/* 上传区域 */}
            {images.length < MAX_IMAGES && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-200 rounded-xl p-8 text-center cursor-pointer hover:border-orange-300 hover:bg-orange-50/30 transition-all"
              >
                <div className="text-4xl mb-2">📷</div>
                <div className="text-sm text-neutral-500">
                  点击上传照片
                </div>
                <div className="text-xs text-neutral-400 mt-1">
                  自动压缩至 1MB 以内
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            )}

            {compressing && (
              <div className="text-center text-sm text-orange-500 py-4">
                图片压缩中...
              </div>
            )}

            {/* 图片预览 */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {images.map((img, i) => (
                  <div key={i} className="relative group">
                    <div className="aspect-square bg-neutral-100 rounded-xl overflow-hidden">
                      <img
                        src={img.preview}
                        alt={`照片 ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {i === 0 && (
                      <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                        封面
                      </div>
                    )}
                    {img.compressed && (
                      <div className="absolute bottom-2 left-2 bg-green-500/80 text-white text-xs px-1.5 py-0.5 rounded">
                        已压缩
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 预览 */}
          {(answers.location || answers.firstUse || answers.difference || answers.story) && (
            <div className="bg-orange-50 rounded-2xl p-6 border border-orange-100">
              <div className="text-sm font-medium text-orange-700 mb-3">
                👀 预览感谢信（赠与者看到的样子）
              </div>
              <div className="bg-white rounded-xl p-4 text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">
                {generateThankLetter()}
              </div>
            </div>
          )}

          {/* 提交按钮 */}
          <div className="flex gap-4">
            <Link
              href="/dashboard"
              className="flex-1 px-6 py-3 border border-neutral-200 text-neutral-600 rounded-xl text-center hover:bg-neutral-50 transition-colors"
            >
              暂存，稍后填写
            </Link>
            <button
              type="submit"
              disabled={submitting || (!answers.location && !answers.firstUse && !answers.difference && !answers.story)}
              className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {submitting ? '提交中...' : '✈️ 发送感谢信'}
            </button>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}
        </form>
      </div>
    </div>
  );
}
