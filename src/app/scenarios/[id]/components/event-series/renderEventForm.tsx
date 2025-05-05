/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Event, IncomeEvent, ExpenseEvent } from "@/types/event";
import { CheckedState } from "@radix-ui/react-checkbox";
import { FixedValues, NormalDistributionValues, UniformDistributionValues } from "@/types/utils";
import { renderBasicEventDetails } from "./renderBasicEventDetails";
import { renderIncomeEventDetails } from "./renderIncomeEventDetails";
import { renderExpenseEventDetails } from "./renderExpenseEventDetails";
import { renderInvestmentEventDetails } from "./renderInvestmentEventDetails";
import { renderRebalanceEventDetails } from "./renderRebalanceEventDetails";

// Type for distribution types used in UI controls
type DistributionType = "fixed" | "normal" | "uniform";

// Define the type for the handlers object
export interface EventHandlers {
  handleBasicInputChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, index: number) => void;
  handleYearInputChange: (field: "startYear" | "duration", value: string, index: number) => void;
  handleYearTypeChange: (field: "startYear" | "duration", type: "fixed" | "uniform" | "normal" | "event", index: number) => void;
  handleIncomeChange: (field: keyof IncomeEvent, value: number, index: number) => void;
  handleExpenseChange: (field: keyof ExpenseEvent, value: number, index: number) => void;
  handleCheckboxChange: (checked: CheckedState, field: string, index: number) => void;
  handleIncomeDistributionValueChange: (subField: keyof (FixedValues & NormalDistributionValues & UniformDistributionValues), value: string, index: number) => void;
  handleIncomeDistributionTypeChange: (newType: DistributionType, index: number) => void;
  handleExpenseDistributionValueChange: (subField: keyof (FixedValues & NormalDistributionValues & UniformDistributionValues), value: string, index: number) => void;
  handleExpenseDistributionTypeChange: (newType: DistributionType, index: number) => void;
  
  // Investment handlers
  handleInvestmentAllocationTypeChange: (type: "fixed" | "glidePath", index: number) => void;
  handleInvestmentPercentageChange: (investmentIndex: number, value: string, eventIndex: number) => void;
  handleInvestmentGlidePathPercentageChange: (investmentIndex: number, phase: "initial" | "final", value: string, eventIndex: number) => void;
  handleMaxCashChange: (value: string, index: number) => void;
  
  // Rebalance handlers (make sure these are not optional)
  handleAllocationTypeChange: (type: "fixed" | "glidePath", index: number) => void;
  handlePercentageChange: (investmentIndex: number, value: string, eventIndex: number) => void;
  handleGlidePathPercentageChange: (investmentIndex: number, phase: "initial" | "final", value: string, eventIndex: number) => void;
  
  confirmDelete: (index: number) => void;
  setCanProceed?: (isValid: boolean) => void;
}

export const renderEventForm = (
  event: Event, 
  index: number, 
  canEdit: boolean, 
  handlers: EventHandlers,
  allEvents?: Event[],
  scenarioInvestments?: unknown[] // Using unknown instead of any
) => {
  return (
    <div className="p-4 border rounded-md mb-6 relative">
      {canEdit && (
        <Button
          type="button"
          onClick={() => handlers.confirmDelete(index)}
          className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white p-2 h-8 w-8"
          variant="destructive"
          size="icon"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
      
      {renderBasicEventDetails(event, index, canEdit, handlers, allEvents)}
      
      {event.eventType.type === "income" && renderIncomeEventDetails(event, index, canEdit, handlers)}
      {event.eventType.type === "expense" && renderExpenseEventDetails(event, index, canEdit, handlers)}
      {event.eventType.type === "investment" && renderInvestmentEventDetails(event, index, canEdit, handlers, scenarioInvestments as any)}
      {event.eventType.type === "rebalance" && renderRebalanceEventDetails(event, index, canEdit, handlers, scenarioInvestments as any)}
    </div>
  );
}; 