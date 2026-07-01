// 直播间发现（真实后端 biz-room-service，网关别名 /room，如 /room/home/page）+ 进出房追踪在线人数。
// 房间列表只带 room 自身字段 + 房内在线用户摘要（非固定的"主播"字段）；主播信息取 onlineUserList
// 第一位近似（真实直播场景下主播基本总在自己房间在线列表里），取不到时退化用房间自身 name/icon 兜底。
import { http } from "./http";
import { toAnchor, type RawAnchor } from "./anchor";
import type { LiveRoom } from "@/types/eve";

interface RawRoom {
  id: number;
  name?: string;
  icon?: string;
  bgImage?: string;
  onlineUserCount?: number;
}
interface RawRoomVo {
  room?: RawRoom;
  onlineUserList?: RawAnchor[];
}

function toLiveRoom(v: RawRoomVo): LiveRoom | null {
  const r = v.room;
  if (!r?.id) return null;
  const hostRaw = v.onlineUserList?.[0];
  const anchor = hostRaw
    ? toAnchor(hostRaw)
    : {
        id: 0,
        nickname: r.name ?? "",
        avatar: r.icon ?? "",
        age: 0,
        region: "",
        online: true,
        onDuty: true,
        intro: "",
        followers: 0,
        price: 0,
        tags: []
      };
  return {
    id: r.id,
    anchor,
    cover: r.bgImage || r.icon || anchor.avatar,
    title: r.name ?? anchor.nickname,
    viewers: r.onlineUserCount ?? 0,
    tag: ""
  };
}

export interface LiveRoomPage {
  items: LiveRoom[];
  total: number;
}

/** 首页直播间列表分页（在线人数/热度排序，按用户所在大区筛选）。 */
export function getLiveRoomsPage(offset = 0, limit = 20): Promise<LiveRoomPage> {
  return http.get<{ list?: RawRoomVo[]; total?: number }>("/room/home/page", { offset, limit }).then((r) => ({
    items: (r?.list ?? []).map(toLiveRoom).filter((x): x is LiveRoom => x != null),
    total: r?.total ?? 0
  }));
}

/** 直播间列表（仅取列表）。 */
export function getLiveRooms(offset = 0, limit = 20): Promise<LiveRoom[]> {
  return getLiveRoomsPage(offset, limit).then((p) => p.items);
}

/** 进入直播间：真实登记在线人数（供房间 onlineUserCount 统计）。 */
export function enterLiveRoom(roomId: number): Promise<void> {
  return http.post("/room/user/enter", { roomId });
}

/** 离开直播间：从在线人数里摘除。 */
export function leaveLiveRoom(roomId: number): Promise<void> {
  return http.post("/room/user/leave", { roomId });
}
