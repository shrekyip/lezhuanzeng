// pages/browse/index.js
const app = getApp();

Page({
  data: {
    url: app.globalData.baseUrl + '/browse'
  },

  onLoad() {
    console.log('浏览页加载:', this.data.url);
  },

  onMessage(e) {
    const data = e.detail.data;
    if (data && data.length > 0) {
      const msg = data[data.length - 1];
      if (msg.action === 'navigate') {
        const { page } = msg;
        const tabMap = {
          home: '/pages/index/index',
          publish: '/pages/publish/index',
          profile: '/pages/profile/index'
        };
        if (tabMap[page]) {
          wx.switchTab({ url: tabMap[page] });
        }
      }
    }
  },

  onError(e) {
    console.error('webview error:', e);
    wx.showToast({ title: '加载失败，请重试', icon: 'none' });
  }
});
