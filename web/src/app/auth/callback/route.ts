import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 获取用户信息
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // 检查是否已有 profile，没有则创建
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();

        if (!existingProfile) {
          // 从用户元数据或手机号提取信息
          const phone = user.phone || "";
          const nickname =
            user.user_metadata?.nickname ||
            user.user_metadata?.full_name ||
            (phone ? `用户${phone.slice(-4)}` : "新用户");

          await supabase.from("profiles").insert({
            id: user.id,
            nickname,
            phone,
            city: "",
            bio: "",
            trust_score: 100,
            completed_cycles: 0,
            red_flowers: 0,
            total_given: 0,
            is_blocked: false,
          });
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 认证失败，重定向到登录页
  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
