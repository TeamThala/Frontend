"use client";
import { useEffect, useState, ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {Scenario} from "@/types/scenario";
import {FixedValues,
  NormalDistributionValues,
  UniformDistributionValues} from "@/types/utils"
import { Checkbox } from "@/components/ui/checkbox";
import { CheckedState } from "@radix-ui/react-checkbox";
import { Select, SelectValue, SelectItem, SelectTrigger, SelectContent } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
// Helper type for distribution types used in UI controls
type DistributionType = "fixed" | "normal" | "uniform";

interface InvestmentProps {
  scenario: Scenario | null;
  canEdit: boolean;
  onUpdate: (updatedScenario: Scenario) => void;
  handlePrevious: () => void;
  handleNext: () => void;
}

export default function Investments({ scenario, canEdit, onUpdate, handlePrevious, handleNext }: InvestmentProps) {
  const [scenarioData, setScenarioData] = useState<Scenario | null>(scenario);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [indexToDelete, setIndexToDelete] = useState<number | null>(null);
  
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

  // Create a new investment with default values
  const addNewInvestment = () => {
    setScenarioData(prev => {
      if (!prev) return null;

      const defaultInvestment = {
        id: uuidv4(), // Generate a unique ID
        investmentType: {
          id: uuidv4(), // Generate a unique ID for investment type
          name: "New Investment",
          description: "",
          expectedAnnualReturn: {
            type: "fixed" as const,
            value: 5,
            valueType: "percentage" as const
          },
          expectedAnnualIncome: {
            type: "fixed" as const,
            value: 0,
            valueType: "amount" as const
          },
          taxability: false,
          expenseRatio: 0
        },
        purchasePrice: 0,
        value: 0,
        taxStatus: "non-retirement" as const
      };

      return {
        ...prev,
        investments: [...prev.investments, defaultInvestment]
      };
    });
  };

// Handles updates for generic input fields (text/number)
const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, index: number) => {
    const { name, value, type } = e.target;
    const isNumberInput = type === 'number';
  
    // Skip changes to the name field for the first investment
    if (index === 0 && name === 'name') return;
  
    setScenarioData(prev => {
      if (!prev) return null;
  
      const investments = [...prev.investments];
      const investment = {...investments[index]};
      
      // For number inputs, parse the value properly
      if (isNumberInput) {
        const numValue = value === '' ? 0 : parseFloat(value);
        const processedValue = isNaN(numValue) ? 0 : numValue;
        
        // Handle specific numeric fields
        if (name === 'purchasePrice') {
          investment.purchasePrice = processedValue;
        } else if (name === 'value') {
          investment.value = processedValue;
        } else if (name === 'expenseRatio') {
          investment.investmentType = {
            ...investment.investmentType,
            expenseRatio: processedValue
          };
        }
      } else {
        // Handle text fields
        if (name === 'name') {
          investment.investmentType = {
            ...investment.investmentType,
            name: value
          };
        } else if (name === 'description') {
          investment.investmentType = {
            ...investment.investmentType,
            description: value
          };
        }
      }
      
      investments[index] = investment;
  
      return {
        ...prev,
        investments
      };
    });
  };
  
  // Handles updates for distribution value inside a nested investment (by index)
  const handleDistributionValueChange = (
    field: "expectedAnnualReturn" | "expectedAnnualIncome",
    subField: keyof (FixedValues & NormalDistributionValues & UniformDistributionValues),
    value: string,
    index: number
  ) => {
    setScenarioData((prev) => {
      if (!prev) return null;
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return prev;
  
      const investments = [...prev.investments];
      const investment = investments[index];
      if (!investment) return prev;
  
      const distribution = investment.investmentType[field];
      if (!distribution) return prev;
  
      const updatedDistribution = {
        ...distribution,
        [subField]: numValue,
      };
  
      // Add proper type checking for uniform distributions
      
      if (distribution.type === "uniform" && 
          "min" in distribution && 
          "max" in distribution) {
        // Now TypeScript understands this is a UniformDistributionValues
        const min = subField === "min" ? numValue : (distribution as UniformDistributionValues).min;
        const max = subField === "max" ? numValue : (distribution as UniformDistributionValues).max;
        
        if (subField === "min" && numValue > max) return prev;
        if (subField === "max" && numValue < min) return prev;
      }
  
      investments[index] = {
        ...investment,
        investmentType: {
          ...investment.investmentType,
          [field]: updatedDistribution,
        },
      };
  
      return {
        ...prev,
        investments,
      };
    });
  };
  
  // Handles distribution type change (fixed, normal, uniform) in nested investment
  const handleDistributionTypeChange = (
    field: "expectedAnnualReturn" | "expectedAnnualIncome",
    newType: DistributionType,
    index: number
  ) => {
    setScenarioData((prev) => {
      if (!prev) return null;
  
      const investments = [...prev.investments];
      const investment = investments[index];
      if (!investment) return prev;
  
      const currentDistribution = investment.investmentType[field];
      const valueType: "amount" | "percentage" = field === "expectedAnnualReturn"
        ? currentDistribution?.valueType || "percentage"
        : "amount";
  
      let newDistribution: FixedValues | NormalDistributionValues | UniformDistributionValues;
  
      switch (newType) {
        case "fixed":
          newDistribution = { type: "fixed", value: 5, valueType };
          break;
        case "normal":
          newDistribution = { type: "normal", mean: 6, stdDev: 1, valueType };
          break;
        case "uniform":
          newDistribution = { type: "uniform", min: 3, max: 8, valueType };
          break;
      }
  
      investments[index] = {
        ...investment,
        investmentType: {
          ...investment.investmentType,
          [field]: newDistribution,
        },
      };
  
      return {
        ...prev,
        investments,
      };
    });
  };
  
  // Handles updates for valueType ("amount" | "percentage") for expectedAnnualReturn only
  const handleDistributionValueTypeChange = (
    field: "expectedAnnualReturn",
    newUnit: "$" | "%",
    index: number
  ) => {
    setScenarioData((prev) => {
      if (!prev) return null;
  
      const investments = [...prev.investments];
      const investment = investments[index];
      if (!investment) return prev;
  
      const currentDistribution = investment.investmentType[field];
      if (!currentDistribution) return prev;
  
      const valueType: "amount" | "percentage" = newUnit === "$" ? "amount" : "percentage";
  
      investments[index] = {
        ...investment,
        investmentType: {
          ...investment.investmentType,
          [field]: {
            ...currentDistribution,
            valueType,
          },
        },
      };
  
      return {
        ...prev,
        investments,
      };
    });
  };
  
  // Render UI for a specific investment distribution field
  const renderDistributionInputs = (
    field: "expectedAnnualReturn" | "expectedAnnualIncome",
    index: number
  ) => {
    const distribution = scenarioData?.investments?.[index]?.investmentType?.[field];
    if (!distribution) return null;
  
    const unitType = distribution.valueType === "percentage" ? "%" : "$";
    const showUnitToggle = field === "expectedAnnualReturn";
  
    return (
      <div className="space-y-4 pl-6 border-l-2 border-gray-200 ml-2 mt-2">
        {showUnitToggle && (
          <div className="flex items-center space-x-4">
            <Label>Return Type:</Label>
            <RadioGroup
              value={unitType}
              onValueChange={(newUnit) =>
                handleDistributionValueTypeChange(field, newUnit as "$" | "%", index)
              }
              disabled={!canEdit}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="%" id={`${field}-percent`} className="border-2 border-gray-300 data-[state=checked]:border-purple-600 data-[state=checked]:bg-purple-600 data-[state=checked]:ring-white data-[state=checked]:ring-2" />
                <Label htmlFor={`${field}-percent`}>%</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="$" id={`${field}-dollar`} className="border-2 border-gray-300 data-[state=checked]:border-purple-600 data-[state=checked]:bg-purple-600 data-[state=checked]:ring-white data-[state=checked]:ring-2" />
                <Label htmlFor={`${field}-dollar`}>$</Label>
              </div>
            </RadioGroup>
          </div>
        )}
  
        <RadioGroup
          value={distribution.type}
          onValueChange={(newType) =>
            handleDistributionTypeChange(field, newType as DistributionType, index)
          }
          disabled={!canEdit}
          className="flex space-x-4"
        >
          {["fixed", "normal", "uniform"].map((type) => (
            <div className="flex items-center space-x-2" key={type}>
              <RadioGroupItem value={type} id={`${field}-${type}`} className="border-2 border-gray-300 data-[state=checked]:border-purple-600 data-[state=checked]:bg-purple-600 data-[state=checked]:ring-white data-[state=checked]:ring-2" />
              <Label htmlFor={`${field}-${type}`}>{type.charAt(0).toUpperCase() + type.slice(1)}</Label>
            </div>
          ))}
        </RadioGroup>
  
        {distribution.type === "fixed" && (
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor={`${field}-value`}>Value ({unitType})</Label>
            <Input
              type="number"
              id={`${field}-value`}
              value={(distribution as FixedValues).value}
              onChange={(e) =>
                handleDistributionValueChange(field, "value", e.target.value, index)
              }
              disabled={!canEdit}
              step={unitType === "%" ? 0.1 : 100}
            />
          </div>
        )}
  
        {distribution.type === "normal" && (
          <div className="flex space-x-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor={`${field}-mean`}>Mean ({unitType})</Label>
              <Input
                type="number"
                id={`${field}-mean`}
                value={(distribution as NormalDistributionValues).mean}
                onChange={(e) =>
                  handleDistributionValueChange(field, "mean", e.target.value, index)
                }
                disabled={!canEdit}
                step={unitType === "%" ? 0.1 : 100}
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor={`${field}-stdDev`}>Std Dev ({unitType})</Label>
              <Input
                type="number"
                id={`${field}-stdDev`}
                value={(distribution as NormalDistributionValues).stdDev}
                onChange={(e) =>
                  handleDistributionValueChange(field, "stdDev", e.target.value, index)
                }
                disabled={!canEdit}
                min="0"
                step={unitType === "%" ? 0.1 : 100}
              />
            </div>
          </div>
        )}
  
        {distribution.type === "uniform" && 
          "min" in distribution && 
          "max" in distribution && (
          <div className="flex space-x-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor={`${field}-min`}>Min ({unitType})</Label>
              <Input
                type="number"
                id={`${field}-min`}
                value={(distribution as UniformDistributionValues).min}
                onChange={(e) =>
                  handleDistributionValueChange(field, "min", e.target.value, index)
                }
                disabled={!canEdit}
                step={unitType === "%" ? 0.1 : 100}
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor={`${field}-max`}>Max ({unitType})</Label>
              <Input
                type="number"
                id={`${field}-max`}
                value={(distribution as UniformDistributionValues).max}
                onChange={(e) =>
                  handleDistributionValueChange(field, "max", e.target.value, index)
                }
                disabled={!canEdit}
                step={unitType === "%" ? 0.1 : 100}
              />
            </div>
          </div>
        )}
      </div>
    );
  };
  

  if (!scenarioData) return null;

    function handleCheckboxChange(checked: CheckedState, index: number): void {
        setScenarioData((prev) => {
            if (!prev) return null;
            const investments = [...prev.investments];
            investments[index].investmentType.taxability = checked === true;
            return { ...prev, investments };
        });
    }

    function handleSelectChange(value: string, index: number): void {
        setScenarioData((prev) => {
            if (!prev) return null;
            const investments = [...prev.investments];
            investments[index].taxStatus = value as "non-retirement" | "pre-tax" | "after-tax";
            return { ...prev, investments };
        });
    }

  // Handle confirmation for investment deletion
  const confirmDelete = (index: number) => {
    setIndexToDelete(index);
    setDeleteDialogOpen(true);
  };

  // Handle actual deletion of an investment
  const deleteInvestment = () => {
    if (indexToDelete === null || indexToDelete === 0 || !scenarioData) return;
    
    const updatedInvestments = [...scenarioData.investments];
    updatedInvestments.splice(indexToDelete, 1);
    
    const updatedScenario = {
      ...scenarioData,
      investments: updatedInvestments
    };
    
    setScenarioData(updatedScenario);
    // Optionally, you can also call onUpdate to persist changes
    onUpdate(updatedScenario);
    setDeleteDialogOpen(false);
    setIndexToDelete(null);
  };

  // Main JSX structure remains the same
  return (
    <div className="space-y-6 p-4 border rounded-md">
        {scenarioData?.investments?.map((investment, index) => (
        <div key={index} className="p-4 border rounded-md mb-6 relative">
            {canEdit && index > 0 && (
              <Button
                type="button"
                onClick={() => confirmDelete(index)}
                className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white p-2 h-8 w-8"
                variant="destructive"
                size="icon"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            
            {/* Name */}
            <div className="grid w-full max-w-md items-center gap-1.5">
                <Label htmlFor={`name-${index}`}>
                  Name {index === 0 && <span className="text-xs text-zinc-400 ml-1">(locked)</span>}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text" id={`name-${index}`} name="name" placeholder="Investment Name"
                  value={investment.investmentType.name} 
                  onChange={(e) => handleInputChange(e, index)} 
                  disabled={!canEdit || index === 0}
                  className={index === 0 ? "bg-zinc-800 text-zinc-400 cursor-not-allowed" : ""}
                  required
                />
            </div>

            {/*Description*/}
            <div className="grid w-full gap-1.5 mt-4">
                <Label htmlFor={`description-${index}`}>Description</Label>
                <Textarea
                    placeholder="Describe the investment..." id={`description-${index}`} name="description"
                    value={investment.investmentType.description} onChange={(e) => handleInputChange(e, index)} disabled={!canEdit} className="min-h-[100px]"
                />
            </div>

            {/* Expected Annual Return */}
            <div className="space-y-2 ">
                <Label className="font-semibold mt-4">Expected Annual Return</Label>
                {renderDistributionInputs("expectedAnnualReturn", index)}
            </div>

            {/* Expected Annual Income */}
            <div className="space-y-2">
                <Label className="font-semibold mt-4">Expected Annual Income</Label>
                {renderDistributionInputs("expectedAnnualIncome", index)}
            </div>

            {/* Taxability */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 mt-4">
                    <Checkbox
                        id={`${index}-taxable`}
                        checked={investment.investmentType.taxability}
                        onCheckedChange={(checked) => handleCheckboxChange(checked, index)}
                        className="border-purple-400 data-[state=checked]:bg-purple-600"
                    />
                    <Label htmlFor={`${index}-taxable`} className="font-semibold">Taxable</Label>
                </div>
            </div>

            {/* Tax Status */}
            <div className="space-y-2">
                <Label className="font-semibold mt-4">Tax Status</Label>
                <Select 
                    value={investment.taxStatus}
                    onValueChange={(value) => handleSelectChange(value, index)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select Tax Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="non-retirement">non-retirement</SelectItem>
                        <SelectItem value="pre-tax">pre-tax</SelectItem>
                        <SelectItem value="after-tax">after-tax</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Purchase Price */}
            <div className="space-y-2">
                <Label className="font-semibold mt-4">Purchase Price</Label>
                <Input
                    type="number" id={`purchasePrice-${index}`} name="purchasePrice" placeholder="Purchase Price"
                    value={investment.purchasePrice} onChange={(e) => handleInputChange(e, index)} disabled={!canEdit}
                />
            </div>

            {/* Expense Ratio */}
            {scenarioData.type === "couple" && (
            <div className="space-y-2">
                <Label className="font-semibold mt-4">Expense Ratio</Label>
                <Input
                    type="number" id={`expenseRatio-${index}`} name="expenseRatio" placeholder="Expense Ratio"
                    value={investment.investmentType.expenseRatio} onChange={(e) => handleInputChange(e, index)} disabled={!canEdit} step={0.1}
                />
            </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
                <Label className="font-semibold mt-4">Amount</Label>
                <Input
                    type="number" id={`value-${index}`} name="value" placeholder="Amount"
                    value={investment.value} onChange={(e) => handleInputChange(e, index)} disabled={!canEdit}
                />
            </div>
        </div>
        

        ))}

        {/* Alert Dialog for Delete Confirmation */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="bg-zinc-900 text-white border-purple-600">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Delete Investment</DialogTitle>
              <DialogDescription className="text-zinc-300 mt-2">
                This will permanently delete this investment and remove it from your scenario.
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="bg-zinc-700 hover:bg-zinc-600 text-white hover:text-white">
                Cancel
              </Button>
              <Button variant="destructive" onClick={deleteInvestment} className="bg-red-600 hover:bg-red-700">
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {canEdit && (
          <Button 
            type="button" 
            onClick={addNewInvestment} 
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <PlusCircle className="h-5 w-5" /> Add Investment
          </Button>
        )}

      {!canEdit && (
        <p className="text-sm text-yellow-400 bg-zinc-800 p-2 rounded">
          Viewing in read-only mode. Editing is disabled.
        </p>
      )}

        <div className="flex justify-end pt-4 border-t mt-6 space-x-4">
          <button
            type="button"
            onClick={handlePreviousClick}
            className="bg-zinc-700 text-white px-4 py-2 rounded hover:bg-zinc-600 transition"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={handleNextClick}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
          >
            Next
          </button>
        </div>
    </div>
  );
}