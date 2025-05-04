import { Dispatch, SetStateAction } from "react";
import { Scenario } from "@/types/scenario";

// Handle allocation type change (fixed vs glidePath)
export const handleAllocationTypeChange = (
  type: "fixed" | "glidePath",
  index: number,
  setScenarioData: Dispatch<SetStateAction<Scenario | null>>
) => {
  setScenarioData(prev => {
    if (!prev) return null;
    
    const events = [...prev.eventSeries];
    const event = { ...events[index] };
    
    if (event.eventType.type !== "rebalance") return prev;
    
    // Get current investments or use empty array
    const investments = prev.investments.length > 0 ? prev.investments : null;
    const percentages = investments ? investments.map(() => 0) : [];
    
    if (type === "fixed") {
      event.eventType = {
        ...event.eventType,
        portfolioDistribution: {
          type: "fixed",
          investments,
          percentages
        }
      };
    } else {
      event.eventType = {
        ...event.eventType,
        portfolioDistribution: {
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

// Handle percentage change for fixed allocation
export const handlePercentageChange = (
  investmentIndex: number,
  value: string,
  eventIndex: number,
  setScenarioData: Dispatch<SetStateAction<Scenario | null>>
) => {
  setScenarioData(prev => {
    if (!prev) return null;
    
    const events = [...prev.eventSeries];
    const event = { ...events[eventIndex] };
    
    if (event.eventType.type !== "rebalance") return prev;
    
    const portfolioDistribution = { ...event.eventType.portfolioDistribution };
    
    // Check if portfolioDistribution is an array, which is not expected here
    if (Array.isArray(portfolioDistribution)) {
      console.error("Error: portfolioDistribution is an array in handlePercentageChange. Event index:", eventIndex);
      return prev; // Cannot handle array of distributions here
    }
    
    if (portfolioDistribution.type === "fixed") {
      // Ensure percentages array exists and is an array
      if (!Array.isArray(portfolioDistribution.percentages)) {
        console.error("Error: percentages is not an array in fixed portfolioDistribution. Event index:", eventIndex);
        return prev; // Cannot handle missing or invalid percentages
      }
      const percentages = [...portfolioDistribution.percentages];
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return prev;
      
      percentages[investmentIndex] = numValue;
      
      event.eventType = {
        ...event.eventType,
        portfolioDistribution: {
          ...portfolioDistribution,
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

// Handle percentage change for glide path
export const handleGlidePathPercentageChange = (
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
    
    if (event.eventType.type !== "rebalance") return prev;
    
    const portfolioDistribution = { ...event.eventType.portfolioDistribution };
    
    // Check if portfolioDistribution is an array, which is not expected here
    if (Array.isArray(portfolioDistribution)) {
      console.error("Error: portfolioDistribution is an array in handleGlidePathPercentageChange. Event index:", eventIndex);
      return prev; // Cannot handle array of distributions here
    }
    
    if (portfolioDistribution.type === "glidePath") {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return prev;
      
      if (phase === "initial") {
        // Ensure initialPercentages array exists and is an array
        if (!Array.isArray(portfolioDistribution.initialPercentages)) {
          console.error("Error: initialPercentages is not an array in glidePath portfolioDistribution. Event index:", eventIndex);
          return prev;
        }
        const initialPercentages = [...portfolioDistribution.initialPercentages];
        initialPercentages[investmentIndex] = numValue;
        
        event.eventType = {
          ...event.eventType,
          portfolioDistribution: {
            ...portfolioDistribution,
            initialPercentages
          }
        };
      } else { // phase === "final"
        // Ensure finalPercentages array exists and is an array
        if (!Array.isArray(portfolioDistribution.finalPercentages)) {
          console.error("Error: finalPercentages is not an array in glidePath portfolioDistribution. Event index:", eventIndex);
          return prev;
        }
        const finalPercentages = [...portfolioDistribution.finalPercentages];
        finalPercentages[investmentIndex] = numValue;
        
        event.eventType = {
          ...event.eventType,
          portfolioDistribution: {
            ...portfolioDistribution,
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