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
          // 新用户：创建临时 profile，引导到 profile-setup 完善信息
          const phone = user.phone || "";

          await supabase.from("profiles").insert({
            id: user.id,
            nickname: "", // 空昵称，标记为需要完善
            phone,
            city: "",
            bio: "",
            trust_score: 100,
            completed_cycles: 0,
            red_flowers: 0,
            total_given: 0,
            is_blocked: false,
          });

          // 新用户跳转到完善信息页
          return NextResponse.redirect(
            `${origin}/auth/profile-setup`
          );
        } else {
          // 老用户：检查是否已设置昵称
          const { data: profile } = await supabase
            .from("profiles")
            .select("nickname")
            .eq("id", user.id)
            .single();

          if (profile && !profile.nickname) {
            // 昵称为空，需要完善信息
            return NextResponse.redirect(
              `${origin}/auth/profile-setup`
            );
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 认证失败，重定向到登录页
  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
