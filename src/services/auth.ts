// 登录/注册接口（真实后端）。当前仅对接「设备快捷登录」，其余业务仍走 mock。
// 网关前缀见 VITE_API_BASE（/api/v1），user-svc 路径段为 /user。

import { http } from "./http";
import { api } from "./api";
import { getWallet } from "./wallet";
import { getDeviceId, getDeviceMeta } from "@/utils/device";
import { useUserStore } from "@/stores";
import type { CurrentUser } from "@/types/eve";

const USER_SVC = "/user";

/** 关注/粉丝分页（对齐 panjoy facade/relation/{follow,fans}/page，只取 total 当计数）。 */
interface RelationPage {
  list?: unknown[];
  total?: number;
}

/** 我关注的人数。background=true 时后台增强调用失败(含 401/1008)只静默降级,不触发全局登出。 */
export function getFollowingCount(background = false): Promise<number> {
  return http
    .get<RelationPage>(`/facade/relation/follow/page`, { offset: 0, limit: 1 }, { background })
    .then((r) => r?.total ?? 0);
}

/** 我的粉丝数。background=true 时后台增强调用失败(含 401/1008)只静默降级,不触发全局登出。 */
export function getFansCount(background = false): Promise<number> {
  return http
    .get<RelationPage>(`/facade/relation/fans/page`, { offset: 0, limit: 1 }, { background })
    .then((r) => r?.total ?? 0);
}

/** 后端 MiniUser（signIn 与 /user/info/get 返回的用户信息，字段为后端命名）。 */
export interface MiniUser {
  id: number;
  cuteId?: string;
  nickname?: string;
  icon?: string;
  gender?: number;
  status?: number;
  area?: string;
  country?: string;
  birthdate?: number;
  aboutMe?: string;
  familyId?: number;
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

/**
 * 当前登录用户的基础资料（对齐 panjoy：GET /user/info/get → MiniUser，按 JWT 取自己）。
 * 这是「我的资料」的规范接口；查看他人请用 getUserCard（大卡）。
 */
/** background=true 时后台增强调用失败(含 401/1008)只静默降级,不触发全局登出。 */
export function getMyInfo(background = false): Promise<MiniUser> {
  return http.get<MiniUser>(`${USER_SVC}/info/get`, undefined, { background });
}

/** 编辑资料请求（对齐 panjoy user/info/profile/update；后端不含地区/相册字段）。 */
export interface ProfileUpdate {
  nickname?: string;
  icon?: string;
  gender?: number;
  birthdate?: string; // ISO-8601
  aboutMe?: string;
}

/** 更新当前用户资料，返回更新后的用户。 */
export function updateProfile(req: ProfileUpdate): Promise<MiniUser> {
  return http.post<MiniUser>(`${USER_SVC}/info/profile/update`, req);
}


/** facade 大卡（完整资料卡，用于查看其他用户）。 */
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
 * 登录后/启动时拉真实资料写入 store：身份(/user/info/get) + 钱包(/user/wallet/get) +
 * 关注/粉丝数(facade/relation/*) 并行拉取，单个失败不影响其它。
 * 过渡期：VIP 等级/有效期暂无真实来源，仍用 mock 兜底，待会员接口接入后替换。
 */
export async function hydrateCurrentUser(): Promise<void> {
  const store = useUserStore();
  if (!store.user.id) return;

  // 后台增强调用:任意一路失败(含后端偶发 401/1008)只按原样降级,不该清掉刚刚才建立好的登录态。
  const [me, wallet, following, followers] = await Promise.all([
    getMyInfo(true).catch(() => null),
    getWallet(true).catch(() => null),
    getFollowingCount(true).catch(() => null),
    getFansCount(true).catch(() => null)
  ]);

  const patch: Partial<CurrentUser> = {};
  if (me) Object.assign(patch, toCurrentUser(me));
  if (wallet) patch.coins = wallet.gold ?? 0; // gold=金币=coins
  if (following != null) patch.following = following;
  if (followers != null) patch.followers = followers;
  if (Object.keys(patch).length) store.setUser(patch);

  // 过渡期兜底：VIP 等级/有效期暂无真实接口；钱包接口失败时金币也回落 mock。
  if (store.user.vipLevel == null || store.user.coins == null) {
    try {
      const demo = await api.getCurrentUser();
      const fill: Partial<CurrentUser> = {};
      if (store.user.vipLevel == null) {
        fill.vipLevel = demo.vipLevel;
        fill.vipValidEnd = demo.vipValidEnd;
      }
      if (store.user.coins == null) fill.coins = demo.coins;
      store.setUser(fill);
    } catch {
      /* mock 兜底失败忽略 */
    }
  }
}

/** 后端 MiniUser → 前端 CurrentUser（关注/粉丝/金币/会员不在该结构里，由 mock 或各自接口补齐）。 */
export function toCurrentUser(m: MiniUser): Partial<CurrentUser> {
  const out: Partial<CurrentUser> = {
    id: m.id,
    nickname: m.nickname ?? "",
    avatar: (m.icon as string) ?? "",
    region: (m.country || m.area || "") as string
  };
  if (m.gender != null) out.gender = String(m.gender);
  if (typeof m.aboutMe === "string") out.intro = m.aboutMe;
  if (typeof m.birthdate === "number" && m.birthdate > 0) out.age = ageFromBirthdate(m.birthdate);
  return out;
}
