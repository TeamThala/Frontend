import { Dispatch, SetStateAction } from "react";
import { Scenario } from "@/types/scenario";
import { EventYear, FixedYear, NormalYear, UniformYear } from "@/types/event";

export const handleYearInputChange = (
  field: "startYear" | "duration", 
  value: string, 
  index: number,
  setScenarioData: Dispatch<SetStateAction<Scenario | null>>
) => {
  setScenarioData(prev => {
    if (!prev) return null;
    
    const events = [...prev.eventSeries];
    const event = { ...events[index] };
    const yearField = event[field];
    
    // Handle the different input formats
    if (value.includes(':')) {
      // This is for normal or uniform distributions or event references
      const [subField, subValue] = value.split(':');
      
      if (yearField.type === "event" && field === "startYear") {
        // Handle event reference fields - only for startYear
        if (subField === 'eventId' || subField === 'eventTime') {
          event[field] = {
            ...yearField,
            [subField]: subValue
          } as EventYear;
        }
      } else if (yearField.type === "normal") {
        const numValue = parseInt(subValue);
        if (isNaN(numValue)) return prev;
        
        event[field] = {
          ...yearField,
          year: {
            ...yearField.year,
            [subField]: numValue
          }
        } as NormalYear;
        
        // Validate standard deviation is not negative
        if (subField === 'stdDev' && numValue < 0) {
          return prev;
        }
      } 
      else if (yearField.type === "uniform") {
        const numValue = parseInt(subValue);
        if (isNaN(numValue)) return prev;
        
        const updatedYear = {
          ...yearField.year,
          [subField]: numValue
        };
        
        // Validate min <= max
        if (subField === 'min' && numValue > yearField.year.max) {
          return prev;
        }
        if (subField === 'max' && numValue < yearField.year.min) {
          return prev;
        }
        
        event[field] = {
          ...yearField,
          year: updatedYear
        } as UniformYear;
      }
    } 
    else {
      // This is for fixed type
      const numValue = parseInt(value);
      if (isNaN(numValue)) return prev;
      
      if (yearField.type === "fixed") {
        event[field] = {
          ...yearField,
          year: numValue
        } as FixedYear;
      }
    }
    
    events[index] = event;
    
    return {
      ...prev,
      eventSeries: events
    };
  });
};

export const handleYearTypeChange = (
  field: "startYear" | "duration", 
  type: "fixed" | "uniform" | "normal" | "event", 
  index: number,
  setScenarioData: Dispatch<SetStateAction<Scenario | null>>
) => {
  setScenarioData(prev => {
    if (!prev) return null;
    
    const events = [...prev.eventSeries];
    const event = { ...events[index] };
    
    if (type === "fixed") {
      event[field] = {
        type: "fixed",
        year: new Date().getFullYear()
      } as FixedYear;
    } else if (type === "uniform") {
      event[field] = {
        type: "uniform",
        year: {
          type: "uniform",
          valueType: "amount",
          min: new Date().getFullYear(),
          max: new Date().getFullYear() + 5
        }
      } as UniformYear;
    } else if (type === "normal") {
      event[field] = {
        type: "normal",
        year: {
          type: "normal",
          valueType: "amount",
          mean: new Date().getFullYear(),
          stdDev: 2
        }
      } as NormalYear;
    } else if (type === "event" && field === "startYear") {
      // Only allow "event" type for startYear
      event.startYear = {
        type: "event",
        eventTime: "start",
        eventId: ""
      } as EventYear;
    }
    
    events[index] = event;
    
    return {
      ...prev,
      eventSeries: events
    };
  });
}; 