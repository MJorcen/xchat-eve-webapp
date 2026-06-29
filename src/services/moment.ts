// 用户动态（真实后端 /facade/post/list → biz-moment-service）。
import { http } from "./http";
import { toAnchor } from "./anchor";
import type { Moment } from "@/types/eve";

interface RawPost {
  id: number;
  user?: unknown; // 后端 MdUser，与 anchor.ts 的 RawAnchor 同构
  content?: string;
  mediaUrls?: string[];
  likeCount?: number;
  likeStatus?: number;
}

// PostVo → eve Moment（user 复用 toAnchor，mediaUrls→images，likeStatus→liked）。
function toMoment(p: RawPost): Moment {
  return {
    id: p.id,
    user: toAnchor((p.user ?? {}) as Parameters<typeof toAnchor>[0]),
    content: p.content ?? "",
    images: Array.isArray(p.mediaUrls) ? p.mediaUrls : [],
    likes: p.likeCount ?? 0,
    liked: p.likeStatus === 1
  };
}

export interface MomentPage {
  items: Moment[];
  total: number;
}

/** 某用户的动态分页（targetId 过滤；total 即该用户动态总数）。 */
export function getUserMomentsPage(userId: number, offset = 0, limit = 20): Promise<MomentPage> {
  return http
    .get<{ list?: RawPost[]; total?: number }>("/facade/post/list", { targetId: userId, offset, limit })
    .then((r) => ({ items: (r?.list ?? []).map(toMoment), total: r?.total ?? 0 }));
}
