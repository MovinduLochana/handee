import { Check } from "lucide-react";

interface Step {
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number; // 0-indexed
}

export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div
      className="step-indicator flex items-center justify-between w-full max-w-2xl mx-auto my-6"
      role="navigation"
      aria-label="Verification progress"
    >
      {steps.map((step, index) => {
        const isComplete = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div
            key={step.label}
            className={`step-item flex-1 flex flex-col items-center relative ${
              isComplete ? "step-complete text-foreground font-semibold" : ""
            } ${isCurrent ? "step-current text-primary font-bold" : "text-muted-foreground"}`}
          >
            <div
              className={`step-circle h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold transition-all z-10 ${
                isComplete
                  ? "bg-primary text-primary-foreground"
                  : isCurrent
                    ? "border-2 border-primary bg-background text-primary ring-4 ring-primary/10"
                    : "border border-border bg-muted/50 text-muted-foreground"
              }`}
            >
              {isComplete ? (
                <Check className="h-4 w-4" strokeWidth={3} />
              ) : (
                <span className="step-number">{index + 1}</span>
              )}
            </div>
            <span className="step-label text-xs mt-2 text-center">{step.label}</span>
            {index < steps.length - 1 && (
              <div
                className={`step-connector absolute top-4.5 left-1/2 w-full h-[2px] -z-0 ${
                  index < currentStep ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
