import { ChangeEvent, Dispatch, SetStateAction } from "react";
import { Scenario } from "@/types/scenario";
import { InvestmentEvent } from "@/types/event";

export const handleBasicInputChange = (
  e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, 
  index: number,
  setScenarioData: Dispatch<SetStateAction<Scenario | null>>
) => {
  const { name, value } = e.target;

  if(name === "maxCash") {
    setScenarioData(prev => {
      if (!prev) return null;

      const events = [...prev.eventSeries];
      const event = { ...(events[index].eventType as InvestmentEvent)};

      event[name] = parseFloat(value);

      const updatedEvent = { ...events[index] };
      updatedEvent.eventType = event;
      events[index] = updatedEvent;

      return {
        ...prev,
        eventSeries: events
      };
    });
  }
  
  setScenarioData(prev => {
    if (!prev) return null;
    
    const events = [...prev.eventSeries];
    const event = { ...events[index] };
    
    if (name === "name" || name === "description") {
      event[name] = value;
    }
    
    events[index] = event;
    
    return {
      ...prev,
      eventSeries: events
    };
  });
}; 