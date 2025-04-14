import React from "react";

interface StepperProps {
    currentStep: number;
    steps: string[];
    onStepClick: (step: number) => void;
  }
  
 export default function Stepper({ currentStep, steps, onStepClick }: StepperProps) {
    return (
      <div className="w-full py-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={index}>
              {/* Step Item */}
              <div className="flex flex-col items-center relative">
                <div
                  className={`flex items-center justify-center h-12 w-12 rounded-full cursor-pointer transition-colors z-10
                    ${index === currentStep
                      ? "bg-purple-600 text-white"
                      : index < currentStep
                        ? "bg-green-500 text-white"
                        : "border bg-zinc-900 border-white text-white"
                    }`}
                  onClick={() => onStepClick(index)}
                >
                  {index + 1}
                </div>
                <span
                  className={`mt-2 text-sm text-center
                    ${index === currentStep
                      ? "text-purple-600 font-semibold"
                      : index < currentStep
                        ? "text-green-500"
                        : "text-gray-400"
                    }`}
                >
                  {step}
                </span>
              </div>
  
              {/* Connector Line (only between steps) */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 bg-gray-200 mx-2"
                  style={{
                    marginTop: '-1.5rem',
                    backgroundColor: index < currentStep ? "#22c55e" : "#e5e7eb" // green-500 or gray-200
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }
  