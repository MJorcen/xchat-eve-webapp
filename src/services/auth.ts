// 登录/注册接口（真实后端）。当前仅对接「设备快捷登录」，其余业务仍走 mock。
// 网关前缀见 VITE_API_BASE（/api/v1），user-svc 路径段为 /user。

import { http } from "./http";
import { api } from "./api";
import { getDeviceId, getDeviceMeta } from "@/utils/device";
import { useUserStore } from "@/stores";
import type { CurrentUser } from "@/types/eve";

const USER_SVC = "/user";

/** 后端 MiniUser（登录/注册返回的用户信息，字段为后端命名）。 */
export interface MiniUser {
  id: number;
  cuteId?: string;
  nickname?: string;
  icon?: string;
  gender?: number;
  status?: number;
  country?: string;
  vipLevel?: number;
  [k: string]: unknown;
}

/** 后端 SignInVo（登录/注册响应）。 */
export interface SignInVo {
  user: MiniUser;
  authToken?: string;
  neteaskAuthToken?: string;
  userLaunchConfig?: unknown;
  signUpItemList?: unknown[];
}

/**
 * 设备快捷登录：用持久化设备密钥换取登录态。
 * 后端 provider=device，identityKey=设备密钥；设备首次登录会自动注册并直接发 token。
 */
export function deviceSignIn(): Promise<SignInVo> {
  const { brand, model } = getDeviceMeta();
  return http.post<SignInVo>(
    `${USER_SVC}/auth/signIn`,
    { provider: "device", identityKey: getDeviceId(), brand, model },
    { auth: false }
  );
}

/** facade 大卡（完整资料卡）。targetId 传自己 id 即为「我的资料」。 */
export interface UserCard {
  user: {
    id: number;
    cuteId?: string;
    nickname?: string;
    icon?: string;
    gender?: number;
    area?: string;
    country?: string;
    birthdate?: number;
    aboutMe?: string;
    [k: string]: unknown;
  };
  wealthLevel?: number;
  charmLevel?: number;
  vipLevel?: number;
  relation?: { fansCount?: number; followCount?: number; relationStatus?: number };
  albums?: unknown[];
  [k: string]: unknown;
}

/** 拉取用户大卡（完整资料）。requestUserId 可选，用于权限判断。 */
export function getUserCard(targetId: number, requestUserId?: number): Promise<UserCard> {
  return http.get<UserCard>(`/facade/userCard/getLgCard`, { targetId, requestUserId });
}

/** 登出（使服务端 token 失效）。 */
export function signOut(): Promise<void> {
  return http.post<void>(`${USER_SVC}/auth/signOut`);
}

/** 大卡 → 前端 CurrentUser（金币/会员有效期不在卡里，由钱包接口或 mock 补齐）。 */
export function cardToCurrentUser(card: UserCard): Partial<CurrentUser> {
  const u = card.user ?? ({} as UserCard["user"]);
  const out: Partial<CurrentUser> = {
    id: u.id,
    nickname: u.nickname ?? "",
    avatar: (u.icon as string) ?? "",
    region: (u.country || u.area || "") as string,
    following: card.relation?.followCount ?? 0,
    followers: card.relation?.fansCount ?? 0,
    vipLevel: card.vipLevel ?? 0
  };
  if (u.gender != null) out.gender = String(u.gender);
  if (typeof u.aboutMe === "string") out.intro = u.aboutMe;
  if (typeof u.birthdate === "number" && u.birthdate > 0) out.age = ageFromBirthdate(u.birthdate);
  return out;
}

function ageFromBirthdate(ms: number): number {
  const b = new Date(ms);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1;
  return age >= 0 ? age : 0;
}

/**
 * 登录后/启动时拉真实资料写入 store：用大卡填充资料字段。
 * 过渡期：卡片不含金币/会员有效期，暂用 mock 补齐，便于其余仍走 mock 的页面正常显示。
 */
export async function hydrateCurrentUser(): Promise<void> {
  const store = useUserStore();
  const id = store.user.id;
  if (!id) return;
  try {
    const card = await getUserCard(id, id);
    store.setUser(cardToCurrentUser(card));
  } catch {
    /* 资料卡加载失败不阻塞（登录响应已给出昵称/头像等基础信息） */
  }
  if (store.user.coins == null) {
    try {
      const demo = await api.getCurrentUser();
      store.setUser({ coins: demo.coins, vipValidEnd: demo.vipValidEnd });
    } catch {
      /* mock 兜底失败忽略 */
    }
  }
}

/** 后端 MiniUser → 前端 CurrentUser 部分字段映射（其余展示字段当前阶段仍由 mock 补齐）。 */
export function toCurrentUser(m: MiniUser): Partial<CurrentUser> {
  return {
    id: m.id,
    nickname: m.nickname ?? "",
    avatar: (m.icon as string) ?? "",
    gender: m.gender != null ? String(m.gender) : undefined
  };
}
