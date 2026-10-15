import { Aperture } from "lucide-react";
import React from "react";

const LandingHeader = () => {
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-mark">
          <Aperture size={21} strokeWidth={2.2} />
        </div>

        <span>Snapmark</span>
      </div>

      <div className="header-caption">Your desktop capture workspace</div>
    </header>
  );
};

export default LandingHeader;
