// 充值（真实后端 trade 模块）：
//  - 产品目录   /trade/product/promo/list → ProductVo → WalletPackage
//  - 创建订单   POST /trade/recharge/create（三方走 paymentProviderId，原生走 paymentProvider）
//  - 测试入账   GET  /trade/provider/test/callback（仅 dev：等价真实网关回调，直接把订单置为已支付并触发入账，用于闭环验证）
import { http } from "./http";
import type { RechargePayInfo, WalletPackage } from "@/types/eve";

// dev 下后端按国家解析币种/促销/可用支付渠道；prod 由 Cloudflare 注入真实国家头。
// 该国家须在 Nacos currency.json 配有币种、且商品对其有定价（US→USD 已配 google_iap 原生渠道）。
const DEV_COUNTRY = "US";
const devCountryOpts = import.meta.env.DEV ? { headers: { "CF-IPCountry": DEV_COUNTRY } } : undefined;

interface RawPrice {
  symbol?: string;
  convertedAmount?: number;
  currency?: string;
}
interface RawPayment {
  id?: number; // 三方渠道 id（原生支付无 id）
  paymentProvider?: string; // google_iap / apple_iap / 三方 provider
  paymentMethod?: string;
}
interface RawProduct {
  product?: { id?: number; coin?: number; amount?: number; name?: string };
  productGiveCoin?: number;
  promo?: { promoKind?: string; promoValue?: number };
  methodOptions?: Array<{ options?: Array<{ price?: RawPrice; payment?: RawPayment }> }>;
}

function toPayInfo(p?: RawPayment): RechargePayInfo | undefined {
  if (!p) return undefined;
  return { paymentProviderId: p.id, paymentProvider: p.paymentProvider, paymentMethod: p.paymentMethod };
}

// ProductVo → WalletPackage。bonus 取 promo(BONUS_RATE 按比例 / BONUS_FIXED 固定);
// price 优先用渠道返回的本币展示价(symbol+convertedAmount),回退到 product.amount(美分→美元);
// pay 取首个可用渠道,创建订单时回传(dev US 为 google_iap 原生)。
function toPackage(r: RawProduct): WalletPackage {
  const coin = r.product?.coin ?? 0;
  let bonus = 0;
  const kind = r.promo?.promoKind;
  const val = r.promo?.promoValue ?? 0;
  if (kind === "BONUS_RATE") bonus = Math.floor((coin * val) / 100);
  else if (kind === "BONUS_FIXED") bonus = val;

  const opt = r.methodOptions?.[0]?.options?.[0];
  const p = opt?.price;
  const price =
    p?.symbol != null && p?.convertedAmount != null
      ? `${p.symbol}${p.convertedAmount.toFixed(2)}`
      : `$${((r.product?.amount ?? 0) / 100).toFixed(2)}`;

  return { id: r.product?.id ?? 0, coins: coin, bonus, price, pay: toPayInfo(opt?.payment) };
}

/** 充值产品列表(真实)。后端按国家解析币种/促销:dev 注入 CF-IPCountry,prod 由 Cloudflare 提供真实国家头。 */
export function getRechargeProducts(): Promise<WalletPackage[]> {
  return http
    .get<RawProduct[] | { list?: RawProduct[] }>("/trade/product/promo/list", undefined, devCountryOpts)
    .then((r) => {
      const list = Array.isArray(r) ? r : (r?.list ?? []);
      return list.filter((x) => x.product?.id != null).map(toPackage);
    });
}

export interface CreateOrderResult {
  id?: number;
  orderId: string;
  redirectMode?: string;
  redirectUrl?: string;
  productSku?: string;
}

/** 创建充值订单：三方传 paymentProviderId；原生(apple/google)传 paymentProvider(+paymentMethod)。返回订单号 + 跳转信息。 */
export function createRechargeOrder(productId: number, pay?: RechargePayInfo): Promise<CreateOrderResult> {
  const body: Record<string, unknown> = { productId };
  if (pay?.paymentProviderId != null) {
    body.paymentProviderId = pay.paymentProviderId;
  } else if (pay?.paymentProvider) {
    body.paymentProvider = pay.paymentProvider;
    if (pay.paymentMethod) body.paymentMethod = pay.paymentMethod;
  }
  return http.post<CreateOrderResult>("/trade/recharge/create", body, devCountryOpts);
}

/**
 * 【仅测试环境】测试支付回调：把订单置为已支付并触发真实入账（等价真实支付网关回调）。
 * 用于 dev 端验证充值闭环（create → 入账 → 钱包到账）。生产由真实网关回调入账，不应调用此接口。
 */
export function testCompletePayment(orderId: string): Promise<unknown> {
  return http.get("/trade/provider/test/callback", { orderId, status: 1 }, devCountryOpts);
}
