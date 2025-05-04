import { Dispatch, SetStateAction } from "react";
import { Scenario } from "@/types/scenario";
import { AssetAllocationFixed, AssetAllocationGlidePath } from "@/types/event";

// Define a type for the combined allocation
type AssetAllocation = AssetAllocationFixed | AssetAllocationGlidePath;

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

    // grab the existing allocation (whether it came in as array or object)
    let alloc: Partial<AssetAllocation> = {};
    if (Array.isArray(event.eventType.assetAllocation)) {
      alloc = { ...event.eventType.assetAllocation[0] };
    } else {
      alloc = { ...event.eventType.assetAllocation };
    }

    // explicitly type and extract properties with defaults
    const investments = alloc.investments || null;
    
    // Handle percentages based on allocation type
    const percentages = alloc.type === "fixed" && alloc.percentages 
      ? [...alloc.percentages] 
      : [] as number[];
      
    const initialPercentages = alloc.type === "glidePath" && alloc.initialPercentages 
      ? [...alloc.initialPercentages] 
      : [] as number[];
      
    const finalPercentages = alloc.type === "glidePath" && alloc.finalPercentages 
      ? [...alloc.finalPercentages] 
      : [] as number[];

    // build a new allocation object based on type
    if (type === "fixed") {
      const newAlloc: AssetAllocationFixed = {
        type: "fixed",
        investments,
        percentages: percentages.length
          ? [...percentages]
          : initialPercentages.length
            ? [...initialPercentages]
            : []
      };

      // put it back on the event
      event.eventType = {
        ...event.eventType,
        assetAllocation: [newAlloc]
      };
    } else {
      const newAlloc: AssetAllocationGlidePath = {
        type: "glidePath",
        investments,
        initialPercentages: percentages.length
          ? [...percentages]
          : initialPercentages.length
            ? [...initialPercentages]
            : [],
        finalPercentages: percentages.length
          ? [...percentages]
          : finalPercentages.length
            ? [...finalPercentages]
            : []
      };

      // put it back on the event
      event.eventType = {
        ...event.eventType,
        assetAllocation: [newAlloc]
      };
    }

    events[index] = event;
    return { ...prev, eventSeries: events };
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
    
    // Handle assetAllocation as either object or array
    let assetAllocation: Partial<AssetAllocation> = {};
    if (Array.isArray(event.eventType.assetAllocation)) {
      assetAllocation = { ...event.eventType.assetAllocation[0] };
    } else {
      assetAllocation = { ...event.eventType.assetAllocation };
    }
    
    if (assetAllocation.type === "fixed") {
      // Safely extract with type checking
      const investments = assetAllocation.investments || null;
      const existingPercentages = assetAllocation.percentages || [];
      
      const percentages = [...existingPercentages];
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return prev;
      
      percentages[investmentIndex] = numValue;
      
      const updatedAllocation: AssetAllocationFixed = {
        type: "fixed",
        investments,
        percentages
      };
      
      event.eventType = {
        ...event.eventType,
        assetAllocation: [updatedAllocation]
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
    
    // Handle assetAllocation as either object or array
    let assetAllocation: Partial<AssetAllocation> = {};
    if (Array.isArray(event.eventType.assetAllocation)) {
      assetAllocation = { ...event.eventType.assetAllocation[0] };
    } else {
      assetAllocation = { ...event.eventType.assetAllocation };
    }
    
    if (assetAllocation.type === "glidePath") {
      // Safely extract with type checking
      const investments = assetAllocation.investments || null;
      const existingInitialPercentages = assetAllocation.initialPercentages || [];
      const existingFinalPercentages = assetAllocation.finalPercentages || [];
      
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return prev;
      
      if (phase === "initial") {
        const initialPercentages = [...existingInitialPercentages];
        initialPercentages[investmentIndex] = numValue;
        
        const updatedAllocation: AssetAllocationGlidePath = {
          type: "glidePath",
          investments,
          initialPercentages,
          finalPercentages: existingFinalPercentages
        };
        
        event.eventType = {
          ...event.eventType,
          assetAllocation: [updatedAllocation]
        };
      } else {
        const finalPercentages = [...existingFinalPercentages];
        finalPercentages[investmentIndex] = numValue;
        
        const updatedAllocation: AssetAllocationGlidePath = {
          type: "glidePath",
          investments,
          initialPercentages: existingInitialPercentages,
          finalPercentages
        };
        
        event.eventType = {
          ...event.eventType,
          assetAllocation: [updatedAllocation]
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