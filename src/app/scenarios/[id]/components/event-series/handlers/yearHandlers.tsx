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
        
        // Update both structures - nested for frontend and top-level for MongoDB
        event[field] = {
          ...yearField,
          [subField]: numValue, // MongoDB schema field
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
        
        // Update MongoDB schema fields
        let mongoField = subField === 'min' ? 'startYear' : 'endYear';
        
        // Validate min <= max
        const maxValue = yearField.year?.max ?? yearField.endYear;
        const minValue = yearField.year?.min ?? yearField.startYear;
        
        if (subField === 'min' && maxValue !== undefined && numValue > maxValue) {
          return prev;
        }
        if (subField === 'max' && minValue !== undefined && numValue < minValue) {
          return prev;
        }
        
        // Update both structures - nested for frontend and top-level for MongoDB
        event[field] = {
          ...yearField,
          [mongoField]: numValue, // MongoDB schema field
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
      const currentYear = new Date().getFullYear();
      const futureYear = currentYear + 5;
      
      event[field] = {
        type: "uniform",
        // MongoDB schema fields
        startYear: currentYear,
        endYear: futureYear,
        // Frontend nested structure
        year: {
          type: "uniform",
          valueType: "amount",
          min: currentYear,
          max: futureYear
        }
      } as UniformYear;
    } else if (type === "normal") {
      const currentYear = new Date().getFullYear();
      
      event[field] = {
        type: "normal",
        // MongoDB schema fields
        mean: currentYear,
        stdDev: 2,
        // Frontend nested structure
        year: {
          type: "normal",
          valueType: "amount",
          mean: currentYear,
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