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

export async function getCurrentUser(): Promise<Profile> {
  const supabase = createClient();
  const id = getCurrentUserId();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) {
    // fallback: return first demo user
    const { data: fallback } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
      .single();
    return fallback as Profile;
  }
  return data as Profile;
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

  // 4. 创建通知：告知申领者被选中
  const applicantId = (accepted as Application).applicant_id;
  const giverId = (accepted as Application).item?.giver_id
    || (await supabase.from('items').select('giver_id').eq('id', itemId).single()).data?.giver_id;

  if (applicantId) {
    await supabase.from('notifications').insert({
      user_id: applicantId,
      type: 'selected',
      content: '恭喜！你的申领被赠主选中了，请留意快递到付包裹。',
      item_id: itemId,
    }).select();
  }

  return accepted as Application;
}

// ===== getDashboardStats =====

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
