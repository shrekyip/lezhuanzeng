// pages/profile/index.js
const app = getApp();

Page({
  data: {
    url: app.globalData.baseUrl + '/dashboard'
  },

  onLoad() {
    console.log('我的页面加载:', this.data.url);
  },

  onMessage(e) {
    const data = e.detail.data;
    if (data && data.length > 0) {
      const msg = data[data.length - 1];
      if (msg.action === 'navigate') {
        const tabMap = {
          home: '/pages/index/index',
          browse: '/pages/browse/index',
          publish: '/pages/publish/index'
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
