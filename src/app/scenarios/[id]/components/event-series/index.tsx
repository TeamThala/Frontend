"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scenario } from "@/types/scenario";
import { Event, IncomeEvent, ExpenseEvent, InvestmentEvent, RebalanceEvent } from "@/types/event";
import { CheckedState } from "@radix-ui/react-checkbox";
import { FixedValues, NormalDistributionValues, UniformDistributionValues } from "@/types/utils";

// Import the render components
import { renderEventForm } from "./renderEventForm";
import { handleBasicInputChange } from "./handlers/basicHandlers";
import { handleYearInputChange, handleYearTypeChange } from "./handlers/yearHandlers";
import { handleIncomeChange, handleIncomeDistributionValueChange, handleIncomeDistributionTypeChange } from "./handlers/incomeHandlers";
import { handleExpenseChange, handleExpenseDistributionValueChange, handleExpenseDistributionTypeChange } from "./handlers/expenseHandlers";
import { handleCheckboxChange } from "./handlers/checkboxHandlers";
import { handleAllocationTypeChange, handlePercentageChange, handleGlidePathPercentageChange } from "./handlers/rebalanceHandlers";
import { handleInvestmentAllocationTypeChange, handleInvestmentPercentageChange, handleInvestmentGlidePathPercentageChange, handleMaxCashChange } from "./handlers/investmentHandlers";


interface EventSeriesProps {
  scenario: Scenario | null;
  canEdit: boolean;
  onUpdate: (updatedScenario: Scenario) => void;
  handlePrevious: () => void;
  handleNext: () => void;
}

export default function EventSeries({ scenario, canEdit, onUpdate, handlePrevious, handleNext }: EventSeriesProps) {
  const [scenarioData, setScenarioData] = useState<Scenario | null>(scenario);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [indexToDelete, setIndexToDelete] = useState<number | null>(null);
  const [addEventDialogOpen, setAddEventDialogOpen] = useState(false);
  const [eventType, setEventType] = useState<"income" | "expense" | "investment" | "rebalance">("income");
  
  // Update scenario data when scenario prop changes
  useEffect(() => {
    setScenarioData(scenario);
  }, [scenario]);

  // Handle next button click
  const handleNextClick = () => {
    if (scenarioData) {
      onUpdate(scenarioData);
      handleNext();
    }
  };

  // Handle previous button click
  const handlePreviousClick = () => {
    if (scenarioData) {
      onUpdate(scenarioData);
      handlePrevious();
    }
  };

  // Handle confirmation for event deletion
  const confirmDelete = (index: number) => {
    setIndexToDelete(index);
    setDeleteDialogOpen(true);
  };

  // Handle actual deletion of an event
  const deleteEvent = () => {
    if (indexToDelete === null || !scenarioData) return;
    
    const updatedEvents = [...scenarioData.eventSeries];
    updatedEvents.splice(indexToDelete, 1);
    
    const updatedScenario = {
      ...scenarioData,
      eventSeries: updatedEvents
    };
    
    setScenarioData(updatedScenario);
    setDeleteDialogOpen(false);
    setIndexToDelete(null);
  };

  // Create a new event with default values based on type
  const addEvent = () => {
    if (!scenarioData) return;
    
    let newEventType: IncomeEvent | ExpenseEvent | InvestmentEvent | RebalanceEvent;
    
    switch (eventType) {
      case "income":
        newEventType = {
          type: "income",
          amount: 0,
          inflationAdjustment: true,
          socialSecurity: false,
          wage: false,
          expectedAnnualChange: {
            type: "fixed",
            valueType: "percentage",
            value: 0
          }
        };
        break;
      case "expense":
        newEventType = {
          type: "expense",
          amount: 0,
          inflationAdjustment: true,
          discretionary: false,
          expectedAnnualChange: {
            type: "fixed",
            valueType: "percentage",
            value: 0
          }
        };
        break;
      case "investment":
        newEventType = {
          type: "investment",
          inflationAdjustment: false,
          assetAllocation: {
            type: "fixed",
            investments: scenarioData.investments.length > 0 ? scenarioData.investments : null,
            percentages: scenarioData.investments.map(() => 0)
          },
          maxCash: 0
        };
        break;
      case "rebalance":
        newEventType = {
          type: "rebalance",
          portfolioDistribution: {
            type: "fixed",
            investments: scenarioData.investments.length > 0 ? scenarioData.investments : null,
            percentages: scenarioData.investments.map(() => 0)
          }
        };
        break;
    }
    
    const newEvent: Event = {
      id: uuidv4(),
      name: `New ${eventType.charAt(0).toUpperCase() + eventType.slice(1)} Event`,
      description: "",
      startYear: {
        type: "fixed",
        year: new Date().getFullYear()
      },
      duration: {
        type: "fixed",
        year: 1
      },
      eventType: newEventType
    };
    
    const updatedScenario = {
      ...scenarioData,
      eventSeries: [...scenarioData.eventSeries, newEvent]
    };
    
    setScenarioData(updatedScenario);
    setAddEventDialogOpen(false);
  };

  // The main component with all the handlers needed for the child components
  const eventHandlers = {
    handleBasicInputChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, index: number) => 
      handleBasicInputChange(e, index, setScenarioData),
    handleYearInputChange: (field: "startYear" | "duration", value: string, index: number) => 
      handleYearInputChange(field, value, index, setScenarioData),
    handleYearTypeChange: (field: "startYear" | "duration", type: "fixed" | "uniform" | "normal" | "event", index: number) => 
      handleYearTypeChange(field, type, index, setScenarioData),
    handleIncomeChange: (field: keyof IncomeEvent, value: number, index: number) => 
      handleIncomeChange(field, value, index, setScenarioData),
    handleExpenseChange: (field: keyof ExpenseEvent, value: number, index: number) => 
      handleExpenseChange(field, value, index, setScenarioData),
    handleCheckboxChange: (checked: CheckedState, field: string, index: number) => 
      handleCheckboxChange(checked, field, index, setScenarioData),
    handleIncomeDistributionValueChange: (subField: keyof (FixedValues & NormalDistributionValues & UniformDistributionValues), value: string, index: number) =>
      handleIncomeDistributionValueChange(subField, value, index, setScenarioData),
    handleIncomeDistributionTypeChange: (newType: "fixed" | "normal" | "uniform", index: number) =>
      handleIncomeDistributionTypeChange(newType, index, setScenarioData),
    handleExpenseDistributionValueChange: (subField: keyof (FixedValues & NormalDistributionValues & UniformDistributionValues), value: string, index: number) =>
      handleExpenseDistributionValueChange(subField, value, index, setScenarioData),
    handleExpenseDistributionTypeChange: (newType: "fixed" | "normal" | "uniform", index: number) =>
      handleExpenseDistributionTypeChange(newType, index, setScenarioData),
    handleAllocationTypeChange: (type: "fixed" | "glidePath", index: number) =>
      handleAllocationTypeChange(type, index, setScenarioData),
    handlePercentageChange: (investmentIndex: number, value: string, eventIndex: number) =>
      handlePercentageChange(investmentIndex, value, eventIndex, setScenarioData),
    handleGlidePathPercentageChange: (investmentIndex: number, phase: "initial" | "final", value: string, eventIndex: number) =>
      handleGlidePathPercentageChange(investmentIndex, phase, value, eventIndex, setScenarioData),
    handleInvestmentAllocationTypeChange: (type: "fixed" | "glidePath", index: number) =>
      handleInvestmentAllocationTypeChange(type, index, setScenarioData),
    handleInvestmentPercentageChange: (investmentIndex: number, value: string, eventIndex: number) =>
      handleInvestmentPercentageChange(investmentIndex, value, eventIndex, setScenarioData),
    handleInvestmentGlidePathPercentageChange: (investmentIndex: number, phase: "initial" | "final", value: string, eventIndex: number) =>
      handleInvestmentGlidePathPercentageChange(investmentIndex, phase, value, eventIndex, setScenarioData),
    handleMaxCashChange: (value: string, index: number) =>
      handleMaxCashChange(value, index, setScenarioData),
    confirmDelete
  };

  if (!scenarioData) return null;

  return (
    <div className="space-y-6 p-4 border rounded-md">
      <h2 className="text-2xl font-bold text-purple-400">Event Series</h2>
      
      {/* Events filtering tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid grid-cols-5 w-full bg-zinc-950">
          <TabsTrigger value="all" className="text-purple-400">All</TabsTrigger>
          <TabsTrigger value="income" className="text-purple-400">Income</TabsTrigger>
          <TabsTrigger value="expense" className="text-purple-400">Expense</TabsTrigger>
          <TabsTrigger value="investment" className="text-purple-400">Investment</TabsTrigger>
          <TabsTrigger value="rebalance" className="text-purple-400">Rebalance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          {scenarioData.eventSeries.length === 0 ? (
            <p className="text-center text-zinc-400 py-8">No events added yet. Click the Add Event button below to get started.</p>
          ) : (
            scenarioData.eventSeries.map((event, index) => (
              <div key={event.id || event._id || index}>
                {renderEventForm(event, index, canEdit, eventHandlers, scenarioData.eventSeries, scenarioData.investments)}
              </div>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="income" className="mt-4">
          {scenarioData.eventSeries.filter(event => event.eventType.type === "income").length === 0 ? (
            <p className="text-center text-zinc-400 py-8">No income events added yet.</p>
          ) : (
            scenarioData.eventSeries
              .map((event, idx) => event.eventType.type === "income" ? (
                <div key={event.id || event._id || idx  }>
                  {renderEventForm(event, idx, canEdit, eventHandlers, scenarioData.eventSeries, scenarioData.investments)}
                </div>
              ) : null)
              .filter(Boolean)
          )}
        </TabsContent>
        
        <TabsContent value="expense" className="mt-4">
          {scenarioData.eventSeries.filter(event => event.eventType.type === "expense").length === 0 ? (
            <p className="text-center text-zinc-400 py-8">No expense events added yet.</p>
          ) : (
            scenarioData.eventSeries
              .map((event, idx) => event.eventType.type === "expense" ? (
                <div key={event.id || event._id || idx}>
                  {renderEventForm(event, idx, canEdit, eventHandlers, scenarioData.eventSeries, scenarioData.investments)}
                </div>
              ) : null)
              .filter(Boolean)
          )}
        </TabsContent>
        
        <TabsContent value="investment" className="mt-4">
          {scenarioData.eventSeries.filter(event => event.eventType.type === "investment").length === 0 ? (
            <p className="text-center text-zinc-400 py-8">No investment events added yet.</p>
          ) : (
            scenarioData.eventSeries
              .map((event, idx) => event.eventType.type === "investment" ? (
                <div key={event.id || event._id || idx}>
                  {renderEventForm(event, idx, canEdit, eventHandlers, scenarioData.eventSeries, scenarioData.investments)}
                </div>
              ) : null)
              .filter(Boolean)
          )}
        </TabsContent>
        
        <TabsContent value="rebalance" className="mt-4">
          {scenarioData.eventSeries.filter(event => event.eventType.type === "rebalance").length === 0 ? (
            <p className="text-center text-zinc-400 py-8">No rebalance events added yet.</p>
          ) : (
            scenarioData.eventSeries
              .map((event, idx) => event.eventType.type === "rebalance" ? (
                <div key={event.id || event._id || idx}>
                  {renderEventForm(event, idx, canEdit, eventHandlers, scenarioData.eventSeries, scenarioData.investments)}
                </div>
              ) : null)
              .filter(Boolean)
          )}
        </TabsContent>
      </Tabs>
      
      {/* Add Event Button */}
      {canEdit && (
        <Button 
          type="button" 
          onClick={() => setAddEventDialogOpen(true)} 
          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
        >
          <PlusCircle className="h-5 w-5" /> Add Event
        </Button>
      )}
      
      {/* Add Event Dialog */}
      <Dialog open={addEventDialogOpen} onOpenChange={setAddEventDialogOpen}>
        <DialogContent className="bg-zinc-900 text-white border-purple-600">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add New Event</DialogTitle>
            <DialogDescription className="text-zinc-300 mt-2">
              Choose the type of event you want to add to your scenario.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label>Event Type</Label>
            <RadioGroup
              value={eventType}
              onValueChange={(value) => setEventType(value as "income" | "expense" | "investment" | "rebalance")}
              className="grid grid-cols-2 gap-4 mt-2"
            >
              <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-zinc-800">
                <RadioGroupItem value="income" id="event-income" className="border-2 border-gray-300 data-[state=checked]:border-purple-600 data-[state=checked]:bg-purple-600 data-[state=checked]:ring-white data-[state=checked]:ring-2" />
                <Label htmlFor="event-income" className="font-semibold">Income</Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-zinc-800">
                <RadioGroupItem value="expense" id="event-expense" className="border-2 border-gray-300 data-[state=checked]:border-purple-600 data-[state=checked]:bg-purple-600 data-[state=checked]:ring-white data-[state=checked]:ring-2" />
                <Label htmlFor="event-expense" className="font-semibold">Expense</Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-zinc-800">
                <RadioGroupItem value="investment" id="event-investment" className="border-2 border-gray-300 data-[state=checked]:border-purple-600 data-[state=checked]:bg-purple-600 data-[state=checked]:ring-white data-[state=checked]:ring-2" />
                <Label htmlFor="event-investment" className="font-semibold">Investment</Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-zinc-800">
                <RadioGroupItem value="rebalance" id="event-rebalance" className="border-2 border-gray-300 data-[state=checked]:border-purple-600 data-[state=checked]:bg-purple-600 data-[state=checked]:ring-white data-[state=checked]:ring-2" />
                <Label htmlFor="event-rebalance" className="font-semibold">Rebalance</Label>
              </div>
            </RadioGroup>
          </div>
          
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setAddEventDialogOpen(false)} className="bg-zinc-700 hover:bg-zinc-600 text-white hover:text-white">
              Cancel
            </Button>
            <Button onClick={addEvent} className="bg-purple-600 hover:bg-purple-700">
              Add Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-900 text-white border-purple-600">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Delete Event</DialogTitle>
            <DialogDescription className="text-zinc-300 mt-2">
              This will permanently delete this event and remove it from your scenario.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="bg-zinc-700 hover:bg-zinc-600 text-white hover:text-white">
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteEvent} className="bg-red-600 hover:bg-red-700">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {!canEdit && (
        <p className="text-sm text-yellow-400 bg-zinc-800 p-2 rounded">
          Viewing in read-only mode. Editing is disabled.
        </p>
      )}
      
      <div className="flex justify-end pt-4 border-t mt-6 space-x-4">
        <Button
          type="button"
          onClick={handlePreviousClick}
          className="bg-zinc-700 text-white px-4 py-2 rounded hover:bg-zinc-600 transition"
        >
          Previous
        </Button>
        <Button
          type="button"
          onClick={handleNextClick}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
        >
          Next
        </Button>
      </div>
    </div>
  );
} 