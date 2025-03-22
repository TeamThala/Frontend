"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";

// US States array for dropdown
const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", 
  "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", 
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", 
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", 
  "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", 
  "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", 
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

export interface GeneralInformationData {
  scenarioName: string;
  scenarioDescription: string;
  scenarioType: 'Single' | 'Married';
  userBirthYear: number;
  userLifeExpectancy: number;
  spouseBirthYear?: number;
  spouseLifeExpectancy?: number;
  financialGoal: number;
  residenceState: string;
}

interface GeneralInformationStepProps {
  data?: GeneralInformationData;
  onDataUpdate?: (data: GeneralInformationData) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export default function GeneralInformationStep({ data, onDataUpdate, onValidationChange }: GeneralInformationStepProps) {
  const [formData, setFormData] = useState<GeneralInformationData>({
    scenarioName: '',
    scenarioDescription: '',
    scenarioType: 'Single',
    userBirthYear: 1990,
    userLifeExpectancy: 85,
    spouseBirthYear: 1990,
    spouseLifeExpectancy: 85,
    financialGoal: 0,
    residenceState: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const onValidationChangeRef = useRef(onValidationChange);

  // Update the ref when the prop changes
  useEffect(() => {
    onValidationChangeRef.current = onValidationChange;
  }, [onValidationChange]);

  // Initialize form with data from parent if provided
  useEffect(() => {
    if (data) {
      setFormData(data);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // Only run on initial mount

  // Validate form data and update parent about validation status
  useEffect(() => {
    const newErrors: Record<string, string> = {};

    // Required field validation
    if (!formData.scenarioName.trim()) {
      newErrors.scenarioName = 'Scenario name is required';
    }

    if (formData.financialGoal < 0) {
      newErrors.financialGoal = 'Financial goal must be a non-negative number';
    }

    if (!formData.residenceState) {
      newErrors.residenceState = 'Residence state is required';
    }

    // Spouse information validation
    if (formData.scenarioType === 'Married') {
      if (!formData.spouseBirthYear) {
        newErrors.spouseBirthYear = 'Spouse birth year is required';
      }
      if (!formData.spouseLifeExpectancy) {
        newErrors.spouseLifeExpectancy = 'Spouse life expectancy is required';
      }
    }

    setErrors(newErrors);

    // Notify parent about validation status using the ref
    const isValid = Object.keys(newErrors).length === 0;
    if (onValidationChangeRef.current) {
      onValidationChangeRef.current(isValid);
    }
  }, [formData]); // Remove onValidationChange from the dependency array

  // Helper function to update form state and notify parent
  const updateForm = (newData: Partial<GeneralInformationData>) => {
    let updatedData = { ...formData, ...newData };
    
    // If scenario type is changing to Single, remove spouse information from the data that will be sent to parent
    if (newData.scenarioType === 'Single') {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { spouseBirthYear, spouseLifeExpectancy, ...singlePersonData } = updatedData;
      updatedData = { ...singlePersonData, scenarioType: 'Single' };
    }
    
    setFormData(updatedData);
    
    // Notify parent of the change
    if (onDataUpdate) {
      // Only send spouse data if married
      if (updatedData.scenarioType === 'Married') {
        onDataUpdate(updatedData);
      } else {
        // Remove spouse fields when sending to parent if single
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { spouseBirthYear, spouseLifeExpectancy, ...singlePersonData } = updatedData;
        onDataUpdate(singlePersonData);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle number inputs
    if (name === 'financialGoal') {
      updateForm({ [name]: Number(value) });
    } else {
      updateForm({ [name]: value });
    }
  };

  const handleRadioChange = (value: 'Single' | 'Married') => {
    updateForm({ scenarioType: value });
  };

  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    updateForm({ [name]: parseInt(value, 10) });
  };

  return (
    <Card className="bg-black text-white p-6 rounded-lg border border-zinc-800">
      <h2 className="text-2xl font-bold mb-6">General Information</h2>

      {/* Errors summary if any */}
      {Object.keys(errors).length > 0 && (
        <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-md">
          <h3 className="text-sm font-medium text-red-400 mb-1">Please fix the following errors:</h3>
          <ul className="text-xs text-red-300 list-disc list-inside">
            {Object.values(errors).map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="space-y-6">
        {/* Scenario Name */}
        <div className="space-y-2">
          <label htmlFor="scenarioName" className="block text-sm font-medium text-white">
            Scenario Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="scenarioName"
            name="scenarioName"
            required
            value={formData.scenarioName}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 bg-zinc-900 border ${errors.scenarioName ? 'border-red-500' : 'border-zinc-700'} rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#7F56D9]`}
            placeholder="Enter scenario name"
          />
          {errors.scenarioName && (
            <p className="text-red-500 text-xs mt-1">{errors.scenarioName}</p>
          )}
        </div>

        {/* Scenario Description */}
        <div className="space-y-2">
          <label htmlFor="scenarioDescription" className="block text-sm font-medium text-white">
            Scenario Description
          </label>
          <textarea
            id="scenarioDescription"
            name="scenarioDescription"
            value={formData.scenarioDescription}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#7F56D9]"
            placeholder="Enter scenario description (optional)"
          />
        </div>

        {/* Scenario Type Radio Buttons */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white">
            Scenario Type <span className="text-red-500">*</span>
          </label>
          <div className="flex space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio text-[#7F56D9] bg-zinc-900 border-zinc-700 focus:ring-[#7F56D9]"
                checked={formData.scenarioType === 'Single'}
                onChange={() => handleRadioChange('Single')}
              />
              <span className="ml-2">Single</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio text-[#7F56D9] bg-zinc-900 border-zinc-700 focus:ring-[#7F56D9]"
                checked={formData.scenarioType === 'Married'}
                onChange={() => handleRadioChange('Married')}
              />
              <span className="ml-2">Married</span>
            </label>
          </div>
        </div>

        {/* User Birth Year and Life Expectancy */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">User Information</h3>
          
          <div className="space-y-2">
            <label htmlFor="userBirthYear" className="block text-sm font-medium text-white">
              Birth Year <span className="text-red-500">*</span>
              <span className="ml-2 text-gray-400 text-xs">{formData.userBirthYear}</span>
            </label>
            <input
              type="range"
              id="userBirthYear"
              name="userBirthYear"
              min={1900}
              max={new Date().getFullYear()}
              value={formData.userBirthYear}
              onChange={handleRangeChange}
              className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#7F56D9]"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="userLifeExpectancy" className="block text-sm font-medium text-white">
              Life Expectancy <span className="text-red-500">*</span>
              <span className="ml-2 text-gray-400 text-xs">{formData.userLifeExpectancy}</span>
            </label>
            <input
              type="range"
              id="userLifeExpectancy"
              name="userLifeExpectancy"
              min={1}
              max={120}
              value={formData.userLifeExpectancy}
              onChange={handleRangeChange}
              className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#7F56D9]"
            />
          </div>
        </div>

        {/* Spouse Information (conditional) */}
        {formData.scenarioType === 'Married' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Spouse Information</h3>
            
            <div className="space-y-2">
              <label htmlFor="spouseBirthYear" className="block text-sm font-medium text-white">
                Spouse Birth Year <span className="text-red-500">*</span>
                <span className="ml-2 text-gray-400 text-xs">{formData.spouseBirthYear}</span>
              </label>
              <input
                type="range"
                id="spouseBirthYear"
                name="spouseBirthYear"
                min={1900}
                max={new Date().getFullYear()}
                value={formData.spouseBirthYear}
                onChange={handleRangeChange}
                className={`w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#7F56D9] ${errors.spouseBirthYear ? 'border border-red-500' : ''}`}
              />
              {errors.spouseBirthYear && (
                <p className="text-red-500 text-xs mt-1">{errors.spouseBirthYear}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="spouseLifeExpectancy" className="block text-sm font-medium text-white">
                Spouse Life Expectancy <span className="text-red-500">*</span>
                <span className="ml-2 text-gray-400 text-xs">{formData.spouseLifeExpectancy}</span>
              </label>
              <input
                type="range"
                id="spouseLifeExpectancy"
                name="spouseLifeExpectancy"
                min={1}
                max={120}
                value={formData.spouseLifeExpectancy}
                onChange={handleRangeChange}
                className={`w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#7F56D9] ${errors.spouseLifeExpectancy ? 'border border-red-500' : ''}`}
              />
              {errors.spouseLifeExpectancy && (
                <p className="text-red-500 text-xs mt-1">{errors.spouseLifeExpectancy}</p>
              )}
            </div>
          </div>
        )}

        {/* Financial Goal */}
        <div className="space-y-2">
          <label htmlFor="financialGoal" className="block text-sm font-medium text-white">
            Financial Goal ($) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="financialGoal"
            name="financialGoal"
            min={0}
            required
            value={formData.financialGoal}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 bg-zinc-900 border ${errors.financialGoal ? 'border-red-500' : 'border-zinc-700'} rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#7F56D9]`}
            placeholder="Enter your financial goal"
          />
          {errors.financialGoal && (
            <p className="text-red-500 text-xs mt-1">{errors.financialGoal}</p>
          )}
        </div>

        {/* Residence State */}
        <div className="space-y-2">
          <label htmlFor="residenceState" className="block text-sm font-medium text-white">
            State of Residence <span className="text-red-500">*</span>
          </label>
          <select
            id="residenceState"
            name="residenceState"
            required
            value={formData.residenceState}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 bg-zinc-900 border ${errors.residenceState ? 'border-red-500' : 'border-zinc-700'} rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#7F56D9]`}
          >
            <option value="" disabled>Select your state</option>
            {US_STATES.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
          {errors.residenceState && (
            <p className="text-red-500 text-xs mt-1">{errors.residenceState}</p>
          )}
        </div>
      </div>

      {/* For development purposes: show the entered data */}
      <div className="mt-8 p-4 bg-zinc-900 rounded-lg">
        <h3 className="text-md font-semibold mb-2">Form Data (Preview)</h3>
        <pre className="text-xs text-zinc-400 overflow-auto">
          {JSON.stringify(
            formData.scenarioType === 'Single' 
              ? { ...formData, spouseBirthYear: undefined, spouseLifeExpectancy: undefined } 
              : formData, 
            null, 
            2
          )}
        </pre>
      </div>

    </Card>
  );
} 