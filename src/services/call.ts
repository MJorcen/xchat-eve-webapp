// 1v1 通话(eve)后端编排:biz-connect-svc /connect/eve/*。
// request/accept 返回 EveContext(ZEGO 房间+token+streamId);呼叫信令走网易 NIM(见 im.ts)。
import { http } from "./http";

export interface EveRecord {
  id: number;
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
  return http.post<EveContext>("/connect/eve/request", { toUserId, type });
}

/** 接听(被叫)。返回被叫的 EveContext。 */
export function acceptCall(eveId: number): Promise<EveContext> {
  return http.post<EveContext>(`/connect/eve/accept?eveId=${eveId}`);
}

/** 拒接(被叫)。 */
export function rejectCall(eveId: number): Promise<unknown> {
  return http.post(`/connect/eve/reject?eveId=${eveId}`);
}

/** 取消(主叫,响铃阶段)。 */
export function cancelCall(eveId: number): Promise<unknown> {
  return http.post(`/connect/eve/cancel?eveId=${eveId}`);
}

/** 挂断/结束。optType 2=主叫挂断 3=被叫挂断。 */
export function endCall(eveId: number, optType: 2 | 3 = 2): Promise<EveContext> {
  return http.post<EveContext>("/connect/eve/end", { eveId, optType });
}

/** 查询通话状态(断线恢复用;不含 token)。 */
export function callStatus(eveId: number): Promise<EveContext> {
  return http.get<EveContext>(`/connect/eve/status?eveId=${eveId}`);
}
