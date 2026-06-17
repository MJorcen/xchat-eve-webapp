export type Anchor = {
  id: number;
  nickname: string;
  age: number;
  region: string;
  avatar: string;
  online: boolean;
  onDuty: boolean;
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

export type CallRecord = {
  id: number;
  user: Anchor;
  duration: string;
  time: string;
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
