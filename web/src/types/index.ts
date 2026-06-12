// 用户简档
export interface Profile {
  id: string;
  nickname: string;
  avatar_url: string;
  phone: string;
  city: string;
  bio: string;
  trust_score: number;
  completed_cycles: number;
  red_flowers: number;
  total_given: number;
  is_blocked: boolean;
  blocked_until?: string | null;
  block_reason?: string;
  created_at?: string;
  updated_at?: string;
}

// 物品
export interface Item {
  id: string;
  giver_id: string;
  category_id: number;
  title: string;
  description: string;
  condition: string;
  tags: string[];
  city: string;
  view_count: number;
  status: ItemStatus;
  applicant_count: number;
  created_at: string;
  // joined
  giver?: Profile;
  category_name?: string;
  images?: ItemImage[];
}

export type ItemStatus = 'active' | 'selected' | 'shipped' | 'completed' | 'archived' | 'expired';

// 物品图片
export interface ItemImage {
  id: string;
  item_id: string;
  url: string;
  thumbnail_url: string;
  sort_order: number;
}

// 分类
export interface Category {
  id: number;
  name: string;
  icon: string;
}

// 申领
export interface Application {
  id: string;
  item_id: string;
  applicant_id: string;
  reason: string;
  address: string;
  phone: string;
  edit_count: number;
  status: ApplicationStatus;
  created_at: string;
  applicant?: Profile;
  item?: Item;
}

export type ApplicationStatus = 'pending' | 'withdrawn' | 'rejected' | 'accepted' | 'cancelled';

// 反馈
export interface Feedback {
  id: string;
  item_id: string;
  applicant_id: string;
  giver_id: string;
  thank_letter: string;
  quality: 'pending' | 'good' | 'poor';
  submitted_at: string;
  created_at?: string;
  is_public?: boolean;
  applicant?: Profile;
  images?: FeedbackImage[];
}

export interface FeedbackImage {
  id: string;
  feedback_id: string;
  url: string;
}

// 通知
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  related_item_id: string | null;
  is_read: boolean;
  created_at: string;
}

export type NotificationType =
  | 'new_application'
  | 'application_accepted'
  | 'application_rejected'
  | 'item_shipped'
  | 'feedback_reminder'
  | 'feedback_received'
  | 'trust_updated';
