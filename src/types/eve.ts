export type Anchor = {
  id: number;
  nickname: string;
  age: number;
  region: string;
  avatar: string;
  online: boolean;
  onDuty: boolean;
  inCall?: boolean; // 通话中(忙)
  live?: boolean; // 正在直播
  distance?: number; // 距离(km)
  height?: number; // cm
  weight?: number; // kg
  job?: string;
  relationship?: string;
  album?: string[]; // 付费私照
  intro: string;
  followers: number;
  price: number;
  tags: string[];
};

export type CurrentUser = {
  id: number;
  nickname: string;
  avatar: string;
  age: number;
  region: string;
  coins: number;
  following: number;
  followers: number;
  vipLevel: number;
  vipValidEnd: string;
  intro?: string;
  gender?: string;
};

export type Moment = {
  id: number;
  user: Anchor;
  content: string;
  images: string[];
  likes: number;
  liked: boolean;
};

export type Conversation = {
  id: number;
  user: Anchor;
  text: string;
  time: string;
  unread: number;
};

export type CallStatus = "answered" | "missed" | "canceled" | "rejected";
export type CallDirection = "in" | "out";

export type CallRecord = {
  id: number;
  user: Anchor;
  duration: string;
  time: string;
  status: CallStatus;
  direction: CallDirection;
  durationSec: number;
  coinCost: number;
};

export type Gift = {
  id: number;
  name: string;
  icon: string; // emoji glyph (mock — no per-gift image/SVGA assets on disk)
  price: number; // coins
  category?: "popular" | "luxury" | "lucky";
  tag?: "hot" | "new";
};

export type ChatMessage = {
  id: number;
  type: "text" | "image" | "gift" | "voice" | "call" | "system";
  outgoing: boolean; // true = sent by current user (right-aligned)
  time: string;
  date?: string; // day-group label
  text?: string;
  image?: string;
  duration?: number; // seconds, for voice / call
  gift?: { name: string; icon: string; price: number; count: number };
  callStatus?: CallStatus;
  translatedText?: string;
  showTranslation?: boolean;
  playing?: boolean;
};

export type NotificationItem = {
  id: number;
  title: string;
  content: string;
  time: string;
};

export type WalletPackage = {
  id: number;
  coins: number;
  bonus: number;
  price: string;
  selected?: boolean;
};

export type PaymentChannel = {
  id: string;
  name: string;
  description: string;
  mark: string;
  recommended?: boolean;
};

export type VipPlan = {
  id: number;
  level: number;
  name: string;
  months: number;
  price: string;
  perks: string[];
  recommended?: boolean;
};

export type SignDay = {
  day: number;
  reward: number;
  signed: boolean;
  today?: boolean;
};

export type LiveRoom = {
  id: number;
  anchor: Anchor;
  cover: string;
  title: string;
  viewers: number;
  tag: string;
};

export type WalletRecord = {
  id: number;
  title: string;
  time: string;
  amount: number;
  type: "income" | "expense";
};
