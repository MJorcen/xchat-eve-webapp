// 关注关系接口（真实后端，对齐 panjoy UserRepository / facade/relation/*）。
import { http } from "./http";

/** 列表行视图模型（由后端 UserListItemDTO 映射而来）。 */
export interface RelationUser {
  id: number;
  nickname: string;
  avatar: string;
  online: boolean;
  vipLevel: number;
  relationStatus: number;
}

interface RawItem {
  onlineStatus?: number;
  vipLevel?: number;
  relation?: { relationStatus?: number };
  user?: { id?: number; nickname?: string; icon?: string };
}
interface RelationPageResp {
  list?: RawItem[];
  total?: number;
}

function mapItem(it: RawItem): RelationUser {
  const u = it.user ?? {};
  return {
    id: u.id as number,
    nickname: u.nickname ?? "",
    avatar: u.icon ?? "",
    online: (it.onlineStatus ?? 0) > 0,
    vipLevel: it.vipLevel ?? 0,
    relationStatus: it.relation?.relationStatus ?? 0
  };
}

function fetchPage(path: string, offset: number, limit: number) {
  return http.get<RelationPageResp>(path, { offset, limit }).then((r) => ({
    items: (r?.list ?? []).filter((it) => it.user?.id != null).map(mapItem),
    total: r?.total ?? 0
  }));
}

/** 我的关注列表。 */
export function getFollowingList(offset = 0, limit = 50) {
  return fetchPage("/facade/relation/follow/page", offset, limit);
}

/** 我的粉丝列表。 */
export function getFansList(offset = 0, limit = 50) {
  return fetchPage("/facade/relation/fans/page", offset, limit);
}

/** 关注某用户，返回新的 relationStatus。 */
export function followUser(targetId: number, referer = "mine"): Promise<number> {
  return http
    .post<{ relationStatus?: number }>("/user/follow/add", { targetId, referer })
    .then((r) => r?.relationStatus ?? 1);
}

/** 取关某用户，返回新的 relationStatus。 */
export function unfollowUser(targetId: number): Promise<number> {
  return http
    .post<{ relationStatus?: number }>("/user/follow/del", { targetId })
    .then((r) => r?.relationStatus ?? 0);
}

/** relationStatus：1=Following、2=Mutual 视为「我已关注 TA」。 */
export function isFollowing(status: number): boolean {
  return status === 1 || status === 2;
}
