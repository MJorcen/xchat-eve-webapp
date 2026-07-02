import { createRouter, createWebHashHistory } from "vue-router";
import HomePage from "./pages/HomePage.vue";
import MatchPage from "./pages/MatchPage.vue";
import MomentsPage from "./pages/MomentsPage.vue";
import MessagesPage from "./pages/MessagesPage.vue";
import MinePage from "./pages/MinePage.vue";
import AnchorDetailPage from "./pages/AnchorDetailPage.vue";
import ChatPage from "./pages/ChatPage.vue";
import CallPage from "./pages/CallPage.vue";
import LiveStreamPage from "./pages/LiveStreamPage.vue";
import CallSummaryPage from "./pages/CallSummaryPage.vue";
import WalletPage from "./pages/WalletPage.vue";
import RechargePage from "./pages/RechargePage.vue";
import PaymentPage from "./pages/PaymentPage.vue";
import PaymentResultPage from "./pages/PaymentResultPage.vue";
import UserDynamicListPage from "./pages/UserDynamicListPage.vue";
import PostComposerPage from "./pages/PostComposerPage.vue";
import MembershipPage from "./pages/MembershipPage.vue";
import WalletDetailPage from "./pages/WalletDetailPage.vue";
import SignInPage from "./pages/SignInPage.vue";
import LoginPage from "./pages/LoginPage.vue";
import CompleteRegistrationPage from "./pages/CompleteRegistrationPage.vue";
import OpenImChatPage from "./pages/OpenImChatPage.vue";
import VisitorPage from "./pages/VisitorPage.vue";
import FollowAndFansPage from "./pages/FollowAndFansPage.vue";
import BlockListPage from "./pages/BlockListPage.vue";
import NotificationPage from "./pages/NotificationPage.vue";
import BlockAndReportPage from "./pages/BlockAndReportPage.vue";
import FeedbackPage from "./pages/FeedbackPage.vue";
import EditProfilePage from "./pages/EditProfilePage.vue";
import GameCatPage from "./pages/GameCatPage.vue";
import NearbyPage from "./pages/NearbyPage.vue";
import MatchDetailPage from "./pages/MatchDetailPage.vue";
import { useUserStore } from "./stores";

export const tabRouteNames = ["Home", "Match", "Moments", "Messages", "Mine"];

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", name: "Home", component: HomePage },
    { path: "/match", name: "Match", component: MatchPage },
    { path: "/moments", name: "Moments", component: MomentsPage },
    { path: "/messages", name: "Messages", component: MessagesPage },
    { path: "/mine", name: "Mine", component: MinePage },
    { path: "/anchor/:id", name: "Anchor", component: AnchorDetailPage },
    { path: "/chat/:id", name: "Chat", component: ChatPage },
    { path: "/oim-chat/:peer", name: "OpenImChat", component: OpenImChatPage },
    { path: "/call/:id", name: "Call", component: CallPage },
    { path: "/live/:id", name: "LiveStream", component: LiveStreamPage },
    { path: "/call-summary/:id", name: "CallSummary", component: CallSummaryPage },
    { path: "/wallet", name: "Wallet", component: WalletPage },
    { path: "/recharge", name: "Recharge", component: RechargePage },
    { path: "/payment", name: "Payment", component: PaymentPage },
    { path: "/payment-result", name: "PaymentResult", component: PaymentResultPage },
    { path: "/login", name: "Login", component: LoginPage },
    { path: "/complete-registration", name: "CompleteRegistration", component: CompleteRegistrationPage },
    { path: "/notifications", name: "Notifications", component: NotificationPage },
    { path: "/visitors", name: "Visitors", component: VisitorPage },
    { path: "/block-list", name: "BlockList", component: BlockListPage },
    { path: "/block-and-report", name: "BlockAndReport", component: BlockAndReportPage },
    { path: "/follow-and-fans", name: "FollowAndFans", component: FollowAndFansPage },
    { path: "/wallet-detail", name: "WalletDetail", component: WalletDetailPage },
    { path: "/edit-profile", name: "EditProfile", component: EditProfilePage },
    { path: "/feedback", name: "Feedback", component: FeedbackPage },
    { path: "/video-upload-dynamic", name: "VideoUploadDynamic", component: PostComposerPage },
    { path: "/sign-detail", name: "SignDetail", component: SignInPage },
    { path: "/user-dynamic-list/:id", name: "UserDynamicList", component: UserDynamicListPage },
    { path: "/membership", name: "Membership", component: MembershipPage },
    { path: "/game", name: "Game", component: GameCatPage },
    { path: "/nearby", name: "Nearby", component: NearbyPage },
    { path: "/match-detail", name: "MatchDetail", component: MatchDetailPage }
  ],
  scrollBehavior() {
    return { top: 0 };
  }
});

// 登录守卫：未登录一律跳登录页（带 redirect 回跳）；已登录访问登录页则回首页。
// 完成注册页(CompleteRegistration)在无登录态下进行(设备注册后补资料换 token),同样放行。
router.beforeEach((to) => {
  const store = useUserStore();
  if (!store.isLogin && to.name !== "Login" && to.name !== "CompleteRegistration") {
    return { name: "Login", query: to.fullPath !== "/" ? { redirect: to.fullPath } : undefined };
  }
  if (store.isLogin && to.name === "Login") {
    return { name: "Home" };
  }
});
