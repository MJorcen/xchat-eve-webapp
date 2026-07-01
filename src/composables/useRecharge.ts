// 充值流程(真实后端 trade 模块),供充值页 / 钱包页共用,避免两份支付逻辑各自漂移。
// 职责:加载真实产品目录、进页面拉真实余额、下单 + 测试入账闭环、支付期占用锁。
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { showFailToast, showLoadingToast, closeToast } from "vant";
import { createRechargeOrder, getRechargeProducts, testCompletePayment } from "../services/recharge";
import { getWallet } from "../services/wallet";
import { acquire, reenter, release } from "../services/busyLock";
import { getCallLockToken } from "./useCall";
import { useUserStore } from "../stores";
import { ApiError } from "../services/http";
import type { PaymentChannel, WalletPackage } from "../types/eve";

// 充值/钱包两页都是支付页,任一页面在就视为占用锁理由仍然成立(tick 自愈用)。
const onPayPage = () =>
  typeof location !== "undefined" && (location.hash.startsWith("#/recharge") || location.hash.startsWith("#/wallet"));

export function useRecharge() {
  const { t } = useI18n();
  const router = useRouter();
  const userStore = useUserStore();

  const packages = ref<WalletPackage[]>([]);
  const selected = ref<number>(0);
  const showSheet = ref(false);
  const paying = ref(false);

  const coins = computed(() => userStore.coins);
  const selectedPkg = computed(() => packages.value.find((p) => p.id === selected.value));

  function goPay() {
    if (selectedPkg.value) showSheet.value = true;
  }

  // 进页面即从后端拉真实余额,避免显示本地缓存旧值(store 仅在 onPay 后更新)。
  function refreshBalance() {
    return getWallet()
      .then((w) => {
        if (w.gold != null) userStore.setUser({ coins: w.gold });
      })
      .catch(() => {
        /* 拉取失败保持现有显示 */
      });
  }

  // 入账是 MQ 异步,test/redirect 回调后短轮询拉真实余额(到账即停),返回最终金币数。
  async function refreshWalletUntilCredited(before: number): Promise<number> {
    let gold = before;
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        gold = (await getWallet()).gold ?? gold;
      } catch {
        /* 单次失败忽略,继续重试 */
      }
      if (gold > before) break;
    }
    return gold;
  }

  // 真实下单:POST /trade/recharge/create。
  //  - 三方网关返回 redirectUrl → 跳转支付,完成后由网关回调入账。
  //  - dev(无跳转): 调测试支付回调直接入账,拉真实余额完成闭环验证。
  async function onPay(channel: PaymentChannel) {
    const pkg = selectedPkg.value;
    if (!pkg || paying.value) return;
    paying.value = true;
    showLoadingToast({ message: t("payment.processing"), forbidClick: true, duration: 0 });
    const arrival = pkg.coins + pkg.bonus;
    try {
      const order = await createRechargeOrder(pkg.id, pkg.pay);

      // 三方支付:跳转真实网关,入账由回调完成。
      if (order.redirectUrl) {
        window.location.href = order.redirectUrl;
        return;
      }

      // dev:测试支付回调把订单置为已支付并触发入账,再拉真实余额。
      if (import.meta.env.DEV) {
        const before = userStore.coins;
        await testCompletePayment(order.orderId);
        const gold = await refreshWalletUntilCredited(before);
        userStore.setUser({ coins: gold });
        closeToast();
        showSheet.value = false;
        router.replace({
          path: "/payment-result",
          query: { status: gold > before ? "success" : "pending", coins: arrival, amount: pkg.price, method: channel.name }
        });
        return;
      }

      // prod 且无跳转(原生 IAP):H5 无法完成,入账依赖客户端内购回执。
      closeToast();
      showSheet.value = false;
      showFailToast(t("payment.unavailableOnWeb"));
    } catch (e) {
      closeToast();
      showFailToast(e instanceof ApiError ? e.message : t("payment.payFailed"));
    } finally {
      paying.value = false;
    }
  }

  // 支付期占用锁:在充值/钱包页期间挡掉新来电(响铃/支付不互相打断)。
  // 通话中(有 call 令牌)→ reenter 搭在通话锁上(in-call 充值);独立充值 → acquire 顶层。
  let payToken: symbol | null = null;
  onMounted(async () => {
    const callToken = getCallLockToken();
    const opts = { sourceType: "payment", sourceId: "recharge", check: onPayPage };
    payToken = callToken ? reenter(callToken, opts) : acquire(opts);

    packages.value = await getRechargeProducts().catch(() => []);
    selected.value = packages.value.find((p) => p.selected)?.id || packages.value[0]?.id || 0;

    refreshBalance();
  });
  onUnmounted(() => {
    release(payToken);
    payToken = null;
  });

  return { packages, selected, showSheet, paying, coins, selectedPkg, goPay, onPay, refreshBalance };
}
