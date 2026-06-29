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

/** 当前登录用户钱包余额。 */
export function getWallet(): Promise<WalletData> {
  return http.get<WalletData>("/user/wallet/get");
}
