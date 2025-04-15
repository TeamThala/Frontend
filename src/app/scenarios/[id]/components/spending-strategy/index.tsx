"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Scenario } from "@/types/scenario";
import { Event, ExpenseEvent } from "@/types/event";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowUp, ArrowDown, DollarSign } from "lucide-react";

interface SpendingStrategyProps {
  scenario: Scenario | null;
  canEdit: boolean;
  onUpdate: (updatedScenario: Scenario) => void;
  handlePrevious: () => void;
  handleNext: () => void;
}

export default function SpendingStrategy({
  scenario,
  canEdit,
  onUpdate,
  handlePrevious,
  handleNext,
}: SpendingStrategyProps) {
  const [scenarioData, setScenarioData] = useState<Scenario | null>(scenario);
  const [discretionaryExpenses, setDiscretionaryExpenses] = useState<Event[]>(
    []
  );

  // Update scenario data when scenario prop changes
  useEffect(() => {
    setScenarioData(scenario);
    
    if (scenario) {
      // Filter out only discretionary expenses from eventSeries
      const expenses = scenario.eventSeries.filter(
        (event) => 
          event.eventType.type === "expense" && 
          (event.eventType as ExpenseEvent).discretionary === true
      );
      
      // Set initial order based on existing spendingStrategy or default to filtered events
      if (scenario.spendingStrategy && scenario.spendingStrategy.length > 0) {
        // Use the existing spending strategy order if available
        const orderedExpenses: Event[] = [];
        
        // First add items that are in the spendingStrategy (in their saved order)
        scenario.spendingStrategy.forEach(strategyEvent => {
          const matchingEvent = expenses.find(e => e._id === strategyEvent._id);
          if (matchingEvent) {
            orderedExpenses.push(matchingEvent);
          }
        });
        
        // Then add any new discretionary expenses that aren't yet in the strategy
        expenses.forEach(expense => {
          if (!orderedExpenses.some(e => e._id === expense._id)) {
            orderedExpenses.push(expense);
          }
        });
        
        setDiscretionaryExpenses(orderedExpenses);
      } else {
        // If no spending strategy exists yet, just use all discretionary expenses
        setDiscretionaryExpenses(expenses);
      }
    }
  }, [scenario]);

  // Handle next button click
  const handleNextClick = () => {
    if (scenarioData) {
      // Update scenario with the current order of discretionary expenses
      const updatedScenario = {
        ...scenarioData,
        spendingStrategy: discretionaryExpenses
      };
      
      setScenarioData(updatedScenario);
      onUpdate(updatedScenario);
      handleNext();
    }
  };

  // Handle previous button click
  const handlePreviousClick = () => {
    if (scenarioData) {
      // Save the current order before going back
      const updatedScenario = {
        ...scenarioData,
        spendingStrategy: discretionaryExpenses
      };
      
      setScenarioData(updatedScenario);
      onUpdate(updatedScenario);
      handlePrevious();
    }
  };

  // Move an expense up in priority
  const moveUp = (index: number) => {
    if (index === 0 || !canEdit) return;
    
    const updatedExpenses = [...discretionaryExpenses];
    const temp = updatedExpenses[index];
    updatedExpenses[index] = updatedExpenses[index - 1];
    updatedExpenses[index - 1] = temp;
    
    setDiscretionaryExpenses(updatedExpenses);
  };

  // Move an expense down in priority
  const moveDown = (index: number) => {
    if (index === discretionaryExpenses.length - 1 || !canEdit) return;
    
    const updatedExpenses = [...discretionaryExpenses];
    const temp = updatedExpenses[index];
    updatedExpenses[index] = updatedExpenses[index + 1];
    updatedExpenses[index + 1] = temp;
    
    setDiscretionaryExpenses(updatedExpenses);
  };

  if (!scenarioData) return null;

  return (
    <div className="space-y-6 p-4 border rounded-md">
      <h2 className="text-2xl font-bold text-purple-400">Spending Strategy</h2>
      <p className="text-zinc-400">
        Prioritize your discretionary expenses by arranging them in order of importance.
        The topmost expenses will be prioritized in your financial plan.
      </p>

      <div className="space-y-4 mt-6">
        {discretionaryExpenses.length === 0 ? (
          <div className="p-6 border border-zinc-800 rounded-md text-center">
            <p className="text-zinc-400">
              No discretionary expenses found. Add discretionary expenses in the Event Series step.
            </p>
          </div>
        ) : (
          discretionaryExpenses.map((expense, index) => (
            <Card key={expense._id || expense.id || index} className="bg-zinc-950 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg text-purple-400">
                    {expense.name}
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    {expense.description}
                  </CardDescription>
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="h-8 w-8 bg-zinc-900"
                    >
                      <ArrowUp className="h-4 w-4 text-white" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => moveDown(index)}
                      disabled={index === discretionaryExpenses.length - 1}
                      className="h-8 w-8 bg-zinc-900"
                    >
                      <ArrowDown className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <DollarSign className="h-4 w-4" />
                    <span>
                      ${(expense.eventType as ExpenseEvent).amount.toLocaleString()} per year
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="flex justify-between mt-8">
        <Button 
          variant="outline"
          onClick={handlePreviousClick}
          className="bg-zinc-900 hover:bg-zinc-800"
        >
          Previous
        </Button>
        <Button 
          onClick={handleNextClick}
          className="bg-purple-600 hover:bg-purple-700"
        >
          Next
        </Button>
      </div>
    </div>
  );
} 