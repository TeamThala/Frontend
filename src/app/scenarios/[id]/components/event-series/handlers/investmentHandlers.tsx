import { Dispatch, SetStateAction } from "react";
import { Scenario } from "@/types/scenario";

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
    let alloc: any;
    if (Array.isArray(event.eventType.assetAllocation)) {
      alloc = { ...event.eventType.assetAllocation[0] };
    } else {
      alloc = { ...event.eventType.assetAllocation };
    }

    // pull out whatever might already be there
    const {
      investments    = null,
      percentages    = [] as number[],
      initialPercentages,
      finalPercentages
    } = alloc as any;

    // build a new allocation object, preserving any existing glidePath arrays
    const newAlloc: any = { investments };

    if (type === "fixed") {
      newAlloc.type = "fixed";
      // seed the fixed percentages from whichever you have
      newAlloc.percentages = percentages.length
        ? [...percentages]
        : initialPercentages
          ? [...initialPercentages]
          : [];

      // **crucially**, carry your glide-path arrays along as "backup"
      if (initialPercentages) newAlloc.initialPercentages = [...initialPercentages];
      if (finalPercentages)   newAlloc.finalPercentages   = [...finalPercentages];
    } else {
      newAlloc.type = "glidePath";
      // if you just came from fixed, percentages will be non-empty
      if (percentages.length) {
        newAlloc.initialPercentages = [...percentages];
        newAlloc.finalPercentages   = [...percentages];
      } else {
        // otherwise restore whichever was already there
        newAlloc.initialPercentages = initialPercentages ? [...initialPercentages] : [];
        newAlloc.finalPercentages   = finalPercentages   ? [...finalPercentages]   : [];
      }
      // keep the fixed percentages around too, in case you toggle back
      if (percentages.length) newAlloc.percentages = [...percentages];
    }

    // put it back on the event
    event.eventType = {
      ...event.eventType,
      assetAllocation: {
        ...newAlloc,
        percentages
      }
    } as any;  // `as any` silences TS about our extra fields

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
    let assetAllocation: any;
    if (Array.isArray(event.eventType.assetAllocation)) {
      assetAllocation = { ...event.eventType.assetAllocation[0] };
    } else {
      assetAllocation = { ...event.eventType.assetAllocation };
    }
    
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
    
    // Handle assetAllocation as either object or array
    let assetAllocation: any;
    if (Array.isArray(event.eventType.assetAllocation)) {
      assetAllocation = { ...event.eventType.assetAllocation[0] };
    } else {
      assetAllocation = { ...event.eventType.assetAllocation };
    }
    
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