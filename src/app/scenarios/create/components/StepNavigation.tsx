"use client";

import React from 'react';
import { Button } from "@/components/ui/button";

export interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  isLastStep: boolean;
  onFinish: () => void;
  isNextDisabled?: boolean;
}

export default function StepNavigation({ 
  currentStep, 
  totalSteps, 
  onNext, 
  onPrevious, 
  isLastStep, 
  onFinish,
  isNextDisabled = false
}: StepNavigationProps) {
  return (
    <div className="flex justify-between mt-8">
      <Button
        variant="outline"
        onClick={onPrevious}
        disabled={currentStep === 0}
        className={`${currentStep === 0 ? 'invisible' : ''} text-white border-zinc-800 hover:bg-zinc-900 bg-zinc-900`}
      >
        Previous
      </Button>
      
      <div className="text-white">
        Step {currentStep + 1} of {totalSteps}
      </div>
      
      {isLastStep ? (
        <Button
          onClick={onFinish}
          disabled={isNextDisabled}
          className="bg-[#7F56D9] hover:bg-[#6941C6] text-white border-none disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          Finish
        </Button>
      ) : (
        <Button
          onClick={onNext}
          disabled={isNextDisabled}
          className="bg-[#7F56D9] hover:bg-[#6941C6] text-white border-none disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          Next
        </Button>
      )}
    </div>
  );
} 