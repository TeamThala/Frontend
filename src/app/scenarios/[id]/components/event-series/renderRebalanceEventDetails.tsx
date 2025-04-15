import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Event } from "@/types/event";
import { EventHandlers } from "./renderEventForm";
import { Progress } from "@/components/ui/progress";

export const renderRebalanceEventDetails = (
  event: Event, 
  index: number, 
  canEdit: boolean, 
  handlers: EventHandlers,
) => {
  if (event.eventType.type !== "rebalance") return null;
  
  // Handle portfolioDistribution whether it's an array or a direct object
  let portfolioDistributionData;
  
  if (Array.isArray(event.eventType.portfolioDistribution)) {
    // If it's an array, use the first item (if exists)
    portfolioDistributionData = event.eventType.portfolioDistribution[0] || { 
      type: "fixed", 
      investments: [], 
      percentages: [] 
    };
  } else {
    // Otherwise use it directly
    portfolioDistributionData = event.eventType.portfolioDistribution || { 
      type: "fixed", 
      investments: [], 
      percentages: [] 
    };
  }
  
  // Make sure we have a type
  const distributionType = portfolioDistributionData.type || "fixed";
  
  // Handle both array of investments and array of investment IDs
  const investments = Array.isArray(portfolioDistributionData.investments) 
    ? portfolioDistributionData.investments 
    : [];
  
  // Calculate total percentages with safety checks
  const calculateTotal = (percentages: number[] = []) => {
    return percentages ? percentages.reduce((sum, current) => sum + (current || 0), 0) : 0;
  };
  
  // Handle naming differences between type definition and actual data
  const percentages = distributionType === "fixed" 
    ? (Array.isArray(portfolioDistributionData.percentages) ? portfolioDistributionData.percentages : [])
    : [];
    
  const initialPercentages = distributionType === "glidePath" 
    ? (Array.isArray(portfolioDistributionData.initialPercentages) ? portfolioDistributionData.initialPercentages : 
       Array.isArray(portfolioDistributionData.initialPercentage) ? portfolioDistributionData.initialPercentage : [])
    : [];
    
  const finalPercentages = distributionType === "glidePath" 
    ? (Array.isArray(portfolioDistributionData.finalPercentages) ? portfolioDistributionData.finalPercentages : 
       Array.isArray(portfolioDistributionData.finalPercentage) ? portfolioDistributionData.finalPercentage : [])
    : [];
  
  const totalFixed = distributionType === "fixed" 
    ? calculateTotal(percentages)
    : 0;
    
  const totalInitial = distributionType === "glidePath"
    ? calculateTotal(initialPercentages)
    : 0;
    
  const totalFinal = distributionType === "glidePath"
    ? calculateTotal(finalPercentages)
    : 0;
  
  const isValidTotal = (total: number) => {
    // Allow for minor floating point errors (99.9-100.1 is acceptable)
    return Math.abs(total - 100) <= 0.1;
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
          
          // Get the investment ID - prefer _id (MongoDB) over id (client-side)
          const investmentId = investment._id || investment.id || `investment-${investmentIndex}`;
          
          return (
            <div key={`${investmentId}-${isInitial ? 'initial' : 'final'}-${index}`} className="grid grid-cols-3 gap-2 items-center">
              <div className="col-span-2">
                <Label className="text-sm">
                  {investment.investmentType?.name || 'Unnamed Investment'}
                  {investment.investmentType?.description && (
                    <span className="text-xs text-zinc-400 block">
                      {investment.investmentType.description}
                    </span>
                  )}
                </Label>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    value={
                      distributionType === "fixed"
                        ? percentages[investmentIndex] || 0
                        : isInitial
                          ? initialPercentages[investmentIndex] || 0
                          : finalPercentages[investmentIndex] || 0
                    }
                    onChange={(e) => {
                      if (distributionType === "fixed") {
                        handlers.handlePercentageChange(investmentIndex, e.target.value, index);
                      } else {
                        handlers.handleGlidePathPercentageChange(
                          investmentIndex,
                          isInitial ? "initial" : "final",
                          e.target.value,
                          index
                        );
                      }
                    }}
                    disabled={!canEdit}
                    min="0"
                    max="100"
                    step="0.1"
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
      <h3 id={`rebalance-${index}`} className="font-semibold text-lg text-purple-400">Rebalance Details</h3>
      
      <div className="space-y-2">
        <Label className="font-semibold">Portfolio Distribution Type</Label>
        <RadioGroup
          value={distributionType}
          onValueChange={(value) => handlers.handleAllocationTypeChange(value as "fixed" | "glidePath", index)}
          disabled={!canEdit}
          className="flex space-x-4 mb-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="fixed" id={`distribution-fixed-${index}`} 
              className="border-2 border-gray-300 data-[state=checked]:border-purple-600 data-[state=checked]:bg-purple-600 data-[state=checked]:ring-white data-[state=checked]:ring-2" 
            />
            <Label htmlFor={`distribution-fixed-${index}`}>Fixed Allocation</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="glidePath" id={`distribution-glidePath-${index}`} 
              className="border-2 border-gray-300 data-[state=checked]:border-purple-600 data-[state=checked]:bg-purple-600 data-[state=checked]:ring-white data-[state=checked]:ring-2" 
            />
            <Label htmlFor={`distribution-glidePath-${index}`}>Glide Path</Label>
          </div>
        </RadioGroup>
      </div>
      
      {distributionType === "fixed" && (
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
              Percentages must add up to 100%.
            </p>
          )}
        </div>
      )}
      
      {distributionType === "glidePath" && (
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
                Initial percentages must add up to 100%.
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
                Final percentages must add up to 100%.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 