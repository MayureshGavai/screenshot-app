import { useState } from "react";

import LandingHeader from "./components/LandingHeader";
import LandingHero from "./components/LandingHero";
import WorkflowSteps from "./components/WorkflowSteps";
import { toast } from "sonner";

export default function LandingPage() {
  const [isCapturing, setIsCapturing] = useState(false);

  async function handleStartCapture() {
    if (isCapturing) return;

    setIsCapturing(true);

    try {
      const result = await window.electronAPI.startNewCapture();

      if (!result.success) {
        toast.info("Unable to start screenshot capture. Please try again.");
      }
    } catch (error) {
      console.error("Failed to start screenshot capture:", error);
      toast.error("Something went wrong while starting capture.");
    } finally {
      setIsCapturing(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="app-container">
        <LandingHeader />

        <LandingHero onStartCapture={handleStartCapture} />

        <WorkflowSteps />
      </div>
    </main>
  );
}
