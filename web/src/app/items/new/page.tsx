"use client";

import { useEffect, useState } from "react";
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
      });
      router.push(`/items/${newItem.id}`);
    } catch (err) {
      console.error('Create item error:', err);
      setError("发布失败，请稍后重试");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-neutral-900 mb-8">发布物品</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
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
