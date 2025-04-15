"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Scenario } from "@/types/scenario";
import { Investment } from "@/types/investment";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowUp, ArrowDown, DollarSign } from "lucide-react";

interface ExpenseWithdrawalStrategyProps {
  scenario: Scenario | null;
  canEdit: boolean;
  onUpdate: (updatedScenario: Scenario) => void;
  handlePrevious: () => void;
  handleNext: () => void;
}

export default function ExpenseWithdrawalStrategy({
  scenario,
  canEdit,
  onUpdate,
  handlePrevious,
  handleNext,
}: ExpenseWithdrawalStrategyProps) {
  const [scenarioData, setScenarioData] = useState<Scenario | null>(scenario);
  const [withdrawalInvestments, setWithdrawalInvestments] = useState<Investment[]>([]);

  // Update scenario data when scenario prop changes
  useEffect(() => {
    setScenarioData(scenario);
    
    if (scenario) {
      // Use all investments
      const investments = scenario.investments;
      
      // Set initial order based on existing expenseWithdrawalStrategy or default to all investments
      if (scenario.expenseWithdrawalStrategy && scenario.expenseWithdrawalStrategy.length > 0) {
        // Use the existing withdrawal strategy order if available
        const orderedInvestments: Investment[] = [];
        
        // First add items that are in the expenseWithdrawalStrategy (in their saved order)
        scenario.expenseWithdrawalStrategy.forEach(strategyInvestment => {
          const matchingInvestment = investments.find(i => i._id === strategyInvestment._id);
          if (matchingInvestment) {
            orderedInvestments.push(matchingInvestment);
          }
        });
        
        // Then add any new investments that aren't yet in the strategy
        investments.forEach(investment => {
          if (!orderedInvestments.some(i => i._id === investment._id)) {
            orderedInvestments.push(investment);
          }
        });
        
        setWithdrawalInvestments(orderedInvestments);
      } else {
        // If no withdrawal strategy exists yet, just use all investments
        setWithdrawalInvestments(investments);
      }
    }
  }, [scenario]);

  // Handle next button click
  const handleNextClick = () => {
    if (scenarioData) {
      // Update scenario with the current order of investments
      const updatedScenario = {
        ...scenarioData,
        expenseWithdrawalStrategy: withdrawalInvestments
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
        expenseWithdrawalStrategy: withdrawalInvestments
      };
      
      setScenarioData(updatedScenario);
      onUpdate(updatedScenario);
      handlePrevious();
    }
  };

  // Move an investment up in priority
  const moveUp = (index: number) => {
    if (index === 0 || !canEdit) return;
    
    const updatedInvestments = [...withdrawalInvestments];
    const temp = updatedInvestments[index];
    updatedInvestments[index] = updatedInvestments[index - 1];
    updatedInvestments[index - 1] = temp;
    
    setWithdrawalInvestments(updatedInvestments);
  };

  // Move an investment down in priority
  const moveDown = (index: number) => {
    if (index === withdrawalInvestments.length - 1 || !canEdit) return;
    
    const updatedInvestments = [...withdrawalInvestments];
    const temp = updatedInvestments[index];
    updatedInvestments[index] = updatedInvestments[index + 1];
    updatedInvestments[index + 1] = temp;
    
    setWithdrawalInvestments(updatedInvestments);
  };

  if (!scenarioData) return null;

  return (
    <div className="space-y-6 p-4 border rounded-md">
      <h2 className="text-2xl font-bold text-purple-400">Expense Withdrawal Strategy</h2>
      <p className="text-zinc-400">
        Prioritize your investments for expense withdrawals by arranging them in order of importance.
        Assets will be liquidated in this order when expenses need to be paid.
      </p>

      <div className="space-y-4 mt-6">
        {withdrawalInvestments.length === 0 ? (
          <div className="p-6 border border-zinc-800 rounded-md text-center">
            <p className="text-zinc-400">
              No investments found. Add investments in the Investments step.
            </p>
          </div>
        ) : (
          withdrawalInvestments.map((investment, index) => (
            <Card key={investment._id || investment.id} className="bg-zinc-950 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg text-purple-400">
                    {investment.investmentType.name}
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    {investment.investmentType.description}
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
                      disabled={index === withdrawalInvestments.length - 1}
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
                      Current Value: ${investment.value.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400 col-span-2">
                    <span>
                      Tax Status: {investment.taxStatus}
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