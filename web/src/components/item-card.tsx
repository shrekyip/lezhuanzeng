"use client";

import Link from "next/link";
import type { Item } from "@/types";

export default function ItemCard({ item }: { item: Item }) {
  const imgUrl = item.images?.[0]?.thumbnail_url || item.images?.[0]?.url;
  const timeAgo = getTimeAgo(item.created_at);

  return (
    <Link
      href={`/items/${item.id}`}
      className="group block bg-white rounded-xl border border-neutral-100 overflow-hidden hover:shadow-md hover:border-neutral-200 transition-all duration-200"
    >
      {/* Image */}
      <div className="aspect-[3/2] bg-neutral-100 relative overflow-hidden">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-neutral-300">
            📦
          </div>
        )}
        <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-xs text-neutral-600 px-2 py-0.5 rounded-full">
          {item.category_name}
        </span>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-medium text-neutral-900 text-sm line-clamp-1 group-hover:text-primary transition-colors">
          {item.title}
        </h3>
        <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
          {item.description}
        </p>

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-50">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-neutral-200 text-neutral-500 text-[9px] flex items-center justify-center font-medium">
              {item.giver?.nickname?.[0] || "?"}
            </div>
            <span className="text-xs text-neutral-500">
              {item.giver?.nickname}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-neutral-400">
            <span>{timeAgo}</span>
            {item.city && <span>📍{item.city}</span>}
          </div>
        </div>

        {/* Status badges */}
        {item.status !== "active" && (
          <div className="mt-2">
            <span
              className={`inline-block text-xs px-2 py-0.5 rounded-full ${
                item.status === "selected"
                  ? "bg-amber-50 text-amber-600"
                  : item.status === "shipped"
                  ? "bg-blue-50 text-blue-600"
                  : item.status === "completed"
                  ? "bg-green-50 text-green-600"
                  : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {statusLabel(item.status)}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = diff / 3600000;
  if (hours < 1) return "刚刚";
  if (hours < 24) return `${Math.floor(hours)}小时前`;
  const days = hours / 24;
  if (days < 30) return `${Math.floor(days)}天前`;
  return `${Math.floor(days / 30)}个月前`;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    selected: "已选受赠者",
    shipped: "已寄出",
    completed: "已完成",
    archived: "已归档",
    expired: "已过期",
  };
  return map[status] || status;
}
