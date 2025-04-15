import { Dispatch, SetStateAction } from "react";
import { Scenario } from "@/types/scenario";
import { ExpenseEvent } from "@/types/event";
import { FixedValues, NormalDistributionValues, UniformDistributionValues } from "@/types/utils";

// Distribution type used in UI controls
type DistributionType = "fixed" | "normal" | "uniform";

export const handleExpenseChange = (
  field: keyof ExpenseEvent, 
  value: number, 
  index: number,
  setScenarioData: Dispatch<SetStateAction<Scenario | null>>
) => {
  setScenarioData(prev => {
    if (!prev) return null;
    
    const events = [...prev.eventSeries];
    const event = { ...events[index] };
    
    if (event.eventType.type === "expense") {
      event.eventType = {
        ...event.eventType,
        [field]: value
      };
    }
    
    events[index] = event;
    
    return {
      ...prev,
      eventSeries: events
    };
  });
};

// Handle distribution value change for expected annual change
export const handleExpenseDistributionValueChange = (
  subField: keyof (FixedValues & NormalDistributionValues & UniformDistributionValues),
  value: string,
  index: number,
  setScenarioData: Dispatch<SetStateAction<Scenario | null>>
) => {
  setScenarioData(prev => {
    if (!prev) return null;
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return prev;
    
    const events = [...prev.eventSeries];
    const event = { ...events[index] };
    
    if (event.eventType.type !== "expense") return prev;
    
    const distribution = event.eventType.expectedAnnualChange;
    
    const updatedDistribution = {
      ...distribution,
      [subField]: numValue
    };
    
    // Validate for uniform distribution
    if (distribution.type === "uniform" && 
        "min" in distribution && 
        "max" in distribution) {
      const min = subField === "min" ? numValue : (distribution as UniformDistributionValues).min;
      const max = subField === "max" ? numValue : (distribution as UniformDistributionValues).max;
      
      if (subField === "min" && numValue > max) return prev;
      if (subField === "max" && numValue < min) return prev;
    }
    
    // Validate standard deviation is not negative
    if (distribution.type === "normal" && subField === "stdDev" && numValue < 0) {
      return prev;
    }
    
    event.eventType = {
      ...event.eventType,
      expectedAnnualChange: updatedDistribution
    };
    
    events[index] = event;
    
    return {
      ...prev,
      eventSeries: events
    };
  });
};

// Handle distribution type change for expected annual change
export const handleExpenseDistributionTypeChange = (
  newType: DistributionType,
  index: number,
  setScenarioData: Dispatch<SetStateAction<Scenario | null>>
) => {
  setScenarioData(prev => {
    if (!prev) return null;
    
    const events = [...prev.eventSeries];
    const event = { ...events[index] };
    
    if (event.eventType.type !== "expense") return prev;
    
    let newDistribution: FixedValues | NormalDistributionValues | UniformDistributionValues;
    
    // Always use percentage for expectedAnnualChange
    const valueType = "percentage";
    
    switch (newType) {
      case "fixed":
        newDistribution = { type: "fixed", value: 0, valueType };
        break;
      case "normal":
        newDistribution = { type: "normal", mean: 0, stdDev: 1, valueType };
        break;
      case "uniform":
        newDistribution = { type: "uniform", min: 0, max: 3, valueType };
        break;
    }
    
    event.eventType = {
      ...event.eventType,
      expectedAnnualChange: newDistribution
    };
    
    events[index] = event;
    
    return {
      ...prev,
      eventSeries: events
    };
  });
}; 