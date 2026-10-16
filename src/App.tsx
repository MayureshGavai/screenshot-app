import React from "react";
import LandingPage from "./features/landing/LandingPage";
import { useSystemTheme } from "./hooks/useSystemTheme";
import CaptureToolbar from "./features/capture/components/CaptureToolbar";

const App = () => {
  useSystemTheme();

  const isCaptureToolbar =
    new URLSearchParams(window.location.search).get("window") ===
    "capture-toolbar";

  if (isCaptureToolbar) {
    return <CaptureToolbar />;
  }

  return <LandingPage />;
};

export default App;
