-- ============================================================
-- 乐转赠 · 断舍离转赠平台 - 数据库 Schema v2
-- ============================================================

-- 1. 用户扩展表（关联 Supabase Auth）
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  nickname TEXT NOT NULL DEFAULT '',
  avatar_url TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  city TEXT DEFAULT '',
  bio TEXT DEFAULT '',                             -- 个人简介
  trust_score INTEGER NOT NULL DEFAULT 100,       -- 信任分
  completed_cycles INTEGER NOT NULL DEFAULT 0,    -- 成功完成闭环次数
  red_flowers INTEGER NOT NULL DEFAULT 0,         -- 收到的小红花数
  total_given INTEGER NOT NULL DEFAULT 0,         -- 成功赠送物品总数
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,       -- 是否被拉黑
  blocked_until TIMESTAMPTZ,                       -- 拉黑截止时间
  block_reason TEXT DEFAULT '',                     -- 拉黑原因
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 当用户在 Supabase Auth 注册时自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '用户' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. 物品分类表
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

-- 3. 物品表
CREATE TABLE public.items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  giver_id UUID NOT NULL REFERENCES public.profiles(id),
  category_id INTEGER NOT NULL REFERENCES public.categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  condition TEXT NOT NULL DEFAULT '良好',
  tags TEXT[] NOT NULL DEFAULT '{}',              -- 标签数组（用于搜索）
  city TEXT DEFAULT '',                            -- 所在城市
  expires_at TIMESTAMPTZ,                          -- 物品过期时间（自动下架）
  view_count INTEGER NOT NULL DEFAULT 0,           -- 浏览次数
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'selected', 'shipped', 'completed', 'archived', 'expired')),
  applicant_count INTEGER NOT NULL DEFAULT 0,     -- 申领人数（缓存）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. 物品图片表（独立表支持排序、单张删除、裁剪）
CREATE TABLE public.item_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumbnail_url TEXT DEFAULT '',                   -- 缩略图 URL
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_item_images_item ON public.item_images(item_id);

-- 5. 申领表
CREATE TABLE public.applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES public.profiles(id),
  reason TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  edit_count INTEGER NOT NULL DEFAULT 0,
  giver_read BOOLEAN NOT NULL DEFAULT FALSE,      -- 赠主是否已读该申领
  rejected_at TIMESTAMPTZ,                         -- 拒绝时间
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'withdrawn', 'rejected', 'accepted', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(item_id, applicant_id)
);

-- 6. 反馈闭环表
CREATE TABLE public.feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES public.profiles(id),
  giver_id UUID NOT NULL REFERENCES public.profiles(id),
  thank_letter TEXT NOT NULL,
  quality TEXT DEFAULT 'pending'
    CHECK (quality IN ('pending', 'good', 'poor')),
  is_public BOOLEAN NOT NULL DEFAULT FALSE,       -- 是否同意展示到案例墙
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. 反馈图片表
CREATE TABLE public.feedback_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_id UUID NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feedback_images_feedback ON public.feedback_images(feedback_id);

-- 8. 信用事件记录表
CREATE TABLE public.trust_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'feedback_on_time',
    'feedback_good',
    'feedback_late',
    'feedback_poor',
    'refuse_delivery',
    'reselling'
  )),
  score_change INTEGER NOT NULL DEFAULT 0,
  block_duration TEXT,                            -- '3m', '1y', 'permanent'
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. 小红花记录表
CREATE TABLE public.red_flowers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  giver_id UUID NOT NULL REFERENCES public.profiles(id),
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(giver_id, sender_id, item_id)
);

-- 10. 通知表（轮询用）
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  type TEXT NOT NULL CHECK (type IN (
    'new_application',          -- 赠主：收到新申领
    'application_accepted',     -- 申领者：被选中
    'application_rejected',     -- 申领者：未被选中
    'item_shipped',             -- 申领者：物品已寄出
    'feedback_reminder',        -- 申领者：提醒提交反馈
    'feedback_received',        -- 赠主：收到反馈
    'trust_updated'             -- 信用分变更
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  related_item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);

-- ============================================================
-- Row Level Security (RLS) 策略
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_public" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items_select_all" ON public.items FOR SELECT USING (status != 'archived');
CREATE POLICY "items_insert_auth" ON public.items FOR INSERT WITH CHECK (auth.uid() = giver_id);
CREATE POLICY "items_update_own" ON public.items FOR UPDATE USING (auth.uid() = giver_id);

ALTER TABLE public.item_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "item_images_select" ON public.item_images FOR SELECT USING (true);
CREATE POLICY "item_images_insert" ON public.item_images FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT giver_id FROM public.items WHERE id = item_id)
);
CREATE POLICY "item_images_delete" ON public.item_images FOR DELETE USING (
  auth.uid() IN (SELECT giver_id FROM public.items WHERE id = item_id)
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "applications_select_own" ON public.applications FOR SELECT USING (
  auth.uid() = applicant_id OR
  auth.uid() IN (SELECT giver_id FROM public.items WHERE id = item_id)
);
CREATE POLICY "applications_insert_auth" ON public.applications FOR INSERT WITH CHECK (auth.uid() = applicant_id);
CREATE POLICY "applications_update_own" ON public.applications FOR UPDATE USING (
  auth.uid() = applicant_id OR
  auth.uid() IN (SELECT giver_id FROM public.items WHERE id = item_id)
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback_select_giver" ON public.feedback FOR SELECT USING (auth.uid() = giver_id);
CREATE POLICY "feedback_select_applicant" ON public.feedback FOR SELECT USING (auth.uid() = applicant_id);
CREATE POLICY "feedback_insert_applicant" ON public.feedback FOR INSERT WITH CHECK (auth.uid() = applicant_id);

ALTER TABLE public.feedback_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback_images_select_giver" ON public.feedback_images FOR SELECT USING (
  auth.uid() IN (SELECT giver_id FROM public.feedback WHERE id = feedback_id)
);
CREATE POLICY "feedback_images_select_applicant" ON public.feedback_images FOR SELECT USING (
  auth.uid() IN (SELECT applicant_id FROM public.feedback WHERE id = feedback_id)
);
CREATE POLICY "feedback_images_insert" ON public.feedback_images FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT applicant_id FROM public.feedback WHERE id = feedback_id)
);

ALTER TABLE public.trust_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trust_events_select_own" ON public.trust_events FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.red_flowers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "red_flowers_select_all" ON public.red_flowers FOR SELECT USING (true);
CREATE POLICY "red_flowers_insert_auth" ON public.red_flowers FOR INSERT WITH CHECK (auth.uid() = sender_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 索引
-- ============================================================
CREATE INDEX idx_items_status ON public.items(status);
CREATE INDEX idx_items_created_at ON public.items(created_at DESC);
CREATE INDEX idx_items_city ON public.items(city);
CREATE INDEX idx_items_tags ON public.items USING GIN(tags);
CREATE INDEX idx_applications_item ON public.applications(item_id);
CREATE INDEX idx_applications_applicant ON public.applications(applicant_id);
CREATE INDEX idx_feedback_item ON public.feedback(item_id);
CREATE INDEX idx_trust_events_user ON public.trust_events(user_id);
CREATE INDEX idx_red_flowers_giver ON public.red_flowers(giver_id);
CREATE INDEX idx_red_flowers_item ON public.red_flowers(item_id);
