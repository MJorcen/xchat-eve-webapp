# 通话客户端状态机 + 占用锁(可重入)设计

> 适用三端(Web / Android / iOS)的客户端契约。解决:通话状态机鲁棒、响铃/支付期不让新通话进来、in-call 充值、被叫偷跑、漏信令/忘释放自愈。与 [RTC-1v1-消息结构-男端秒开-埋点方案](./RTC-1v1-消息结构-男端秒开-埋点方案.md) 配套(那篇讲信令/秒开/埋点,这篇讲客户端状态与占用)。

---

## 0. 目标
1. 客户端维护一个**鲁棒**的通话状态机。
2. **响铃(去/来电)和支付过程中,不允许其它通话被带进来。**
3. 支持 **in-call 充值**(通话不挂断的浮层)与跳页充值。
4. **被叫偷跑**、漏信令、业务忘了释放锁 —— 都能**自愈**,且用户主动操作能**自我订正**。
5. 模型中性,三端同一套契约。

---

## 1. 选型结论:一把「可重入独占锁」

设计过程排除了几条路:
- **对称 S/X 锁(MySQL/PG 标准)**:配不出我们的语义 —— `call=X`→挡 payment(无 in-call 充值);`call=S`→两个 call 能并存(双通话)。标准对称矩阵做不到。
- **非对称相容表**(`X 容许 S、S 挡 X`):能,但非对称表不是标准锁语义,易混。
- **嵌套父子锁 + promote**:能,但要处理「父释放时把活着的子升级」,偏重。
- ✅ **AQS `ReentrantLock` 思路:一把独占锁 + 持有计数(可重入)**。**子窗口(in-call 充值)= 在同一把锁上再持有一次(reenter),不搞两套锁。** 通话先结束时计数没归零 → 锁不开 → 新通话照样被挡(orphan 天然解决)。

**搬 Java 必须改对的 3 点**(否则照抄会出 bug):
1. **owner 不能用「线程/会话」**:Java 靠「同线程」判可重入;我们若用 session 当 owner,**新来电也是同一个运行上下文 → 会被当成重入 → 放进第二通**。所以 **owner = 持有令牌(token)**,reenter 必须**出示一个有效 token**。子窗口从通话上下文拿得到 token → 能重入;新来电没 token → 只能 `acquire()` fresh → 撞已持有 → 挡掉。
2. **释放顺序无关(纯 refcount,不是 LIFO)**:Java 习惯 try/finally 配对;我们「通话先于充值释放」不是后进先出 → 当纯计数:谁结束谁减一,归零解锁。
3. **加 `check()` + 定时器自愈**(Java 没有):每个持有带本地存活探针 + 软过期;定时器跑探针,死的自动减一 → 忘了释放也自愈。

### 1.1 锁与业务彻底解耦(对外只有 0/1)
- **锁是业务无关的占用原语**:对外状态只有 **`0`(空闲)/`1`(占用)**,**它不认识 call / payment**。`sourceType/sourceId` 只是穿透给日志的**不透明标签**,锁从不读它做任何判断。
- **所有不对称的业务语义,来自「业务决定调哪个方法」,不在锁里**:
  - 要**独占**(新通话、独立充值)→ `acquire()`(仅 0 可得,拿到变 1)。
  - 在占用内**追加**(in-call 充值)→ `reenter(token)`(出示句柄=证明在占用内,状态仍是 1)。
  - 「通话挡新通话、但充值能搭进通话」= 通话调 `acquire`、in-call 充值调 `reenter` —— 全在业务侧决定,锁本身对称、零业务。
- 内部为支持 in-call 追加,`1` 这个状态底下挂着一个「存活持有集合」,集合空了才回到 `0`;但对外、对「能不能起新通话」而言,就是 **0/1 一个真值**(`isLocked()`)。

---

## 2. 占用锁契约 `busyLock`(业务无关)

```
Hold { token, sourceType, sourceId, check(), expireAt }   // sourceType/sourceId 仅日志,不参与逻辑

busyLock(单例) {
  holds: Map<token, Hold>        // = AQS state(持有计数);空=空闲,非空=忙

  acquire({sourceType, sourceId, check, ttlMs=30000}) -> token | null
      // 先 reconcile();若仍有存活 hold → null(忙);否则注册首个 hold,返回 token

  reenter(token, {sourceType, sourceId, check, ttlMs=30000}) -> token | null
      // token 必须是当前某个有效 hold(出示句柄=证明在占用内);加一个 hold,返回新 token
      // in-call 充值浮层用:通话 token 重入一次

  release(token)         // 移除该 hold;holds 空了 → 解锁
  isLocked() -> bool     // holds 非空(替代 isBusy)
  reconcile()            // 立即跑所有 hold.check();false 的移除;空了→解锁
  forceClear()           // 无条件清空所有 hold(清空按钮用;配合外部 leaveRoom/resetState)
  tick()                 // 每 5s:reconcile() + 清过期(expireAt<now);存活的续 expireAt=now+ttl
}
```

**规则**
- `acquire` 只有**空闲**才给(独占);拿到的 token 既是凭证也是首个 hold。
- `reenter` 需**出示有效 token**;这是「在占用内」的证明,新来电拿不到 → 天然挡住第二通。
- 计数**归零才解锁**;`release` 顺序无关。
- **自愈两层**:`tick`(每 5s 被动)+ `reconcile`(主动,见 §5)。
- `check()` 全**本地**、不打服务端:通话=「在通话页 ‖ ZEGO 流还在」;支付=「在充值页/浮层开着」。

---

## 3. 通话状态机

```
idle ──startOutgoing[acquire成功]──► ringing ──call_eve/accept──► active ──挂断/end/断流──► ended ──reset──► idle
idle ──call_eve/request[acquire成功]──► incoming ──accept──► active
                                                 └─reject/cancel/timeout──► ended
凡 busyLock.isLocked() ⇒ 拒一切新通话(acquire 返 null)
```

**转移表(每个转移标注锁操作)**

| 事件 | from | to | 锁操作 | 其它副作用 |
|---|---|---|---|---|
| 用户拨号 `startOutgoing` | idle/ended | ringing | `reconcile()`→`acquire(call)`;null→留 idle+toast | requestCall、埋点 init |
| 收到 `call_eve/request` | idle/ended | incoming | `reconcile()`→`acquire(call)`;null→`autoReject(新eveId)` | receiveIncoming、偷跑 prewarm(持 token) |
| 接听 `accept` | incoming | active | 持有不变,启动心跳 `renew` | acceptCall、mark connect |
| 收到 `call_eve/accept` | ringing | active | 不变,启动心跳 | mark connect |
| 拒接 `reject` | incoming | ended | `release(token)` | rejectCall、leaveRoom |
| 挂断 `hangup`(响铃) | ringing | ended | `release` | cancelCall、leaveRoom |
| 挂断 `hangup`(通话) | active | ended | `release` | **endCall**、leaveRoom |
| 收到 `call_eve/reject` | ringing | ended | `release` | leaveRoom |
| 收到 `call_eve/cancel` | incoming | ended | `release` | leaveRoom(撤销偷跑) |
| 收到 `call_eve/end` | active | ended | `release` | leaveRoom |
| 响铃超时(ringGuard / tick check 死) | incoming/ringing | ended | `release` | leaveRoom |

**统一终态收口 `finishLocal()`**:`clearTimers → trackEnd → busyLock.release(token) → leaveRoom → phase=ended`。所有终态(reject/hangup/各终态信令/timeout)都走它 → ZEGO 必清、埋点一次、锁必释放、状态一致。

> 🐛 顺带修一个真 bug:现在 active 通话跳走只 `CallPage.onUnmounted→leaveRoom`(断媒体)**但不 endCall**,后端通话还在跑、还在计费 → 跳页/离开 active 通话必须 `endCall`(走 finishLocal)。

---

## 4. in-call 充值 / 跳页 / 偷跑 映射

| 场景 | 锁操作 | 说明 |
|---|---|---|
| 来电/去电 | `t=acquire(call, eveId, check=在通话页‖流活)` | null→忙(autoReject/toast) |
| **偷跑** | 持 `t`;`await joinRoom/prewarmPull` 后若 `t` 已释放(reject/cancel)→ abort | token 失效=已被终态 release,旧操作天然作废 |
| **in-call 充值浮层** | `s=reenter(t, payment, orderId, check=浮层开着)`;关→`release(s)` | 通话不挂断;通话**先**结束只 `release(t)`,`s` 还在 → 锁不开 → 新通话仍挡 |
| 跳页/独立充值 | 跳页前先 `hangup`(release t)→ `acquire(payment, orderId, check=在充值页)` | 离开通话页=放弃这通,必须 endCall |
| 新通话入口 | `acquire(call,…)` 返 null 即忙 | |

**为什么 in-call 不会漏出空档**:充值是同一把锁的一次重入(计数 +1)。通话结束减 1 后**计数仍 >0**(充值那次),锁保持,新通话被挡;直到关闭充值(check 死或 release)计数归零才解锁。

---

## 5. 自愈与自我订正(回答「锁状态不对要不要订正」)

锁可能因为 bug / 漏信令 / 异常退出而**陈旧**(holds 还在但业务其实没了)。两道防线:

**① 被动自愈 —— `tick()` 每 5s**
逐个跑 `hold.check()`:活的续命 30s,死的 `release`;清过期。漏掉的 `call_eve/end`、忘了的 release,都在 5s 内被探针发现并清掉。

**② 主动订正 —— `reconcile()` on intent(你提的那个)**
> 不变量:**用户能看到并点「拨号 / 接听」按钮 ⇒ 客户端 UI 认为自己空闲。** 若此时锁却显示「忙」,只有两种可能:(a) 锁陈旧(探针其实死了)→ 应清掉;(b) 锁真活(真有通话/支付)→ 该拒。

所以**每个用户主动入口(startOutgoing / accept / 进入充值)在 acquire 前先 `reconcile()`**:立即跑所有探针,陈旧的当场清掉再 acquire。
- 探针全死 → 清空 → acquire 成功 → 放行(不必等 5s tick)。
- 有探针真活(如确实在通话页/流还在)→ acquire 仍返回 null → 拒(并可提示「通话中/支付中」)。

→ `reconcile` 让「用户主动操作」永远基于真实状态,**陈旧锁自我订正、真活锁不被误清**。

**③ 兜底逃生 —— `forceClear()` 清空按钮**
无条件清掉所有 hold,并联动外部清理(`leaveRoom` + 通话状态机 `resetState`)。给「卡死自救」用。放置(产品定):
- 推荐:卡在某态超过 N 秒时,UI 出一个不显眼的「通话异常?重置」入口 → `forceClear`。
- 或:设置/调试页一个「重置通话状态」。
- `forceClear` 与 `reconcile` 区别:`reconcile` 尊重探针(只清死的),`forceClear` 不问探针、强清(可能打断真活通话,仅作最后手段)。

---

## 6. 鲁棒性对照(review 出的问题 → 本设计怎么兜)

| 风险 | 兜法 |
|---|---|
| 双通话(并发两通) | `acquire(call)` 仅空闲可得;第二通 null |
| 响铃/支付期被新通话打断 | 同上,`isLocked()` 期间一律拒;支付=重入持锁 |
| in-call 充值后通话先结束(orphan) | 重入计数未归零,锁保持,新通话仍挡 |
| 去电时抹掉旧通话 | `startOutgoing` 先 `acquire`,忙则 toast 不动旧通话(不再无脑 resetState) |
| 偷跑 await 期间被 reject/cancel | 持 token;await 后 token 已 release → abort,不留悬挂 |
| 漏 `call_eve/end` / 忘 release | `tick` 5s 探针自愈 + 用户操作 `reconcile` 即时订正 |
| 锁彻底卡死 | `forceClear` 清空按钮逃生 |
| 跳页 active 通话不挂断、后端空跑计费 | 终态统一走 `finishLocal`→`endCall` |

---

## 7. 跨端

同一套契约,各端只换两处实现:
- **定时器**:Web `setInterval` / Android `Handler.postDelayed` 或协程 `delay` 循环 / iOS `Timer` 或 Combine。
- **check 注入**:各端的「在通话页?流还在?在充值页?」本地判断。

`busyLock` 的 holds/acquire/reenter/release/reconcile/tick 逻辑三端一致。Android 可直接借 `ReentrantLock` 心智(但 owner 用 token、不用 thread;释放按 refcount)。

---

## 8. 落地清单(Web,本仓)

- [x] 新建 `src/services/busyLock.ts`(契约 §2:acquire/reenter/release/isLocked/reconcile/forceClear/tick + 5s/30s;symbol token fencing)
- [x] `useCall.ts`:接锁(startOutgoing/incoming `acquire`,内部 reconcile 自我订正);终态统一 `finishLocal`→`release`;`leaveCall`(离开通话页静默结束+释放);偷跑持 token、await 后 `lockToken!==myToken` 校验;`resetAll` 暴露
- [x] `CallPage.vue`:`onUnmounted → leaveCall`(修掉「离开通话页只断媒体、后端空跑计费」)
- [x] `RechargePage.vue`:`acquire(payment)`(有通话令牌则 `reenter`)/ 离开 `release`;check=在充值页
- [x] `CallModal.vue`:「通话异常?重置」逃生入口(`resetAll`)+ i18n
- [x] autoReject:忙线/支付期收到 `call_eve/request` 时以 busy 拒掉新来电
- [ ] in-call 充值**浮层**(通话不断的 reenter):当前充值是跳页(`leaveCall` 结束本通);浮层 UI 待建,锁侧 `reenter` + `getCallLockToken` 已就绪
- [ ] (后端,已改未部署)`EveBusyReconcileScheduled` cron 1s→30s,需 connect-svc 重新部署生效
