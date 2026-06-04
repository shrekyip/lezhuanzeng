// MVP 阶段的数据层 - 使用本地模拟数据
// 后期接入 Supabase 后，只需要替换这个文件中的函数实现

import type {
  Profile,
  Item,
  ItemImage,
  Category,
  Application,
  Feedback,
  Notification,
  ItemStatus,
  ApplicationStatus,
} from "@/types";

// ===== 模拟数据 =====

let nextUserId = 3;

export const mockProfiles: Profile[] = [
  {
    id: "user-1",
    nickname: "小林",
    avatar_url: "",
    city: "深圳",
    trust_score: 100,
    completed_cycles: 0,
    red_flowers: 0,
    total_given: 0,
    is_blocked: false,
  },
  {
    id: "user-2",
    nickname: "阿花",
    avatar_url: "",
    city: "广州",
    trust_score: 100,
    completed_cycles: 0,
    red_flowers: 0,
    total_given: 0,
    is_blocked: false,
  },
  {
    id: "admin",
    nickname: "乐转赠运营",
    avatar_url: "",
    city: "深圳",
    trust_score: 999,
    completed_cycles: 0,
    red_flowers: 0,
    total_given: 0,
    is_blocked: false,
  },
];

export const mockCategories: Category[] = [
  { id: 1, name: "衣物", icon: "👔" },
  { id: 2, name: "书籍", icon: "📚" },
  { id: 3, name: "电子产品", icon: "📱" },
  { id: 4, name: "家居用品", icon: "🏠" },
  { id: 5, name: "厨房用品", icon: "🍳" },
  { id: 6, name: "母婴用品", icon: "👶" },
  { id: 7, name: "运动户外", icon: "⚽" },
  { id: 8, name: "美妆个护", icon: "💄" },
  { id: 9, name: "玩具文具", icon: "🧸" },
  { id: 10, name: "其他", icon: "📦" },
];

let nextItemId = 1;

export function generateMockItems(count: number = 6): Item[] {
  const sampleItems: Omit<Item, "id" | "created_at" | "images">[] = [
    {
      giver_id: "user-1",
      category_id: 1,
      title: "闲置冬季外套",
      description:
        "仅穿过两次的冬季外套，尺码 M，保暖效果好。因为搬家后气候变暖，不需要厚外套了。希望送给真正需要的人。",
      condition: "良好",
      tags: ["冬季", "外套", "M码"],
      city: "深圳",
      view_count: 0,
      status: "active",
      applicant_count: 0,
      giver: mockProfiles[0],
      category_name: "衣物",
    },
    {
      giver_id: "user-1",
      category_id: 2,
      title: "《代码大全》第二版",
      description:
        "经典编程书籍，品相完好，仅翻阅过几次。送给正在学习编程的朋友。",
      condition: "良好",
      tags: ["编程", "计算机", "技术"],
      city: "深圳",
      view_count: 0,
      status: "active",
      applicant_count: 0,
      giver: mockProfiles[0],
      category_name: "书籍",
    },
    {
      giver_id: "user-2",
      category_id: 3,
      title: "Kindle Paperwhite 入门款",
      description:
        "之前用来读小说的，现在买了新款所以闲置了。功能正常，屏幕无划痕，送充电线。希望给爱看书的朋友。",
      condition: "良好",
      tags: ["电子书", "阅读器", "Kindle"],
      city: "广州",
      view_count: 0,
      status: "active",
      applicant_count: 0,
      giver: mockProfiles[1],
      category_name: "电子产品",
    },
    {
      giver_id: "user-2",
      category_id: 10,
      title: "手工编织围巾",
      description:
        "自己织的围巾，全新未使用。本来是准备送朋友的但对方已经搬家了。希望送给怕冷的人。",
      condition: "全新",
      tags: ["手工", "围巾", "冬季"],
      city: "广州",
      view_count: 0,
      status: "active",
      applicant_count: 0,
      giver: mockProfiles[1],
      category_name: "其他",
    },
    {
      giver_id: "user-1",
      category_id: 4,
      title: "宜家台灯",
      description:
        "买回来发现光线不太适合看书，用了两周就一直放着。功能完好，送灯泡。",
      condition: "良好",
      tags: ["台灯", "照明", "宜家"],
      city: "深圳",
      view_count: 0,
      status: "active",
      applicant_count: 0,
      giver: mockProfiles[0],
      category_name: "家居用品",
    },
    {
      giver_id: "user-2",
      category_id: 2,
      title: "三体全集",
      description:
        "刘慈欣经典科幻小说，纸质版三本全。读过一遍，品相良好。希望送给还没看过的朋友。",
      condition: "良好",
      tags: ["科幻", "文学", "小说"],
      city: "广州",
      view_count: 0,
      status: "active",
      applicant_count: 0,
      giver: mockProfiles[1],
      category_name: "书籍",
    },
  ];

  return sampleItems.slice(0, count).map((item) => {
    const id = `item-${nextItemId++}`;
    const days = nextItemId >= 3 ? nextItemId - 2 : 0;
    return {
      ...item,
      id,
      created_at: new Date(
        Date.now() - days * 24 * 60 * 60 * 1000
      ).toISOString(),
      images: [
        {
          id: `img-${id}`,
          item_id: id,
          url: `https://picsum.photos/seed/${id}/600/400`,
          thumbnail_url: `https://picsum.photos/seed/${id}/300/200`,
          sort_order: 0,
        },
      ],
    };
  });
}

// ===== 数据存储 =====

let items: Item[] = [];
let applications: Application[] = [];
let feedbacks: Feedback[] = [];
let notifications: Notification[] = [];

// 初始化数据
export function initMockData() {
  if (items.length === 0) {
    items = generateMockItems(6);
  }
}

// ===== API 函数（模拟） =====

export function getCurrentUser(): Profile {
  return mockProfiles[0]; // 默认用小林
}

export function setCurrentUser(userId: string) {
  const user = mockProfiles.find((p) => p.id === userId);
  return user || mockProfiles[0];
}

export function getProfiles(): Profile[] {
  return mockProfiles;
}

export function getProfile(id: string): Profile | undefined {
  return mockProfiles.find((p) => p.id === id);
}

export function getCategories(): Category[] {
  return mockCategories;
}

export function getItems(filters?: {
  categoryId?: number;
  city?: string;
  keyword?: string;
}): Item[] {
  let result = [...items].filter((i) => i.status === "active");

  if (filters?.categoryId) {
    result = result.filter((i) => i.category_id === filters.categoryId);
  }
  if (filters?.city) {
    result = result.filter((i) => i.city === filters.city);
  }
  if (filters?.keyword) {
    const kw = filters.keyword.toLowerCase();
    result = result.filter(
      (i) =>
        i.title.toLowerCase().includes(kw) ||
        i.description.toLowerCase().includes(kw) ||
        i.tags.some((t) => t.toLowerCase().includes(kw))
    );
  }

  return result.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function getItem(id: string): Item | undefined {
  return items.find((i) => i.id === id);
}

export function createItem(
  data: Omit<Item, "id" | "created_at" | "images" | "giver" | "view_count">
): Item {
  const images: ItemImage[] = [
    {
      id: `img-${Date.now()}`,
      item_id: "",
      url: `https://picsum.photos/seed/${Date.now()}/600/400`,
      thumbnail_url: `https://picsum.photos/seed/${Date.now()}/300/200`,
      sort_order: 0,
    },
  ];
  const newItem: Item = {
    ...data,
    id: `item-${nextItemId++}`,
    created_at: new Date().toISOString(),
    images,
    giver: getProfile(data.giver_id),
    category_name: mockCategories.find((c) => c.id === data.category_id)?.name,
    view_count: 0,
  };
  if (newItem.images && newItem.images[0]) {
    newItem.images[0].item_id = newItem.id;
  }
  items.unshift(newItem);
  return newItem;
}

export function updateItemStatus(id: string, status: ItemStatus) {
  const item = items.find((i) => i.id === id);
  if (item) {
    item.status = status;
    return item;
  }
  return undefined;
}

export function getApplicationsForItem(itemId: string): Application[] {
  return applications
    .filter((a) => a.item_id === itemId)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
}

export function getApplicationsByUser(userId: string): Application[] {
  return applications.filter((a) => a.applicant_id === userId);
}

export function createApplication(
  data: Omit<Application, "id" | "status" | "created_at" | "edit_count">
): Application {
  const app: Application = {
    ...data,
    id: `app-${Date.now()}`,
    status: "pending",
    edit_count: 0,
    created_at: new Date().toISOString(),
    applicant: getProfile(data.applicant_id),
  };
  applications.push(app);

  // 更新物品申领数
  const item = items.find((i) => i.id === data.item_id);
  if (item) {
    item.applicant_count++;
  }

  return app;
}

export function updateApplicationStatus(
  id: string,
  status: ApplicationStatus
) {
  const app = applications.find((a) => a.id === id);
  if (app) {
    app.status = status;
  }
  return app;
}

export function getUserNotifications(userId: string): Notification[] {
  return notifications
    .filter((n) => n.user_id === userId)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
}

export function markNotificationRead(id: string) {
  const n = notifications.find((n) => n.id === id);
  if (n) n.is_read = true;
}

export function getUnreadCount(userId: string): number {
  return notifications.filter((n) => n.user_id === userId && !n.is_read).length;
}
