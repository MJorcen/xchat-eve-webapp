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
import ListPage from "./pages/ListPage.vue";
import FormPage from "./pages/FormPage.vue";
import UserDynamicListPage from "./pages/UserDynamicListPage.vue";

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
    { path: "/notifications", name: "Notifications", component: ListPage, meta: { listType: "notifications", title: "Notifications" } },
    { path: "/visitors", name: "Visitors", component: ListPage, meta: { listType: "visitors", title: "Visitors" } },
    { path: "/block-list", name: "BlockList", component: ListPage, meta: { listType: "blocked", title: "Block List" } },
    { path: "/follow-and-fans", name: "FollowAndFans", component: ListPage, meta: { listType: "following", title: "Follow And Fans" } },
    { path: "/wallet-detail", name: "WalletDetail", component: ListPage, meta: { listType: "wallet", title: "Wallet Detail" } },
    { path: "/edit-profile", name: "EditProfile", component: FormPage, meta: { formType: "profile", title: "Edit Profile" } },
    { path: "/feedback", name: "Feedback", component: FormPage, meta: { formType: "feedback", title: "Feedback" } },
    { path: "/video-upload-dynamic", name: "VideoUploadDynamic", component: FormPage, meta: { formType: "post", title: "New Moment" } },
    { path: "/sign-detail", name: "SignDetail", component: ListPage, meta: { listType: "sign", title: "Sign-in" } },
    { path: "/user-dynamic-list/:id", name: "UserDynamicList", component: UserDynamicListPage }
  ],
  scrollBehavior() {
    return { top: 0 };
  }
});
