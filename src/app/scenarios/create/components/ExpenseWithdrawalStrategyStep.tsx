// "use client";

// import React, { useState, useEffect, useRef } from 'react';
// import { Card } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { InvestmentsData } from "./InvestmentsStep";

// export interface ExpenseWithdrawalStrategyData {
//   withdrawalOrder: string[];
// }

// interface ExpenseWithdrawalStrategyStepProps {
//   data: ExpenseWithdrawalStrategyData;
//   onDataUpdate: (data: ExpenseWithdrawalStrategyData) => void;
//   onValidationChange?: (isValid: boolean) => void;
//   investmentsData?: InvestmentsData;
// }

// export default function ExpenseWithdrawalStrategyStep({ 
//   data, 
//   onDataUpdate, 
//   onValidationChange,
//   investmentsData = { investments: [] }
// }: ExpenseWithdrawalStrategyStepProps) {
//   // Create a ref for the data to prevent infinite updates
//   const dataRef = useRef(data);
//   const onDataUpdateRef = useRef(onDataUpdate);
//   const onValidationChangeRef = useRef(onValidationChange);
  
//   // Get investment IDs from the investments data
//   const investmentIds = investmentsData.investments.map(inv => inv.id);
  
//   // Initialize state with existing withdrawal order or investment IDs if available
//   const [formData, setFormData] = useState<ExpenseWithdrawalStrategyData>(() => {
//     // If we have pre-existing data, use it
//     if (dataRef.current?.withdrawalOrder?.length) {
//       return {
//         withdrawalOrder: dataRef.current.withdrawalOrder,
//       };
//     }
    
//     // Otherwise, use investment IDs as the default order
//     return {
//       withdrawalOrder: investmentIds,
//     };
//   });

//   // Update refs when props change
//   useEffect(() => {
//     dataRef.current = data;
//     onDataUpdateRef.current = onDataUpdate;
//     onValidationChangeRef.current = onValidationChange;
//   }, [data, onDataUpdate, onValidationChange]);

//   // Update parent component with form data when it changes
//   useEffect(() => {
//     if (onDataUpdateRef.current) {
//       onDataUpdateRef.current(formData);
//     }
    
//     if (onValidationChangeRef.current) {
//       onValidationChangeRef.current(true); // Always valid
//     }
//   }, [formData]);
  
//   // Update withdrawal order when investments change
//   useEffect(() => {
//     // Only update if investments have changed and we don't have an existing order
//     if (investmentIds.length > 0 && 
//        (!formData.withdrawalOrder.length || 
//         !formData.withdrawalOrder.every(id => investmentIds.includes(id)))) {
      
//       setFormData(prevData => ({
//         ...prevData,
//         withdrawalOrder: investmentIds
//       }));
//     }
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [investmentIds]);

//   const handleOrderChange = (index1: number, index2: number) => {
//     // Swap the elements at the given indices
//     const newOrder = [...formData.withdrawalOrder];
//     [newOrder[index1], newOrder[index2]] = [newOrder[index2], newOrder[index1]];
    
//     setFormData({
//       ...formData,
//       withdrawalOrder: newOrder
//     });
//   };

//   const moveUp = (index: number) => {
//     if (index > 0) {
//       handleOrderChange(index, index - 1);
//     }
//   };

//   const moveDown = (index: number) => {
//     if (index < formData.withdrawalOrder.length - 1) {
//       handleOrderChange(index, index + 1);
//     }
//   };

//   // Helper to get investment name from ID
//   const getInvestmentName = (id: string) => {
//     const investment = investmentsData.investments.find(inv => inv.id === id);
//     return investment ? investment.investmentType.name : id;
//   };

//   return (
//     <Card className="bg-black text-white p-6 rounded-lg border border-zinc-800">
//       <h2 className="text-2xl font-bold mb-6">Expense Withdrawal Strategy</h2>
      
//       <div className="space-y-6">
//         {/* Withdrawal Order */}
//         <div className="space-y-2">
//           <label className="block text-md font-medium text-white">
//             Account Withdrawal Order
//           </label>
//           <p className="text-sm text-zinc-400 mb-3">
//             Arrange the sequence in which investments will be used for withdrawals.
//           </p>
          
//           {investmentsData.investments.length > 0 ? (
//             <div className="space-y-2">
//               {formData.withdrawalOrder.map((investmentId, index) => (
//                 <div 
//                   key={investmentId} 
//                   className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-md"
//                 >
//                   <span>{getInvestmentName(investmentId)}</span>
//                   <div className="flex space-x-2">
//                     <Button 
//                       variant="ghost" 
//                       size="sm" 
//                       onClick={() => moveUp(index)}
//                       disabled={index === 0}
//                       className="text-zinc-400 hover:text-white hover:bg-zinc-800"
//                     >
//                       ↑
//                     </Button>
//                     <Button 
//                       variant="ghost" 
//                       size="sm" 
//                       onClick={() => moveDown(index)}
//                       disabled={index === formData.withdrawalOrder.length - 1}
//                       className="text-zinc-400 hover:text-white hover:bg-zinc-800"
//                     >
//                       ↓
//                     </Button>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           ) : (
//             <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-md text-center text-zinc-400">
//               No investments to organize. Please add investments in the Investments step.
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Form Data Preview (for development) */}
//       <div className="mt-8 p-4 bg-zinc-900 rounded-lg">
//         <h3 className="text-md font-semibold mb-2">Withdrawal Strategy Configuration</h3>
//         <pre className="text-xs text-zinc-400 overflow-auto">
//           {JSON.stringify(formData, null, 2)}
//         </pre>
//       </div>
//     </Card>
//   );
// } 