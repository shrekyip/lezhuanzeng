# 乐转赠小程序 - 快速上线指南

## 目录结构
```
miniprogram/
  app.js              全局逻辑
  app.json            全局配置（页面路由 + TabBar）
  app.wxss            全局样式
  sitemap.json        搜索配置
  pages/
    index/            首页（lezhuanzeng.com/）
    browse/           浏览页（lezhuanzeng.com/browse）
    publish/          发布页（lezhuanzeng.com/items/new）
    profile/          我的（lezhuanzeng.com/dashboard）
  assets/icons/       TabBar 图标（占位图，可替换）
```

---

## 第一步：注册小程序账号

1. 打开 https://mp.weixin.qq.com
2. 点击右上角「立即注册」→ 选「小程序」
3. 选择主体类型：**个人**
4. 用手机号完成注册
5. 登录后台 → 左侧「开发管理」→「开发设置」→ 复制 **AppID**

---

## 第二步：填写 AppID

打开 `miniprogram/project.config.json`，把两处 `YOUR_APPID_HERE` 替换为你的 AppID：

```json
{
  "appid": "wx1234567890abcdef",
  ...
}
```

---

## 第三步：配置业务域名（关键！）

`web-view` 只能访问已配置的域名，否则直接白屏。

1. 登录 https://mp.weixin.qq.com
2. 左侧「开发管理」→「开发设置」
3. 滚动到「业务域名」
4. 点击「开始配置」→ 添加：
   ```
   https://www.lezhuanzeng.com
   https://lezhuanzeng.com
   ```
5. 下载验证文件（一个 txt 文件），上传到 lezhuanzeng.com 网站根目录

**上传验证文件方法（在 WorkBuddy 桌面端告诉 AI 帮你完成）：**
- 文件放到 `web/public/` 目录下即可（Next.js 会自动作为静态文件服务）
- 例：`web/public/MP_verify_xxxxx.txt`

---

## 第四步：安装微信开发者工具

下载地址：https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html

安装后：
1. 扫码登录
2. 选「小程序」→「导入项目」
3. 目录选 `DSL_Platform/miniprogram`
4. 填入 AppID
5. 点「确定」

---

## 第五步：预览和测试

在开发者工具里可以：
- 直接预览 4 个 Tab 页（会加载真实的 lezhuanzeng.com）
- 用「真机调试」扫码在手机上测试

---

## 第六步：替换正式图标（可选，但建议上线前完成）

从 https://iconfont.cn 下载以下图标，保存为 81×81 PNG：
- 首页：house / home 类
- 浏览：search / grid 类  
- 发布：plus / gift 类
- 我的：person / user 类

普通状态用灰色 `#999999`，选中状态用橙色 `#FF6B35`

---

## 第七步：提交审核上线

1. 开发者工具 → 「上传」→ 填写版本号（如 1.0.0）和备注
2. 登录 https://mp.weixin.qq.com → 「版本管理」
3. 点「提交审核」
4. 审核通过后「发布」

审核一般 1-3 个工作日。

---

## 常见问题

**Q：web-view 白屏**  
A：检查业务域名是否已配置，且验证文件已上传

**Q：TabBar 图标不显示**  
A：PNG 格式，不能用 SVG，大小建议 81×81px

**Q：个人主体可以上线吗？**  
A：可以，但部分功能（如微信支付）需要企业主体。赠物平台不涉及支付，个人主体完全够用。
