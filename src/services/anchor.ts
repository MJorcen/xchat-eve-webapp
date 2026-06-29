// 主播发现流（真实后端 /user/anchor/feed：在线主播,不忙碌优先 + 综合档排序）。
import { http } from "./http";
import { getUserCard } from "./auth";
import type { Anchor } from "@/types/eve";

interface RawAnchor {
  user?: {
    id?: number;
    nickname?: string;
    icon?: string;
    gender?: number;
    area?: string;
    country?: string;
    birthdate?: number;
    aboutMe?: string;
  };
  onlineStatus?: number;
  busyStatus?: number;
  distance?: string;
  vipLevel?: number;
  relation?: { fansCount?: number; followCount?: number };
}

function ageFromBirthdate(ms?: number): number {
  if (!ms) return 0;
  const b = new Date(ms);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1;
  return age >= 0 ? age : 0;
}

// MdUser(+busyStatus) → eve Anchor。price/tags/距离等不在 feed 里的字段给默认值（后续接定价/标签再补）。
function toAnchor(r: RawAnchor): Anchor {
  const u = r.user ?? {};
  const online = r.onlineStatus === 1;
  return {
    id: u.id as number,
    nickname: u.nickname ?? "",
    avatar: u.icon ?? "",
    age: ageFromBirthdate(u.birthdate),
    region: (u.area as string) ?? "", // 平台地区码统一取 area（用户侧无 region 字段）
    online,
    onDuty: online,
    inCall: r.busyStatus === 1, // 忙碌(1v1 占线)
    intro: u.aboutMe ?? "",
    followers: r.relation?.fansCount ?? 0,
    distance: r.distance ? Number(r.distance) || undefined : undefined,
    price: 0,
    tags: []
  };
}

export interface AnchorPage {
  items: Anchor[];
  total: number;
}

/** 主播发现流分页（按地区筛选 + 在线/不忙/档位排序;area 不传则后端取当前用户地区）。 */
export function getAnchorsPage(offset = 0, limit = 20, area?: string): Promise<AnchorPage> {
  return http
    .get<{ list?: RawAnchor[]; total?: number }>("/user/anchor/list", { area, offset, limit })
    .then((r) => ({
      items: (r?.list ?? []).filter((x) => x.user?.id != null).map(toAnchor),
      total: r?.total ?? 0
    }));
}

/** 主播发现流（仅取列表;分页/总数用 getAnchorsPage）。 */
export function getAnchors(area?: string, offset = 0, limit = 30): Promise<Anchor[]> {
  return getAnchorsPage(offset, limit, area).then((p) => p.items);
}

/** 真实大卡覆盖：详情页用，返回可叠加到 Anchor 的身份字段 + 当前关注态 relationStatus。 */
export async function fetchAnchorCard(
  id: number,
  requestUserId?: number
): Promise<{ overlay: Partial<Anchor>; relationStatus: number }> {
  const c = await getUserCard(id, requestUserId);
  const u = c.user ?? {};
  const overlay: Partial<Anchor> = {};
  if (u.id != null) overlay.id = u.id as number;
  if (u.nickname) overlay.nickname = u.nickname;
  if (u.icon) overlay.avatar = u.icon as string;
  const region = (u.country as string) || (u.area as string);
  if (region) overlay.region = region;
  if (typeof u.aboutMe === "string" && u.aboutMe) overlay.intro = u.aboutMe;
  const age = ageFromBirthdate(u.birthdate);
  if (age > 0) overlay.age = age;
  if (c.relation?.fansCount != null) overlay.followers = c.relation.fansCount;
  return { overlay, relationStatus: c.relation?.relationStatus ?? 0 };
}
