// 乐转赠数据层 - Supabase 真实数据库版本
// 替代原有的 mock-data.ts

import { createClient } from '@/lib/supabase/client';
import type {
  Profile,
  Item,
  ItemImage,
  Category,
  Application,
  Feedback,
  Notification,
  NotificationType,
} from '@/types';

// MVP: 固定的测试用户 ID（接入微信登录后替换为 auth.uid()）
export const DEMO_USERS = [
  { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', nickname: '小林', city: '深圳' },
  { id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901', nickname: '阿花', city: '广州' },
  { id: 'c3d4e5f6-a7b8-9012-cdef-123456789012', nickname: '乐转赠运营', city: '深圳' },
];

const CURRENT_USER_KEY = 'lzz_current_user_id';
const DEFAULT_USER_ID = DEMO_USERS[0].id;

// ===== 用户管理 =====

export function getCurrentUserId(): string {
  if (typeof window === 'undefined') return DEFAULT_USER_ID;
  return localStorage.getItem(CURRENT_USER_KEY) || DEFAULT_USER_ID;
}

export function setCurrentUserId(userId: string) {
  localStorage.setItem(CURRENT_USER_KEY, userId);
}

// 判断当前是否为真实登录用户（通过 Supabase Auth）
export async function getAuthUser() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user; // null if not authenticated
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<Profile> {
  const supabase = createClient();

  // 优先使用 Supabase Auth 用户
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
      if (data) return data as Profile;
    }
  } catch {
    // Auth 不可用，回退到 demo 用户
  }

  // 回退到 demo 用户
  const id = getCurrentUserId();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) {
    const { data: fallback } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
      .single();
    return fallback as Profile;
  }
  return data as Profile;
}

export async function signOut() {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
  // 清除 demo 用户缓存
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

export async function getProfiles(): Promise<Profile[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) return [];
  return (data || []) as Profile[];
}

export async function getProfile(id: string): Promise<Profile | undefined> {
  const supabase = createClient();
  const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
  return data as Profile | undefined;
}

// ===== 分类 =====

export async function getCategories(): Promise<Category[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) return [];
  return (data || []) as Category[];
}

// ===== 物品 =====

export async function getItems(filters?: {
  categoryId?: number;
  city?: string;
  keyword?: string;
}): Promise<Item[]> {
  const supabase = createClient();
  let query = supabase
    .from('items')
    .select(`
      *,
      giver:profiles(*),
      images:item_images(*)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }
  if (filters?.city) {
    query = query.eq('city', filters.city);
  }
  if (filters?.keyword) {
    const kw = filters.keyword;
    query = query.or(`title.ilike.%${kw}%,description.ilike.%${kw}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('getItems error:', error);
    return [];
  }

  // Enrich with category_name
  const categories = await getCategories();
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  return ((data || []) as Item[]).map((item) => ({
    ...item,
    category_name: catMap.get(item.category_id) || '',
  }));
}

export async function getItem(id: string): Promise<Item | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('items')
    .select(`
      *,
      giver:profiles(*),
      images:item_images(*)
    `)
    .eq('id', id)
    .single();

  if (error || !data) return undefined;

  const categories = await getCategories();
  const cat = categories.find((c) => c.id === data.category_id);
  return {
    ...(data as Item),
    category_name: cat?.name || '',
  };
}

export async function getItemsByGiver(giverId: string): Promise<Item[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('items')
    .select(`
      *,
      giver:profiles(*),
      images:item_images(*)
    `)
    .eq('giver_id', giverId)
    .order('created_at', { ascending: false });

  if (error) return [];

  const categories = await getCategories();
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  return ((data || []) as Item[]).map((item) => ({
    ...item,
    category_name: catMap.get(item.category_id) || '',
  }));
}

// ===== 图片上传（Supabase Storage）=====

const STORAGE_BUCKET = 'item-images';

export async function uploadItemImage(file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const filePath = fileName;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

export async function createItem(
  data: Omit<Item, 'id' | 'created_at' | 'images' | 'giver' | 'view_count' | 'category_name'> & { imageFiles?: File[] }
): Promise<Item> {
  const supabase = createClient();

  // Insert item
  const { data: item, error } = await supabase
    .from('items')
    .insert({
      giver_id: data.giver_id,
      category_id: data.category_id,
      title: data.title,
      description: data.description,
      condition: data.condition,
      tags: data.tags,
      city: data.city,
      status: data.status,
    })
    .select(`
      *,
      giver:profiles(*),
      images:item_images(*)
    `)
    .single();

  if (error) throw error;

  // Upload images if provided
  if (data.imageFiles && data.imageFiles.length > 0) {
    for (let i = 0; i < data.imageFiles.length; i++) {
      try {
        const url = await uploadItemImage(data.imageFiles[i]);
        await supabase.from('item_images').insert({
          item_id: item.id,
          url,
          sort_order: i,
        });
      } catch (imgErr) {
        console.error(`Failed to upload image ${i}:`, imgErr);
      }
    }
  }

  const categories = await getCategories();
  const cat = categories.find((c) => c.id === item.category_id);

  return {
    ...(item as Item),
    category_name: cat?.name || '',
  };
}

export async function updateItemStatus(
  id: string,
  status: string
): Promise<void> {
  const supabase = createClient();
  await supabase.from('items').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
}

// ===== 申领 =====

export async function getApplicationsForItem(itemId: string): Promise<Application[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('applications')
    .select(`
      *,
      applicant:profiles(*)
    `)
    .eq('item_id', itemId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data || []) as Application[];
}

export async function getApplicationsByUser(userId: string): Promise<Application[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('applications')
    .select(`
      *,
      applicant:profiles(*),
      item:items(*, images:item_images(*))
    `)
    .eq('applicant_id', userId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data || []) as Application[];
}

export async function createApplication(
  data: Omit<Application, 'id' | 'status' | 'created_at' | 'edit_count' | 'applicant'>
): Promise<Application> {
  const supabase = createClient();

  // 拉黑用户不能申领
  const blockState = await isUserBlocked(data.applicant_id);
  if (blockState.blocked) {
    const untilText = blockState.until
      ? `（限制期至 ${new Date(blockState.until).toLocaleDateString('zh-CN')}）`
      : '（永久限制）';
    throw new Error(`账号当前被限制申领${untilText}。原因：${blockState.reason || '违反社区约定'}`);
  }

  // 申领频次限制：信用分 <100 每月 2 次，>=100 每月 5 次
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('trust_score')
    .eq('id', data.applicant_id)
    .single();
  const monthlyLimit = (myProfile?.trust_score ?? 100) >= 100 ? 5 : 2;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { count: monthlyCount } = await supabase
    .from('applications')
    .select('*', { count: 'exact', head: true })
    .eq('applicant_id', data.applicant_id)
    .gte('created_at', monthStart.toISOString());

  if ((monthlyCount || 0) >= monthlyLimit) {
    throw new Error(
      `本月申领次数已达上限（${monthlyLimit} 次）。持续完成「赠物→反馈」闭环可以提升信用分、提高申领额度。`
    );
  }

  // Insert application
  const { data: app, error } = await supabase
    .from('applications')
    .insert({
      item_id: data.item_id,
      applicant_id: data.applicant_id,
      reason: data.reason,
      address: data.address,
      phone: data.phone,
    })
    .select(`
      *,
      applicant:profiles(*)
    `)
    .single();

  if (error) throw error;

  // 通知捐赠者有人申领
  try {
    const [{ data: item }, { data: applicant }] = await Promise.all([
      supabase.from('items').select('giver_id, title').eq('id', data.item_id).single(),
      supabase.from('profiles').select('nickname').eq('id', data.applicant_id).single(),
    ]);

    if (item?.giver_id) {
      await createNotification({
        userId: item.giver_id,
        type: 'new_application',
        title: '有人申领你的物品',
        body: `${applicant?.nickname || '有人'} 申领了你的物品「${item.title}」，快去看看吧！`,
        relatedItemId: data.item_id,
      });
    }
  } catch (_) {
    // 通知发送失败不影响申领流程
  }

  // Update applicant_count on item
  try {
    const { count } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('item_id', data.item_id)
      .eq('status', 'pending');

    if (count !== null) {
      await supabase
        .from('items')
        .update({ applicant_count: count })
        .eq('id', data.item_id);
    }
  } catch (_) {
    // Ignore count update errors
  }

  return app as Application;
}

export async function updateApplicationStatus(
  id: string,
  status: string
): Promise<void> {
  const supabase = createClient();
  await supabase
    .from('applications')
    .update({
      status,
      updated_at: new Date().toISOString(),
      ...(status === 'rejected' ? { rejected_at: new Date().toISOString() } : {}),
    })
    .eq('id', id);
}

// ===== 申领编辑 / 撤回（防滥用规则）=====

// 修改申领理由（限 3 次）
export async function updateApplicationReason(
  applicationId: string,
  reason: string
): Promise<void> {
  const supabase = createClient();

  const { data: app } = await supabase
    .from('applications')
    .select('edit_count, status, applicant_id, item_id')
    .eq('id', applicationId)
    .single();

  if (!app) throw new Error('申领不存在');
  if (app.status !== 'pending') throw new Error('只有等待中的申领可以修改');
  if ((app.edit_count || 0) >= 3) throw new Error('修改次数已用完（最多 3 次）');
  if (!reason || reason.trim().length < 30) throw new Error('申领理由至少 30 字');

  await supabase
    .from('applications')
    .update({
      reason: reason.trim(),
      edit_count: (app.edit_count || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId);
}

// 撤回申领（赠主决定前可撤回，减少对方负担）
export async function withdrawApplication(
  applicationId: string,
  itemId: string
): Promise<void> {
  const supabase = createClient();

  const { data: app } = await supabase
    .from('applications')
    .select('status')
    .eq('id', applicationId)
    .single();

  if (!app) throw new Error('申领不存在');
  if (app.status !== 'pending') throw new Error('只有等待中的申领可以撤回');

  await supabase
    .from('applications')
    .update({ status: 'withdrawn', updated_at: new Date().toISOString() })
    .eq('id', applicationId);

  // 更新物品申领人数
  try {
    const { count } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('item_id', itemId)
      .eq('status', 'pending');

    if (count !== null) {
      await supabase
        .from('items')
        .update({ applicant_count: count })
        .eq('id', itemId);
    }
  } catch (_) {}
}

// ===== 反馈 =====

export async function getFeedbackForItem(itemId: string): Promise<Feedback[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('feedback')
    .select(`
      *,
      applicant:profiles(*),
      images:feedback_images(*)
    `)
    .eq('item_id', itemId);

  if (error) return [];
  return (data || []) as Feedback[];
}

// ===== 通知 =====

export async function getUserNotifications(userId: string): Promise<Notification[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data || []) as Notification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('notifications').update({ is_read: true }).eq('id', id);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
}

export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) return 0;
  return count || 0;
}

// 创建通知的统一方法
export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedItemId?: string;
}): Promise<void> {
  const supabase = createClient();
  await supabase.from('notifications').insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    related_item_id: params.relatedItemId || null,
  });
}

// ===== 信用体系 =====

type TrustEventType =
  | 'feedback_on_time'
  | 'feedback_good'
  | 'feedback_late'
  | 'feedback_poor'
  | 'refuse_delivery'
  | 'reselling';

// 记录信用事件并更新用户信用分（可选拉黑）
export async function recordTrustEvent(params: {
  userId: string;
  eventType: TrustEventType;
  scoreChange: number;
  blockDuration?: '3m' | '1y' | 'permanent';
  description?: string;
  relatedItemId?: string;
}): Promise<void> {
  const supabase = createClient();

  // 1. 写入信用事件
  await supabase.from('trust_events').insert({
    user_id: params.userId,
    event_type: params.eventType,
    score_change: params.scoreChange,
    block_duration: params.blockDuration || null,
    description: params.description || '',
  });

  // 2. 计算拉黑截止时间
  let blockedUntil: string | null = null;
  let isBlocked = false;
  if (params.blockDuration) {
    isBlocked = true;
    if (params.blockDuration !== 'permanent') {
      const months = params.blockDuration === '3m' ? 3 : 12;
      const d = new Date();
      d.setMonth(d.getMonth() + months);
      blockedUntil = d.toISOString();
    }
  }

  // 3. 更新 profile：信用分 + 拉黑状态
  const { data: profile } = await supabase
    .from('profiles')
    .select('trust_score')
    .eq('id', params.userId)
    .single();

  await supabase
    .from('profiles')
    .update({
      trust_score: Math.max(0, (profile?.trust_score ?? 100) + params.scoreChange),
      ...(isBlocked ? { is_blocked: true, blocked_until: blockedUntil, block_reason: params.description || '' } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.userId);

  // 4. 通知用户信用变更
  const actionText =
    params.scoreChange > 0
      ? `信用分 +${params.scoreChange}`
      : params.scoreChange < 0
        ? `信用分 ${params.scoreChange}`
        : '';
  await createNotification({
    userId: params.userId,
    type: 'trust_updated',
    title: isBlocked ? '账号已被限制申领' : '信用分变动',
    body: isBlocked
      ? `${params.description || '违反社区约定'}，${params.blockDuration === 'permanent' ? '账号被永久限制' : '限制期至 ' + (blockedUntil ? new Date(blockedUntil).toLocaleDateString('zh-CN') : '')}。期间可浏览物品，但不能申领。`
      : `${actionText}。${params.description || ''}`,
    relatedItemId: params.relatedItemId,
  });
}

// 判断用户当前是否处于拉黑状态（懒解封：过期自动解除）
export async function isUserBlocked(userId: string): Promise<{
  blocked: boolean;
  until: string | null;
  reason: string;
}> {
  const supabase = createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_blocked, blocked_until, block_reason')
    .eq('id', userId)
    .single();

  if (!profile?.is_blocked) return { blocked: false, until: null, reason: '' };

  // 拉黑已到期 → 自动解封
  if (profile.blocked_until && new Date(profile.blocked_until) < new Date()) {
    await supabase
      .from('profiles')
      .update({ is_blocked: false, blocked_until: null, updated_at: new Date().toISOString() })
      .eq('id', userId);
    return { blocked: false, until: null, reason: '' };
  }

  return {
    blocked: true,
    until: profile.blocked_until,
    reason: profile.block_reason || '',
  };
}

// 反馈超时检查（懒执行）：确认收货 7 天内未提交反馈 → 拉黑 3 个月
export async function checkFeedbackDeadline(userId: string): Promise<void> {
  const supabase = createClient();

  // 找到该用户所有已接受、物品已完成、但还没写反馈的申领
  const { data: apps } = await supabase
    .from('applications')
    .select(`
      id,
      item_id,
      applicant_id,
      item:items!inner(id, status, updated_at, title)
    `)
    .eq('applicant_id', userId)
    .eq('status', 'accepted')
    .eq('item.status', 'completed');

  if (!apps || apps.length === 0) return;

  for (const app of apps) {
    const item = Array.isArray(app.item) ? app.item[0] : app.item;
    if (!item) continue;

    // 是否已提交反馈
    const { data: existing } = await supabase
      .from('feedback')
      .select('id')
      .eq('item_id', app.item_id)
      .eq('applicant_id', userId)
      .maybeSingle();
    if (existing) continue;

    // 以物品 completed 时间（updated_at）为起点，7 天未反馈 → 拉黑
    const completedAt = new Date(item.updated_at);
    const daysPassed = (Date.now() - completedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysPassed > 7) {
      await recordTrustEvent({
        userId,
        eventType: 'feedback_late',
        scoreChange: 0,
        blockDuration: '3m',
        description: `超过 7 天未提交「${item.title}」的使用反馈`,
        relatedItemId: app.item_id,
      });
    }
  }
}

// ===== 反馈模块（新增/修改）=====

// getItemById 别名（供反馈页使用）
export async function getItemById(id: string): Promise<Item | undefined> {
  return getItem(id);
}

// 创建反馈（先创建记录，返回 feedback id 供上传图片使用）
export async function createFeedback(data: {
  itemId: string;
  applicantId: string;
  giverId: string;
  thankLetter: string;
}): Promise<{ id: string }> {
  const supabase = createClient();

  const { data: fb, error: fbError } = await supabase
    .from('feedback')
    .insert({
      item_id: data.itemId,
      applicant_id: data.applicantId,
      giver_id: data.giverId,
      thank_letter: data.thankLetter,
      is_public: false,
    })
    .select('id')
    .single();

  if (fbError || !fb) throw fbError || new Error('创建反馈失败');

  // 更新物品状态为 completed
  await supabase
    .from('items')
    .update({ status: 'completed' })
    .eq('id', data.itemId);

  // ===== 信用体系：按时反馈加分 + 闭环计数 =====
  try {
    // 判断是否按时（以确认收货时间为起点，7 天内算按时）
    const { data: item } = await supabase
      .from('items')
      .select('title, updated_at')
      .eq('id', data.itemId)
      .single();

    const completedAt = item?.updated_at ? new Date(item.updated_at) : new Date();
    const daysPassed = (Date.now() - completedAt.getTime()) / (1000 * 60 * 60 * 24);
    const onTime = daysPassed <= 7;

    await recordTrustEvent({
      userId: data.applicantId,
      eventType: onTime ? 'feedback_on_time' : 'feedback_late',
      scoreChange: onTime ? 10 : 0,
      description: onTime
        ? `按时提交「${item?.title || ''}」的使用反馈`
        : `超时提交「${item?.title || ''}」的反馈（超过 7 天）`,
      relatedItemId: data.itemId,
    });

    // 完成闭环 +1（申领者）
    const { data: appProfile } = await supabase
      .from('profiles')
      .select('completed_cycles')
      .eq('id', data.applicantId)
      .single();
    if (appProfile) {
      await supabase
        .from('profiles')
        .update({
          completed_cycles: (appProfile.completed_cycles || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.applicantId);
    }

    // 成功赠送 +1（赠主）
    const { data: giverProfile } = await supabase
      .from('profiles')
      .select('total_given')
      .eq('id', data.giverId)
      .single();
    if (giverProfile) {
      await supabase
        .from('profiles')
        .update({
          total_given: (giverProfile.total_given || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.giverId);
    }
  } catch (trustErr) {
    console.error('trust event error:', trustErr);
  }

  return { id: fb.id };
}

// 上传反馈图片到 Supabase Storage
export async function uploadFeedbackImage(
  feedbackId: string,
  file: File,
  sortOrder: number
): Promise<void> {
  const supabase = createClient();

  // 生成文件名
  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `${feedbackId}_${Date.now()}.${fileExt}`;
  const filePath = `feedback/${feedbackId}/${fileName}`;

  // 上传到 Storage
  const { error: uploadError } = await supabase.storage
    .from('item-images') // 复用已有 bucket
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  // 获取公开 URL
  const { data: urlData } = supabase.storage
    .from('item-images')
    .getPublicUrl(filePath);

  // 写入 feedback_images 表
  await supabase.from('feedback_images').insert({
    feedback_id: feedbackId,
    url: urlData.publicUrl,
  });
}

// 赠主评价反馈质量（送小红花）
export async function rateFeedback(
  feedbackId: string,
  quality: 'good' | 'poor',
  giverId: string,
  applicantId: string,
  itemId: string
): Promise<void> {
  const supabase = createClient();

  // 更新反馈质量
  await supabase
    .from('feedback')
    .update({ quality })
    .eq('id', feedbackId);

  // 如果是 good，给赠主送一朵小红花
  if (quality === 'good') {
    const { error: insertError } = await supabase.from('red_flowers').insert({
      giver_id: giverId,
      sender_id: applicantId,
      item_id: itemId,
    });

    // 忽略重复送花错误（唯一约束）
    if (insertError && !insertError.message.includes('duplicate')) {
      throw insertError;
    }

    // 直接更新赠主的小红花计数
    const { data: current } = await supabase
      .from('profiles')
      .select('red_flowers')
      .eq('id', giverId)
      .single();

    if (current) {
      await supabase
        .from('profiles')
        .update({ red_flowers: (current.red_flowers || 0) + 1 })
        .eq('id', giverId);
    }

    // 优质反馈：申领者信用分 +15
    await recordTrustEvent({
      userId: applicantId,
      eventType: 'feedback_good',
      scoreChange: 15,
      description: '反馈质量获得赠主认可',
      relatedItemId: itemId,
    });
  } else if (quality === 'poor') {
    // 敷衍反馈：拉黑 3 个月
    await recordTrustEvent({
      userId: applicantId,
      eventType: 'feedback_poor',
      scoreChange: 0,
      blockDuration: '3m',
      description: '赠主反馈你的感谢信敷衍，经平台复核确认',
      relatedItemId: itemId,
    });
  }
}

// ===== 赠主选择申领者 =====

export async function selectApplicant(
  applicationId: string,
  itemId: string
): Promise<Application> {
  const supabase = createClient();

  // 1. 接受该申领
  const { data: accepted, error: acceptErr } = await supabase
    .from('applications')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', applicationId)
    .select(`*, applicant:profiles(*)`)
    .single();

  if (acceptErr || !accepted) throw acceptErr || new Error('更新申领状态失败');

  // 2. 拒绝该物品的其他待定申领
  await supabase
    .from('applications')
    .update({
      status: 'rejected',
      updated_at: new Date().toISOString(),
      rejected_at: new Date().toISOString(),
    })
    .eq('item_id', itemId)
    .eq('status', 'pending')
    .neq('id', applicationId);

  // 3. 更新物品状态为 selected（等待寄出）
  await supabase
    .from('items')
    .update({ status: 'selected', updated_at: new Date().toISOString() })
    .eq('id', itemId);

  // 4. 通知申领者被选中
  const applicantId = (accepted as Application).applicant_id;
  if (applicantId) {
    await createNotification({
      userId: applicantId,
      type: 'application_accepted',
      title: '你的申领被选中了',
      body: '恭喜！你的申领被赠主选中了，请留意快递到付包裹。',
      relatedItemId: itemId,
    });
  }

  return accepted as Application;
}

// ===== 赠主确认寄出 =====

export async function confirmShipment(itemId: string, trackingNumber?: string): Promise<void> {
  const supabase = createClient();

  // 更新物品状态为 shipped
  await supabase
    .from('items')
    .update({
      status: 'shipped',
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId);

  // 获取被接受的申领者，通知对方
  const { data: acceptedApp } = await supabase
    .from('applications')
    .select('applicant_id')
    .eq('item_id', itemId)
    .eq('status', 'accepted')
    .single();

  if (acceptedApp?.applicant_id) {
    await createNotification({
      userId: acceptedApp.applicant_id,
      type: 'item_shipped',
      title: '物品已寄出',
      body: trackingNumber
        ? `赠主已寄出物品，快递单号：${trackingNumber}，请注意查收到付包裹。`
        : '赠主已寄出物品，请注意查收到付包裹。',
      relatedItemId: itemId,
    });
  }
}

// ===== 申领者确认收货 =====

export async function confirmReceipt(itemId: string): Promise<void> {
  const supabase = createClient();

  // 更新物品状态为 completed（反馈提交时也设 completed，这里先标记已收货等待反馈）
  await supabase
    .from('items')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId);

  // 通知赠主
  const { data: item } = await supabase
    .from('items')
    .select('giver_id, title')
    .eq('id', itemId)
    .single();

  if (item?.giver_id) {
    await createNotification({
      userId: item.giver_id,
      type: 'feedback_received',
      title: '物品已签收',
      body: `「${item.title}」已被签收，等待对方提交感谢反馈。`,
      relatedItemId: itemId,
    });
  }
}

// ===== 申领者拒绝接受 =====

export async function declineAcceptance(itemId: string, applicationId: string): Promise<void> {
  const supabase = createClient();

  // 1. 更新该申领为 cancelled
  await supabase
    .from('applications')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId);

  // 2. 物品回到 active 状态（让赠主可以重新选择）
  await supabase
    .from('items')
    .update({
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId);

  // 3. 通知赠主
  const { data: item } = await supabase
    .from('items')
    .select('giver_id, title')
    .eq('id', itemId)
    .single();

  if (item?.giver_id) {
    await createNotification({
      userId: item.giver_id,
      type: 'application_rejected',
      title: '受赠者拒绝了物品',
      body: `「${item.title}」的受赠者拒绝了接受，物品已回到可申领状态，你可以重新选择。`,
      relatedItemId: itemId,
    });
  }
}

// ===== getDashboardStats =====

// 获取赠主收到的公开感谢信（个人主页展示用）
export async function getPublicFeedbackForGiver(giverId: string): Promise<Feedback[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('feedback')
    .select(`
      *,
      applicant:profiles(*),
      item:items(id, title),
      images:feedback_images(*)
    `)
    .eq('giver_id', giverId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) return [];
  return (data || []) as Feedback[];
}

export async function getDashboardStats(userId: string) {
  const supabase = createClient();
  const [itemsRes, appsRes] = await Promise.all([
    supabase.from('items').select('id, status', { count: 'exact' }).eq('giver_id', userId),
    supabase.from('applications').select('id, status', { count: 'exact' }).eq('applicant_id', userId),
  ]);
  return {
    totalGiven: (itemsRes.data || []).filter((i) => i.status === 'completed').length,
    totalApplied: appsRes.count || 0,
    activeItems: (itemsRes.data || []).filter((i) => i.status === 'active').length,
  };
}
