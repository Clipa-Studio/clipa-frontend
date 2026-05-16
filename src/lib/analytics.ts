// GA4 이벤트 추적 헬퍼

type SlackAnalyticsEvent =
  | { type: "contact_email_click" }
  | { type: "purchase_complete"; planName: string }
  | {
      type: "subscription_cancel";
      email: string;
      reason: string;
      detail?: string;
    };

// 슬랙 알림은 서버 API route에서만 webhook을 사용한다.
const sendSlackNotification = async (event: SlackAnalyticsEvent) => {
  if (typeof window === "undefined") return;

  try {
    await fetch("/api/slack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...event,
        referrer: document.referrer || "Direct visit",
      }),
      keepalive: true,
    });
  } catch (error) {
    console.error("Slack notification failed:", error);
  }
};

declare global {
  interface Window {
    gtag: (
      command: "event" | "config" | "js",
      action: string,
      params?: Record<string, unknown>
    ) => void;
  }
}

export const trackEvent = (
  action: string,
  category: string,
  label?: string
) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", action, {
      event_category: category,
      event_label: label,
    });
  }
};

// 사전 정의된 이벤트들
export const analytics = {
  // 다운로드 버튼 클릭
  downloadClick: (location: "header" | "hero" | "cta" | "mobile_menu") => {
    trackEvent("download_click", "CTA", location);
  },

  // 문의 이메일 클릭
  contactEmailClick: () => {
    trackEvent("contact_email_click", "engagement", "faq_section");
    sendSlackNotification({ type: "contact_email_click" });
  },

  // 결제 성공
  purchaseComplete: (planName: string) => {
    trackEvent("purchase_complete", "conversion", planName);
    sendSlackNotification({ type: "purchase_complete", planName });
  },

  // 랜딩페이지 방문
  pageVisit: () => {
    trackEvent("page_visit", "traffic", "landing");
  },

  // Watch Demo 클릭
  watchDemoClick: () => {
    trackEvent("watch_demo_click", "engagement", "hero");
  },

  // 네비게이션 클릭
  navClick: (item: string) => {
    trackEvent("nav_click", "navigation", item);
  },

  // FAQ 열기
  faqOpen: (question: string) => {
    trackEvent("faq_open", "engagement", question);
  },

  // 구독 취소 사유
  subscriptionCancel: async (
    email: string,
    reason: string,
    detail?: string
  ) => {
    trackEvent("subscription_cancel", "churn", reason);
    await sendSlackNotification({
      type: "subscription_cancel",
      email,
      reason,
      detail,
    });
  },
};
