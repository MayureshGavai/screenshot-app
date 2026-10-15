import { useState } from "react";
import { Monitor } from "lucide-react";

import LandingHeader from "./components/LandingHeader";
import LandingHero from "./components/LandingHero";
import WorkflowSteps from "./components/WorkflowSteps";

export default function LandingPage() {
  const [notice, setNotice] = useState("");

  function handleStartCapture() {
    setNotice(
      "Capture is not connected yet. We'll implement desktop region selection in Phase 2.",
    );
  }

  return (
    <main className="app-shell">
      <div className="app-container">
        <LandingHeader />

        <LandingHero onStartCapture={handleStartCapture} />

        <WorkflowSteps />

        {notice && (
          <div className="notice" role="status">
            {notice}
          </div>
        )}

        <footer className="app-footer">
          <span>Made for a clearer workflow.</span>

          <span className="status-indicator">
            <span />
            <Monitor size={13} />
            Desktop workspace
          </span>
        </footer>
      </div>
    </main>
  );
}
