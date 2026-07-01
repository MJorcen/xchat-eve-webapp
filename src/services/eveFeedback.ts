// 1v1 通话异常反馈(挂断原因,对位 borders /call/feedback)。biz-connect-svc,网关别名 /connect。
import { http } from "./http";

export interface FeedbackQuery {
  showPrompt: boolean;
}
export interface FeedbackSubmitResult {
  coinBonus: number;
}

/** 前端反馈原因 key → 后端 EveFeedback.REASON_* 常量。 */
export const FEEDBACK_REASON_CODE: Record<string, number> = {
  blackScreen: 1,
  noVoice: 2,
  nobody: 3,
  stuck: 4,
  ignore: 5,
  other: 199
};

/** 是否需要弹反馈提示(短时差通话挂断后处于可反馈窗口、且今日未达上限)。 */
export function needToShowFeedback(eveId: number): Promise<FeedbackQuery> {
  return http.get<FeedbackQuery>("/connect/eve/feedback", { eveId });
}

/** 提交反馈原因;当天前 3 条发金币奖励(返回 coinBonus,可能为 0)。 */
export function submitFeedback(eveId: number, reason: number): Promise<FeedbackSubmitResult> {
  return http.post<FeedbackSubmitResult>(`/connect/eve/feedback?eveId=${eveId}&reason=${reason}`);
}

/** 举报通话中索要联系方式(reason=100,无奖金)。 */
export function reportFeedbackContact(eveId: number): Promise<void> {
  return http.post<void>(`/connect/eve/feedback/reportContact?eveId=${eveId}`);
}
