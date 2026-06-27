import { createI18n } from "vue-i18n";

const en = {
  common: {
    follow: "Follow",
    following: "Following",
    send: "Send",
    save: "Save",
    cancel: "Cancel",
    recharge: "Recharge",
    submit: "Submit",
    continue: "Continue",
    later: "Maybe later",
    online: "online",
    offline: "offline",
    records: "Records"
  },
  home: {
    recommend: "Recommend",
    following: "Following",
    all: "All",
    hot: "Hot",
    new: "New",
    nearby: "Nearby",
    dance: "Dance",
    empty: "No one here yet"
  },
  match: {
    title: "Match",
    subtitle: "Meet someone new in one tap",
    random: "Random",
    goddess: "Goddess",
    perMatch: "/ match"
  },
  moments: {
    discover: "Discover",
    following: "Following"
  },
  messages: {
    message: "Message",
    call: "Call",
    notifications: "Notifications",
    noNew: "No new notifications",
    visitors: "Visitors",
    newVisitors: "You have new visitors!"
  },
  mine: {
    following: "Following",
    followers: "Followers",
    moments: "Moments",
    visitor: "Visitor",
    becomeVip: "Become VIP",
    vipDesc: "Get 8000 coins & more perks",
    myCoins: "My coins",
    games: "Games",
    blockList: "Block List",
    feedback: "Feedback",
    settings: "Settings",
    language: "Language",
    idCopied: "ID copied",
    cacheCleared: "Cache cleared"
  },
  firstCharge: {
    title: "First Recharge Bonus",
    subtitle: "Double coins on your very first top-up!",
    cta: "Recharge now"
  },
  call: {
    lowBalance: "Low balance — call ends soon",
    topUp: "Top up",
    hangUp: "Hang up",
    endingIn: "Call ends in {n}s"
  },
  lang: {
    en: "English",
    zh: "中文"
  }
};

const zh: typeof en = {
  common: {
    follow: "关注",
    following: "已关注",
    send: "发送",
    save: "保存",
    cancel: "取消",
    recharge: "充值",
    submit: "提交",
    continue: "继续",
    later: "以后再说",
    online: "在线",
    offline: "离线",
    records: "明细"
  },
  home: {
    recommend: "推荐",
    following: "关注",
    all: "全部",
    hot: "热门",
    new: "最新",
    nearby: "附近",
    dance: "热舞",
    empty: "这里还没有人"
  },
  match: {
    title: "匹配",
    subtitle: "一键遇见新朋友",
    random: "随机",
    goddess: "女神",
    perMatch: "/ 次"
  },
  moments: {
    discover: "发现",
    following: "关注"
  },
  messages: {
    message: "消息",
    call: "通话",
    notifications: "通知",
    noNew: "暂无新通知",
    visitors: "访客",
    newVisitors: "有新访客啦！"
  },
  mine: {
    following: "关注",
    followers: "粉丝",
    moments: "动态",
    visitor: "访客",
    becomeVip: "成为 VIP",
    vipDesc: "领 8000 金币及更多特权",
    myCoins: "我的金币",
    games: "游戏",
    blockList: "黑名单",
    feedback: "反馈",
    settings: "设置",
    language: "语言",
    idCopied: "ID 已复制",
    cacheCleared: "缓存已清除"
  },
  firstCharge: {
    title: "首充奖励",
    subtitle: "首次充值金币翻倍！",
    cta: "立即充值"
  },
  call: {
    lowBalance: "余额不足,通话即将结束",
    topUp: "去充值",
    hangUp: "挂断",
    endingIn: "{n} 秒后结束"
  },
  lang: {
    en: "English",
    zh: "中文"
  }
};

export const i18n = createI18n({
  legacy: false,
  locale: "en",
  fallbackLocale: "en",
  messages: { en, zh }
});

export type AppLocale = "en" | "zh";
