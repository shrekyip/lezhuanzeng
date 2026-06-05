"use client";

import { Suspense, useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import ItemCard from "@/components/item-card";
import { getItems, getCategories } from "@/lib/db";
import type { Item, Category } from "@/types";

function BrowseContent() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [keyword, setKeyword] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const cats = await getCategories();
      setCategories(cats);
      const allItems = await getItems();
      setItems(allItems);
      setMounted(true);
    };
    loadData();
  }, []);

  // Read URL params
  useEffect(() => {
    const catParam = searchParams.get("category");
    if (catParam) {
      setSelectedCat(Number(catParam));
    }
  }, [searchParams]);

  // Filter items (client-side from loaded data)
  const filtered = useMemo(() => {
    let result = [...items];

    if (selectedCat) {
      result = result.filter((i) => i.category_id === selectedCat);
    }
    if (keyword) {
      const kw = keyword.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(kw) ||
          i.description.toLowerCase().includes(kw) ||
          i.tags.some((t) => t.toLowerCase().includes(kw))
      );
    }

    return result;
  }, [items, selectedCat, keyword]);

  const handleRefresh = useCallback(async () => {
    const allItems = await getItems();
    setItems(allItems);
  }, []);

  if (!mounted) {
    return (
      <div className="text-center py-20 text-neutral-400">加载中...</div>
    );
  }

  return (
    <>
      {/* Search */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="搜索物品..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <button
          onClick={handleRefresh}
          className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          刷新
        </button>
        <span className="text-sm text-neutral-400">
          共 {filtered.length} 件物品
        </span>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setSelectedCat(null)}
          className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
            selectedCat === null
              ? "bg-primary text-white"
              : "bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-300"
          }`}
        >
          全部
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() =>
              setSelectedCat(selectedCat === cat.id ? null : cat.id)
            }
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-colors ${
              selectedCat === cat.id
                ? "bg-primary text-white"
                : "bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-300"
            }`}
          >
            <span>{cat.icon}</span>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-lg text-neutral-500">没有找到匹配的物品</p>
          <p className="text-sm text-neutral-400 mt-1">
            {keyword
              ? "试试其他关键词"
              : selectedCat
              ? "该分类暂无物品"
              : "还没有人发布物品"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </>
  );
}

export default function BrowsePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Suspense fallback={<div className="text-center py-20 text-neutral-400">加载中...</div>}>
        <BrowseContent />
      </Suspense>
    </div>
  );
}
