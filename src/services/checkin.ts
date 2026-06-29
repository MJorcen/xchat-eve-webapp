// 签到（growth 服务，/api/v1/growth/check-in/*）。
import { http } from "./http";

export interface CheckInDayReward {
  checkInOffset: number;
  itemCount: number;
  icon?: string;
  itemType?: number;
  itemId?: number;
}
export interface CheckInInfo {
  checkedStatus: number; // 今日是否已签：0 否 / 1 是
  maxDays: number;
  currentOffset: number; // 今天是第几天（1-based）
  rewards: CheckInDayReward[];
}
export interface CheckInResult {
  checkInOffset?: number;
  itemCount?: number;
  settlementStatus?: number;
}

/** 签到面板信息。 */
export function getCheckInInfo(): Promise<CheckInInfo> {
  return http.get<CheckInInfo>("/growth/check-in/info");
}

/** 执行今日签到。 */
export function signCheckIn(): Promise<CheckInResult> {
  return http.post<CheckInResult>("/growth/check-in/sign");
}
