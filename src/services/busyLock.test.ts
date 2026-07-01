import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { acquire, reenter, release, isLocked, reconcile, forceClear, holdsSnapshot } from "./busyLock";

const alive = () => true;

describe("busyLock(业务无关可重入占用锁)", () => {
  beforeEach(() => forceClear());
  afterEach(() => {
    forceClear();
    vi.useRealTimers();
  });

  it("空闲→acquire 拿锁;再 acquire→null(忙)", () => {
    expect(isLocked()).toBe(false);
    const t = acquire({ check: alive });
    expect(t).not.toBeNull();
    expect(isLocked()).toBe(true);
    expect(acquire({ check: alive })).toBeNull(); // 已占用
  });

  it("reenter:出示有效令牌→追加;计数归零才解锁", () => {
    const t = acquire({ check: alive })!;
    const s = reenter(t, { check: alive });
    expect(s).not.toBeNull();
    expect(holdsSnapshot().length).toBe(2);
    release(t);
    expect(isLocked()).toBe(true); // 还有 reenter 那个
    release(s);
    expect(isLocked()).toBe(false); // 归零解锁
  });

  it("reenter:空/失效令牌→null", () => {
    expect(reenter(null, { check: alive })).toBeNull();
    const t = acquire({ check: alive })!;
    release(t);
    expect(reenter(t, { check: alive })).toBeNull(); // 已释放的令牌不在表里
  });

  it("fencing:迟到的旧令牌 release 不误伤新锁", () => {
    const t1 = acquire({ check: alive })!;
    release(t1);
    const t2 = acquire({ check: alive })!;
    release(t1); // 旧令牌迟到 → no-op
    expect(isLocked()).toBe(true); // t2 仍持有
    release(t2);
    expect(isLocked()).toBe(false);
  });

  it("reconcile:check 死的清掉、活的保留", () => {
    let live = true;
    acquire({ check: () => live });
    expect(isLocked()).toBe(true);
    live = false;
    reconcile();
    expect(isLocked()).toBe(false);
  });

  it("自我订正:acquire 前 reconcile 清掉陈旧锁→放行(模拟漏 release)", () => {
    let live = true;
    acquire({ check: () => live }); // 第一把
    live = false; // 业务死了但没释放(泄漏)
    const t2 = acquire({ check: alive }); // acquire 内部 reconcile 清陈旧 → 成功
    expect(t2).not.toBeNull();
    expect(holdsSnapshot().length).toBe(1);
  });

  it("forceClear:清空 + 回调 onForceClear", () => {
    const fc = vi.fn();
    acquire({ check: alive, onForceClear: fc });
    forceClear();
    expect(isLocked()).toBe(false);
    expect(fc).toHaveBeenCalledTimes(1);
  });

  it("tick:5s 自动清掉 check 死的 hold(自愈漏 release)", () => {
    vi.useFakeTimers();
    let live = true;
    acquire({ check: () => live });
    expect(isLocked()).toBe(true);
    live = false;
    vi.advanceTimersByTime(5000); // 一次 tick
    expect(isLocked()).toBe(false);
  });

  it("TTL:活着的 hold 经多次 tick 续命,60s 后仍持有", () => {
    vi.useFakeTimers();
    acquire({ check: alive });
    vi.advanceTimersByTime(60000); // 多次 tick 续命(30s 软过期一直被刷新)
    expect(isLocked()).toBe(true);
  });
});
