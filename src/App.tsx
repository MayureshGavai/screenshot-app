import React from "react";
import LandingPage from "./features/landing/LandingPage";
import { useSystemTheme } from "./hooks/useSystemTheme";

const App = () => {
  useSystemTheme();
  return <LandingPage />;
};

export default App;
