// 1v1 通话(eve)后端编排:biz-connect-svc /connect/eve/*。
// request/accept 返回 EveContext(ZEGO 房间+token+streamId);呼叫信令走网易 NIM(见 im.ts)。
import { http } from "./http";
import { toAnchor, type RawAnchor } from "./anchor";
import { useUserStore } from "@/stores";
import type { CallRecord, CallStatus } from "@/types/eve";

export interface EveRecord {
  id: string; // 雪花 id(19 位,> 2^53):必须按字符串处理,否则 JSON.parse 丢精度导致后续按 id 调接口错位
  eveNo?: string;
  rtcRoomId?: string;
  fromUserId?: number;
  toUserId?: number;
  playerUserId?: number;
  anchorUserId?: number;
  anchorLevel?: number;
  acceptStatus?: number; // 0 未接 1 已接 2 拒接
  status?: number; // 0 未开始 1 通话中 2 结束
  billStepSeconds?: number;
  billStepCount?: number;
}

export interface EveContext {
  record: EveRecord;
  rtcRoomId: string;
  rtcToken: string;
  rtcConfig?: unknown;
  playerStreamId: string; // 自己推流的 streamId(后端据此检测双流计费)
  anchorStreamId: string; // 对端 streamId
}

/** 发起通话(toUserId=对端主播)。返回主叫的 EveContext;同时后端经 NIM 给对端发 eve_invite。 */
export function requestCall(toUserId: number, type: "direct" | "match" = "direct"): Promise<EveContext> {
  return http.post<EveContext>("/connect/eve/request", { toUserId, type }, { losslessJson: true });
}

/** 接听(被叫)。返回被叫的 EveContext。 */
export function acceptCall(eveId: string): Promise<EveContext> {
  return http.post<EveContext>(`/connect/eve/accept?eveId=${eveId}`, undefined, { losslessJson: true });
}

/** 拒接(被叫)。 */
export function rejectCall(eveId: string): Promise<unknown> {
  return http.post(`/connect/eve/reject?eveId=${eveId}`);
}

/** 取消(主叫,响铃阶段)。 */
export function cancelCall(eveId: string): Promise<unknown> {
  return http.post(`/connect/eve/cancel?eveId=${eveId}`);
}

/** 挂断/结束。optType 2=主叫挂断 3=被叫挂断。 */
export function endCall(eveId: string, optType: 2 | 3 = 2): Promise<EveContext> {
  return http.post<EveContext>("/connect/eve/end", { eveId, optType }, { losslessJson: true });
}

/** 查询通话状态(断线恢复用;不含 token)。 */
export function callStatus(eveId: string): Promise<EveContext> {
  return http.get<EveContext>(`/connect/eve/status?eveId=${eveId}`, undefined, { losslessJson: true });
}

// ============ 通话记录（我的通话历史） ============

interface RawEveRecord {
  id: number;
  fromUserId?: number;
  toUserId?: number;
  acceptStatus?: number; // 0 未接 1 已接 2 拒接
  finishType?: number; // 5=主叫响铃中取消
  seconds?: number;
  actualPrice?: number;
  createdAt?: number | string;
}
interface RawEveRecordVo {
  record?: RawEveRecord;
  peer?: RawAnchor;
}

function fmtDuration(sec = 0): string {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function fmtRecordTime(ts?: number | string): string {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// acceptStatus:0 未接/1 已接/2 拒接;未接时按 finishType 区分主叫取消(5)与其余(未接来电/超时等)。
function toCallStatus(r: RawEveRecord): CallStatus {
  if (r.acceptStatus === 1) return "answered";
  if (r.acceptStatus === 2) return "rejected";
  return r.finishType === 5 ? "canceled" : "missed";
}

export interface CallRecordPage {
  items: CallRecord[];
  total: number;
}

/** 我的通话记录分页(按拨打时间倒序)。 */
export function getMyCallRecords(offset = 0, limit = 20): Promise<CallRecordPage> {
  const myId = useUserStore().user.id;
  return http.get<{ list?: RawEveRecordVo[]; total?: number }>("/connect/eve/records", { offset, limit }).then((r) => ({
    items: (r?.list ?? [])
      .filter((v) => v.record?.id != null)
      .map((v): CallRecord => {
        const rec = v.record as RawEveRecord;
        return {
          id: rec.id,
          user: v.peer ? toAnchor(v.peer) : ({ id: rec.toUserId === myId ? rec.fromUserId ?? 0 : rec.toUserId ?? 0, nickname: "", avatar: "", age: 0, region: "", online: false, onDuty: false, intro: "", followers: 0, price: 0, tags: [] }),
          duration: fmtDuration(rec.seconds),
          time: fmtRecordTime(rec.createdAt),
          status: toCallStatus(rec),
          direction: rec.fromUserId === myId ? "out" : "in",
          durationSec: rec.seconds ?? 0,
          coinCost: rec.actualPrice ?? 0
        };
      }),
    total: r?.total ?? 0
  }));
}
