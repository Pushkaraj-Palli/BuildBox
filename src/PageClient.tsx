"use client";

import dynamic from "next/dynamic";

const screens = {
  home: dynamic(() => import("./screens/home"), { ssr: false }),
  login: dynamic(() => import("./screens/login"), { ssr: false }),
  signup: dynamic(() => import("./screens/authPage").then((module) => () => <module.default mode="signup" />), { ssr: false }),
  forgotPassword: dynamic(() => import("./screens/authPage").then((module) => () => <module.default mode="forgot" />), { ssr: false }),
  dashboard: dynamic(() => import("./screens/dashboard"), { ssr: false }),
  templates: dynamic(() => import("./screens/templates"), { ssr: false }),
  pricing: dynamic(() => import("./screens/pricingPage"), { ssr: false }),
  settings: dynamic(() => import("./screens/settingsPage"), { ssr: false }),
  workspace: dynamic(() => import("./screens/workspacePage"), { ssr: false }),
  onboarding: dynamic(() => import("./screens/onboarding"), { ssr: false }),
  loading: dynamic(() => import("./screens/loadingPage"), { ssr: false }),
  error: dynamic(() => import("./screens/loadingPage").then((module) => module.ErrorPage), { ssr: false }),
  notFound: dynamic(() => import("./screens/loadingPage").then((module) => () => <module.ErrorPage notFound />), { ssr: false }),
};

export type ScreenName = keyof typeof screens;

export default function PageClient({ screen }: { screen: ScreenName }) {
  const Screen = screens[screen];
  return <Screen />;
}
