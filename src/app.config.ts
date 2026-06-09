export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/bookDetail/index',
    'pages/aiChat/index',
    'pages/notes/index',
    'pages/profile/index',
    'pages/admin/index',
    'pages/reservation/index',
    'pages/reservation/search',
    'pages/reservation/detail',
    'pages/reservation/my',
    'pages/reservation/status',
    'pages/admin/reservation/index',
    'pages/admin/reservation/detail',
  ],
  tabBar: {
    color: '#999999',
    selectedColor: '#3B82F6',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '书单',
        iconPath: 'assets/tab-book.png',
        selectedIconPath: 'assets/tab-book-active.png',
      },
      {
        pagePath: 'pages/aiChat/index',
        text: '伴读',
        iconPath: 'assets/tab-ai.png',
        selectedIconPath: 'assets/tab-ai-active.png',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/tab-profile.png',
        selectedIconPath: 'assets/tab-profile-active.png',
      },
    ],
  },
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '校园阅读伴读',
    navigationBarTextStyle: 'black',
  },
})
