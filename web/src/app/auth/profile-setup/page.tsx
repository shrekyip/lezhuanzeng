"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ProfileSetupPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nickname.trim()) {
      setError("请输入昵称");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setError("请先登录");
        router.push("/auth/login");
        return;
      }

      // Update profiles table
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          nickname: nickname.trim(),
          bio: bio.trim() || null,
          city: city.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", authUser.id);

      if (updateError) {
        setError("保存失败，请重试");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("保存失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary text-2xl flex items-center justify-center mx-auto mb-4">
            🎉
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">
            欢迎加入乐转赠！
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            完善你的个人信息，开始转赠之旅
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 space-y-5"
        >
          {/* Nickname */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              昵称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value.slice(0, 20));
                setError("");
              }}
              placeholder="给自己取个名字吧"
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 text-sm outline-none focus:border-primary transition-colors"
              maxLength={20}
              autoFocus
            />
            <p className="mt-1 text-xs text-neutral-400">
              {nickname.length}/20
            </p>
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              所在城市
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value.slice(0, 20))}
              placeholder="例如：深圳"
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 text-sm outline-none focus:border-primary transition-colors"
              maxLength={20}
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              一句话介绍自己
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 100))}
              placeholder="让赠主和申领者更了解你"
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 text-sm outline-none focus:border-primary transition-colors resize-none"
              maxLength={100}
              rows={3}
            />
            <p className="mt-1 text-xs text-neutral-400">{bio.length}/100</p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading || !nickname.trim()}
            className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "保存中..." : "完成注册"}
          </button>

          <button
            type="button"
            onClick={() => {
              router.push("/");
            }}
            className="w-full py-2 text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            稍后再说
          </button>
        </form>
      </div>
    </div>
  );
}
