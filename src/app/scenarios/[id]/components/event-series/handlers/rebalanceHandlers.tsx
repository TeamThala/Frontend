import { Dispatch, SetStateAction } from "react";
import { Scenario } from "@/types/scenario";

// Type for portfolio distribution to help with type safety
interface PortfolioDistributionFixed {
  type: "fixed";
  investments: any[];
  percentages: number[];
}

interface PortfolioDistributionGlidePath {
  type: "glidePath";
  investments: any[];
  initialPercentages: number[];
  finalPercentages: number[];
}

type PortfolioDistribution = PortfolioDistributionFixed | PortfolioDistributionGlidePath;

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
    const investments = prev.investments || [];
    
    // Initialize with 0 percentages
    const percentages = Array(investments.length).fill(0);
    
    // Preserve existing values if switching between types
    const existingDistribution = event.eventType.portfolioDistribution;
    let existingPercentages: number[] = [], existingInitial: number[] = [], existingFinal: number[] = [];
    
    if (existingDistribution) {
      if (Array.isArray(existingDistribution)) {
        const firstDist = existingDistribution[0] as any;
        if (firstDist) {
          existingPercentages = firstDist.percentages || [];
          existingInitial = firstDist.initialPercentages || [];
          existingFinal = firstDist.finalPercentages || [];
        }
      } else {
        const dist = existingDistribution as any;
        existingPercentages = dist.percentages || [];
        existingInitial = dist.initialPercentages || [];
        existingFinal = dist.finalPercentages || [];
      }
    }
    
    if (type === "fixed") {
      event.eventType = {
        ...event.eventType,
        portfolioDistribution: {
          type: "fixed",
          investments,
          percentages: existingPercentages.length ? existingPercentages :
                       existingInitial.length ? existingInitial : percentages
        } as PortfolioDistributionFixed
      };
    } else {
      event.eventType = {
        ...event.eventType,
        portfolioDistribution: {
          type: "glidePath",
          investments,
          initialPercentages: existingInitial.length ? existingInitial :
                              existingPercentages.length ? existingPercentages : percentages,
          finalPercentages: existingFinal.length ? existingFinal :
                           existingPercentages.length ? existingPercentages : percentages
        } as PortfolioDistributionGlidePath
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
    
    // Safely get portfolioDistribution (handle both array and object cases)
    let portfolioDistribution: any;
    if (Array.isArray(event.eventType.portfolioDistribution)) {
      portfolioDistribution = { ...(event.eventType.portfolioDistribution[0] || {}) };
    } else {
      portfolioDistribution = { ...(event.eventType.portfolioDistribution || {}) };
    }
    
    if (portfolioDistribution.type === "fixed") {
      // Create percentages array if it doesn't exist
      const percentages = Array.isArray(portfolioDistribution.percentages) 
        ? [...portfolioDistribution.percentages]
        : Array(prev.investments?.length || 0).fill(0);
      
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
      
      events[eventIndex] = event;
    }
    
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
    
    // Safely get portfolioDistribution (handle both array and object cases)
    let portfolioDistribution: any;
    if (Array.isArray(event.eventType.portfolioDistribution)) {
      portfolioDistribution = { ...(event.eventType.portfolioDistribution[0] || {}) };
    } else {
      portfolioDistribution = { ...(event.eventType.portfolioDistribution || {}) };
    }
    
    if (portfolioDistribution.type === "glidePath") {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return prev;
      
      if (phase === "initial") {
        // Create initialPercentages array if it doesn't exist
        const initialPercentages = Array.isArray(portfolioDistribution.initialPercentages)
          ? [...portfolioDistribution.initialPercentages]
          : Array(prev.investments?.length || 0).fill(0);
        
        initialPercentages[investmentIndex] = numValue;
        
        event.eventType = {
          ...event.eventType,
          portfolioDistribution: {
            ...portfolioDistribution,
            initialPercentages
          }
        };
      } else {
        // Create finalPercentages array if it doesn't exist
        const finalPercentages = Array.isArray(portfolioDistribution.finalPercentages)
          ? [...portfolioDistribution.finalPercentages]
          : Array(prev.investments?.length || 0).fill(0);
        
        finalPercentages[investmentIndex] = numValue;
        
        event.eventType = {
          ...event.eventType,
          portfolioDistribution: {
            ...portfolioDistribution,
            finalPercentages
          }
        };
      }
      
      events[eventIndex] = event;
    }
    
    return {
      ...prev,
      eventSeries: events
    };
  });
}; 