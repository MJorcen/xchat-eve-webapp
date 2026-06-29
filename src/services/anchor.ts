// 主播发现流（真实后端 /user/anchor/feed：在线主播,不忙碌优先 + 综合档排序）。
import { http } from "./http";
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
    region: (u.area || u.country || "") as string,
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

/** 主播发现流。 */
export function getAnchors(offset = 0, limit = 30): Promise<Anchor[]> {
  return http
    .get<{ list?: RawAnchor[] }>("/user/anchor/feed", { offset, limit })
    .then((r) => (r?.list ?? []).filter((x) => x.user?.id != null).map(toAnchor));
}
