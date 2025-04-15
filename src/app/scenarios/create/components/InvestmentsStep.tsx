// "use client";

// import React, { useState, useEffect, useRef } from 'react';
// import { Card } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { FixedValues, NormalDistributionValues } from "@/types/utils";
// import { Trash2 } from "lucide-react";

// export interface InvestmentType {
//   id: string;
//   name: string;
//   description: string;
//   expectedAnnualReturn: FixedValues | NormalDistributionValues;
//   expenseRatio: number;
//   expectedAnnualIncome: FixedValues | NormalDistributionValues;
//   taxability: boolean;
// }

// export interface Investment {
//   id: string;
//   value: number;
//   investmentType: InvestmentType;
//   taxStatus: "non-retirement" | "pre-tax" | "after-tax";
// }

// export interface InvestmentsData {
//   investments: Investment[];
// }

// interface InvestmentsStepProps {
//   data: InvestmentsData;
//   onDataUpdate: (data: InvestmentsData) => void;
//   onValidationChange?: (isValid: boolean) => void;
// }

// export default function InvestmentsStep({ data, onDataUpdate, onValidationChange }: InvestmentsStepProps) {
//   const [investments, setInvestments] = useState<Investment[]>(data.investments || []);
//   const [errors, setErrors] = useState<Record<string, string[]>>({});
  
//   // Create a ref for the validation change callback to prevent infinite updates
//   const onValidationChangeRef = useRef(onValidationChange);

//   // Update the ref when prop changes
//   useEffect(() => {
//     onValidationChangeRef.current = onValidationChange;
//   }, [onValidationChange]);
  
//   // Validate investments
//   useEffect(() => {
//     const newErrors: Record<string, string[]> = {};
    
//     investments.forEach(investment => {
//       const investmentErrors: string[] = [];
      
//       // Check for required fields
//       if (!investment.investmentType.name.trim()) {
//         investmentErrors.push('Investment name is required');
//       }
      
//       if (investment.value <= 0) {
//         investmentErrors.push('Investment value must be greater than 0');
//       }
      
//       if (investment.investmentType.expectedAnnualReturn.type === 'fixed') {
//         if (investment.investmentType.expectedAnnualReturn.value < 0) {
//           investmentErrors.push('Expected annual return must be a non-negative value');
//         }
//       } else {
//         if ((investment.investmentType.expectedAnnualReturn as NormalDistributionValues).mean < 0) {
//           investmentErrors.push('Expected annual return mean must be a non-negative value');
//         }
//         if ((investment.investmentType.expectedAnnualReturn as NormalDistributionValues).stdDev < 0) {
//           investmentErrors.push('Expected annual return standard deviation must be a non-negative value');
//         }
//       }
      
//       if (investment.investmentType.expenseRatio < 0) {
//         investmentErrors.push('Expense ratio must be a non-negative value');
//       }
      
//       if (investment.investmentType.expectedAnnualIncome.type === 'fixed') {
//         if (investment.investmentType.expectedAnnualIncome.value < 0) {
//           investmentErrors.push('Expected annual income must be a non-negative value');
//         }
//       } else {
//         if ((investment.investmentType.expectedAnnualIncome as NormalDistributionValues).mean < 0) {
//           investmentErrors.push('Expected annual income mean must be a non-negative value');
//         }
//         if ((investment.investmentType.expectedAnnualIncome as NormalDistributionValues).stdDev < 0) {
//           investmentErrors.push('Expected annual income standard deviation must be a non-negative value');
//         }
//       }
      
//       if (investmentErrors.length > 0) {
//         newErrors[investment.id] = investmentErrors;
//       }
//     });
    
//     setErrors(newErrors);
    
//     // Update parent about validation status
//     const isValid = Object.keys(newErrors).length === 0;
//     if (onValidationChangeRef.current) {
//       onValidationChangeRef.current(investments.length === 0 || isValid);
//     }
    
//     // Update parent data
//     onDataUpdate({ investments });
//   }, [investments, onDataUpdate]);

//   const handleAddInvestment = () => {
//     // Create a new investment with default values
//     const newInvestment: Investment = {
//       id: `inv-${Date.now()}`,
//       value: 0,
//       taxStatus: "non-retirement",
//       investmentType: {
//         id: `invtype-${Date.now()}`,
//         name: "",
//         description: "",
//         expectedAnnualReturn: { type: "fixed", valueType: "percentage", value: 0 },
//         expenseRatio: 0,
//         expectedAnnualIncome: { type: "fixed", valueType: "percentage", value: 0 },
//         taxability: true
//       }
//     };
    
//     setInvestments([...investments, newInvestment]);
//   };

//   const handleRemoveInvestment = (id: string) => {
//     setInvestments(investments.filter(inv => inv.id !== id));
//   };

//   const handleInvestmentChange = (id: string, updates: Partial<Investment>) => {
//     setInvestments(investments.map(investment => 
//       investment.id === id ? { ...investment, ...updates } : investment
//     ));
//   };

//   const handleInvestmentTypeChange = (investmentId: string, updates: Partial<InvestmentType>) => {
//     setInvestments(investments.map(investment => 
//       investment.id === investmentId 
//         ? { 
//             ...investment, 
//             investmentType: { 
//               ...investment.investmentType, 
//               ...updates 
//             } 
//           } 
//         : investment
//     ));
//   };

//   const handleReturnTypeChange = (
//     investmentId: string, 
//     type: "fixed" | "normal", 
//     field: "expectedAnnualReturn" | "expectedAnnualIncome"
//   ) => {
//     setInvestments(investments.map(investment => {
//       if (investment.id !== investmentId) return investment;
      
//       const currentValue = investment.investmentType[field];
//       let newValue;
      
//       if (type === "fixed") {
//         newValue = { 
//           type: "fixed" as const, 
//           valueType: currentValue.valueType, 
//           value: 0
//         };
//       } else {
//         newValue = { 
//           type: "normal" as const, 
//           valueType: currentValue.valueType, 
//           mean: 0, 
//           stdDev: 0 
//         };
//       }
      
//       return {
//         ...investment,
//         investmentType: {
//           ...investment.investmentType,
//           [field]: newValue
//         }
//       };
//     }));
//   };

//   const handleDistributionValueChange = (
//     investmentId: string,
//     field: "expectedAnnualReturn" | "expectedAnnualIncome",
//     key: "value" | "mean" | "stdDev",
//     value: number
//   ) => {
//     setInvestments(investments.map(investment => {
//       if (investment.id !== investmentId) return investment;
      
//       const currentValue = investment.investmentType[field];
      
//       if (currentValue.type === "fixed" && key === "value") {
//         return {
//           ...investment,
//           investmentType: {
//             ...investment.investmentType,
//             [field]: { ...currentValue, value }
//           }
//         };
//       } else if (currentValue.type === "normal" && (key === "mean" || key === "stdDev")) {
//         return {
//           ...investment,
//           investmentType: {
//             ...investment.investmentType,
//             [field]: { ...currentValue, [key]: value }
//           }
//         };
//       }
      
//       return investment;
//     }));
//   };

//   // Helper to check if an investment has errors
//   const hasErrors = (investmentId: string): boolean => {
//     return !!errors[investmentId] && errors[investmentId].length > 0;
//   };

//   // Helper to get input class based on error state
//   const getInputClass = (investmentId: string, fieldName: string): string => {
//     const baseClass = "w-full px-3 py-2 bg-zinc-900 border rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#7F56D9]";
    
//     if (hasErrors(investmentId) && errors[investmentId].some(err => err.toLowerCase().includes(fieldName.toLowerCase()))) {
//       return `${baseClass} border-red-500`;
//     }
    
//     return `${baseClass} border-zinc-700`;
//   };

//   return (
//     <Card className="bg-black text-white p-6 rounded-lg border border-zinc-800">
//       <h2 className="text-2xl font-bold mb-6">Investments</h2>
      
//       {/* Investments List */}
//       {investments.length > 0 && (
//         <div className="mb-6">
//           <h3 className="text-lg font-medium mb-4">Your Investments</h3>
          
//           {investments.map((investment, index) => (
//             <div key={investment.id} className="mb-6 border-b border-zinc-800 pb-6">
//               <div className="flex justify-between items-center mb-4">
//                 <h4 className="text-md font-medium">Investment #{index + 1}</h4>
//                 <Button 
//                   variant="ghost" 
//                   size="sm"
//                   className="text-red-500 hover:text-red-400 hover:bg-zinc-900"
//                   onClick={() => handleRemoveInvestment(investment.id)}
//                 >
//                   <Trash2 className="h-5 w-5 mr-1" />
//                   Remove
//                 </Button>
//               </div>
              
//               {hasErrors(investment.id) && (
//                 <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-md">
//                   <p className="text-red-400 font-medium mb-1">Please fix the following errors:</p>
//                   <ul className="list-disc list-inside text-sm text-red-400">
//                     {errors[investment.id].map((error, i) => (
//                       <li key={i}>{error}</li>
//                     ))}
//                   </ul>
//                 </div>
//               )}
              
//               <div className="space-y-4">
//                 {/* Basic Info */}
//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                   <div className="space-y-2">
//                     <label className="block text-sm font-medium text-white">
//                       Investment Name <span className="text-red-500">*</span>
//                     </label>
//                     <input 
//                       type="text" 
//                       className={getInputClass(investment.id, 'name')}
//                       value={investment.investmentType.name}
//                       onChange={(e) => handleInvestmentTypeChange(investment.id, { name: e.target.value })}
//                       placeholder="e.g., US Total Stock Market"
//                     />
//                   </div>
                  
//                   <div className="space-y-2">
//                     <label className="block text-sm font-medium text-white">
//                       Current Value ($) <span className="text-red-500">*</span>
//                     </label>
//                     <input 
//                       type="number" 
//                       min="0"
//                       step="1000"
//                       className={getInputClass(investment.id, 'value')}
//                       value={investment.value}
//                       onChange={(e) => handleInvestmentChange(investment.id, { value: Number(e.target.value) })}
//                     />
//                   </div>
//                 </div>
                
//                 {/* Tax Status */}
//                 <div className="space-y-2">
//                   <label className="block text-sm font-medium text-white">
//                     Tax Status <span className="text-red-500">*</span>
//                   </label>
//                   <select 
//                     className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#7F56D9]"
//                     value={investment.taxStatus}
//                     onChange={(e) => handleInvestmentChange(investment.id, { 
//                       taxStatus: e.target.value as "non-retirement" | "pre-tax" | "after-tax"
//                     })}
//                   >
//                     <option value="non-retirement">Non-Retirement Account</option>
//                     <option value="pre-tax">Pre-Tax Retirement Account</option>
//                     <option value="after-tax">After-Tax Retirement Account</option>
//                   </select>
//                 </div>
                
//                 {/* Expected Annual Return */}
//                 <div className="space-y-2">
//                   <label className="block text-sm font-medium text-white">
//                     Expected Annual Return <span className="text-red-500">*</span>
//                   </label>
//                   <div className="flex items-center space-x-4 mb-2">
//                     <label className="inline-flex items-center">
//                       <input
//                         type="radio"
//                         className="form-radio text-[#7F56D9] bg-zinc-900 border-zinc-700"
//                         checked={investment.investmentType.expectedAnnualReturn.type === 'fixed'}
//                         onChange={() => handleReturnTypeChange(investment.id, 'fixed', 'expectedAnnualReturn')}
//                       />
//                       <span className="ml-2 text-sm">Fixed</span>
//                     </label>
//                     <label className="inline-flex items-center">
//                       <input
//                         type="radio"
//                         className="form-radio text-[#7F56D9] bg-zinc-900 border-zinc-700"
//                         checked={investment.investmentType.expectedAnnualReturn.type === 'normal'}
//                         onChange={() => handleReturnTypeChange(investment.id, 'normal', 'expectedAnnualReturn')}
//                       />
//                       <span className="ml-2 text-sm">Normal Distribution</span>
//                     </label>
//                   </div>
                  
//                   {investment.investmentType.expectedAnnualReturn.type === 'fixed' ? (
//                     <div className="space-y-2">
//                       <label className="block text-xs text-zinc-400">Value (%) <span className="text-red-500">*</span></label>
//                       <input 
//                         type="number" 
//                         min="0"
//                         step="0.1"
//                         className={getInputClass(investment.id, 'expected annual return')}
//                         value={investment.investmentType.expectedAnnualReturn.value}
//                         onChange={(e) => handleDistributionValueChange(
//                           investment.id, 
//                           'expectedAnnualReturn', 
//                           'value', 
//                           Number(e.target.value)
//                         )}
//                       />
//                     </div>
//                   ) : (
//                     <div className="grid grid-cols-2 gap-4">
//                       <div className="space-y-2">
//                         <label className="block text-xs text-zinc-400">Mean (%) <span className="text-red-500">*</span></label>
//                         <input 
//                           type="number" 
//                           min="0"
//                           step="0.1"
//                           className={getInputClass(investment.id, 'expected annual return mean')}
//                           value={(investment.investmentType.expectedAnnualReturn as NormalDistributionValues).mean}
//                           onChange={(e) => handleDistributionValueChange(
//                             investment.id, 
//                             'expectedAnnualReturn', 
//                             'mean', 
//                             Number(e.target.value)
//                           )}
//                         />
//                       </div>
//                       <div className="space-y-2">
//                         <label className="block text-xs text-zinc-400">Std Dev (%) <span className="text-red-500">*</span></label>
//                         <input 
//                           type="number" 
//                           min="0"
//                           step="0.1"
//                           className={getInputClass(investment.id, 'expected annual return standard deviation')}
//                           value={(investment.investmentType.expectedAnnualReturn as NormalDistributionValues).stdDev}
//                           onChange={(e) => handleDistributionValueChange(
//                             investment.id, 
//                             'expectedAnnualReturn', 
//                             'stdDev', 
//                             Number(e.target.value)
//                           )}
//                         />
//                       </div>
//                     </div>
//                   )}
//                 </div>
                
//                 {/* Expense Ratio */}
//                 <div className="space-y-2">
//                   <label className="block text-sm font-medium text-white">
//                     Expense Ratio (%) <span className="text-red-500">*</span>
//                   </label>
//                   <input 
//                     type="number" 
//                     min="0"
//                     step="0.01"
//                     className={getInputClass(investment.id, 'expense ratio')}
//                     value={investment.investmentType.expenseRatio}
//                     onChange={(e) => handleInvestmentTypeChange(investment.id, { expenseRatio: Number(e.target.value) })}
//                   />
//                 </div>
                
//                 {/* Expected Annual Income */}
//                 <div className="space-y-2">
//                   <label className="block text-sm font-medium text-white">
//                     Expected Annual Income <span className="text-red-500">*</span>
//                   </label>
//                   <div className="flex items-center space-x-4 mb-2">
//                     <label className="inline-flex items-center">
//                       <input
//                         type="radio"
//                         className="form-radio text-[#7F56D9] bg-zinc-900 border-zinc-700"
//                         checked={investment.investmentType.expectedAnnualIncome.type === 'fixed'}
//                         onChange={() => handleReturnTypeChange(investment.id, 'fixed', 'expectedAnnualIncome')}
//                       />
//                       <span className="ml-2 text-sm">Fixed</span>
//                     </label>
//                     <label className="inline-flex items-center">
//                       <input
//                         type="radio"
//                         className="form-radio text-[#7F56D9] bg-zinc-900 border-zinc-700"
//                         checked={investment.investmentType.expectedAnnualIncome.type === 'normal'}
//                         onChange={() => handleReturnTypeChange(investment.id, 'normal', 'expectedAnnualIncome')}
//                       />
//                       <span className="ml-2 text-sm">Normal Distribution</span>
//                     </label>
//                   </div>
                  
//                   {investment.investmentType.expectedAnnualIncome.type === 'fixed' ? (
//                     <div className="space-y-2">
//                       <label className="block text-xs text-zinc-400">Value (%) <span className="text-red-500">*</span></label>
//                       <input 
//                         type="number" 
//                         min="0"
//                         step="0.1"
//                         className={getInputClass(investment.id, 'expected annual income')}
//                         value={investment.investmentType.expectedAnnualIncome.value}
//                         onChange={(e) => handleDistributionValueChange(
//                           investment.id, 
//                           'expectedAnnualIncome', 
//                           'value', 
//                           Number(e.target.value)
//                         )}
//                       />
//                     </div>
//                   ) : (
//                     <div className="grid grid-cols-2 gap-4">
//                       <div className="space-y-2">
//                         <label className="block text-xs text-zinc-400">Mean (%) <span className="text-red-500">*</span></label>
//                         <input 
//                           type="number" 
//                           min="0"
//                           step="0.1"
//                           className={getInputClass(investment.id, 'expected annual income mean')}
//                           value={(investment.investmentType.expectedAnnualIncome as NormalDistributionValues).mean}
//                           onChange={(e) => handleDistributionValueChange(
//                             investment.id, 
//                             'expectedAnnualIncome', 
//                             'mean', 
//                             Number(e.target.value)
//                           )}
//                         />
//                       </div>
//                       <div className="space-y-2">
//                         <label className="block text-xs text-zinc-400">Std Dev (%) <span className="text-red-500">*</span></label>
//                         <input 
//                           type="number" 
//                           min="0"
//                           step="0.1"
//                           className={getInputClass(investment.id, 'expected annual income standard deviation')}
//                           value={(investment.investmentType.expectedAnnualIncome as NormalDistributionValues).stdDev}
//                           onChange={(e) => handleDistributionValueChange(
//                             investment.id, 
//                             'expectedAnnualIncome', 
//                             'stdDev', 
//                             Number(e.target.value)
//                           )}
//                         />
//                       </div>
//                     </div>
//                   )}
//                 </div>
                
//                 {/* Taxability */}
//                 <div className="space-y-2">
//                   <label className="block text-sm font-medium text-white">
//                     Taxability <span className="text-red-500">*</span>
//                   </label>
//                   <select 
//                     className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#7F56D9]"
//                     value={investment.investmentType.taxability ? "true" : "false"}
//                     onChange={(e) => handleInvestmentTypeChange(investment.id, { 
//                       taxability: e.target.value === "true"
//                     })}
//                   >
//                     <option value="true">Taxable</option>
//                     <option value="false">Tax-Free</option>
//                   </select>
//                 </div>
//               </div>
//             </div>
//           ))}
          
//           {/* Portfolio Summary */}
//           <div className="bg-zinc-900 p-3 rounded-md mt-4">
//             <div className="flex justify-between items-center">
//               <span>Total Investment Value:</span>
//               <span className="font-bold">
//                 ${investments.reduce((sum, inv) => sum + inv.value, 0).toLocaleString()}
//               </span>
//             </div>
//           </div>
//         </div>
//       )}
      
//       {/* Add Investment Button */}
//       <div className="flex justify-center">
//         <Button 
//           onClick={handleAddInvestment}
//           className="bg-[#7F56D9] hover:bg-[#6941C6] text-white px-8 py-2"
//         >
//           + Add Investment
//         </Button>
//       </div>
      
//       {investments.length === 0 && (
//         <div className="mt-4 text-center text-zinc-400">
//           <p>No investments added yet. Click the button above to add your first investment.</p>
//         </div>
//       )}
      
//       {/* Investments Data Preview (for development) */}
//       <div className="mt-8 p-4 bg-zinc-900 rounded-lg">
//         <h3 className="text-md font-semibold mb-2">Investments Configuration</h3>
//         <pre className="text-xs text-zinc-400 overflow-auto">
//           {JSON.stringify({ investments }, null, 2)}
//         </pre>
//       </div>
//     </Card>
//   );
// } 