import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Event } from "@/types/event";
import { EventHandlers } from "./renderEventForm";
import { Progress } from "@/components/ui/progress";

// Basic investment type for type safety
interface Investment {
  _id: string;
  id?: string;
  investmentType?: {
    name: string;
    description?: string;
  };
}

export const renderInvestmentEventDetails = (
  event: Event, 
  index: number, 
  canEdit: boolean, 
  handlers: EventHandlers & { setCanProceed?: (canProceed: boolean) => void },
  scenarioInvestments: Investment[] = [] // Add scenario investments parameter with type
) => {
  if (event.eventType.type !== "investment") return null;
  
  // Handle assetAllocation whether it's an array or a direct object
  let assetAllocationData;
  
  if (Array.isArray(event.eventType.assetAllocation)) {
    // If it's an array, use the first item (if exists)
    assetAllocationData = event.eventType.assetAllocation[0] || { 
      type: "fixed", 
      investments: [], 
      percentages: [] 
    };
  } else {
    // Otherwise use it directly
    assetAllocationData = event.eventType.assetAllocation || { 
      type: "fixed", 
      investments: [], 
      percentages: [] 
    };
  }
  
  // Make sure we have a type
  const allocationType = assetAllocationData.type || "fixed";
  
  // Handle both array of investments and array of investment IDs by checking the structure
  const investments = Array.isArray(assetAllocationData.investments) 
    ? assetAllocationData.investments 
    : [];
  
  // Calculate total percentages with safety checks
  const calculateTotal = (percentages: number[] = []) => {
    return percentages ? percentages.reduce((sum, current) => sum + (current || 0), 0) : 0;
  };
  
  // Function to convert decimal percentages to display percentages (0.2 → 20)
  const toDisplayPercentage = (value: number) => {
    return value * 100;
  };

  // Function to convert display percentages back to decimal (20 → 0.2)
  const toStoredPercentage = (value: number) => {
    return value / 100;
  };
  
  // Handle naming differences between type definition and actual data
  const percentages = allocationType === "fixed" 
    ? (Array.isArray(assetAllocationData.percentages) ? assetAllocationData.percentages : [])
    : [];
    
  const initialPercentages = allocationType === "glidePath" 
    ? (Array.isArray(assetAllocationData.initialPercentages) ? assetAllocationData.initialPercentages : 
       Array.isArray(assetAllocationData.initialPercentage) ? assetAllocationData.initialPercentage : [])
    : [];
    
  const finalPercentages = allocationType === "glidePath" 
    ? (Array.isArray(assetAllocationData.finalPercentages) ? assetAllocationData.finalPercentages : 
       Array.isArray(assetAllocationData.finalPercentage) ? assetAllocationData.finalPercentage : [])
    : [];
  
  const totalFixed = allocationType === "fixed" 
    ? calculateTotal(percentages) * 100
    : 0;
    
  const totalInitial = allocationType === "glidePath"
    ? calculateTotal(initialPercentages) * 100
    : 0;
    
  const totalFinal = allocationType === "glidePath"
    ? calculateTotal(finalPercentages) * 100
    : 0;
  
  const isValidTotal = (total: number) => {
    // Allow for minor floating point errors (99.9-100.1 is acceptable)
    return Math.abs(total - 100) <= 0.1;
  };

  // Check if the allocations are valid
  const isValid = allocationType === "fixed" 
    ? isValidTotal(totalFixed)
    : isValidTotal(totalInitial) && isValidTotal(totalFinal);

  // Add warning message when allocation isn't 100%
  const renderWarningMessage = () => {
    if (isValid) return null;
    
    return (
      <div className="mt-4 p-3 bg-red-500/10 border border-red-500 rounded-md">
        <p className="text-red-500 font-medium">
          ⚠️ Total allocation must equal exactly 100% before you can proceed.
        </p>
      </div>
    );
  };

  // Function to get full investment details from scenario investments
  const getInvestmentDetails = (investmentRef: string | Investment): Investment | undefined => {
    // If it's already an object with investmentType, return it
    if (typeof investmentRef !== 'string' && investmentRef?.investmentType) {
      return investmentRef;
    }
    
    // Convert to string if it's an object without investmentType
    const id = typeof investmentRef === 'string' ? investmentRef : investmentRef?._id;
    
    // Find the matching investment in scenario investments
    return scenarioInvestments.find(inv => inv._id === id);
  };

  // Render each investment with percentage input
  const renderInvestmentInputs = (isInitial = true) => {
    if (!investments || investments.length === 0) {
      return (
        <p className="text-sm text-yellow-400 p-2">
          No investments available. Please create investments first.
        </p>
      );
    }
    
    return (
      <div className="space-y-3 mt-2">
        {investments.map((investment, investmentIndex) => {
          // Skip if investment is not valid
          if (!investment) {
            return null;
          }
          
          // Get full investment details
          const fullInvestment = getInvestmentDetails(investment);
          
          // Get the investment ID - prefer _id (MongoDB) over id (client-side)
          const investmentId = typeof investment === 'string' ? investment : (investment._id || investment.id || `investment-${investmentIndex}`);
          
          return (
            <div key={`${investmentId}-${isInitial ? 'initial' : 'final'}-${index}`} className="grid grid-cols-3 gap-2 items-center">
              <div className="col-span-2">
                <Label className="text-sm">
                  {fullInvestment?.investmentType?.name || `Investment ID: ${typeof investmentId === 'string' ? investmentId.substring(0, 8) : investmentId}...`}
                  {fullInvestment?.investmentType?.description && (
                    <span className="text-xs text-zinc-400 block">
                      {fullInvestment.investmentType.description}
                    </span>
                  )}
                </Label>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    value={
                      allocationType === "fixed"
                        ? toDisplayPercentage(percentages[investmentIndex] || 0)
                        : isInitial
                          ? toDisplayPercentage(initialPercentages[investmentIndex] || 0)
                          : toDisplayPercentage(finalPercentages[investmentIndex] || 0)
                    }
                    onChange={(e) => {
                      if (allocationType === "fixed") {
                        handlers.handleInvestmentPercentageChange(investmentIndex, String(toStoredPercentage(parseFloat(e.target.value))), index);
                      } else {
                        handlers.handleInvestmentGlidePathPercentageChange(
                          investmentIndex,
                          isInitial ? "initial" : "final",
                          String(toStoredPercentage(parseFloat(e.target.value))),
                          index
                        );
                      }
                    }}
                    disabled={!canEdit}
                    min="0"
                    max="100"
                    step="1"
                    className="w-20"
                  />
                  <span className="text-sm">%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  return (
    <div className="space-y-4 mt-4 border-t pt-4">
      <h3 className="font-semibold text-lg text-purple-400">Investment Details</h3>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`inflation-${index}`}
            checked={event.eventType.inflationAdjustment}
            onCheckedChange={(checked) => handlers.handleCheckboxChange(checked, "inflationAdjustment", index)}
            className="border-purple-400 data-[state=checked]:bg-purple-600"
            disabled={!canEdit}
          />
          <Label htmlFor={`inflation-${index}`}>Adjust for Inflation</Label>
        </div>
      </div>
      
      <div className="grid w-full max-w-md items-center gap-1.5">
        <Label htmlFor={`maxCash-${index}`}>Maximum Cash ($)</Label>
        <Input
          type="number"
          id={`maxCash-${index}`}
          value={event.eventType.maxCash || 0}
          onChange={(e) => handlers.handleMaxCashChange(e.target.value, index)}
          disabled={!canEdit}
          min="0"
          max="100"
          step="1"
          className="max-w-[150px]"
        />
      </div>
      
      <div className="space-y-4 mt-6">
        <div className="space-y-2">
          <Label className="font-semibold">Asset Allocation Type</Label>
          <RadioGroup
            value={allocationType}
            onValueChange={(value) => handlers.handleInvestmentAllocationTypeChange(value as "fixed" | "glidePath", index)}
            disabled={!canEdit}
            className="flex space-x-4 mb-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fixed" id={`allocation-fixed-${index}`} 
                className="border-2 border-gray-300 data-[state=checked]:border-purple-600 data-[state=checked]:bg-purple-600 data-[state=checked]:ring-white data-[state=checked]:ring-2" 
              />
              <Label htmlFor={`allocation-fixed-${index}`}>Fixed Allocation</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="glidePath" id={`allocation-glidePath-${index}`} 
                className="border-2 border-gray-300 data-[state=checked]:border-purple-600 data-[state=checked]:bg-purple-600 data-[state=checked]:ring-white data-[state=checked]:ring-2" 
              />
              <Label htmlFor={`allocation-glidePath-${index}`}>Glide Path</Label>
            </div>
          </RadioGroup>
        </div>
        
        {allocationType === "fixed" && (
          <div className="space-y-4 border p-4 rounded-md">
            <div className="flex justify-between items-center">
              <Label className="font-semibold">Asset Allocation</Label>
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-medium ${isValidTotal(totalFixed) ? 'text-green-500' : 'text-red-500'}`}>
                  Total: {totalFixed.toFixed(1)}%
                </span>
                <Progress 
                  value={totalFixed} 
                  max={100}
                  className={`w-24 h-2 ${
                    isValidTotal(totalFixed) 
                      ? 'bg-zinc-800 [&>div]:bg-green-500' 
                      : totalFixed > 100 
                        ? 'bg-zinc-800 [&>div]:bg-red-500' 
                        : 'bg-zinc-800 [&>div]:bg-yellow-500'
                  }`}
                />
              </div>
            </div>
            
            {renderInvestmentInputs()}
            
            {!isValidTotal(totalFixed) && (
              <p className="text-sm text-red-500">
                Percentages must add up to 100% to proceed.
              </p>
            )}
          </div>
        )}
        
        {allocationType === "glidePath" && (
          <div className="space-y-6">
            <div className="space-y-4 border p-4 rounded-md">
              <div className="flex justify-between items-center">
                <Label className="font-semibold">Initial Allocation</Label>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${isValidTotal(totalInitial) ? 'text-green-500' : 'text-red-500'}`}>
                    Total: {totalInitial.toFixed(1)}%
                  </span>
                  <Progress 
                    value={totalInitial} 
                    max={100}
                    className={`w-24 h-2 ${
                      isValidTotal(totalInitial) 
                        ? 'bg-zinc-800 [&>div]:bg-green-500' 
                        : totalInitial > 100 
                          ? 'bg-zinc-800 [&>div]:bg-red-500' 
                          : 'bg-zinc-800 [&>div]:bg-yellow-500'
                    }`}
                  />
                </div>
              </div>
              
              {renderInvestmentInputs(true)}
              
              {!isValidTotal(totalInitial) && (
                <p className="text-sm text-red-500">
                  Initial percentages must add up to 100% to proceed.
                </p>
              )}
            </div>
            
            <div className="space-y-4 border p-4 rounded-md">
              <div className="flex justify-between items-center">
                <Label className="font-semibold">Final Allocation</Label>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${isValidTotal(totalFinal) ? 'text-green-500' : 'text-red-500'}`}>
                    Total: {totalFinal.toFixed(1)}%
                  </span>
                  <Progress 
                    value={totalFinal} 
                    max={100}
                    className={`w-24 h-2 ${
                      isValidTotal(totalFinal) 
                        ? 'bg-zinc-800 [&>div]:bg-green-500' 
                        : totalFinal > 100 
                          ? 'bg-zinc-800 [&>div]:bg-red-500' 
                          : 'bg-zinc-800 [&>div]:bg-yellow-500'
                    }`}
                  />
                </div>
              </div>
              
              {renderInvestmentInputs(false)}
              
              {!isValidTotal(totalFinal) && (
                <p className="text-sm text-red-500">
                  Final percentages must add up to 100% to proceed.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
      
      {renderWarningMessage()}
    </div>
  );
}; 