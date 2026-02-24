export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/hotelList/hotelList'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'WeChat',
    navigationBarTextStyle: 'black'
  },
  permission: {
    'scope.userLocation': {
      desc: '您的位置信息将用于为您推荐附近的酒店' // 弹窗给用户看的理由
    }
  },
  requiredPrivateInfos: ['getLocation'] // 现代小程序架构必须显式声明
})
