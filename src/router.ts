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
import VisitorPage from "./pages/VisitorPage.vue";
import FollowAndFansPage from "./pages/FollowAndFansPage.vue";
import BlockListPage from "./pages/BlockListPage.vue";
import NotificationPage from "./pages/NotificationPage.vue";
import BlockAndReportPage from "./pages/BlockAndReportPage.vue";
import FeedbackPage from "./pages/FeedbackPage.vue";
import EditProfilePage from "./pages/EditProfilePage.vue";
import GameCatPage from "./pages/GameCatPage.vue";
import NearbyPage from "./pages/NearbyPage.vue";
import MatchNewPage from "./pages/MatchNewPage.vue";
import MatchDetailPage from "./pages/MatchDetailPage.vue";

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
    { path: "/call/:id", name: "Call", component: CallPage },
    { path: "/live/:id", name: "LiveStream", component: LiveStreamPage },
    { path: "/call-summary/:id", name: "CallSummary", component: CallSummaryPage },
    { path: "/wallet", name: "Wallet", component: WalletPage },
    { path: "/recharge", name: "Recharge", component: RechargePage },
    { path: "/payment", name: "Payment", component: PaymentPage },
    { path: "/payment-result", name: "PaymentResult", component: PaymentResultPage },
    { path: "/login", name: "Login", component: LoginPage },
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
    { path: "/match-new", name: "MatchNew", component: MatchNewPage },
    { path: "/match-detail", name: "MatchDetail", component: MatchDetailPage }
  ],
  scrollBehavior() {
    return { top: 0 };
  }
});
