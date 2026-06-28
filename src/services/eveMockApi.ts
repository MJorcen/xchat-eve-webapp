import type {
  Anchor,
  CallRecord,
  ChatMessage,
  Conversation,
  CurrentUser,
  Gift,
  LiveRoom,
  Moment,
  NotificationItem,
  PaymentChannel,
  SignDay,
  VipPlan,
  WalletPackage,
  WalletRecord
} from "../types/eve";

const avatarSeeds = ["Lina", "Ava", "Mira", "Nora", "Sia", "Isha", "Zara", "Riya"];
// 真实 SFW 人像占位图（randomuser），数据层统一，后续可一键替换为真实后端头像
const portraitIds = [44, 68, 21, 32, 9, 75, 12, 51];

// 在线状态展示 4 态:Live / Online / Busy(通话中) / Offline
const onlineArr = [true, true, true, true, false, true, true, true];
const onDutyArr = [true, true, true, true, false, true, true, true];
const liveArr = [true, false, false, false, false, false, false, false];
const inCallArr = [false, false, true, false, false, false, true, false];
const distanceArr = [0.8, 1.2, 2.4, 3.1, 5.6, 0.5, 1.9, 4.2]; // km

const anchors: Anchor[] = avatarSeeds.map((name, index) => ({
  id: 860120 + index,
  nickname: name,
  age: [22, 24, 21, 26, 23, 25, 20, 27][index],
  region: ["bgd", "phl", "idn", "bra", "egy", "vnm", "col", "esp"][index],
  avatar: `https://randomuser.me/api/portraits/women/${portraitIds[index]}.jpg`,
  online: onlineArr[index],
  onDuty: onDutyArr[index],
  live: liveArr[index],
  inCall: inCallArr[index],
  distance: distanceArr[index],
  height: [165, 168, 160, 170, 163, 167, 158, 172][index],
  weight: [50, 52, 48, 55, 49, 53, 46, 57][index],
  job: ["Model", "Student", "Designer", "Dancer", "Singer", "Nurse", "Barista", "Artist"][index],
  relationship: ["Single", "Single", "It's complicated", "Single", "Single", "Open", "Single", "Single"][index],
  album: [0, 1, 2, 3].map((k) => `https://randomuser.me/api/portraits/women/${(portraitIds[index] + k * 7) % 99}.jpg`),
  intro: "Open minded, sweet voice, love music and night talks. Say hi and let's make today less boring.",
  followers: 1200 + index * 486,
  price: [300, 260, 280, 320, 220, 300, 260, 340][index],
  tags: ["Single", "Music", "Travel", "Movies"].slice(0, 2 + (index % 3))
}));

const currentUser: CurrentUser = {
  id: 778899,
  nickname: "Guest User",
  avatar: "https://randomuser.me/api/portraits/women/65.jpg",
  age: 28,
  region: "ind",
  coins: 1280,
  following: 36,
  followers: 108,
  vipLevel: 0,
  vipValidEnd: "2026-07-31"
};

const moments: Moment[] = anchors.slice(0, 5).map((user, index) => ({
  id: index + 1,
  user,
  content: [
    "Good evening. I am online now, waiting for a warm video call.",
    "New dress today. Tell me which color looks best?",
    "Small talk, big smile. I like people who are kind.",
    "Music makes the night soft. What song are you playing?",
    "Coffee first, then calls. Let's meet."
  ][index],
  images: [
    `https://picsum.photos/seed/eve-${index}-a/540/540`,
    `https://picsum.photos/seed/eve-${index}-b/540/540`
  ],
  likes: 120 + index * 37,
  liked: index % 2 === 0
}));

const conversations: Conversation[] = anchors.slice(0, 6).map((user, index) => ({
  id: user.id,
  user,
  text: ["Hi, are you free now?", "[Video Call]", "Missed you today.", "Send me a smile.", "[Gift]", "Let's chat tonight."][index],
  time: ["18:20", "17:42", "Yesterday", "Mon", "Sun", "Sat"][index],
  unread: [2, 0, 5, 1, 0, 0][index]
}));

const callDurationsSec = [222, 736, 0, 508];
const callStatuses: CallRecord["status"][] = ["answered", "answered", "canceled", "answered"];
const callDirections: CallRecord["direction"][] = ["out", "in", "out", "in"];

const calls: CallRecord[] = anchors.slice(2, 6).map((user, index) => {
  const durationSec = callDurationsSec[index];
  const mm = String(Math.floor(durationSec / 60)).padStart(2, "0");
  const ss = String(durationSec % 60).padStart(2, "0");
  return {
    id: user.id,
    user,
    duration: `00:${mm}:${ss}`,
    time: ["2026-06-17 05:20", "2026-06-16 22:11", "2026-06-15 19:40", "2026-06-14 12:05"][index],
    status: callStatuses[index],
    direction: callDirections[index],
    durationSec,
    coinCost: Math.ceil(durationSec / 60) * user.price
  };
});

const notifications: NotificationItem[] = [
  { id: 1, title: "System", content: "Welcome to EVE. New rewards are waiting for you.", time: "18:10" },
  { id: 2, title: "VIP", content: "Become VIP and unlock lower match price.", time: "Yesterday" },
  { id: 3, title: "Security", content: "Keep conversations friendly and respectful.", time: "Mon" }
];

const walletPackages: WalletPackage[] = [
  { id: 1, coins: 600, bonus: 60, price: "$4.99", selected: true },
  { id: 2, coins: 1200, bonus: 180, price: "$9.99" },
  { id: 3, coins: 3000, bonus: 600, price: "$19.99" },
  { id: 4, coins: 6800, bonus: 1600, price: "$49.99" }
];

const paymentChannels: PaymentChannel[] = [
  { id: "card", name: "Credit / Debit Card", description: "Visa, Mastercard, Amex", mark: "CARD", recommended: true },
  { id: "google-pay", name: "Google Pay", description: "Fast checkout on Android devices", mark: "GPay" },
  { id: "wallet", name: "Local Wallet", description: "Pay with supported regional wallets", mark: "WAL" },
  { id: "upi", name: "UPI", description: "Instant bank transfer", mark: "UPI" }
];

const vipPlans: VipPlan[] = [
  { id: 1, level: 1, name: "Silver", months: 1, price: "$9.99", perks: ["Lower match price", "Priority queue"] },
  { id: 2, level: 2, name: "Gold", months: 3, price: "$24.99", perks: ["All Silver perks", "Free daily calls", "VIP badge"], recommended: true },
  { id: 3, level: 3, name: "Diamond", months: 12, price: "$79.99", perks: ["All Gold perks", "Invisible visits", "Exclusive gifts"] }
];

const signDays: SignDay[] = [
  { day: 1, reward: 20, signed: true },
  { day: 2, reward: 30, signed: true },
  { day: 3, reward: 50, signed: false, today: true },
  { day: 4, reward: 60, signed: false },
  { day: 5, reward: 80, signed: false },
  { day: 6, reward: 100, signed: false },
  { day: 7, reward: 200, signed: false }
];

const liveRooms: LiveRoom[] = anchors.slice(0, 6).map((anchor, index) => ({
  id: 9000 + index,
  anchor,
  cover: `https://picsum.photos/seed/live-${index}/480/640`,
  title: ["Singing tonight 🎤", "Just chatting", "Dance party", "Late night talk", "Guess game", "Say hi to me"][index],
  viewers: 120 + index * 233,
  tag: ["Hot", "New", "Music", "Game", "Talk", "Dance"][index]
}));

// 礼物目录：mock 范围无单独礼物图片/SVGA 素材，用 emoji 字形代替 icon
const gifts: Gift[] = [
  { id: 1, name: "Rose", icon: "🌹", price: 10, category: "popular", tag: "hot" },
  { id: 2, name: "Kiss", icon: "💋", price: 30, category: "popular" },
  { id: 3, name: "Heart", icon: "❤️", price: 66, category: "popular" },
  { id: 4, name: "Teddy", icon: "🧸", price: 99, category: "popular" },
  { id: 5, name: "Cake", icon: "🍰", price: 52, category: "popular" },
  { id: 6, name: "Star", icon: "⭐", price: 20, category: "popular" },
  { id: 7, name: "Crown", icon: "👑", price: 188, category: "luxury" },
  { id: 8, name: "Ring", icon: "💍", price: 520, category: "luxury" },
  { id: 9, name: "Diamond", icon: "💎", price: 888, category: "luxury", tag: "new" },
  { id: 10, name: "Rocket", icon: "🚀", price: 1314, category: "luxury" },
  { id: 11, name: "Clover", icon: "🍀", price: 8, category: "lucky" },
  { id: 12, name: "Rainbow", icon: "🌈", price: 48, category: "lucky" }
];

// 每个会话的种子聊天记录（文本/图片/礼物/语音/通话/系统混排）
function buildChatThread(anchorId: number): ChatMessage[] {
  const anchor = anchors.find((a) => a.id === anchorId) || anchors[0];
  return [
    { id: 1, type: "system", outgoing: false, time: "", date: "Today", text: "You are now connected. Say hi 👋" },
    { id: 2, type: "text", outgoing: false, time: "18:02", text: `Hi! I'm ${anchor.nickname}, nice to meet you 😊` },
    { id: 3, type: "text", outgoing: true, time: "18:03", text: "Hey, you look lovely today" },
    { id: 4, type: "image", outgoing: false, time: "18:04", image: `https://picsum.photos/seed/chat-${anchorId}/360/480` },
    { id: 5, type: "voice", outgoing: false, time: "18:05", duration: 4 },
    { id: 6, type: "text", outgoing: true, time: "18:06", text: "Can we have a video call tonight?" },
    { id: 7, type: "gift", outgoing: true, time: "18:07", gift: { name: "Rose", icon: "🌹", price: 10, count: 1 } },
    { id: 8, type: "call", outgoing: true, time: "18:09", duration: 222, callStatus: "answered" },
    { id: 9, type: "text", outgoing: false, time: "18:20", text: "Are you free now? 💕" }
  ];
}

const walletRecords: WalletRecord[] = [
  { id: 1, title: "Coins purchase", time: "2026-06-26 10:12", amount: 600, type: "income" },
  { id: 2, title: "Video call · Mira", time: "2026-06-25 22:40", amount: -280, type: "expense" },
  { id: 3, title: "Gift sent · Ava", time: "2026-06-25 21:05", amount: -99, type: "expense" },
  { id: 4, title: "Sign-in reward", time: "2026-06-25 09:00", amount: 30, type: "income" },
  { id: 5, title: "Coins purchase", time: "2026-06-24 18:33", amount: 1200, type: "income" }
];

export const eveMockApi = {
  getAnchors: () => anchors,
  getFollowing: () => anchors.filter((_, index) => index % 2 === 0),
  getAnchor: (id: number) => anchors.find((item) => item.id === id) || anchors[0],
  getCurrentUser: () => currentUser,
  getMoments: () => moments,
  getUserMoments: (id: number) => moments.filter((item) => item.user.id === id || item.id <= 3),
  getConversations: () => conversations,
  getCalls: () => calls,
  getNotifications: () => notifications,
  getVisitors: () => anchors.slice(1, 7),
  getWalletPackages: () => walletPackages,
  getPaymentChannels: () => paymentChannels,
  getBlockedUsers: () => anchors.slice(5, 7),
  getVipPlans: () => vipPlans,
  getSignDays: () => signDays,
  getLiveRooms: () => liveRooms,
  getWalletRecords: () => walletRecords,
  getGifts: () => gifts,
  getChatMessages: (anchorId: number) => buildChatThread(anchorId),
  getCall: (id: number) => calls.find((c) => c.id === id) || calls[0],
  translate: (text: string) => `（译）${text}`
};
