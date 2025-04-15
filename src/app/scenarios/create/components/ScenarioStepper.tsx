// "use client";

// import React from 'react';

// export interface StepperProps {
//   steps: string[];
//   currentStep: number;
//   onStepClick: (step: number) => void;
//   stepValidation?: Record<number, boolean>;
// }

// export default function ScenarioStepper({ steps, currentStep, onStepClick, stepValidation = {} }: StepperProps) {
//   return (
//     <div className="w-full mt-8 mb-12">
//       {/* Main stepper with number circles and lines */}
//       <div className="flex items-center relative">
//         {/* Background connector line */}
//         <div className="absolute h-0.5 bg-zinc-700 w-full" style={{ top: '16px', left: 0, zIndex: 0 }} />
        
//         {/* Active progress line */}
//         {currentStep > 0 && (
//           <div 
//             className="absolute h-0.5 bg-[#7F56D9] transition-all duration-300" 
//             style={{ 
//               top: '16px', 
//               left: 0, 
//               zIndex: 1,
//               width: `calc(${(currentStep / (steps.length - 1)) * 100}% - ${(32 * currentStep) / (steps.length)}px)`
//             }} 
//           />
//         )}
        
//         {/* Steps with circles */}
//         <div className="flex justify-between w-full relative z-10">
//           {steps.map((step, index) => {
//             const isActive = index === currentStep;
//             const isCompleted = index < currentStep;
//             const isClickable = index <= currentStep || (stepValidation && Object.entries(stepValidation)
//               .filter(([stepIndex, isValid]) => parseInt(stepIndex) < index && isValid)
//               .length === index);
            
//             return (
//               <div key={index} className="flex flex-col items-center">
//                 <button
//                   onClick={() => isClickable && onStepClick(index)}
//                   disabled={!isClickable}
//                   className={`flex items-center justify-center w-8 h-8 rounded-full border-2 bg-black
//                     ${isActive 
//                       ? 'bg-[#7F56D9] border-[#7F56D9] text-white' 
//                       : isCompleted 
//                         ? 'bg-[#7F56D9] border-[#7F56D9] text-white' 
//                         : 'bg-black border-zinc-700 text-zinc-400'
//                     } ${!isClickable ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
//                 >
//                   {isCompleted ? (
//                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
//                     </svg>
//                   ) : (
//                     index + 1
//                   )}
//                 </button>
                
//                 {/* Step label */}
//                 <span 
//                   className={`mt-2 text-xs font-medium truncate max-w-[120px] text-center
//                     ${isActive 
//                       ? 'text-white' 
//                       : isCompleted 
//                         ? 'text-[#7F56D9]' 
//                         : 'text-zinc-500'
//                     }`}
//                 >
//                   {step}
//                 </span>
//               </div>
//             );
//           })}
//         </div>
//       </div>
//     </div>
//   );
// } 