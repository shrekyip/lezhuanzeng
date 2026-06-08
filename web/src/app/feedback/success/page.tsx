import Link from 'next/link';
import Navbar from '@/components/navbar';

export default function FeedbackSuccessPage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />

      <div className="max-w-md mx-auto px-4 py-20 text-center">
        {/* 成功图标 */}
        <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
          <span className="text-5xl">🎉</span>
        </div>

        <h1 className="text-2xl font-bold text-neutral-900 mb-4">
          感谢信已送出！
        </h1>

        <p className="text-neutral-500 mb-2 leading-relaxed">
          赠与者会收到你的感谢信和照片。
          <br />
          你的反馈让这个平台更有温度 💝
        </p>

        <div className="bg-orange-50 rounded-2xl p-4 mb-10 text-sm text-orange-700">
          💡 小贴士：赠与者可以给你的反馈送一朵小红花，
          这会增加你的信用积分哦！
        </div>

        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="block w-full px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium"
          >
            返回我的申领
          </Link>

          <Link
            href="/browse"
            className="block w-full px-6 py-3 border border-neutral-200 text-neutral-600 rounded-xl hover:bg-neutral-50 transition-colors"
          >
            继续逛逛
          </Link>
        </div>
      </div>
    </div>
  );
}
