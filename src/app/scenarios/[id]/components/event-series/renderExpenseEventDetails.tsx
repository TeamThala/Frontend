import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Event, ExpenseEvent } from "@/types/event";
import { EventHandlers } from "./renderEventForm";
import { FixedValues, NormalDistributionValues, UniformDistributionValues } from "@/types/utils";

// Type for distribution types used in UI controls
type DistributionType = "fixed" | "normal" | "uniform";

export const renderExpenseEventDetails = (
  event: Event, 
  index: number, 
  canEdit: boolean, 
  handlers: EventHandlers
) => {
  if (event.eventType.type !== "expense") return null;
  
  // Function to render distribution inputs for expectedAnnualChange
  const renderDistributionInputs = () => {
    const distribution = (event.eventType as ExpenseEvent).expectedAnnualChange;
    if (!distribution) return null;
    
    // Always percentage for expectedAnnualChange
    const unitType = "%";
    
    return (
      <div className="space-y-4 pl-6 border-l-2 border-gray-200 ml-2 mt-2">
        <RadioGroup
          value={distribution.type}
          onValueChange={(newType) => handlers.handleExpenseDistributionTypeChange(newType as DistributionType, index)}
          disabled={!canEdit}
          className="flex space-x-4"
        >
          {["fixed", "normal", "uniform"].map((type) => (
            <div className="flex items-center space-x-2" key={type}>
              <RadioGroupItem value={type} id={`expectedAnnualChange-${type}-${index}`} className="border-2 border-gray-300 data-[state=checked]:border-purple-600 data-[state=checked]:bg-purple-600 data-[state=checked]:ring-white data-[state=checked]:ring-2" />
              <Label htmlFor={`expectedAnnualChange-${type}-${index}`}>{type.charAt(0).toUpperCase() + type.slice(1)}</Label>
            </div>
          ))}
        </RadioGroup>
        
        {distribution.type === "fixed" && (
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor={`expectedAnnualChange-value-${index}`}>Value ({unitType})</Label>
            <Input
              type="number"
              id={`expectedAnnualChange-value-${index}`}
              value={(distribution as FixedValues).value}
              onChange={(e) => handlers.handleExpenseDistributionValueChange("value", e.target.value, index)}
              disabled={!canEdit}
              step="0.1"
            />
          </div>
        )}
        
        {distribution.type === "normal" && (
          <div className="flex space-x-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor={`expectedAnnualChange-mean-${index}`}>Mean ({unitType})</Label>
              <Input
                type="number"
                id={`expectedAnnualChange-mean-${index}`}
                value={(distribution as NormalDistributionValues).mean}
                onChange={(e) => handlers.handleExpenseDistributionValueChange("mean", e.target.value, index)}
                disabled={!canEdit}
                step="0.1"
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor={`expectedAnnualChange-stdDev-${index}`}>Std Dev ({unitType})</Label>
              <Input
                type="number"
                id={`expectedAnnualChange-stdDev-${index}`}
                value={(distribution as NormalDistributionValues).stdDev}
                onChange={(e) => handlers.handleExpenseDistributionValueChange("stdDev", e.target.value, index)}
                disabled={!canEdit}
                min="0"
                step="0.1"
              />
            </div>
          </div>
        )}
        
        {distribution.type === "uniform" && (
          <div className="flex space-x-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor={`expectedAnnualChange-min-${index}`}>Min ({unitType})</Label>
              <Input
                type="number"
                id={`expectedAnnualChange-min-${index}`}
                value={(distribution as UniformDistributionValues).min}
                onChange={(e) => handlers.handleExpenseDistributionValueChange("min", e.target.value, index)}
                disabled={!canEdit}
                step="0.1"
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor={`expectedAnnualChange-max-${index}`}>Max ({unitType})</Label>
              <Input
                type="number"
                id={`expectedAnnualChange-max-${index}`}
                value={(distribution as UniformDistributionValues).max}
                onChange={(e) => handlers.handleExpenseDistributionValueChange("max", e.target.value, index)}
                disabled={!canEdit}
                step="0.1"
              />
            </div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="space-y-4 mt-4 border-t pt-4">
      <h3 className="font-semibold text-lg text-purple-400">Expense Details</h3>
      
      <div className="grid w-full max-w-md items-center gap-1.5">
        <Label htmlFor={`amount-${index}`}>Amount ($)</Label>
        <Input
          type="number"
          id={`amount-${index}`}
          value={event.eventType.amount}
          onChange={(e) => handlers.handleExpenseChange("amount", parseFloat(e.target.value) || 0, index)}
          disabled={!canEdit}
          step="100"
        />
      </div>
      
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
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`discretionary-${index}`}
            checked={event.eventType.discretionary}
            onCheckedChange={(checked) => handlers.handleCheckboxChange(checked, "discretionary", index)}
            className="border-purple-400 data-[state=checked]:bg-purple-600"
            disabled={!canEdit}
          />
          <Label htmlFor={`discretionary-${index}`}>Discretionary Expense</Label>
        </div>
      </div>
      
      {/* Expected Annual Change */}
      <div className="space-y-2 mt-4">
        <Label className="font-semibold">Expected Annual Change</Label>
        {renderDistributionInputs()}
      </div>
    </div>
  );
}; 