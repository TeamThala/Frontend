import { Dispatch, SetStateAction } from "react";
import { Scenario } from "@/types/scenario";
import { InvestmentEvent } from "@/types/event";

// Handle allocation type change (fixed vs glidePath) for investments
export const handleInvestmentAllocationTypeChange = (
  type: "fixed" | "glidePath",
  index: number,
  setScenarioData: Dispatch<SetStateAction<Scenario | null>>
) => {
  setScenarioData(prev => {
    if (!prev) return null;
    
    const events = [...prev.eventSeries];
    const event = { ...events[index] };
    
    if (event.eventType.type !== "investment") return prev;
    
    // Get current investments or use empty array
    const investments = prev.investments.length > 0 ? prev.investments : null;
    const percentages = investments ? investments.map(() => 0) : [];
    
    if (type === "fixed") {
      event.eventType = {
        ...event.eventType,
        assetAllocation: {
          type: "fixed",
          investments,
          percentages
        }
      };
    } else {
      event.eventType = {
        ...event.eventType,
        assetAllocation: {
          type: "glidePath",
          investments,
          initialPercentages: percentages,
          finalPercentages: percentages
        }
      };
    }
    
    events[index] = event;
    
    return {
      ...prev,
      eventSeries: events
    };
  });
};

// Handle investment percentage change for fixed allocation
export const handleInvestmentPercentageChange = (
  investmentIndex: number,
  value: string,
  eventIndex: number,
  setScenarioData: Dispatch<SetStateAction<Scenario | null>>
) => {
  setScenarioData(prev => {
    if (!prev) return null;
    
    const events = [...prev.eventSeries];
    const event = { ...events[eventIndex] };
    
    if (event.eventType.type !== "investment") return prev;
    
    const assetAllocation = { ...event.eventType.assetAllocation };
    
    if (assetAllocation.type === "fixed") {
      const percentages = [...assetAllocation.percentages];
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return prev;
      
      percentages[investmentIndex] = numValue;
      
      event.eventType = {
        ...event.eventType,
        assetAllocation: {
          ...assetAllocation,
          percentages
        }
      };
    }
    
    events[eventIndex] = event;
    
    return {
      ...prev,
      eventSeries: events
    };
  });
};

// Handle investment glide path percentage change
export const handleInvestmentGlidePathPercentageChange = (
  investmentIndex: number,
  phase: "initial" | "final",
  value: string,
  eventIndex: number,
  setScenarioData: Dispatch<SetStateAction<Scenario | null>>
) => {
  setScenarioData(prev => {
    if (!prev) return null;
    
    const events = [...prev.eventSeries];
    const event = { ...events[eventIndex] };
    
    if (event.eventType.type !== "investment") return prev;
    
    const assetAllocation = { ...event.eventType.assetAllocation };
    
    if (assetAllocation.type === "glidePath") {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return prev;
      
      if (phase === "initial") {
        const initialPercentages = [...assetAllocation.initialPercentages];
        initialPercentages[investmentIndex] = numValue;
        
        event.eventType = {
          ...event.eventType,
          assetAllocation: {
            ...assetAllocation,
            initialPercentages
          }
        };
      } else {
        const finalPercentages = [...assetAllocation.finalPercentages];
        finalPercentages[investmentIndex] = numValue;
        
        event.eventType = {
          ...event.eventType,
          assetAllocation: {
            ...assetAllocation,
            finalPercentages
          }
        };
      }
    }
    
    events[eventIndex] = event;
    
    return {
      ...prev,
      eventSeries: events
    };
  });
};

// Handle maxCash change for investment events
export const handleMaxCashChange = (
  value: string,
  index: number,
  setScenarioData: Dispatch<SetStateAction<Scenario | null>>
) => {
  setScenarioData(prev => {
    if (!prev) return null;
    
    const events = [...prev.eventSeries];
    const event = { ...events[index] };
    
    if (event.eventType.type !== "investment") return prev;
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return prev;
    
    event.eventType = {
      ...event.eventType,
      maxCash: numValue
    };
    
    events[index] = event;
    
    return {
      ...prev,
      eventSeries: events
    };
  });
}; 