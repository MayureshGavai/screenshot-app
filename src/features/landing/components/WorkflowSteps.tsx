import {
  ClipboardCheck,
  Crop,
  PencilRuler,
  type LucideIcon,
} from "lucide-react";
import { workflowSteps } from "../../../constants/workflowSteps";

export default function WorkflowSteps() {
  return (
    <section className="workflow-section">
      <h2 className="section-heading">From screen to shareable image</h2>

      <p className="section-description">
        A simple workflow, from capturing to the final result.
      </p>

      <div className="workflow-grid">
        {workflowSteps.map((step) => {
          const Icon = step.icon;

          return (
            <article className="workflow-card" key={step.number}>
              <div className="workflow-icon">
                <Icon size={20} />
              </div>

              <div>
                <h3 className="workflow-title">
                  <span
                    style={{
                      color: "var(--text-muted)",
                      marginRight: 7,
                    }}
                  >
                    {step.number}
                  </span>
                  {step.title}
                </h3>

                <p className="workflow-description">{step.description}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
