import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Event } from "@/types/event";
import { EventHandlers } from "./renderEventForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Helper function to safely access nested properties
const safeGet = (obj: any, path: string, defaultValue: any = 0) => {
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === undefined || current === null) {
      return defaultValue;
    }
    current = current[part];
  }
  
  return current !== undefined && current !== null ? current : defaultValue;
};

export const renderBasicEventDetails = (
  event: Event, 
  index: number, 
  canEdit: boolean, 
  handlers: EventHandlers,
  allEvents?: Event[]
) => {
  // Ensure event has the expected structure
  const startYear = event.startYear || { type: "fixed", year: 0 };
  const duration = event.duration || { type: "fixed", year: 0 };
  
  // For backward compatibility - handle both old and new schema formats
  const getUniformValue = (obj: any, prop: string) => {
    // New format: obj.year.prop
    if (obj.year && typeof obj.year === 'object') {
      return obj.year[prop];
    }
    // Old format: obj.prop directly
    return obj[prop];
  };

  return (
    <div className="space-y-4">
      <div className="grid w-full max-w-md items-center gap-1.5">
        <Label htmlFor={`name-${index}`}>Name <span className="text-red-500">*</span></Label>
        <Input
          type="text" id={`name-${index}`} name="name" placeholder="Event Name"
          value={event.name} 
          onChange={(e) => handlers.handleBasicInputChange(e, index)} 
          disabled={!canEdit}
          required
        />
      </div>
      
      <div className="grid w-full gap-1.5">
        <Label htmlFor={`description-${index}`}>Description</Label>
        <Textarea
          placeholder="Describe the event..." id={`description-${index}`} name="description"
          value={event.description || ""} 
          onChange={(e) => handlers.handleBasicInputChange(e, index)} 
          disabled={!canEdit} 
          className="min-h-[80px]"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Year</Label>
          <RadioGroup
            value={startYear.type}
            onValueChange={(value) => handlers.handleYearTypeChange("startYear", value as "fixed" | "uniform" | "normal" | "event", index)}
            disabled={!canEdit}
            className="flex flex-wrap gap-2"
          >
            {["fixed", "uniform", "normal", "event"].map((type) => (
              <div className="flex items-center space-x-2" key={type}>
                <RadioGroupItem value={type} id={`startYear-${type}-${index}`} 
                  className="border-2 border-gray-300 data-[state=checked]:border-purple-600 data-[state=checked]:bg-purple-600 data-[state=checked]:ring-white data-[state=checked]:ring-2" 
                />
                <Label htmlFor={`startYear-${type}-${index}`}>
                  {type === "event" ? "Same as Event" : type.charAt(0).toUpperCase() + type.slice(1)}
                </Label>
              </div>
            ))}
          </RadioGroup>
          
          {startYear.type === "fixed" && (
            <Input
              type="number"
              value={startYear.year || 0}
              onChange={(e) => handlers.handleYearInputChange("startYear", e.target.value, index)}
              disabled={!canEdit}
              className="mt-2"
            />
          )}
          
          {startYear.type === "normal" && (
            <div className="flex space-x-2 mt-2">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor={`startYear-mean-${index}`}>Mean</Label>
                <Input
                  type="number"
                  id={`startYear-mean-${index}`}
                  value={safeGet(startYear, 'year.mean')}
                  onChange={(e) => handlers.handleYearInputChange("startYear", `mean:${e.target.value}`, index)}
                  disabled={!canEdit}
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor={`startYear-stdDev-${index}`}>Std Dev</Label>
                <Input
                  type="number"
                  id={`startYear-stdDev-${index}`}
                  value={safeGet(startYear, 'year.stdDev')}
                  onChange={(e) => handlers.handleYearInputChange("startYear", `stdDev:${e.target.value}`, index)}
                  disabled={!canEdit}
                  min="0"
                />
              </div>
            </div>
          )}
          
          {startYear.type === "uniform" && (
            <div className="flex space-x-2 mt-2">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor={`startYear-min-${index}`}>Min</Label>
                <Input
                  type="number"
                  id={`startYear-min-${index}`}
                  value={safeGet(startYear, 'year.min')}
                  onChange={(e) => handlers.handleYearInputChange("startYear", `min:${e.target.value}`, index)}
                  disabled={!canEdit}
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor={`startYear-max-${index}`}>Max</Label>
                <Input
                  type="number"
                  id={`startYear-max-${index}`}
                  value={safeGet(startYear, 'year.max')}
                  onChange={(e) => handlers.handleYearInputChange("startYear", `max:${e.target.value}`, index)}
                  disabled={!canEdit}
                />
              </div>
            </div>
          )}
          
          {startYear.type === "event" && (
            <div className="space-y-2 mt-2">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor={`startYear-eventId-${index}`}>Reference Event</Label>
                <Select
                  value={startYear.eventId || ""}
                  onValueChange={(value) => handlers.handleYearInputChange("startYear", `eventId:${value}`, index)}
                  disabled={!canEdit}
                >
                  <SelectTrigger id={`startYear-eventId-${index}`} className="w-full">
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent>
                    {allEvents?.filter(e => e.id !== event.id).map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor={`startYear-eventTime-${index}`}>Event Time</Label>
                <Select
                  value={startYear.eventTime || "start"}
                  onValueChange={(value) => handlers.handleYearInputChange("startYear", `eventTime:${value}`, index)}
                  disabled={!canEdit}
                >
                  <SelectTrigger id={`startYear-eventTime-${index}`} className="w-full">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="start">Start of event</SelectItem>
                    <SelectItem value="end">End of event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <Label>Duration (Years)</Label>
          <RadioGroup
            value={duration.type}
            onValueChange={(value) => handlers.handleYearTypeChange("duration", value as "fixed" | "uniform" | "normal", index)}
            disabled={!canEdit}
            className="flex space-x-4"
          >
            {["fixed", "uniform", "normal"].map((type) => (
              <div className="flex items-center space-x-2" key={type}>
                <RadioGroupItem value={type} id={`duration-${type}-${index}`} 
                  className="border-2 border-gray-300 data-[state=checked]:border-purple-600 data-[state=checked]:bg-purple-600 data-[state=checked]:ring-white data-[state=checked]:ring-2" 
                />
                <Label htmlFor={`duration-${type}-${index}`}>{type.charAt(0).toUpperCase() + type.slice(1)}</Label>
              </div>
            ))}
          </RadioGroup>
          
          {duration.type === "fixed" && (
            <Input
              type="number"
              value={typeof duration.year === 'object' ? 0 : (duration.year || 0)}
              onChange={(e) => handlers.handleYearInputChange("duration", e.target.value, index)}
              disabled={!canEdit}
              className="mt-2"
            />
          )}
          
          {duration.type === "normal" && (
            <div className="flex space-x-2 mt-2">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor={`duration-mean-${index}`}>Mean</Label>
                <Input
                  type="number"
                  id={`duration-mean-${index}`}
                  value={safeGet(duration, 'year.mean')}
                  onChange={(e) => handlers.handleYearInputChange("duration", `mean:${e.target.value}`, index)}
                  disabled={!canEdit}
                  min="1"
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor={`duration-stdDev-${index}`}>Std Dev</Label>
                <Input
                  type="number"
                  id={`duration-stdDev-${index}`}
                  value={safeGet(duration, 'year.stdDev')}
                  onChange={(e) => handlers.handleYearInputChange("duration", `stdDev:${e.target.value}`, index)}
                  disabled={!canEdit}
                  min="0"
                />
              </div>
            </div>
          )}
          
          {duration.type === "uniform" && (
            <div className="flex space-x-2 mt-2">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor={`duration-min-${index}`}>Min</Label>
                <Input
                  type="number"
                  id={`duration-min-${index}`}
                  value={safeGet(duration, 'year.min')}
                  onChange={(e) => handlers.handleYearInputChange("duration", `min:${e.target.value}`, index)}
                  disabled={!canEdit}
                  min="1"
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor={`duration-max-${index}`}>Max</Label>
                <Input
                  type="number"
                  id={`duration-max-${index}`}
                  value={safeGet(duration, 'year.max')}
                  onChange={(e) => handlers.handleYearInputChange("duration", `max:${e.target.value}`, index)}
                  disabled={!canEdit}
                  min="1"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 