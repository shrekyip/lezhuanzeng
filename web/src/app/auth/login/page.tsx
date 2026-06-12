"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  const formatPhone = (value: string) => {
    // 只允许数字
    const digits = value.replace(/\D/g, "");
    // 限制11位
    return digits.slice(0, 11);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
    setError("");
  };

  const sendOTP = async () => {
    if (phone.length !== 11) {
      setError("请输入11位手机号");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: `+86${phone}`,
      });

      if (otpError) {
        // 如果 Supabase 未开启 Phone Auth，给出提示
        if (otpError.message.includes("Phone")) {
          setError("手机号登录暂未开放，请使用测试账号体验");
        } else {
          setError(otpError.message);
        }
        return;
      }

      setStep("otp");
      // 60秒倒计时
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setError("发送验证码失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (otp.length < 6) {
      setError("请输入6位验证码");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: `+86${phone}`,
        token: otp,
        type: "sms",
      });

      if (verifyError) {
        setError("验证码错误或已过期，请重新发送");
        return;
      }

      // 登录成功，跳转到首页
      router.push("/");
      router.refresh();
    } catch {
      setError("验证失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  // 使用测试账号登录
  const loginAsDemo = async (userId: string) => {
    const { setCurrentUserId } = await import("@/lib/db");
    setCurrentUserId(userId);
    router.push("/");
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-primary">
            乐转赠
          </Link>
          <p className="mt-2 text-sm text-neutral-500">
            转赠带来快乐
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
          {step === "phone" ? (
            <>
              <h2 className="text-lg font-bold text-neutral-900 mb-1">
                手机号登录
              </h2>
              <p className="text-sm text-neutral-500 mb-6">
                输入手机号，我们将发送验证码
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    手机号
                  </label>
                  <div className="flex items-center rounded-xl border border-neutral-200 overflow-hidden focus-within:border-primary transition-colors">
                    <span className="px-3 text-sm text-neutral-500 border-r border-neutral-200 bg-neutral-50">
                      +86
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="请输入手机号"
                      className="flex-1 px-3 py-2.5 text-sm outline-none"
                      maxLength={11}
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}

                <button
                  onClick={sendOTP}
                  disabled={loading || phone.length !== 11}
                  className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "发送中..." : "获取验证码"}
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-neutral-900 mb-1">
                输入验证码
              </h2>
              <p className="text-sm text-neutral-500 mb-6">
                验证码已发送至 +86 {phone.slice(0, 3)}****{phone.slice(7)}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    验证码
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                      setError("");
                    }}
                    placeholder="6位数字验证码"
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 text-sm outline-none focus:border-primary transition-colors text-center tracking-[0.5em] text-lg"
                    maxLength={6}
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}

                <button
                  onClick={verifyOTP}
                  disabled={loading || otp.length < 6}
                  className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "验证中..." : "登录 / 注册"}
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    onClick={sendOTP}
                    disabled={countdown > 0}
                    className="text-primary hover:text-primary-dark disabled:text-neutral-400 transition-colors"
                  >
                    {countdown > 0
                      ? `${countdown}s 后重新发送`
                      : "重新发送验证码"}
                  </button>
                  <button
                    onClick={() => {
                      setStep("phone");
                      setOtp("");
                      setError("");
                    }}
                    className="text-neutral-500 hover:text-neutral-700 transition-colors"
                  >
                    更换手机号
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Demo Login */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
          <div className="text-center mb-4">
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              测试模式
            </span>
          </div>
          <p className="text-sm text-neutral-500 text-center mb-4">
            手机号登录需要配置 Supabase Phone Auth，<br />
            目前可使用测试账号体验
          </p>
          <div className="space-y-2">
            <button
              onClick={() =>
                loginAsDemo("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
              }
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-neutral-200 hover:border-primary hover:bg-primary-50 transition-colors text-sm"
            >
              <div className="w-8 h-8 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                林
              </div>
              <div className="text-left">
                <div className="font-medium text-neutral-900">小林</div>
                <div className="text-xs text-neutral-400">深圳 · 赠主</div>
              </div>
            </button>
            <button
              onClick={() =>
                loginAsDemo("b2c3d4e5-f6a7-8901-bcde-f12345678901")
              }
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-neutral-200 hover:border-primary hover:bg-primary-50 transition-colors text-sm"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center">
                花
              </div>
              <div className="text-left">
                <div className="font-medium text-neutral-900">阿花</div>
                <div className="text-xs text-neutral-400">广州 · 申领者</div>
              </div>
            </button>
            <button
              onClick={() =>
                loginAsDemo("c3d4e5f6-a7b8-9012-cdef-123456789012")
              }
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-neutral-200 hover:border-primary hover:bg-primary-50 transition-colors text-sm"
            >
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                运
              </div>
              <div className="text-left">
                <div className="font-medium text-neutral-900">乐转赠运营</div>
                <div className="text-xs text-neutral-400">深圳 · 运营</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
