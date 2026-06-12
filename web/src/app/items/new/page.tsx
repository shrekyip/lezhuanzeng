"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  getCategories,
  getCurrentUser,
  createItem,
} from "@/lib/db";
import type { Category, Profile } from "@/types";

export default function NewItemPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number>(0);
  const [condition, setCondition] = useState("良好");
  const [city, setCity] = useState("");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image state
  const [images, setImages] = useState<{ file: File; preview: string; originalSize?: number }[]>([]);
  const MAX_IMAGES = 5;

  useEffect(() => {
    const load = async () => {
      const [cats, user] = await Promise.all([
        getCategories(),
        getCurrentUser(),
      ]);
      setCategories(cats);
      setCurrentUser(user);
      setCategoryId(cats[0]?.id || 1);
      setLoading(false);
    };
    load();
  }, []);

  if (loading || !currentUser) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center text-neutral-400">
        加载中...
      </div>
    );
  }

  // ===== 客户端图片压缩（目标 < 1MB）=====
  const MAX_IMAGE_SIZE = 1024 * 1024; // 1MB
  const MAX_DIMENSION = 1600; // 最大边长 px
  const TARGET_QUALITY = 0.8; // 初始 JPEG 质量

  async function compressImage(file: File): Promise<File> {
    // Already small enough
    if (file.size <= MAX_IMAGE_SIZE) return file;

    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          // Calculate target dimensions
          let { width, height } = img;
          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context failed'));
            return;
          }

          // Use high-quality downscaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Try progressive quality reduction until < 1MB
          let quality = TARGET_QUALITY;
          const tryCompress = (q: number): File => {
            const dataUrl = canvas.toDataURL('image/jpeg', q);
            const byteLength = Math.ceil((dataUrl.length - 'data:image/jpeg;base64,'.length) * 3 / 4);
            if (byteLength <= MAX_IMAGE_SIZE || q <= 0.1) {
              const binaryStr = atob(dataUrl.split(',')[1]);
              const bytes = new Uint8Array(binaryStr.length);
              for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
              }
              const compressed = new File([bytes], file.name.replace(/\.[^.]+$/, '.jpg'), {
                type: 'image/jpeg',
              });
              return compressed;
            }
            return tryCompress(q - 0.1);
          };

          const result = tryCompress(quality);
          resolve(result);
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remaining = MAX_IMAGES - images.length;
    const toProcess = Array.from(files).slice(0, remaining);

    setCompressing(true);
    setError("");

    try {
      const compressedFiles = await Promise.all(
        toProcess.map((file) => compressImage(file))
      );
      const newImages = compressedFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        originalSize: file.size,
      }));
      setImages((prev) => [...prev, ...newImages]);
    } catch (err) {
      console.error('Image compression error:', err);
      setError('图片处理失败，请重试');
    } finally {
      setCompressing(false);
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("请输入物品名称");
      return;
    }
    if (!description.trim() || description.trim().length < 20) {
      setError("物品描述至少20字");
      return;
    }
    if (!city.trim()) {
      setError("请输入所在城市");
      return;
    }
    if (images.length === 0) {
      setError("请至少上传一张物品照片");
      return;
    }

    setSubmitting(true);
    try {
      const newItem = await createItem({
        giver_id: currentUser.id,
        category_id: categoryId,
        title: title.trim(),
        description: description.trim(),
        condition,
        tags: tags
          .split(/[,，、\s]+/)
          .filter((t) => t.trim())
          .map((t) => t.trim()),
        city: city.trim(),
        status: "active",
        applicant_count: 0,
        imageFiles: images.map((img) => img.file),
      });
      // Clean up previews
      images.forEach((img) => URL.revokeObjectURL(img.preview));
      router.push(`/items/${newItem.id}`);
    } catch (err) {
      console.error("Create item error:", err);
      setError("发布失败，请稍后重试");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-neutral-900 mb-8">发布物品</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Image Upload */}
        <div>
          <label className="text-sm font-medium text-neutral-700 mb-1.5 block">
            物品照片
            <span className="text-neutral-400 font-normal">
              （最多{MAX_IMAGES}张，自动压缩至1MB以内）
            </span>
          </label>

          {/* Preview Grid */}
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-3">
              {images.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-neutral-100">
                  <img
                    src={img.preview}
                    alt={`预览${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center text-xs hover:bg-black/70 transition-colors"
                  >
                    ✕
                  </button>
                  {img.originalSize !== undefined && (
                    <span className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
                      {(img.originalSize / 1024).toFixed(0)}KB
                    </span>
                  )}
                  {idx === 0 && (
                    <span className="absolute bottom-1 left-1 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded">
                      封面
                    </span>
                  )}
                </div>
              ))}

              {/* Add more button */}
              {images.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center text-neutral-400 hover:border-primary hover:text-primary transition-colors"
                >
                  <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span className="text-xs">添加</span>
                </button>
              )}
            </div>
          )}

          {/* Upload area (shown when no images) */}
          {images.length === 0 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-[16/9] rounded-xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center text-neutral-400 hover:border-primary hover:text-primary transition-colors bg-neutral-50"
            >
              <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21zM8.25 8.625a1.125 1.125 0 100-2.25 1.125 1.125 0 000 2.25z" />
              </svg>
              <span className="text-sm font-medium">点击上传物品照片</span>
              <span className="text-xs mt-1">第一张将作为封面图 · 自动压缩</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>

        {/* Category */}
        <div>
          <label className="text-sm font-medium text-neutral-700 mb-1.5 block">
            分类
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors ${
                  categoryId === cat.id
                    ? "bg-primary text-white"
                    : "bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-300"
                }`}
              >
                <span>{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-sm font-medium text-neutral-700 mb-1.5 block">
            物品名称
          </label>
          <input
            type="text"
            placeholder="如：闲置冬季外套"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-primary transition-colors"
            maxLength={50}
          />
          <p className="text-xs text-neutral-400 mt-1">{title.length}/50</p>
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-neutral-700 mb-1.5 block">
            物品描述
          </label>
          <textarea
            placeholder="描述一下物品的品相、使用情况、为什么送出去..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-primary transition-colors resize-none"
            rows={5}
          />
          <p className="text-xs text-neutral-400 mt-1">
            {description.length}字（至少20字）
          </p>
        </div>

        {/* Condition + City */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-neutral-700 mb-1.5 block">
              新旧程度
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-primary transition-colors bg-white"
            >
              <option value="全新">全新</option>
              <option value="良好">良好</option>
              <option value="有使用痕迹">有使用痕迹</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 mb-1.5 block">
              所在城市
            </label>
            <input
              type="text"
              placeholder="如：深圳"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="text-sm font-medium text-neutral-700 mb-1.5 block">
            标签
            <span className="text-neutral-400 font-normal">（用空格或逗号分隔）</span>
          </label>
          <input
            type="text"
            placeholder="如：冬季 外套 M码"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Error */}
        {compressing && (
          <p className="text-sm text-primary bg-orange-50 rounded-lg px-3 py-2">
            图片压缩中，请稍候...
          </p>
        )}
        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-primary text-white py-3 text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 shadow-sm"
        >
          {submitting ? "发布中..." : "发布物品"}
        </button>
      </form>
    </div>
  );
}
