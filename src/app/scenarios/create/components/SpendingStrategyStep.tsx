"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EventSeriesData } from "./EventSeriesStep";
import { ExpenseEvent } from "@/types/event";

export interface SpendingStrategyData {
  expensePriorityOrder: string[];
}

interface SpendingStrategyStepProps {
  data: SpendingStrategyData;
  onDataUpdate: (data: SpendingStrategyData) => void;
  onValidationChange?: (isValid: boolean) => void;
  eventSeriesData?: EventSeriesData;
}

export default function SpendingStrategyStep({ 
  data, 
  onDataUpdate, 
  onValidationChange,
  eventSeriesData = { events: [] }
}: SpendingStrategyStepProps) {
  // Create refs to prevent infinite update loops
  const dataRef = useRef(data);
  const onDataUpdateRef = useRef(onDataUpdate);
  const onValidationChangeRef = useRef(onValidationChange);
  
  // Get discretionary expense event IDs from event series data
  const discretionaryExpenseIds = eventSeriesData.events
    .filter(event => 
      event.eventType.type === 'expense' && 
      (event.eventType as ExpenseEvent).discretionary === true
    )
    .map(event => event.id);
  
  // Initialize state with existing priority order or discretionary expense IDs
  const [formData, setFormData] = useState<SpendingStrategyData>(() => {
    // If we have pre-existing data with valid expense events, use it
    if (dataRef.current?.expensePriorityOrder?.length && 
        dataRef.current.expensePriorityOrder.some(id => discretionaryExpenseIds.includes(id))) {
      // Filter out any expense IDs that no longer exist in current discretionary expenses
      const validExpenseIds = dataRef.current.expensePriorityOrder
        .filter(id => discretionaryExpenseIds.includes(id));
      
      // Add any new discretionary expenses that aren't already in the priority order
      const missingExpenseIds = discretionaryExpenseIds
        .filter(id => !validExpenseIds.includes(id));
      
      return {
        expensePriorityOrder: [...validExpenseIds, ...missingExpenseIds]
      };
    }
    
    // Otherwise, use all discretionary expense IDs as the default order
    return {
      expensePriorityOrder: discretionaryExpenseIds
    };
  });

  // Update refs when props change
  useEffect(() => {
    dataRef.current = data;
    onDataUpdateRef.current = onDataUpdate;
    onValidationChangeRef.current = onValidationChange;
  }, [data, onDataUpdate, onValidationChange]);

  // Update parent component with form data when it changes
  useEffect(() => {
    if (onDataUpdateRef.current) {
      onDataUpdateRef.current(formData);
    }
    
    if (onValidationChangeRef.current) {
      onValidationChangeRef.current(true); // Always valid
    }
  }, [formData]);
  
  // Update priority order when discretionary expenses change
  useEffect(() => {
    if (discretionaryExpenseIds.length > 0 &&
        (!formData.expensePriorityOrder.length || 
         !discretionaryExpenseIds.every(id => formData.expensePriorityOrder.includes(id)) ||
         !formData.expensePriorityOrder.every(id => discretionaryExpenseIds.includes(id)))) {
      
      setFormData(prevData => ({
        ...prevData,
        expensePriorityOrder: discretionaryExpenseIds
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discretionaryExpenseIds]);

  const handleOrderChange = (index1: number, index2: number) => {
    // Swap the elements at the given indices
    const newOrder = [...formData.expensePriorityOrder];
    [newOrder[index1], newOrder[index2]] = [newOrder[index2], newOrder[index1]];
    
    setFormData({
      ...formData,
      expensePriorityOrder: newOrder
    });
  };

  const moveUp = (index: number) => {
    if (index > 0) {
      handleOrderChange(index, index - 1);
    }
  };

  const moveDown = (index: number) => {
    if (index < formData.expensePriorityOrder.length - 1) {
      handleOrderChange(index, index + 1);
    }
  };

  // Helper to get expense name and details from ID
  const getExpenseDetails = (id: string) => {
    const event = eventSeriesData.events.find(event => event.id === id);
    if (!event || event.eventType.type !== 'expense') return { name: id, amount: 0 };
    
    return {
      name: event.name,
      amount: (event.eventType as ExpenseEvent).amount || 0
    };
  };

  return (
    <Card className="bg-black text-white p-6 rounded-lg border border-zinc-800">
      <h2 className="text-2xl font-bold mb-6">Spending Strategy</h2>
      
      <div className="space-y-6">
        {/* Expense Priority Order */}
        <div className="space-y-2">
          <label className="block text-md font-medium text-white">
            Discretionary Expense Priority
          </label>
          <p className="text-sm text-zinc-400 mb-3">
            Arrange the priority order for your discretionary expenses. 
            Higher priority expenses (at the top) will be maintained longer during financial constraints.
          </p>
          
          {discretionaryExpenseIds.length > 0 ? (
            <div className="space-y-2">
              {formData.expensePriorityOrder.map((expenseId, index) => {
                const expenseDetails = getExpenseDetails(expenseId);
                
                return (
                  <div 
                    key={expenseId} 
                    className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-md"
                  >
                    <div>
                      <span className="font-medium">{expenseDetails.name}</span>
                      <span className="ml-2 text-sm text-zinc-400">${expenseDetails.amount.toLocaleString()}/yr</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                      >
                        ↑
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => moveDown(index)}
                        disabled={index === formData.expensePriorityOrder.length - 1}
                        className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                      >
                        ↓
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-md text-center text-zinc-400">
              No discretionary expenses found. Please add discretionary expenses in the Event Series step.
            </div>
          )}
        </div>
      </div>

      {/* Form Data Preview (for development) */}
      <div className="mt-8 p-4 bg-zinc-900 rounded-lg">
        <h3 className="text-md font-semibold mb-2">Spending Priority Configuration</h3>
        <pre className="text-xs text-zinc-400 overflow-auto">
          {JSON.stringify(formData, null, 2)}
        </pre>
      </div>
    </Card>
  );
} 