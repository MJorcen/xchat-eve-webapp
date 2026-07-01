// 钱包接口（真实后端，对齐 panjoy WalletRepository.getWallet → user/wallet/get）。
import { http } from "./http";

export interface CashWallet {
  amount?: number;
  currency?: string;
  symbol?: string;
  amountDisplay?: number;
  cashEnabled?: boolean;
}

/** 钱包余额。gold=金币（消费币，对应 eve 的 coins），diamond=钻石，dealerCoin=商户币，cashWallet=现金红包。 */
export interface WalletData {
  userId?: number;
  gold?: number;
  diamond?: number;
  dealerCoin?: number;
  cashWallet?: CashWallet;
}

/** 当前登录用户钱包余额。background=true 时后台增强调用失败(含 401/1008)只静默降级,不触发全局登出。 */
export function getWallet(background = false): Promise<WalletData> {
  return http.get<WalletData>("/user/wallet/get", undefined, { background });
}

/** 金币流水项（后端 BillRecordVo）。 */
export interface CoinRecord {
  id: number;
  txType?: number;
  txName?: string;
  txIcon?: string;
  amount: number;
  createdAt?: number;
}

/** 金币流水。txGroup：1=收入，2=支出。 */
export function getCoinRecords(txGroup: number, offset = 0, limit = 50): Promise<CoinRecord[]> {
  return http
    .get<{ list?: CoinRecord[] }>("/user/coin/records", { txGroup, offset, limit })
    .then((r) => r?.list ?? []);
}
