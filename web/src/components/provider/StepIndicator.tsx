import { Check } from "lucide-react";
import "./StepIndicator.css";

interface Step {
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number; // 0-indexed
}

export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="step-indicator" role="navigation" aria-label="Verification progress">
      {steps.map((step, index) => {
        const isComplete = index < currentStep;
        const isCurrent = index === currentStep;
        const isUpcoming = index > currentStep;

        return (
          <div
            key={step.label}
            className={`step-item ${isComplete ? "step-complete" : ""} ${isCurrent ? "step-current" : ""} ${isUpcoming ? "step-upcoming" : ""}`}
          >
            <div className="step-circle">
              {isComplete ? (
                <Check size={14} strokeWidth={3} />
              ) : (
                <span className="step-number">{index + 1}</span>
              )}
            </div>
            <span className="step-label">{step.label}</span>
            {index < steps.length - 1 && <div className="step-connector" />}
          </div>
        );
      })}
    </div>
  );
}
