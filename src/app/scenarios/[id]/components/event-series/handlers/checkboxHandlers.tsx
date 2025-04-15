import { Dispatch, SetStateAction } from "react";
import { Scenario } from "@/types/scenario";
import { CheckedState } from "@radix-ui/react-checkbox";

export const handleCheckboxChange = (
  checked: CheckedState | number, 
  field: string, 
  index: number,
  setScenarioData: Dispatch<SetStateAction<Scenario | null>>
) => {
  setScenarioData((prev) => {
    if (!prev) return null;
    
    const events = [...prev.eventSeries];
    const event = { ...events[index] };
    const eventType = { ...event.eventType };
    
    if (field in eventType) {
      if (typeof checked === 'number') {
        // For numeric values like maxCash
        (eventType)[field] = checked;
      } else {
        // For boolean values
        (eventType)[field] = checked === true;
      }
    }
    
    event.eventType = eventType;
    events[index] = event;
    
    return { 
      ...prev, 
      eventSeries: events 
    };
  });
}; 