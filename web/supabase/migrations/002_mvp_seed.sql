-- ============================================================
-- 乐转赠 MVP Migration + Seed Data
-- 在 Supabase SQL Editor 中执行此文件
-- ============================================================

-- 清理（如需重新执行，先删除已有表）
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.red_flowers CASCADE;
DROP TABLE IF EXISTS public.trust_events CASCADE;
DROP TABLE IF EXISTS public.feedback_images CASCADE;
DROP TABLE IF EXISTS public.feedback CASCADE;
DROP TABLE IF EXISTS public.applications CASCADE;
DROP TABLE IF EXISTS public.item_images CASCADE;
DROP TABLE IF EXISTS public.items CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ============================================================
-- 1. 用户表（MVP: 不关联 auth.users，直接 UUID 主键）
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT NOT NULL DEFAULT '',
  avatar_url TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  city TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  trust_score INTEGER NOT NULL DEFAULT 100,
  completed_cycles INTEGER NOT NULL DEFAULT 0,
  red_flowers INTEGER NOT NULL DEFAULT 0,
  total_given INTEGER NOT NULL DEFAULT 0,
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  blocked_until TIMESTAMPTZ,
  block_reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. 分类表
-- ============================================================
CREATE TABLE public.categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO public.categories (name, icon, sort_order) VALUES
  ('衣物', '👔', 1),
  ('书籍', '📚', 2),
  ('电子产品', '📱', 3),
  ('家居用品', '🏠', 4),
  ('厨房用品', '🍳', 5),
  ('母婴用品', '👶', 6),
  ('运动户外', '⚽', 7),
  ('美妆个护', '💄', 8),
  ('玩具文具', '🧸', 9),
  ('其他', '📦', 10);

-- ============================================================
-- 3. 物品表
-- ============================================================
CREATE TABLE public.items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  giver_id UUID NOT NULL REFERENCES public.profiles(id),
  category_id INTEGER NOT NULL REFERENCES public.categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  condition TEXT NOT NULL DEFAULT '良好',
  tags TEXT[] NOT NULL DEFAULT '{}',
  city TEXT DEFAULT '',
  expires_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'selected', 'shipped', 'completed', 'archived', 'expired')),
  applicant_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. 物品图片表
-- ============================================================
CREATE TABLE public.item_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumbnail_url TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. 申领表
-- ============================================================
CREATE TABLE public.applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES public.profiles(id),
  reason TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  edit_count INTEGER NOT NULL DEFAULT 0,
  giver_read BOOLEAN NOT NULL DEFAULT FALSE,
  rejected_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'withdrawn', 'rejected', 'accepted', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(item_id, applicant_id)
);

-- ============================================================
-- 6. 反馈闭环表
-- ============================================================
CREATE TABLE public.feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES public.profiles(id),
  giver_id UUID NOT NULL REFERENCES public.profiles(id),
  thank_letter TEXT NOT NULL,
  quality TEXT DEFAULT 'pending'
    CHECK (quality IN ('pending', 'good', 'poor')),
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. 反馈图片表
-- ============================================================
CREATE TABLE public.feedback_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_id UUID NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. 信用事件记录表
-- ============================================================
CREATE TABLE public.trust_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'feedback_on_time', 'feedback_good', 'feedback_late',
    'feedback_poor', 'refuse_delivery', 'reselling'
  )),
  score_change INTEGER NOT NULL DEFAULT 0,
  block_duration TEXT,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. 小红花记录表
-- ============================================================
CREATE TABLE public.red_flowers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  giver_id UUID NOT NULL REFERENCES public.profiles(id),
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(giver_id, sender_id, item_id)
);

-- ============================================================
-- 10. 通知表
-- ============================================================
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  type TEXT NOT NULL CHECK (type IN (
    'new_application', 'application_accepted', 'application_rejected',
    'item_shipped', 'feedback_reminder', 'feedback_received', 'trust_updated'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  related_item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 索引
-- ============================================================
CREATE INDEX idx_items_status ON public.items(status);
CREATE INDEX idx_items_created_at ON public.items(created_at DESC);
CREATE INDEX idx_items_city ON public.items(city);
CREATE INDEX idx_items_giver ON public.items(giver_id);
CREATE INDEX idx_items_tags ON public.items USING GIN(tags);
CREATE INDEX idx_item_images_item ON public.item_images(item_id);
CREATE INDEX idx_applications_item ON public.applications(item_id);
CREATE INDEX idx_applications_applicant ON public.applications(applicant_id);
CREATE INDEX idx_feedback_item ON public.feedback(item_id);
CREATE INDEX idx_trust_events_user ON public.trust_events(user_id);
CREATE INDEX idx_red_flowers_giver ON public.red_flowers(giver_id);
CREATE INDEX idx_red_flowers_item ON public.red_flowers(item_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);

-- ============================================================
-- MVP: 不启用 RLS（接入微信登录后再启用）
-- ============================================================

-- ============================================================
-- 种子数据：测试用户
-- ============================================================
INSERT INTO public.profiles (id, nickname, city, trust_score) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '小林', '深圳', 100),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', '阿花', '广州', 100),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', '乐转赠运营', '深圳', 999);

-- ============================================================
-- 种子数据：测试物品
-- ============================================================
INSERT INTO public.items (giver_id, category_id, title, description, condition, tags, city, status) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 1, '闲置冬季外套', '仅穿过两次的冬季外套，尺码 M，保暖效果好。因为搬家后气候变暖，不需要厚外套了。希望送给真正需要的人。', '良好', ARRAY['冬季', '外套', 'M码'], '深圳', 'active'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2, '《代码大全》第二版', '经典编程书籍，品相完好，仅翻阅过几次。送给正在学习编程的朋友。', '良好', ARRAY['编程', '计算机', '技术'], '深圳', 'active'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 3, 'Kindle Paperwhite 入门款', '之前用来读小说的，现在买了新款所以闲置了。功能正常，屏幕无划痕，送充电线。希望给爱看书的朋友。', '良好', ARRAY['电子书', '阅读器', 'Kindle'], '广州', 'active'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 10, '手工编织围巾', '自己织的围巾，全新未使用。本来是准备送朋友的但对方已经搬家了。希望送给怕冷的人。', '全新', ARRAY['手工', '围巾', '冬季'], '广州', 'active'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 4, '宜家台灯', '买回来发现光线不太适合看书，用了两周就一直放着。功能完好，送灯泡。', '良好', ARRAY['台灯', '照明', '宜家'], '深圳', 'active'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 2, '三体全集', '刘慈欣经典科幻小说，纸质版三本全。读过一遍，品相良好。希望送给还没看过的朋友。', '良好', ARRAY['科幻', '文学', '小说'], '广州', 'active');

-- ============================================================
-- 种子数据：物品图片（使用 picsum 占位图）
-- ============================================================
INSERT INTO public.item_images (item_id, url, thumbnail_url, sort_order)
SELECT
  i.id,
  'https://picsum.photos/seed/' || i.id || '/600/400',
  'https://picsum.photos/seed/' || i.id || '/300/200',
  0
FROM public.items i;

-- ============================================================
-- 完成！
-- ============================================================
