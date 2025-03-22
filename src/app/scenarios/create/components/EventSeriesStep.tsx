"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Event, IncomeEvent, ExpenseEvent, InvestmentEvent, RebalanceEvent } from "@/types/event";
import { InvestmentsData } from "./InvestmentsStep";

// Define FixedYear interface locally to fix the linter error
interface FixedYear {
  type: "fixed";
  year: number;
}

// Define EventTypeUpdate type for the handleEventTypeChange function
type EventTypeUpdate = Partial<IncomeEvent | ExpenseEvent | InvestmentEvent | RebalanceEvent> & {
  type?: "income" | "expense" | "investment" | "rebalance";
};

export interface EventSeriesData {
  events: Event[];
}

interface EventSeriesStepProps {
  data: EventSeriesData;
  onDataUpdate: (data: EventSeriesData) => void;
  onValidationChange?: (isValid: boolean) => void;
  investmentsData: InvestmentsData;
}

export default function EventSeriesStep({ data, onDataUpdate, onValidationChange, investmentsData }: EventSeriesStepProps) {
  const [events, setEvents] = useState<Event[]>(data.events || []);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const onValidationChangeRef = useRef(onValidationChange);

  useEffect(() => {
    onValidationChangeRef.current = onValidationChange;
  }, [onValidationChange]);

  useEffect(() => {
    const newErrors: Record<string, string[]> = {};
    
    events.forEach(event => {
      const eventErrors: string[] = [];
      
      if (!event.name.trim()) {
        eventErrors.push('Event name is required');
      }
      
      if (!event.startYear) {
        eventErrors.push('Start year is required');
      }
      
      if (!event.duration) {
        eventErrors.push('Duration is required');
      }
      
      if (event.eventType.type === 'investment') {
        const investmentEvent = event.eventType as InvestmentEvent;
        if (!investmentEvent.assetAllocation || investmentEvent.assetAllocation.length === 0) {
          eventErrors.push('At least one asset allocation is required');
        }
        if (investmentsData.investments.length === 0) {
          eventErrors.push('No investments available for asset allocation');
        }
      }
      
      if (eventErrors.length > 0) {
        newErrors[event.id] = eventErrors;
      }
    });
    
    setErrors(newErrors);
    
    const isValid = Object.keys(newErrors).length === 0;
    if (onValidationChangeRef.current) {
      onValidationChangeRef.current(events.length > 0 && isValid);
    }
    
    onDataUpdate({ events });
  }, [events, onDataUpdate, investmentsData]);

  const handleAddEvent = () => {
    const newEvent: Event = {
      id: `evt-${Date.now()}`,
      name: "",
      startYear: { type: "fixed", year: new Date().getFullYear() },
      duration: { type: "fixed", year: 1 },
      eventType: { 
        type: "income", 
        amount: 0, 
        expectedAnnualChange: { type: "fixed", valueType: "amount", value: 0 }, 
        inflationAdjustment: false, 
        socialSecurity: false 
      }
    };
    
    setEvents([...events, newEvent]);
  };

  const handleRemoveEvent = (id: string) => {
    setEvents(events.filter(evt => evt.id !== id));
  };

  const handleEventChange = (id: string, updates: Partial<Event>) => {
    setEvents(events.map(event => 
      event.id === id ? { ...event, ...updates } : event
    ));
  };

  const handleEventTypeChange = (eventId: string, updates: EventTypeUpdate) => {
    setEvents((prevEvents: Event[]) => {
      return prevEvents.map(event => {
        if (event.id === eventId) {
          // Handle type change which requires rebuilding the eventType object
          if (updates.type && updates.type !== event.eventType.type) {
            let newEventType: IncomeEvent | ExpenseEvent | InvestmentEvent | RebalanceEvent;
            
            switch (updates.type) {
              case 'income':
                newEventType = { 
                  type: 'income', 
                  amount: 0, 
                  expectedAnnualChange: { type: "fixed", valueType: "amount", value: 0 }, 
                  inflationAdjustment: false, 
                  socialSecurity: false 
                } as IncomeEvent;
                break;
              case 'expense':
                newEventType = { 
                  type: 'expense', 
                  amount: 0, 
                  expectedAnnualChange: { type: "fixed", valueType: "amount", value: 0 }, 
                  inflationAdjustment: false, 
                  discretionary: false 
                } as ExpenseEvent;
                break;
              case 'investment':
                newEventType = { 
                  type: 'investment', 
                  assetAllocation: [], 
                  maximumCash: 0 
                } as InvestmentEvent;
                break;
              case 'rebalance':
                newEventType = { 
                  type: 'rebalance', 
                  assetAllocation: [] 
                } as RebalanceEvent;
                break;
              default:
                newEventType = event.eventType;
            }
            
            return { ...event, eventType: newEventType };
          }
          
          // Create a copy of the event to modify
          const updatedEvent = { ...event };
          
          // Apply updates to the event type
          if (event.eventType.type === 'income' && updates.type !== 'expense' && 
              updates.type !== 'investment' && updates.type !== 'rebalance') {
            updatedEvent.eventType = { ...event.eventType, ...updates } as IncomeEvent;
          } else if (event.eventType.type === 'expense' && updates.type !== 'income' && 
              updates.type !== 'investment' && updates.type !== 'rebalance') {
            updatedEvent.eventType = { ...event.eventType, ...updates } as ExpenseEvent;
          } else if (event.eventType.type === 'investment' && updates.type !== 'income' && 
              updates.type !== 'expense' && updates.type !== 'rebalance') {
            updatedEvent.eventType = { ...event.eventType, ...updates } as InvestmentEvent;
          } else if (event.eventType.type === 'rebalance' && updates.type !== 'income' && 
              updates.type !== 'expense' && updates.type !== 'investment') {
            updatedEvent.eventType = { ...event.eventType, ...updates } as RebalanceEvent;
          }
          
          return updatedEvent;
        }
        return event;
      });
    });
  };

  const hasErrors = (eventId: string): boolean => {
    return !!errors[eventId] && errors[eventId].length > 0;
  };

  const getInputClass = (eventId: string, fieldName: string): string => {
    const baseClass = "w-full px-3 py-2 bg-zinc-900 border rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#7F56D9]";
    
    if (hasErrors(eventId) && errors[eventId].some(err => err.toLowerCase().includes(fieldName.toLowerCase()))) {
      return `${baseClass} border-red-500`;
    }
    
    return `${baseClass} border-zinc-700`;
  };

  const renderEventTypeSpecificFields = (event: Event) => {
    switch (event.eventType.type) {
      case 'income':
        const incomeEvent = event.eventType as IncomeEvent;
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white">
                Amount ($) <span className="text-red-500">*</span>
              </label>
              <input 
                type="number" 
                min="0"
                className={getInputClass(event.id, 'amount')}
                value={incomeEvent.amount || 0}
                onChange={(e) => handleEventTypeChange(event.id, { amount: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white">
                Inflation Adjustment <span className="text-red-500">*</span>
              </label>
              <select 
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#7F56D9]"
                value={incomeEvent.inflationAdjustment ? "true" : "false"}
                onChange={(e) => handleEventTypeChange(event.id, { inflationAdjustment: e.target.value === "true" })}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>
        );
      case 'expense':
        const expenseEvent = event.eventType as ExpenseEvent;
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white">
                Amount ($) <span className="text-red-500">*</span>
              </label>
              <input 
                type="number" 
                min="0"
                className={getInputClass(event.id, 'amount')}
                value={expenseEvent.amount || 0}
                onChange={(e) => handleEventTypeChange(event.id, { amount: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white">
                Discretionary <span className="text-red-500">*</span>
              </label>
              <select 
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#7F56D9]"
                value={expenseEvent.discretionary ? "true" : "false"}
                onChange={(e) => handleEventTypeChange(event.id, { discretionary: e.target.value === "true" })}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>
        );
      case 'investment':
        const investmentEvent = event.eventType as InvestmentEvent;
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white">
                Maximum Cash ($) <span className="text-red-500">*</span>
              </label>
              <input 
                type="number" 
                min="0"
                className={getInputClass(event.id, 'maximum cash')}
                value={investmentEvent.maximumCash || 0}
                onChange={(e) => handleEventTypeChange(event.id, { maximumCash: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white">
                Asset Allocation <span className="text-red-500">*</span>
              </label>
              {investmentsData.investments.length > 0 ? (
                <select 
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#7F56D9]"
                  onChange={(e) => handleEventTypeChange(event.id, { assetAllocation: [{ type: "fixed", investment: investmentsData.investments.find(inv => inv.id === e.target.value)!, percentage: 100 }] })}
                >
                  <option value="">Select an investment</option>
                  {investmentsData.investments.map(investment => (
                    <option key={investment.id} value={investment.id}>{investment.investmentType.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-red-500">No investments available for selection.</p>
              )}
            </div>
          </div>
        );
      case 'rebalance':
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _rebalanceEvent = event.eventType as RebalanceEvent;
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white">
                Asset Allocation <span className="text-red-500">*</span>
              </label>
              {investmentsData.investments.length > 0 ? (
                <select 
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#7F56D9]"
                  onChange={(e) => handleEventTypeChange(event.id, { assetAllocation: [{ type: "fixed", investment: investmentsData.investments.find(inv => inv.id === e.target.value)!, percentage: 100 }] })}
                >
                  <option value="">Select an investment</option>
                  {investmentsData.investments.map(investment => (
                    <option key={investment.id} value={investment.id}>{investment.investmentType.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-red-500">No investments available for selection.</p>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="bg-black text-white p-6 rounded-lg border border-zinc-800">
      <h2 className="text-2xl font-bold mb-6">Event Series</h2>
      
      {events.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-4">Your Events</h3>
          
          {events.map((event, index) => (
            <div key={event.id} className="mb-6 border-b border-zinc-800 pb-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-md font-medium">Event #{index + 1}</h4>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-red-500 hover:text-red-400 hover:bg-zinc-900"
                  onClick={() => handleRemoveEvent(event.id)}
                >
                  Remove
                </Button>
              </div>
              
              {hasErrors(event.id) && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-md">
                  <p className="text-red-400 font-medium mb-1">Please fix the following errors:</p>
                  <ul className="list-disc list-inside text-sm text-red-400">
                    {errors[event.id].map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white">
                      Event Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      className={getInputClass(event.id, 'name')}
                      value={event.name}
                      onChange={(e) => handleEventChange(event.id, { name: e.target.value })}
                      placeholder="e.g., Retirement"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white">
                      Start Year <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="number" 
                      min="1900"
                      max="2100"
                      className={getInputClass(event.id, 'start year')}
                      value={(event.startYear as FixedYear).year}
                      onChange={(e) => handleEventChange(event.id, { startYear: { type: "fixed", year: Number(e.target.value) } })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white">
                    Duration (Years) <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="number" 
                    min="1"
                    className={getInputClass(event.id, 'duration')}
                    value={(event.duration as FixedYear).year}
                    onChange={(e) => handleEventChange(event.id, { duration: { type: "fixed", year: Number(e.target.value) } })}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white">
                    Event Type <span className="text-red-500">*</span>
                  </label>
                  <select 
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#7F56D9]"
                    value={event.eventType.type}
                    onChange={(e) => handleEventTypeChange(event.id, { type: e.target.value as "income" | "expense" | "investment" | "rebalance" })}
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                    <option value="investment">Investment</option>
                    <option value="rebalance">Rebalance</option>
                  </select>
                </div>
                
                {renderEventTypeSpecificFields(event)}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex justify-center">
        <Button 
          onClick={handleAddEvent}
          className="bg-[#7F56D9] hover:bg-[#6941C6] text-white px-8 py-2"
        >
          + Add Event
        </Button>
      </div>
      
      {events.length === 0 && (
        <div className="mt-4 text-center text-zinc-400">
          <p>No events added yet. Click the button above to add your first event.</p>
        </div>
      )}
      
      {/* Event Series Data Preview (for development) */}
      <div className="mt-8 p-4 bg-zinc-900 rounded-lg">
        <h3 className="text-md font-semibold mb-2">Event Series Configuration</h3>
        <pre className="text-xs text-zinc-400 overflow-auto">
          {JSON.stringify({ events }, null, 2)}
        </pre>
      </div>
    </Card>
  );
} 