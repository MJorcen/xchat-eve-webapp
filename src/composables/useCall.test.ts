import { describe, it, expect, beforeEach, vi } from "vitest";

// 捕获 onEveSignal 注册的 handler,测试据此驱动各类信令
const h = vi.hoisted(() => ({ sig: null as ((s: any) => void) | null }));

vi.mock("../services/im", () => ({
  onEveSignal: (cb: (s: any) => void) => {
    h.sig = cb;
    return () => {};
  },
  ensureImLogin: vi.fn(async () => {})
}));
vi.mock("../services/call", () => ({
  requestCall: vi.fn(),
  acceptCall: vi.fn(),
  rejectCall: vi.fn(),
  cancelCall: vi.fn(),
  endCall: vi.fn()
}));
vi.mock("../services/zego", () => ({
  setMicEnabled: vi.fn(),
  setCameraEnabled: vi.fn(),
  joinRoom: vi.fn(async () => true),
  prewarmPull: vi.fn(async () => {}),
  leaveRoom: vi.fn(async () => {})
}));
vi.mock("../services/callTelemetry", () => ({
  initCallTelemetry: vi.fn(),
  clearCallTelemetry: vi.fn(),
  mark: vi.fn(),
  track: vi.fn(),
  getReconnectCount: () => 0,
  getMaxRtt: () => 0
}));
vi.mock("../stores", () => ({
  useUserStore: () => ({ user: { id: 100, gender: "1" } })
}));

import { useCall, startCallSignals, getCallLockToken } from "./useCall";
import { requestCall, acceptCall, rejectCall, cancelCall, endCall } from "../services/call";
import { joinRoom, prewarmPull, leaveRoom } from "../services/zego";
import { isLocked, forceClear, acquire, reenter, release } from "../services/busyLock";

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const ctx = (eveId: number) => ({
  record: { id: eveId, playerUserId: 100, anchorUserId: 200 },
  rtcRoomId: `eve_${eveId}`,
  rtcToken: "tk",
  playerStreamId: `eve_${eveId}_100`,
  anchorStreamId: `eve_${eveId}_200`
});
const anchor = (id: number) =>
  ({ id, nickname: "A", avatar: "", age: 0, region: "", online: true, onDuty: true, intro: "", followers: 0, price: 0, tags: [] }) as any;
const invite = (eveId: number, from = 200) => ({
  messageType: "call_eve/request",
  content: { eveId, rtcRoomId: `eve_${eveId}`, fromUserId: from },
  sender: { id: from }
});

const { callState, startOutgoing, accept, reject, hangup, reset } = useCall();

describe("useCall 状态机 × 占用锁", () => {
  beforeEach(async () => {
    forceClear();
    reset();
    vi.clearAllMocks();
    (requestCall as any).mockResolvedValue(ctx(1));
    (acceptCall as any).mockResolvedValue(ctx(2));
    (rejectCall as any).mockResolvedValue(undefined);
    (cancelCall as any).mockResolvedValue(undefined);
    (endCall as any).mockResolvedValue(ctx(1));
    (joinRoom as any).mockResolvedValue(true);
    (prewarmPull as any).mockResolvedValue(undefined);
    (leaveRoom as any).mockResolvedValue(undefined);
    await startCallSignals(); // 注册信令 handler(幂等,只首轮真正注册)
  });

  it("拨号 → ringing + 持锁,且发起后端 request", async () => {
    await startOutgoing(anchor(200));
    expect(callState.phase).toBe("ringing");
    expect(callState.eveId).toBe(1);
    expect(isLocked()).toBe(true);
    expect(requestCall).toHaveBeenCalledWith(200);
  });

  it("对端接听信令 → active", async () => {
    await startOutgoing(anchor(200));
    h.sig!({ messageType: "call_eve/accept", content: { eveId: 1 } });
    expect(callState.phase).toBe("active");
  });

  it("收到来电信令 → incoming + 持锁", () => {
    h.sig!(invite(2));
    expect(callState.phase).toBe("incoming");
    expect(callState.eveId).toBe(2);
    expect(isLocked()).toBe(true);
  });

  it("被叫接听 → active(调后端 accept)", async () => {
    h.sig!(invite(2));
    await accept();
    expect(callState.phase).toBe("active");
    expect(acceptCall).toHaveBeenCalledWith(2);
  });

  it("通话中再来电 → autoReject,不打断当前", async () => {
    await startOutgoing(anchor(200));
    h.sig!({ messageType: "call_eve/accept", content: { eveId: 1 } });
    expect(callState.phase).toBe("active");
    h.sig!(invite(9, 300)); // 第二通
    expect(rejectCall).toHaveBeenCalledWith(9); // 自动拒掉
    expect(callState.phase).toBe("active"); // 当前不变
    expect(callState.eveId).toBe(1);
  });

  it("响铃中再拨号 → 拒绝,不发起第二通", async () => {
    await startOutgoing(anchor(200));
    (requestCall as any).mockClear();
    await startOutgoing(anchor(999));
    expect(requestCall).not.toHaveBeenCalled();
    expect(callState.phase).toBe("ringing");
    expect(callState.eveId).toBe(1);
  });

  it("拒接 → ended + 释放锁 + 调后端 reject", () => {
    h.sig!(invite(2));
    reject();
    expect(callState.phase).toBe("ended");
    expect(rejectCall).toHaveBeenCalledWith(2);
    expect(isLocked()).toBe(false);
  });

  it("响铃中挂断 → cancel + 释放锁", async () => {
    await startOutgoing(anchor(200));
    hangup();
    expect(cancelCall).toHaveBeenCalledWith(1);
    expect(callState.phase).toBe("ended");
    expect(isLocked()).toBe(false);
  });

  it("通话中挂断 → end + 释放锁", async () => {
    await startOutgoing(anchor(200));
    h.sig!({ messageType: "call_eve/accept", content: { eveId: 1 } });
    hangup();
    expect(endCall).toHaveBeenCalled();
    expect(callState.phase).toBe("ended");
    expect(isLocked()).toBe(false);
  });

  it("对端结束信令 → ended + 写入时长 + 释放锁", async () => {
    await startOutgoing(anchor(200));
    h.sig!({ messageType: "call_eve/accept", content: { eveId: 1 } });
    h.sig!({ messageType: "call_eve/end", content: { eveId: 1, duration: 42 } });
    expect(callState.phase).toBe("ended");
    expect(callState.seconds).toBe(42);
    expect(isLocked()).toBe(false);
  });

  it("来电后对端取消 → ended + 释放锁", () => {
    h.sig!(invite(2));
    h.sig!({ messageType: "call_eve/cancel", content: { eveId: 2 } });
    expect(callState.phase).toBe("ended");
    expect(isLocked()).toBe(false);
  });

  it("主叫 ringing 收到 cancel(后端未接通超时)→ 结束 + 释放锁(不再卡死)", async () => {
    await startOutgoing(anchor(200));
    expect(callState.phase).toBe("ringing");
    h.sig!({ messageType: "call_eve/cancel", content: { eveId: 1 } });
    expect(callState.phase).toBe("ended");
    expect(isLocked()).toBe(false);
  });

  it("结束后锁释放 → 可再次拨号(锁循环)", async () => {
    await startOutgoing(anchor(200));
    hangup();
    expect(isLocked()).toBe(false);
    (requestCall as any).mockResolvedValue(ctx(5));
    await startOutgoing(anchor(201));
    expect(callState.phase).toBe("ringing");
    expect(callState.eveId).toBe(5);
  });

  it("重复结束信令幂等 → 仍 ended,不抛错", async () => {
    await startOutgoing(anchor(200));
    h.sig!({ messageType: "call_eve/accept", content: { eveId: 1 } });
    h.sig!({ messageType: "call_eve/end", content: { eveId: 1, duration: 10 } });
    h.sig!({ messageType: "call_eve/end", content: { eveId: 1, duration: 10 } });
    expect(callState.phase).toBe("ended");
    expect(isLocked()).toBe(false);
  });

  // ---- 支付锁 × 通话互斥(模拟 RechargePage 持锁)----
  it("支付锁持有 → 来电被 autoReject(支付期不被打断)", () => {
    const pay = acquire({ sourceType: "payment", sourceId: "recharge", check: () => true });
    expect(pay).not.toBeNull();
    h.sig!(invite(8, 300));
    expect(rejectCall).toHaveBeenCalledWith(8);
    expect(callState.phase).not.toBe("incoming"); // 没被带进来
    release(pay);
  });

  it("支付锁持有 → 拨号被拒,不发起 request", async () => {
    acquire({ sourceType: "payment", sourceId: "recharge", check: () => true });
    await startOutgoing(anchor(200));
    expect(requestCall).not.toHaveBeenCalled();
    expect(callState.phase).not.toBe("ringing");
  });

  it("通话中 → 充值可 reenter 搭在通话锁上(in-call 共存,不互斥)", async () => {
    await startOutgoing(anchor(200));
    h.sig!({ messageType: "call_eve/accept", content: { eveId: 1 } }); // active
    const token = getCallLockToken();
    expect(token).not.toBeNull();
    const pay = reenter(token, { sourceType: "payment", sourceId: "recharge", check: () => true });
    expect(pay).not.toBeNull(); // 充值搭进通话,不冲突
    expect(callState.phase).toBe("active"); // 通话继续
    release(pay);
  });

  // ---- 偷跑 fencing:await 期间被拒 → token 失效则 abort ----
  it("偷跑 await joinRoom 期间被拒 → 不预拉、撤销入房(token fencing)", async () => {
    const d = deferred<boolean>();
    (joinRoom as any).mockReturnValue(d.promise); // 让 joinRoom 挂起,卡住偷跑
    h.sig!({
      messageType: "call_eve/request",
      content: { eveId: 7, rtcRoomId: "eve_7", fromUserId: 200 },
      sender: { id: 200 },
      rtcInfo: { anchorToken: "atk", playerStreamId: "eve_7_200" } // 带 rtcInfo 触发偷跑
    });
    expect(callState.phase).toBe("incoming");
    reject(); // 偷跑卡在 await joinRoom 时,用户拒接(令牌失效)
    expect(callState.phase).toBe("ended");
    d.resolve(true); // joinRoom 此刻才返回
    await Promise.resolve();
    await Promise.resolve();
    expect(prewarmPull).not.toHaveBeenCalled(); // 已 abort,不预拉
  });
});
