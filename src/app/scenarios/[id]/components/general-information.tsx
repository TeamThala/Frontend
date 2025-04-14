"use client";
import { useEffect, useState, ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Scenario,
    CoupleScenario,
    SingleScenario,
    LifeExpectancy // Assuming LifeExpectancy = FixedValues | NormalDistributionValues based on original types
} from "@/types/scenario"; // Adjust path as needed
import {FixedValues,
  NormalDistributionValues,
  UniformDistributionValues} from "@/types/utils"

// Helper type for distribution types used in UI controls
type DistributionType = "fixed" | "normal" | "uniform";

interface GeneralInformationProps {
  scenario: Scenario | null;
  canEdit: boolean;
  onUpdate: (updatedScenario: Scenario) => void;
  handleNext: () => void;
}

export default function GeneralInformation({ scenario, canEdit, onUpdate, handleNext }: GeneralInformationProps) {
  const [scenarioData, setScenarioData] = useState<Scenario | null>(scenario);

  useEffect(() => {
    setScenarioData(scenario);
  }, [scenario]);

  const handleNextClick = () => {
    if (scenarioData) {
      onUpdate(scenarioData);
      handleNext();
    }
  };
    


  // --- Handlers ---

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isNumberInput = type === 'number';

    setScenarioData(prev => {
      if (!prev) return null;

      let processedValue: string | number = value;
      if (isNumberInput) {
        // Try parsing, default to 0 if empty string or invalid, keep original string if needed?
        // Let's default to 0 for simplicity here, adjust if empty should be treated differently
        processedValue = value === '' ? 0 : parseFloat(value);
         if (isNaN(processedValue)) {
            processedValue = 0; // Or handle error state
         }
      }

      console.log(name,":", processedValue);

      return {
        ...prev,
        [name]: processedValue,
      };
    });
  };

  // Handler for changing scenario type (Individual/Couple)
  const handleScenarioTypeChange = (value: "individual" | "couple") => {
    setScenarioData(prev => {
        if (!prev || prev.type === value) return prev; // No change needed if null or type is the same

        if (value === 'individual') {
            // Changing to individual: omit spouse data
            // Prefix unused vars with _ to satisfy ESLint
            const {...rest } = prev as CoupleScenario;
            return {
                ...rest,
                type: 'individual', // Explicitly set type
            } as SingleScenario;
        } else { // value === 'couple'
            // Changing to couple: add default spouse data
            return {
                ...prev, // Keep existing base data
                type: 'couple', // Explicitly set type
                spouseBirthYear: 1980, // Provide a sensible default
                spouseLifeExpectancy: { type: 'fixed', valueType: 'amount', value: 85 }, // Default value
            } as CoupleScenario;
        }
    });
  };

  // Generic handler for distribution type changes (Inflation, Owner LE, Spouse LE)
  const handleDistributionTypeChange = (
    field: "inflationRate" | "ownerLifeExpectancy" | "spouseLifeExpectancy",
    newType: DistributionType
  ) => {
    setScenarioData(prev => {
      if (!prev) return null;

      // Get the current distribution safely, considering spouse scenario type
      let currentDistribution: FixedValues | NormalDistributionValues | UniformDistributionValues | LifeExpectancy | undefined | null;
      if (field === 'spouseLifeExpectancy') {
        if (prev.type !== 'couple') return prev; // Cannot set spouse LE on individual
        currentDistribution = prev.spouseLifeExpectancy;
      } else {
        currentDistribution = prev[field];
      }

      // If the type isn't actually changing, do nothing
      if (currentDistribution && currentDistribution.type === newType) {
        return prev;
      }

      let newDistribution: FixedValues | NormalDistributionValues | UniformDistributionValues; // Use base types

      const valueType = (field === 'inflationRate') ? 'percentage' : 'amount';
      const defaultValue = (field === 'inflationRate') ? 2 : 85;
      const defaultMean = (field === 'inflationRate') ? 3 : 85;
      const defaultStdDev = (field === 'inflationRate') ? 1 : 5;
      const defaultMin = (field === 'inflationRate') ? 1 : 80;
      const defaultMax = (field === 'inflationRate') ? 5 : 90;


      switch (newType) {
        case 'fixed':
          newDistribution = { type: 'fixed', valueType: valueType, value: defaultValue };
          break;
        case 'normal':
          newDistribution = { type: 'normal', valueType: valueType, mean: defaultMean, stdDev: defaultStdDev };
          break;
        case 'uniform':
          // Prompt requires Uniform for LE, even if base LifeExpectancy type doesn't list it
          newDistribution = { type: 'uniform', valueType: valueType, min: defaultMin, max: defaultMax };
          break;
        // No default case needed due to strict DistributionType
      }

      // Update state
      if (field === 'spouseLifeExpectancy' && prev.type === 'couple') {
        return {
          ...prev,
          spouseLifeExpectancy: newDistribution as LifeExpectancy, // Assert LifeExpectancy (acknowledging uniform might not be strictly typed)
        } as CoupleScenario;
      } else if (field !== 'spouseLifeExpectancy') {
          return {
            ...prev,
            [field]: newDistribution, // TS should infer correctly here for InflationRate or OwnerLifeExpectancy
          };
      }

      return prev; // No change if field is spouse LE but type isn't couple
    });
  };

  // Generic handler for distribution value changes
  const handleDistributionValueChange = (
    field: "inflationRate" | "ownerLifeExpectancy" | "spouseLifeExpectancy",
    // Use keyof combined types. This allows TS to know all possible keys.
    subField: keyof (FixedValues & NormalDistributionValues & UniformDistributionValues),
    value: string // Input value is always string initially
  ) => {
    setScenarioData(prev => {
        if (!prev) return null;

        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
             // Optionally provide feedback or reset to a default
            console.warn(`Invalid number input for ${field}.${String(subField)}: ${value}`);
            // Decide if state should revert or stay with invalid input temporarily
            // For simplicity, let's prevent update on NaN
            return prev;
        }

        // Define the type explicitly for the variable holding the distribution
        let currentDistribution: FixedValues | NormalDistributionValues | UniformDistributionValues | LifeExpectancy | undefined | null; // Fix #2: Replace 'any'
        const isSpouseField = field === 'spouseLifeExpectancy';

        if (isSpouseField) {
            if (prev.type !== 'couple') return prev;
            currentDistribution = (prev as CoupleScenario).spouseLifeExpectancy;
        } else {
            currentDistribution = prev[field];
        }

        if (!currentDistribution) return prev; // Distribution doesn't exist

        // **Fix #1 (TS2345):** Use direct spread syntax. TypeScript *should* handle this,
        // inferring that subField is a valid key for the object being spread.
        const updatedDistribution = {
          ...currentDistribution,
          [subField]: numValue,
        };
        
        // Special validation for uniform min/max
        if (currentDistribution.type === "uniform") {
          const { min, max } = updatedDistribution as UniformDistributionValues;
        
          if (subField === "min" && numValue > max) {
            console.warn("Minimum cannot be greater than maximum.");
            return prev; // prevent update
          }
          if (subField === "max" && numValue < min) {
            console.warn("Maximum cannot be less than minimum.");
            return prev; // prevent update
          }
        }
        

        // If the above causes TS errors, fallback is:
        // const updatedDistribution = { ...currentDistribution };
        // (updatedDistribution as any)[subField] = numValue; // Less safe, but bypasses TS check

        // Update state with appropriate type assertions
        if (isSpouseField && prev.type === 'couple') {
            // Assert the updated object conforms to LifeExpectancy type for the spouse field
            return { ...prev, spouseLifeExpectancy: updatedDistribution as LifeExpectancy };
        } else if (!isSpouseField && field === 'inflationRate') {
            // Assert the updated object conforms to the Inflation Rate types
            return { ...prev, [field]: updatedDistribution as FixedValues | NormalDistributionValues | UniformDistributionValues };
        } else if (!isSpouseField && field === 'ownerLifeExpectancy') {
            // Assert the updated object conforms to LifeExpectancy type for the owner field
           return { ...prev, [field]: updatedDistribution as LifeExpectancy };
       }

        return prev;
    });
  };


  // --- Render Logic ---

  if (!scenarioData) {
    return <div>Loading scenario data...</div>;
  }
  
  // Helper function to render distribution inputs remains the same
  const renderDistributionInputs = ( /* ... same as before ... */
        field: "inflationRate" | "ownerLifeExpectancy" | "spouseLifeExpectancy"
    ) => {
        // ... (No changes needed inside this function based on errors)
        // Make sure the keys passed in onChange match the subField expectation: 'value', 'mean', 'stdDev', 'min', 'max'
        let distribution: FixedValues | NormalDistributionValues | UniformDistributionValues | LifeExpectancy | undefined | null; // Allow null

        if (field === 'spouseLifeExpectancy') {
             if (scenarioData.type === 'couple') {
                 distribution = scenarioData.spouseLifeExpectancy;
             }
        } else {
             distribution = scenarioData[field];
        }

        // Handle case where distribution might be null or undefined initially
        if (!distribution) {
             // Optionally render a placeholder or nothing
             // console.warn(`Distribution data for ${field} is missing.`);
             return null;
        }

        const isInflation = field === 'inflationRate';
        const minValue = isInflation ? 0 : undefined;
        const maxValue = isInflation ? 100 : undefined;

        return (
            <div className="space-y-4 pl-6 border-l-2 border-gray-200 ml-2 mt-2">
                <RadioGroup
                    value={distribution.type}
                    onValueChange={(newType) => handleDistributionTypeChange(field, newType as DistributionType)}
                    disabled={!canEdit}
                    className="flex space-x-4"
                >
                    {/* Radio Items */}
                     <div className="flex items-center space-x-2">
                        <RadioGroupItem value="fixed" id={`${field}-fixed`} className="border-2 border-gray-300 data-[state=checked]:border-purple-600 data-[state=checked]:bg-purple-600 data-[state=checked]:ring-white data-[state=checked]:ring-2"/>
                        <Label htmlFor={`${field}-fixed`}>Fixed</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="normal" id={`${field}-normal`} className="border-2 border-gray-300 data-[state=checked]:border-purple-600 data-[state=checked]:bg-purple-600 data-[state=checked]:ring-white data-[state=checked]:ring-2"/>
                        <Label htmlFor={`${field}-normal`}>Normal</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="uniform" id={`${field}-uniform`} className="border-2 border-gray-300 data-[state=checked]:border-purple-600 data-[state=checked]:bg-purple-600 data-[state=checked]:ring-white data-[state=checked]:ring-2"/>
                        <Label htmlFor={`${field}-uniform`}>Uniform</Label>
                    </div>
                </RadioGroup>

                {distribution.type === "fixed" && (
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor={`${field}-value`}>Value {isInflation ? '(%)' : '(Years)'}</Label>
                        <Input
                            type="number"
                            id={`${field}-value`}
                            // Use 'value' as the subField key
                            value={(distribution as FixedValues).value}
                            onChange={(e) => handleDistributionValueChange(field, 'value', e.target.value)}
                            disabled={!canEdit}
                            min={minValue}
                            max={maxValue}
                            step={isInflation ? 0.1 : 1}
                        />
                    </div>
                )}

                {distribution.type === "normal" && (
                     // Use 'mean' and 'stdDev' as subField keys
                    <div className="flex space-x-4">
                         <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor={`${field}-mean`}>Mean {isInflation ? '(%)' : '(Years)'}</Label>
                            <Input
                                type="number"
                                id={`${field}-mean`}
                                value={(distribution as NormalDistributionValues).mean}
                                onChange={(e) => handleDistributionValueChange(field, 'mean', e.target.value)}
                                disabled={!canEdit}
                                step={isInflation ? 0.1 : 1}
                            />
                        </div>
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor={`${field}-stdDev`}>Std Dev {isInflation ? '(%)' : '(Years)'}</Label>
                            <Input
                                type="number"
                                id={`${field}-stdDev`}
                                value={(distribution as NormalDistributionValues).stdDev}
                                onChange={(e) => handleDistributionValueChange(field, 'stdDev', e.target.value)}
                                disabled={!canEdit}
                                min="0"
                                step={isInflation ? 0.1 : 1}
                            />
                        </div>
                    </div>
                )}

                {distribution.type === "uniform" && (
                     // Use 'min' and 'max' as subField keys
                     <div className="flex space-x-4">
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor={`${field}-min`}>Min {isInflation ? '(%)' : '(Years)'}</Label>
                            <Input
                                type="number"
                                id={`${field}-min`}
                                value={(distribution as UniformDistributionValues).min}
                                onChange={(e) => handleDistributionValueChange(field, 'min', e.target.value)}
                                disabled={!canEdit}
                                step={isInflation ? 0.1 : 1}
                            />
                        </div>
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor={`${field}-max`}>Max {isInflation ? '(%)' : '(Years)'}</Label>
                            <Input
                                type="number"
                                id={`${field}-max`}
                                value={(distribution as UniformDistributionValues).max}
                                onChange={(e) => handleDistributionValueChange(field, 'max', e.target.value)}
                                disabled={!canEdit}
                                step={isInflation ? 0.1 : 1}
                            />
                        </div>
                    </div>
                )}
            </div>
        );
    };

  // Main JSX structure remains the same
  return (
    <div className="space-y-6 p-4 border rounded-md">
      {/* Name */}
      <div className="grid w-full max-w-md items-center gap-1.5">
        <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
        <Input
          type="text" id="name" name="name" placeholder="Scenario Name"
          value={scenarioData.name} onChange={handleInputChange} disabled={!canEdit} required
        />
      </div>

      {/* Description */}
      <div className="grid w-full gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          placeholder="Describe the scenario..." id="description" name="description"
          value={scenarioData.description} onChange={handleInputChange} disabled={!canEdit} className="min-h-[100px]"
        />
      </div>

      {/* Financial Goal */}
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="financialGoal">Financial Goal ($)</Label>
        <Input
          type="number" id="financialGoal" name="financialGoal" placeholder="e.g., 1000000"
          value={scenarioData.financialGoal} onChange={handleInputChange} disabled={!canEdit} min="0" step="1000"
        />
        {scenarioData.financialGoal < 0 && canEdit && (
          <p className="text-sm text-red-500">Financial goal must be zero or more.</p>
        )}
      </div>

      {/* Residence State */}
      <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="residenceState">Residence State</Label>
      <Select
        value={scenarioData.residenceState}
        onValueChange={(value) => {
          setScenarioData(prev => {
            if (!prev) return null;
            return { ...prev, residenceState: value };
          });
        }}
        disabled={!canEdit}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a state" />
        </SelectTrigger>
        <SelectContent>
          {[
            ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"],
            ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"],
            ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"],
            ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"],
            ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"],
            ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"],
            ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"],
            ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
            ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"],
            ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"],
            ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"],
            ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"],
            ["WI", "Wisconsin"], ["WY", "Wyoming"]
          ].map(([code, name]) => (
            <SelectItem key={code} value={code}>{name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>


      {/* Inflation Rate */}
      <div className="space-y-2">
          <Label className="font-semibold">Inflation Rate</Label>
          {renderDistributionInputs("inflationRate")}
      </div>


      {/* Owner Information */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-semibold">Owner Information</h3>
        <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="ownerBirthYear">Birth Year</Label>
            <Input
                type="number" id="ownerBirthYear" name="ownerBirthYear"
                value={scenarioData.ownerBirthYear} onChange={handleInputChange} disabled={!canEdit} min="1950" max="2025" step="1"
            />
        </div>
        <div className="space-y-2">
            <Label className="font-semibold">Life Expectancy (Owner)</Label>
            {renderDistributionInputs("ownerLifeExpectancy")}
        </div>
      </div>

       {/* Scenario Type (Individual/Couple) */}
      <div className="space-y-2 border-t pt-4">
          <Label className="font-semibold">Scenario Type</Label>
          <RadioGroup
              value={scenarioData.type}
              onValueChange={(value) => handleScenarioTypeChange(value as "individual" | "couple")}
              disabled={!canEdit}
              className="flex space-x-4"
          >
              <div className="flex items-center space-x-2">
                  <RadioGroupItem value="individual" id="type-individual" className="border-2 border-gray-300 data-[state=checked]:border-purple-600 data-[state=checked]:bg-purple-600 data-[state=checked]:ring-white data-[state=checked]:ring-2"/>
                  <Label htmlFor="type-individual">Individual</Label>
              </div>
              <div className="flex items-center space-x-2">
                  <RadioGroupItem value="couple" id="type-couple" className="border-2 border-gray-300 data-[state=checked]:border-purple-600 data-[state=checked]:bg-purple-600 data-[state=checked]:ring-white data-[state=checked]:ring-2"/>
                  <Label htmlFor="type-couple">Couple</Label>
              </div>
          </RadioGroup>
      </div>

      {/* Spouse Information (Conditional) */}
      {scenarioData.type === "couple" && (
          <div className="space-y-4 border-t pt-4 pl-4 border-l ml-4">
            <h3 className="text-lg font-semibold">Spouse Information</h3>
             <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="spouseBirthYear">Spouse Birth Year</Label>
                <Input
                    type="number" id="spouseBirthYear" name="spouseBirthYear" // Direct name handling might need adjustment if using generic handler
                    value={(scenarioData as CoupleScenario).spouseBirthYear}
                    // Using specific logic here for spouseBirthYear for clarity
                    onChange={(e) => setScenarioData(prev => {
                         if (!prev || prev.type !== 'couple') return prev;
                         const year = parseInt(e.target.value);
                         return {...prev, spouseBirthYear: isNaN(year) ? 1950 : year }; // Add parsing and default
                    })}
                    disabled={!canEdit} min="1950" max="2025" step="1"
                />
            </div>
             <div className="space-y-2">
                <Label className="font-semibold">Life Expectancy (Spouse)</Label>
                {renderDistributionInputs("spouseLifeExpectancy")}
            </div>
          </div>
      )}

      {!canEdit && (
        <p className="text-sm text-yellow-400 bg-zinc-800 p-2 rounded">
          Viewing in read-only mode. Editing is disabled.
        </p>
      )}

        <div className="flex justify-end pt-4 border-t mt-6">
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