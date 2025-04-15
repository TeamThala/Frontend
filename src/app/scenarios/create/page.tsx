// "use client";

// import React, { useState, useCallback } from 'react';
// import Link from 'next/link';
// import { Button } from '@/components/ui/button';
// import ScenarioStepper from './components/ScenarioStepper';
// import StepNavigation from './components/StepNavigation';

// // Import all step components
// import GeneralInformationStep, { GeneralInformationData } from './components/GeneralInformationStep';
// import InvestmentsStep, { InvestmentsData } from './components/InvestmentsStep';
// import EventSeriesStep, { EventSeriesData } from './components/EventSeriesStep';
// import SpendingStrategyStep, { SpendingStrategyData } from './components/SpendingStrategyStep';
// import ExpenseWithdrawalStrategyStep, { ExpenseWithdrawalStrategyData } from './components/ExpenseWithdrawalStrategyStep';
// import RothAndRMDStep, { RothAndRMDData } from './components/RothAndRMDStep';
// import SummaryStep from './components/SummaryStep';

// // Define step labels
// const STEPS = [
//   "General Information",
//   "Investments",
//   "Event Series",
//   "Spending Strategy",
//   "Expense Withdrawal Strategy",
//   "Roth and RMD",
//   "Summary"
// ];

// // Define the overall form data structure
// export interface ScenarioFormData {
//   generalInformation: GeneralInformationData;
//   investments: InvestmentsData;
//   eventSeries: EventSeriesData;
//   spendingStrategy: SpendingStrategyData;
//   expenseWithdrawalStrategy: ExpenseWithdrawalStrategyData;
//   rothAndRMD: RothAndRMDData;
// }

// export default function CreateScenarioPage() {
//   const [currentStep, setCurrentStep] = useState(0);
//   const [stepValidation, setStepValidation] = useState<Record<number, boolean>>({
//     0: false, // GeneralInformation step initially invalid
//     1: false, // Investments step initially invalid
//     2: true,
//     3: true,
//     4: true, // ExpenseWithdrawalStrategy step initially valid
//     5: true,
//     6: true,
//   });
  
//   // Initialize the scenario form data
//   const [scenarioData, setScenarioData] = useState<ScenarioFormData>({
//     generalInformation: {
//       scenarioName: '',
//       scenarioDescription: '',
//       scenarioType: 'Single',
//       userBirthYear: 1990,
//       userLifeExpectancy: 85,
//       spouseBirthYear: 1990,
//       spouseLifeExpectancy: 85,
//       financialGoal: 0,
//       residenceState: '',
//     },
//     investments: {
//       investments: [] // Initialize with empty investments array
//     },
//     eventSeries: {
//       events: [] // Initialize with empty events array
//     },
//     spendingStrategy: {
//       expensePriorityOrder: []
//     },
//     expenseWithdrawalStrategy: {
//       withdrawalOrder: []
//     },
//     rothAndRMD: {
//       inflationRate: {
//         type: "fixed",
//         valueType: "percentage",
//         value: 2.5
//       }
//     },
//   });

//   // Handle step validation change with useCallback
//   const handleStepValidationChange = useCallback((stepIndex: number, isValid: boolean) => {
//     setStepValidation(prev => ({
//       ...prev,
//       [stepIndex]: isValid
//     }));
//   }, []);

//   // Functions to update data for each step
//   const updateGeneralInformation = useCallback((data: GeneralInformationData) => {
//     // If scenario type is Single, make sure we don't store spouse data
//     const updatedData = data.scenarioType === 'Single' 
//       ? { ...data, spouseBirthYear: undefined, spouseLifeExpectancy: undefined }
//       : data;

//     setScenarioData(prevData => ({
//       ...prevData,
//       generalInformation: updatedData,
//     }));
//   }, []);

//   const updateInvestments = useCallback((data: InvestmentsData) => {  
//     setScenarioData(prevData => ({
//       ...prevData,
//       investments: data,
//     }));
//   }, []);

//   const updateEventSeries = useCallback((data: EventSeriesData) => {
//     setScenarioData(prevData => ({
//       ...prevData,
//       eventSeries: data,
//     }));
//   }, []);

//   const updateSpendingStrategy = useCallback((data: SpendingStrategyData) => {
//     setScenarioData(prevData => ({
//       ...prevData,
//       spendingStrategy: data,
//     }));
//   }, []);

//   const updateExpenseWithdrawalStrategy = useCallback((data: ExpenseWithdrawalStrategyData) => {
//     setScenarioData(prevData => ({
//       ...prevData,
//       expenseWithdrawalStrategy: data,
//     }));
//   }, []);

//   const updateRothAndRMD = useCallback((data: RothAndRMDData) => {
//     setScenarioData(prevData => ({
//       ...prevData,
//       rothAndRMD: data,
//     }));
//   }, []);

//   // Function to handle step changes
//   const handleNextStep = () => {
//     // Only allow navigation if current step is valid
//     if (currentStep < STEPS.length - 1 && stepValidation[currentStep]) {
//       setCurrentStep(currentStep + 1);
//     }
//   };

//   const handlePreviousStep = () => {
//     if (currentStep > 0) {
//       setCurrentStep(currentStep - 1);
//     }
//   };

//   const handleStepClick = (step: number) => {
//     // Check if all steps before the target step are valid
//     const canNavigate = Array.from({ length: step }, (_, i) => i)
//       .every(i => stepValidation[i]);
    
//     if (canNavigate) {
//       setCurrentStep(step);
//     } else {
//       // Alert user they need to complete previous steps
//       alert('Please complete all required fields in the current and previous steps before proceeding.');
//     }
//   };

//   const handleFinish = () => {
//     // Check if all steps are valid before finishing
//     const allStepsValid = Object.values(stepValidation).every(valid => valid);
    
//     if (allStepsValid) {
//       // Logic for saving the scenario and redirecting
//       console.log('Scenario creation completed!');
//       console.log('Final scenario data:', scenarioData);
//       // You would normally save data and redirect here
//     } else {
//       alert('Please complete all required fields in all steps before finishing.');
//     }
//   };

//   // Generate validation change handler for specific step
//   const getValidationChangeHandler = useCallback((stepIndex: number) => {
//     return (isValid: boolean) => handleStepValidationChange(stepIndex, isValid);
//   }, [handleStepValidationChange]);

//   // Render the appropriate step component based on currentStep
//   const renderStepContent = () => {
//     switch (currentStep) {
//       case 0:
//         return (
//           <GeneralInformationStep 
//             data={scenarioData.generalInformation}
//             onDataUpdate={updateGeneralInformation}
//             onValidationChange={getValidationChangeHandler(0)}
//           />
//         );
//       case 1:
//         return (
//           <InvestmentsStep 
//             data={scenarioData.investments}
//             onDataUpdate={updateInvestments}
//             onValidationChange={getValidationChangeHandler(1)}
//           />
//         );
//       case 2:
//         return (
//           <EventSeriesStep 
//             data={scenarioData.eventSeries}
//             onDataUpdate={updateEventSeries}
//             investmentsData={scenarioData.investments}
//           />
//         );
//       case 3:
//         return (
//           <SpendingStrategyStep 
//             data={scenarioData.spendingStrategy}
//             onDataUpdate={updateSpendingStrategy}
//             onValidationChange={getValidationChangeHandler(3)}
//             eventSeriesData={scenarioData.eventSeries}
//           />
//         );
//       case 4:
//         return (
//           <ExpenseWithdrawalStrategyStep 
//             data={scenarioData.expenseWithdrawalStrategy}
//             onDataUpdate={updateExpenseWithdrawalStrategy}
//             onValidationChange={getValidationChangeHandler(4)}
//             investmentsData={scenarioData.investments}
//           />
//         );
//       case 5:
//         return (
//           <RothAndRMDStep 
//             data={scenarioData.rothAndRMD}
//             onDataUpdate={updateRothAndRMD}
//           />
//         );
//       case 6:
//         return (
//           <SummaryStep scenarioData={scenarioData}/>
//         );
//       default:
//         return (
//           <GeneralInformationStep 
//             data={scenarioData.generalInformation}
//             onDataUpdate={updateGeneralInformation}
//             onValidationChange={getValidationChangeHandler(0)}
//           />
//         );
//     }
//   };

//   return (
//     <div className="container mx-auto py-8 px-4 bg-black min-h-screen">
//       <div className="flex items-center mb-8">
//         <Link href="/scenarios">
//           <Button variant="outline" className="text-white border-zinc-800 hover:bg-zinc-900 bg-zinc-900 mr-4">
//             Back to Scenarios
//           </Button>
//         </Link>
//         <h1 className="text-4xl font-bold text-white">Create New Scenario</h1>
//       </div>

//       {/* Stepper Component */}
//       <ScenarioStepper 
//         steps={STEPS} 
//         currentStep={currentStep}
//         onStepClick={handleStepClick}
//         stepValidation={stepValidation}
//       />

//       {/* Step Content */}
//       <div className="my-8">
//         {renderStepContent()}
//       </div>

//       {/* Navigation between steps */}
//       <StepNavigation 
//         currentStep={currentStep}
//         totalSteps={STEPS.length}
//         onNext={handleNextStep}
//         onPrevious={handlePreviousStep}
//         isLastStep={currentStep === STEPS.length - 1}
//         onFinish={handleFinish}
//         isNextDisabled={!stepValidation[currentStep]}
//       />

//       {/* Preview of all collected data (for development) */}
//       {currentStep === STEPS.length - 1 && (
//         <div className="mt-8 p-4 bg-zinc-900 rounded-lg">
//           <h3 className="text-xl font-semibold mb-2 text-white">Scenario Data Summary</h3>
//           <pre className="text-xs text-zinc-400 overflow-auto">
//             {JSON.stringify(scenarioData, null, 2)}
//           </pre>
//         </div>
//       )}
//     </div>
//   );
// } 