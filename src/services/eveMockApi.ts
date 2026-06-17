import type { Anchor, CallRecord, Conversation, CurrentUser, Moment, NotificationItem, PaymentChannel, WalletPackage } from "../types/eve";

const avatarSeeds = ["Lina", "Ava", "Mira", "Nora", "Sia", "Isha", "Zara", "Riya"];

const anchors: Anchor[] = avatarSeeds.map((name, index) => ({
  id: 860120 + index,
  nickname: name,
  age: [22, 24, 21, 26, 23, 25, 20, 27][index],
  region: ["ind", "phl", "idn", "bra", "usa", "vnm", "egy", "mar"][index],
  avatar: `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${name}&backgroundColor=ffd5dc,ffe6a7,c0aede,d1d4f9`,
  online: index % 3 !== 1,
  onDuty: index % 2 === 0,
  intro: "Open minded, sweet voice, love music and night talks. Say hi and let's make today less boring.",
  followers: 1200 + index * 486,
  price: [300, 260, 280, 320, 220, 300, 260, 340][index],
  tags: ["Single", "Music", "Travel", "Movies"].slice(0, 2 + (index % 3))
}));

const currentUser: CurrentUser = {
  id: 778899,
  nickname: "Guest User",
  avatar: "https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=Guest&backgroundColor=fecaca",
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

const calls: CallRecord[] = anchors.slice(2, 6).map((user, index) => ({
  id: user.id,
  user,
  duration: ["00:03:42", "00:12:16", "00:01:35", "00:08:28"][index],
  time: ["2026-06-17 05:20", "2026-06-16 22:11", "2026-06-15 19:40", "2026-06-14 12:05"][index]
}));

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
  getBlockedUsers: () => anchors.slice(5, 7)
};
