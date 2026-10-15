import { Check, Crop, Image, MousePointer2, Scan } from "lucide-react";

const CapturePreview = () => {
  return (
    <div className="preview-stage" aria-hidden="true">
      <div className="preview-window">
        <div className="preview-window-header">
          <span className="window-dot" />
          <span className="window-dot" />
          <span className="window-dot" />
        </div>

        <div className="preview-content">
          <div className="preview-label">Capture workspace</div>

          <div className="preview-demo-card">
            <div className="preview-demo-icon">
              <Image size={20} />
            </div>

            <div>
              <div className="preview-demo-title">Screenshot captured</div>

              <div className="preview-demo-subtitle">
                Ready to crop and annotate
              </div>
            </div>

            <Check
              size={17}
              color="var(--success)"
              style={{ marginLeft: "auto", flexShrink: 0 }}
            />
          </div>

          <div className="preview-demo-card">
            <div className="preview-demo-icon">
              <Crop size={20} />
            </div>

            <div>
              <div className="preview-demo-title">Select any region</div>

              <div className="preview-demo-subtitle">
                Keep only what matters
              </div>
            </div>
          </div>

          <div className="preview-progress">
            <span />
          </div>
        </div>
      </div>

      <div className="preview-floating-tag">
        <MousePointer2 size={16} />
        <span>Capture precisely</span>
        <Scan size={16} />
      </div>
    </div>
  );
};

export default CapturePreview;
