import { ArrowRight, Command, Crosshair, Sparkles } from "lucide-react";

import CapturePreview from "./CapturePreview";

type LandingHeroProps = {
  onStartCapture: () => void;
};

export default function LandingHero({ onStartCapture }: LandingHeroProps) {
  return (
    <section className="landing-hero">
      <div>
        <div className="eyebrow">
          <Sparkles size={15} />
          Your ideas, captured clearly
        </div>

        <h1 className="hero-title">
          Capture it.
          <br />
          Make it <span>clear.</span>
        </h1>

        <p className="hero-description">
          Capture any part of your screen, highlight what matters, and share a
          clear image without interrupting your workflow.
        </p>

        <div className="hero-actions">
          <button className="primary-button" onClick={onStartCapture}>
            <Crosshair size={17} />
            Start capture
            <ArrowRight size={16} />
          </button>

          <div className="shortcut-hint">
            <Command size={14} />
            <kbd>Ctrl</kbd>
            <span>+</span>
            <kbd>Shift</kbd>
            <span>+</span>
            <kbd>S</kbd>
          </div>
        </div>
      </div>

      <CapturePreview />
    </section>
  );
}
