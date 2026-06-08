// pages/publish/index.js
const app = getApp();

Page({
  data: {
    url: app.globalData.baseUrl + '/items/new'
  },

  onLoad() {
    console.log('发布页加载:', this.data.url);
  },

  onMessage(e) {
    const data = e.detail.data;
    if (data && data.length > 0) {
      const msg = data[data.length - 1];
      if (msg.action === 'navigate') {
        const tabMap = {
          home: '/pages/index/index',
          browse: '/pages/browse/index',
          profile: '/pages/profile/index'
        };
        if (tabMap[msg.page]) {
          wx.switchTab({ url: tabMap[msg.page] });
        }
      }
    }
  },

  onError(e) {
    console.error('webview error:', e);
    wx.showToast({ title: '加载失败，请重试', icon: 'none' });
  }
});
