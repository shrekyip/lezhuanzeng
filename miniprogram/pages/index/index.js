// pages/index/index.js
const app = getApp();

Page({
  data: {
    url: app.globalData.baseUrl + '/'
  },

  onLoad() {
    console.log('首页加载:', this.data.url);
  },

  // 接收 H5 发来的消息（用于导航跳转等）
  onMessage(e) {
    const data = e.detail.data;
    if (data && data.length > 0) {
      const msg = data[data.length - 1];
      console.log('H5 消息:', msg);

      // 处理 H5 发来的导航指令
      if (msg.action === 'navigate') {
        const { page } = msg;
        if (page === 'browse') {
          wx.switchTab({ url: '/pages/browse/index' });
        } else if (page === 'publish') {
          wx.switchTab({ url: '/pages/publish/index' });
        } else if (page === 'profile') {
          wx.switchTab({ url: '/pages/profile/index' });
        }
      }
    }
  },

  onLoad_error() {
    wx.showToast({
      title: '页面加载失败，请检查网络',
      icon: 'none'
    });
  },

  onError(e) {
    console.error('webview error:', e);
    wx.showToast({
      title: '加载失败，请重试',
      icon: 'none'
    });
  }
});
