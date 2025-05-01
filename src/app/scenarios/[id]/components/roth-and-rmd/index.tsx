"use client";
import { useEffect, useState, ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Scenario } from "@/types/scenario";
import { FixedValues, NormalDistributionValues, UniformDistributionValues } from "@/types/utils";
import { Investment } from "@/types/investment";

// Helper type for distribution types used in UI controls
type DistributionType = "fixed" | "normal" | "uniform";

interface RothAndRMDProps {
  scenario: Scenario | null;
  canEdit: boolean;
  onUpdate: (updatedScenario: Scenario) => void;
  handlePrevious: () => void;
  handleNext: () => void;
}

export default function RothAndRMD({ scenario, canEdit, onUpdate, handlePrevious, handleNext }: RothAndRMDProps) {
  const [scenarioData, setScenarioData] = useState<Scenario | null>(scenario);
  const [rothEnabled, setRothEnabled] = useState<boolean>(false);
  const [startYear, setStartYear] = useState<number>(new Date().getFullYear());
  const [endYear, setEndYear] = useState<number>(new Date().getFullYear() + 5);
  const [rmdInvestmentOrder, setRmdInvestmentOrder] = useState<string[]>([]);
  const [rothInvestmentOrder, setRothInvestmentOrder] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [indexToDelete, setIndexToDelete] = useState<number | null>(null);
  const [section, setSection] = useState<'roth' | 'rmd'>('roth');
  
  // Update scenario data when scenario prop changes
  useEffect(() => {
    if (!scenario) return;
    
    setScenarioData(scenario);
    /* RMD */
    setRmdInvestmentOrder(
      scenario.RMDStrategy.map((inv: any) =>
        typeof inv === "string" ? inv : (inv.id ?? inv._id.toString())
      )
    );
    /* Roth */
    setRothInvestmentOrder(
      scenario.RothConversionStrategy.map((inv: any) =>
        typeof inv === "string" ? inv : (inv.id ?? inv._id.toString())
      )
    );

    
    // Initialize Roth conversion settings
    if (scenario.rothConversion) {
      setRothEnabled(true);
      setStartYear(scenario.rothConversion.RothConversionStartYear || new Date().getFullYear());
      setEndYear(scenario.rothConversion.RothConversionEndYear || new Date().getFullYear() + 5);
    } else {
      setRothEnabled(false);
      setStartYear(new Date().getFullYear());
      setEndYear(new Date().getFullYear() + 5);
    }
    
    // Initialize RMD strategy
    if (scenario.RMDStrategy && scenario.RMDStrategy.length > 0) {
      setRmdInvestmentOrder(scenario.RMDStrategy.map(investment => investment.id));
    } else {
      setRmdInvestmentOrder([]);
    }
    
    // Initialize Roth Conversion strategy
    if (scenario.RothConversionStrategy && scenario.RothConversionStrategy.length > 0) {
      setRothInvestmentOrder(scenario.RothConversionStrategy.map(investment => investment.id));
    } else {
      setRothInvestmentOrder([]);
    }
  }, [scenario]);

  // Handle next button click
  const handleNextClick = () => {
    if (scenarioData) {
      const updatedScenario = updateScenarioWithCurrentData();
      if (updatedScenario) {
        onUpdate(updatedScenario);
      }
      handleNext();
    }
  };

  // Handle previous button click
  const handlePreviousClick = () => {
    if (scenarioData) {
      const updatedScenario = updateScenarioWithCurrentData();
      if (updatedScenario) {
        onUpdate(updatedScenario);
      }
      handlePrevious();
    }
  };

  // Update scenario object with current component state
  const updateScenarioWithCurrentData = () => {
    if (!scenarioData) return scenarioData;

    // Map investment IDs back to investment objects
    const rmdStrategy = rmdInvestmentOrder
      .map(id => scenarioData.investments.find(inv => inv.id === id))
      .filter((inv): inv is Investment => inv !== undefined);

    const rothStrategy = rothInvestmentOrder
      .map(id => scenarioData.investments.find(inv => inv.id === id))
      .filter((inv): inv is Investment => inv !== undefined);

    return {
      ...scenarioData,
      RMDStrategy: rmdStrategy,
      RothConversionStrategy: rothStrategy,
      rothConversion: rothEnabled ? {
        rothConversion: true as const,
        RothConversionStartYear: startYear,
        RothConversionEndYear: endYear
      } : null
    };
  };

  // Toggle Roth conversion enabled/disabled
  const handleRothEnabledChange = (enabled: boolean) => {
    setRothEnabled(enabled);
    if (!enabled) {
      // Clear Roth conversion data when disabling
      if (scenarioData) {
        const updatedScenario = {
          ...scenarioData,
          rothConversion: null,
          RothConversionStrategy: []
        };
        setScenarioData(updatedScenario);
      }
    }
  };

  // Handler for moving investments in priority order
  const moveInvestment = (investmentId: string, direction: 'up' | 'down', type: 'rmd' | 'roth') => {
    const orderArray = type === 'rmd' ? [...rmdInvestmentOrder] : [...rothInvestmentOrder];
    const currentIndex = orderArray.indexOf(investmentId);
    
    if (currentIndex === -1) return;
    
    if (direction === 'up' && currentIndex > 0) {
      // Move up (higher priority)
      [orderArray[currentIndex - 1], orderArray[currentIndex]] = 
      [orderArray[currentIndex], orderArray[currentIndex - 1]];
    } else if (direction === 'down' && currentIndex < orderArray.length - 1) {
      // Move down (lower priority)
      [orderArray[currentIndex], orderArray[currentIndex + 1]] = 
      [orderArray[currentIndex + 1], orderArray[currentIndex]];
    }
    
    if (type === 'rmd') {
      setRmdInvestmentOrder(orderArray);
    } else {
      setRothInvestmentOrder(orderArray);
    }
  };

  // Add investment to strategy
  const addInvestmentToStrategy = (investmentId: string, type: 'rmd' | 'roth') => {
    if (type === 'rmd') {
      if (!rmdInvestmentOrder.includes(investmentId)) {
        setRmdInvestmentOrder([...rmdInvestmentOrder, investmentId]);
      }
    } else {
      if (!rothInvestmentOrder.includes(investmentId)) {
        setRothInvestmentOrder([...rothInvestmentOrder, investmentId]);
      }
    }
  };

  // Remove investment from strategy
  const removeInvestmentFromStrategy = (investmentId: string, type: 'rmd' | 'roth') => {
    if (type === 'rmd') {
      setRmdInvestmentOrder(rmdInvestmentOrder.filter(id => id !== investmentId));
    } else {
      setRothInvestmentOrder(rothInvestmentOrder.filter(id => id !== investmentId));
    }
  };

  // Get eligible investments for RMD (pre-tax retirement accounts)
  const getEligibleRmdInvestments = () => {
    if (!scenarioData) return [];
    return scenarioData.investments.filter(inv => 
      inv.taxStatus === "pre-tax" && !rmdInvestmentOrder.includes(inv.id)
    );
  };

  // Get eligible investments for Roth conversion (pre-tax retirement accounts not already in strategy)
  const getEligibleRothInvestments = () => {
    if (!scenarioData) return [];
    return scenarioData.investments.filter(inv => 
      inv.taxStatus === "pre-tax" && !rothInvestmentOrder.includes(inv.id)
    );
  };

  if (!scenarioData) {
    return <div>Loading scenario data...</div>;
  }

  // Get current year based on owner's birth year
  const currentYear = new Date().getFullYear();
  const ownerAge = currentYear - scenarioData.ownerBirthYear;
  const rmdStartYear = scenarioData.ownerBirthYear + 73; // RMD starts at age 73

  return (
    <div className="space-y-6 p-4 border rounded-md">
      {/* Tab selection */}
      <div className="flex border-b border-gray-600 mb-6">
        <button
          className={`px-4 py-2 font-medium ${section === 'roth' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-400'}`}
          onClick={() => setSection('roth')}
        >
          Roth Conversion
        </button>
        <button
          className={`px-4 py-2 font-medium ${section === 'rmd' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-400'}`}
          onClick={() => setSection('rmd')}
        >
          Required Minimum Distributions
        </button>
      </div>

      {section === 'roth' && (
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enable-roth"
              checked={rothEnabled}
              onCheckedChange={(checked) => handleRothEnabledChange(checked === true)}
              disabled={!canEdit}
              className="border-purple-400 data-[state=checked]:bg-purple-600"
            />
            <Label htmlFor="enable-roth" className="font-semibold">
              Enable Roth Conversion Strategy
            </Label>
          </div>

          {rothEnabled && (
            <div className="mt-4 pl-6 border-l-2 border-purple-200 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-year">Start Year</Label>
                  <Input
                    id="start-year"
                    type="number"
                    min={currentYear}
                    max={endYear}
                    value={startYear}
                    onChange={(e) => setStartYear(parseInt(e.target.value))}
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="end-year">End Year</Label>
                  <Input
                    id="end-year"
                    type="number"
                    min={startYear}
                    value={endYear}
                    onChange={(e) => setEndYear(parseInt(e.target.value))}
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Conversion Priority</h3>
                  <p className="text-sm text-zinc-400">
                    Arrange investments in order of conversion priority
                  </p>
                </div>

                {/* Selected investments for Roth conversion with priority */}
                <div className="space-y-2 border rounded-md p-4 bg-zinc-800">
                  {rothInvestmentOrder.length === 0 ? (
                    <p className="text-zinc-400 italic">No investments selected for Roth conversion</p>
                  ) : (
                    rothInvestmentOrder.map((investmentId, index) => {
                      const investment = scenarioData.investments.find(inv => inv.id === investmentId);
                      if (!investment) return null;
                      
                      return (
                        <div key={`roth-${investmentId}-${index}`} className="flex items-center justify-between py-2 border-b border-zinc-700">
                          <div className="flex items-center">
                            <span className="w-6 h-6 rounded-full bg-purple-700 flex items-center justify-center text-xs mr-3">
                              {index + 1}
                            </span>
                            <span>
                              {`${investment.investmentType.name} (${investment.taxStatus})`}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => moveInvestment(investmentId, 'up', 'roth')}
                              disabled={!canEdit || index === 0}
                              className="h-8 w-8 bg-zinc-700"
                            >
                              ↑
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => moveInvestment(investmentId, 'down', 'roth')}
                              disabled={!canEdit || index === rothInvestmentOrder.length - 1}
                              className="h-8 w-8 bg-zinc-700"
                            >
                              ↓
                            </Button>
                            <Button
                              size="icon"
                              variant="destructive"
                              onClick={() => removeInvestmentFromStrategy(investmentId, 'roth')}
                              disabled={!canEdit}
                              className="h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add investment dropdown */}
                {canEdit && (
                  <div className="mt-4">
                    <Label htmlFor="add-roth-investment">Add Investment</Label>
                    <Select 
                      onValueChange={(value) => addInvestmentToStrategy(value, 'roth')}
                      disabled={getEligibleRothInvestments().length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an investment" />
                      </SelectTrigger>
                      <SelectContent>
                        {getEligibleRothInvestments().map((investment, index) => (
                          <SelectItem key={`roth-option-${investment.id}-${index}`} value={investment.id}>
                            {`${investment.investmentType.name} (${investment.taxStatus})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {section === 'rmd' && (
        <div className="space-y-6">
          <div className="mb-4">
            <h3 className="font-semibold text-lg">Required Minimum Distributions (RMDs)</h3>
            <p className="text-zinc-400 mt-1">
              RMDs will start in {rmdStartYear} (when you turn 73). Define the order in which investments should be withdrawn.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">RMD Withdrawal Priority</h3>
              <p className="text-sm text-zinc-400">
                Arrange investments in order of withdrawal priority
              </p>
            </div>

            {/* Selected investments for RMD with priority */}
            <div className="space-y-2 border rounded-md p-4 bg-zinc-800">
              {rmdInvestmentOrder.length === 0 ? (
                <p className="text-zinc-400 italic">No investments selected for RMD withdrawal</p>
              ) : (
                rmdInvestmentOrder.map((investmentId, index) => {
                  const investment = scenarioData.investments.find(
                    inv => inv.id === investmentId || inv._id?.toString() === investmentId
                  );
                  
                  if (!investment) return null;
                  
                  return (
                    <div key={`rmd-${investmentId}-${index}`} className="flex items-center justify-between py-2 border-b border-zinc-700">
                      <div className="flex items-center">
                        <span className="w-6 h-6 rounded-full bg-purple-700 flex items-center justify-center text-xs mr-3">
                          {index + 1}
                        </span>
                        <span>
                          {`${investment.investmentType.name} (${investment.taxStatus})`}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => moveInvestment(investmentId, 'up', 'rmd')}
                          disabled={!canEdit || index === 0}
                          className="h-8 w-8 bg-zinc-700"
                        >
                          ↑
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => moveInvestment(investmentId, 'down', 'rmd')}
                          disabled={!canEdit || index === rmdInvestmentOrder.length - 1}
                          className="h-8 w-8 bg-zinc-700"
                        >
                          ↓
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => removeInvestmentFromStrategy(investmentId, 'rmd')}
                          disabled={!canEdit}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add investment dropdown */}
            {canEdit && (
              <div className="mt-4">
                <Label htmlFor="add-rmd-investment">Add Investment</Label>
                <Select 
                  onValueChange={(value) => addInvestmentToStrategy(value, 'rmd')}
                  disabled={getEligibleRmdInvestments().length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an investment" />
                  </SelectTrigger>
                  <SelectContent>
                    {getEligibleRmdInvestments().map((investment, index) => (
                      <SelectItem key={`rmd-option-${investment.id}-${index}`} value={investment.id}>
                        {`${investment.investmentType.name} (${investment.taxStatus})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
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