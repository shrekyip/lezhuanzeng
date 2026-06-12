"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import ItemCard from "@/components/item-card";
import { getItems, getCategories } from "@/lib/db";
import type { Item, Category } from "@/types";

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState({ totalItems: 0, totalUsers: 0, totalCompleted: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const [allItems, cats] = await Promise.all([
        getItems(),
        getCategories(),
      ]);
      setItems(allItems);
      setCategories(cats);

      // 获取统计数据
      try {
        const supabase = (await import("@/lib/supabase/client")).createClient();
        const [
          { count: itemCount },
          { count: userCount },
          { count: completedCount },
        ] = await Promise.all([
          supabase.from('items').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('items').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        ]);
        setStats({
          totalItems: itemCount || 0,
          totalUsers: userCount || 0,
          totalCompleted: completedCount || 0,
        });
      } catch (e) {
        // 统计数据获取失败不影响首页渲染
      }

      setMounted(true);
    };
    loadData();
  }, []);

  return (
    <>
      {/* Section 1: Hero - 情感钩子 */}
      <section className="relative overflow-hidden bg-gradient-to-br from-warm-50 via-white to-warm-100">
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28 lg:flex lg:items-center lg:gap-12">
          {/* 文案 */}
          <div className="max-w-xl">
            <h1 className="text-4xl md:text-5xl font-bold text-warm-900 leading-tight">
              把不再用的好东西，
              <br />
              <span className="text-primary">送给真正需要的人</span>
            </h1>
            
            <p className="mt-6 text-lg text-warm-700 leading-relaxed">
              不是二手交易，是一次有温度的赠与。
              <br />
              你会收到对方的使用照片和手写信——
              <br />
              <span className="font-medium text-warm-800">那种满足感，比买新东西持久得多。</span>
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/items/new"
                className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3.5 text-base font-medium text-white hover:bg-primary-dark shadow-warm-md hover:shadow-warm-lg transition-all"
              >
                我要赠与
              </Link>
              <Link
                href="/browse"
                className="inline-flex items-center justify-center rounded-full border-2 border-warm-300 px-8 py-3.5 text-base font-medium text-warm-700 hover:bg-warm-100 transition-colors"
              >
                我需要
              </Link>
            </div>

            <p className="mt-6 text-sm text-warm-500">
              ✨ 已有 <span className="font-semibold text-primary">{stats.totalCompleted || '—'}</span> 件物品找到新主人
            </p>
          </div>

          {/* 右侧视觉元素 - 模拟照片墙 */}
          <div className="hidden lg:block lg:w-1/2 mt-12 lg:mt-0">
            <div className="relative">
              {/* 主图 */}
              <div className="rounded-2xl overflow-hidden shadow-warm-lg">
                <div className="aspect-[4/3] bg-warm-200 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🎁</div>
                    <p className="text-warm-600 font-medium">温暖的赠与瞬间</p>
                  </div>
                </div>
              </div>
              {/* 悬浮卡片 - 成功案例 */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl p-4 shadow-warm-lg max-w-xs">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-accent-light flex items-center justify-center text-2xl flex-shrink-0">
                    ❤️
                  </div>
                  <div>
                    <p className="text-sm text-warm-700 font-medium">@小张 刚送出</p>
                    <p className="text-xs text-warm-500 mt-0.5">一台咖啡机给单亲妈妈</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <span className="text-xs text-accent font-medium">+1 小红花</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: 如何工作 (3步) - 紧凑版 */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-warm-900 text-center mb-12">
            三步，完成一次有意义的赠与
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-warm-100 flex items-center justify-center text-3xl mb-4">
                1️⃣
              </div>
              <h3 className="text-lg font-semibold text-warm-800 mb-2">
                发布高价值物品
              </h3>
              <p className="text-sm text-warm-600 leading-relaxed">
                100元以上，有照片有故事
                <br />
                不是破烂，是你认真挑选过的好东西
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary-light flex items-center justify-center text-3xl mb-4">
                2️⃣
              </div>
              <h3 className="text-lg font-semibold text-warm-800 mb-2">
                选择最需要的申领者
              </h3>
              <p className="text-sm text-warm-600 leading-relaxed">
                不是算法匹配，是你来决定给谁
                <br />
                每个申领者都写了真实的使用场景
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-light flex items-center justify-center text-3xl mb-4">
                3️⃣
              </div>
              <h3 className="text-lg font-semibold text-warm-800 mb-2">
                收到使用照片 + 感谢信
              </h3>
              <p className="text-sm text-warm-600 leading-relaxed">
                看到你的东西真的在被珍惜
                <br />
                这种满足感，会让你想再来一次
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2.5: 最新物品 - 真实数据 */}
      {items.length > 0 && (
        <section className="py-12 px-4 bg-warm-50">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-warm-900">
                最新发布的物品
              </h2>
              <Link
                href="/browse"
                className="text-sm text-primary hover:text-primary-dark font-medium"
              >
                查看全部 →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.slice(0, 6).map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Section 3: 真实案例 - 核心说服区 */}
      <section className="py-16 px-4 bg-warm-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-warm-900 text-center mb-4">
            真实案例
          </h2>
          <p className="text-center text-warm-600 mb-10 max-w-2xl mx-auto">
            每一个故事都是真实的（为保护隐私，姓名已做处理）
          </p>

          {/* 案例卡片 - 横向布局 */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* 案例1 */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-warm-sm hover:shadow-warm-md transition-shadow">
              <div className="relative aspect-[16/9]">
                <Image
                  src="/images/A_coffee_machine_on_a_convenie_2026-06-03T12-46-28.png"
                  alt="咖啡机放在小便利店柜台上"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-warm-800 mb-2">
                  这台咖啡机，现在在一位单亲妈妈的小店里飘香
                </h3>
                <div className="flex items-center gap-2 mb-3 text-sm">
                  <span className="text-warm-500">物主：@小张</span>
                  <span className="text-warm-300">·</span>
                  <span className="text-primary font-medium">靠谱值 15</span>
                </div>
                <p className="text-sm text-warm-600 leading-relaxed italic">
                  "孩子说，店里现在有咖啡香了，像个大商场…"
                </p>
                <Link
                  href="#"
                  className="inline-block mt-3 text-sm text-primary hover:text-primary-dark font-medium"
                >
                  查看完整故事 →
                </Link>
              </div>
            </div>

            {/* 案例2 */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-warm-sm hover:shadow-warm-md transition-shadow">
              <div className="relative aspect-[16/9] bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-2">📱</div>
                  <p className="text-sm text-warm-500">iPad 照片（生成中...）</p>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-warm-800 mb-2">
                  那台闲置的 iPad，现在在帮一个大学生记笔记
                </h3>
                <div className="flex items-center gap-2 mb-3 text-sm">
                  <span className="text-warm-500">物主：@老陈</span>
                  <span className="text-warm-300">·</span>
                  <span className="text-primary font-medium">已赠与 7 次</span>
                </div>
                <p className="text-sm text-warm-600 leading-relaxed italic">
                  "我第一次送的是iPad，收到那个大学生发来的笔记照片时，我真的鼻子一酸。"
                </p>
                <Link
                  href="#"
                  className="inline-block mt-3 text-sm text-primary hover:text-primary-dark font-medium"
                >
                  查看完整故事 →
                </Link>
              </div>
            </div>
          </div>

          {/* 查看更多 */}
          <div className="text-center mt-8">
            <Link
              href="#"
              className="inline-flex items-center gap-2 text-primary hover:text-primary-dark font-medium"
            >
              查看更多温暖故事
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Section 4: 为什么是高价值物品 - 紧凑版 */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-warm-900 text-center mb-8">
            为什么我们鼓励 100 元以上的物品？
          </h2>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent-light flex items-center justify-center text-xl flex-shrink-0">
                💡
              </div>
              <div>
                <h3 className="font-semibold text-warm-800 mb-1">对获得者：真正改善生活</h3>
                <p className="text-sm text-warm-600 leading-relaxed">
                  不是凑合用的破烂，是能实实在在提升生活品质的好东西。
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center text-xl flex-shrink-0">
                ❤️
              </div>
              <div>
                <h3 className="font-semibold text-warm-800 mb-1">对赠与者：情感回报更强烈</h3>
                <p className="text-sm text-warm-600 leading-relaxed">
                  「忍痛割爱」后的反馈，带来的满足感远超过随手送个不值钱的东西。
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-warm-100 flex items-center justify-center text-xl flex-shrink-0">
                ✨
              </div>
              <div>
                <h3 className="font-semibold text-warm-800 mb-1">我们不一样</h3>
                <p className="text-sm text-warm-600 leading-relaxed">
                  见过太多「送废书」的平台——那些平台没有情感，只有清理。乐转赠不一样。
                </p>
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-lg text-warm-700 font-medium">
            我们想让你体验那种
            <span className="text-primary">「我居然真的改变了一个人的一天」</span>
            的感觉。
          </p>
        </div>
      </section>

      {/* Section 5: 信任与安全 - 简洁版 */}
      <section className="py-12 px-4 bg-warm-50 border-t border-warm-200">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-xl font-bold text-warm-900 mb-6">
            你的善意，我们有守护
          </h2>

          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="bg-white rounded-xl p-4">
              <div className="text-2xl mb-2">✅</div>
              <p className="text-warm-700 font-medium">实名认证 + 设备指纹</p>
              <p className="text-warm-500 text-xs mt-1">防止职业薅羊毛</p>
            </div>
            <div className="bg-white rounded-xl p-4">
              <div className="text-2xl mb-2">🔒</div>
              <p className="text-warm-700 font-medium">反馈造假会被拉黑</p>
              <p className="text-warm-500 text-xs mt-1">严重者永久封号</p>
            </div>
            <div className="bg-white rounded-xl p-4">
              <div className="text-2xl mb-2">👁️</div>
              <p className="text-warm-700 font-medium">物品流向透明</p>
              <p className="text-warm-500 text-xs mt-1">你可以随时查看</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: CTA Footer */}
      <section className="py-16 px-4 bg-primary">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            准备好体验「给予的快乐」了吗？
          </h2>
          <p className="text-primary-light mb-8 text-lg">
            加入已有 {stats.totalUsers || '—'} 位用户的温暖社区
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/items/new"
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-base font-medium text-primary hover:bg-warm-50 transition-colors"
            >
              立即发布物品
            </Link>
            <Link
              href="/browse"
              className="inline-flex items-center justify-center rounded-full border-2 border-white px-8 py-3.5 text-base font-medium text-white hover:bg-primary-dark transition-colors"
            >
              浏览可申领物品
            </Link>
          </div>
        </div>
      </section>

      {/* 页脚 */}
      <footer className="bg-warm-900 text-warm-300 py-8 px-4">
        <div className="max-w-5xl mx-auto text-center text-sm">
          <p>乐转赠 · 一个断舍离转赠平台</p>
          <p className="mt-1">非盈利 · 永不抽成 · 财务公开</p>
        </div>
      </footer>
    </>
  );
}
