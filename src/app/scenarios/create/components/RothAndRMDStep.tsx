"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { FixedValues, NormalDistributionValues, UniformDistributionValues } from "@/types/utils";

type InflationRateType = FixedValues | NormalDistributionValues | UniformDistributionValues;

export interface RothAndRMDData {
  inflationRate: InflationRateType;
}

interface RothAndRMDStepProps {
  data: RothAndRMDData;
  onDataUpdate: (data: RothAndRMDData) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export default function RothAndRMDStep({ 
  data, 
  onDataUpdate, 
  onValidationChange 
}: RothAndRMDStepProps) {
  // Create refs to prevent infinite update loops
  const dataRef = useRef(data);
  const onDataUpdateRef = useRef(onDataUpdate);
  const onValidationChangeRef = useRef(onValidationChange);
  
  // Initialize state with default values if not provided
  const [formData, setFormData] = useState<RothAndRMDData>(() => {
    // Use existing data if available, otherwise use defaults
    const initialData: RothAndRMDData = {
      inflationRate: dataRef.current?.inflationRate ?? {
        type: "fixed",
        valueType: "percentage",
        value: 2.5
      }
    };
    
    return initialData;
  });
  
  const [errors, setErrors] = useState<string[]>([]);
  
  // Update refs when props change
  useEffect(() => {
    dataRef.current = data;
    onDataUpdateRef.current = onDataUpdate;
    onValidationChangeRef.current = onValidationChange;
  }, [data, onDataUpdate, onValidationChange]);
  
  // Validate form data and update parent component
  useEffect(() => {
    const newErrors: string[] = [];
    
    
    // Validate inflation rate based on type
    if (formData.inflationRate.type === 'fixed') {
      if ((formData.inflationRate as FixedValues).value < 0) {
        newErrors.push('Inflation rate must be a non-negative value');
      }
    } else if (formData.inflationRate.type === 'normal') {
      const normalDist = formData.inflationRate as NormalDistributionValues;
      if (normalDist.mean < 0) {
        newErrors.push('Mean inflation rate must be a non-negative value');
      }
      if (normalDist.stdDev < 0) {
        newErrors.push('Standard deviation must be a non-negative value');
      }
    } else if (formData.inflationRate.type === 'uniform') {
      const uniformDist = formData.inflationRate as UniformDistributionValues;
      if (uniformDist.min < 0) {
        newErrors.push('Minimum inflation rate must be a non-negative value');
      }
      if (uniformDist.max < uniformDist.min) {
        newErrors.push('Maximum inflation rate must be greater than or equal to minimum rate');
      }
    }
    
    setErrors(newErrors);
    
    // Update parent component with form data
    if (onDataUpdateRef.current) {
      onDataUpdateRef.current(formData);
    }
    
    // Notify parent about validation status
    const isValid = newErrors.length === 0;
    if (onValidationChangeRef.current) {
      onValidationChangeRef.current(isValid);
    }
  }, [formData]);
  
  // Handle inflation rate type change
  const handleInflationRateTypeChange = (type: "fixed" | "normal" | "uniform") => {
    let newInflationRate: InflationRateType;
    
    switch (type) {
      case "fixed":
        newInflationRate = {
          type: "fixed",
          valueType: "percentage",
          value: 2.5
        };
        break;
      case "normal":
        newInflationRate = {
          type: "normal",
          valueType: "percentage",
          mean: 2.5,
          stdDev: 0.5
        };
        break;
      case "uniform":
        newInflationRate = {
          type: "uniform",
          valueType: "percentage",
          min: 1.5,
          max: 3.5
        };
        break;
      default:
        return; // No change if invalid type
    }
    
    setFormData(prev => ({
      ...prev,
      inflationRate: newInflationRate
    }));
  };
  
  // Handle fixed inflation rate value change
  const handleFixedInflationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    
    if (formData.inflationRate.type === 'fixed') {
      setFormData(prev => ({
        ...prev,
        inflationRate: {
          ...prev.inflationRate,
          value: isNaN(value) ? 0 : value
        } as FixedValues
      }));
    }
  };
  
  // Handle normal distribution inflation rate changes
  const handleNormalInflationChange = (field: 'mean' | 'stdDev', e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    
    if (formData.inflationRate.type === 'normal') {
      setFormData(prev => ({
        ...prev,
        inflationRate: {
          ...prev.inflationRate,
          [field]: isNaN(value) ? 0 : value
        } as NormalDistributionValues
      }));
    }
  };
  
  // Handle uniform distribution inflation rate changes
  const handleUniformInflationChange = (field: 'min' | 'max', e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    
    if (formData.inflationRate.type === 'uniform') {
      setFormData(prev => ({
        ...prev,
        inflationRate: {
          ...prev.inflationRate,
          [field]: isNaN(value) ? 0 : value
        } as UniformDistributionValues
      }));
    }
  };
  
  return (
    <Card className="bg-black text-white p-6 rounded-lg border border-zinc-800">
      <h2 className="text-2xl font-bold mb-6">Simulation Settings</h2>
      
      {errors.length > 0 && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-md">
          <p className="text-red-400 font-medium mb-1">Please fix the following errors:</p>
          <ul className="list-disc list-inside text-sm text-red-400">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="space-y-6">
        
        {/* Inflation Rate */}
        <div className="space-y-4">
          <label className="block text-md font-medium text-white">
            Inflation Rate <span className="text-red-500">*</span>
          </label>
          
          {/* Inflation Rate Type Selection */}
          <div className="flex flex-wrap gap-3">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio text-[#7F56D9] bg-zinc-900 border-zinc-700 focus:ring-[#7F56D9]"
                checked={formData.inflationRate.type === 'fixed'}
                onChange={() => handleInflationRateTypeChange('fixed')}
              />
              <span className="ml-2">Fixed</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio text-[#7F56D9] bg-zinc-900 border-zinc-700 focus:ring-[#7F56D9]"
                checked={formData.inflationRate.type === 'normal'}
                onChange={() => handleInflationRateTypeChange('normal')}
              />
              <span className="ml-2">Normal Distribution</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio text-[#7F56D9] bg-zinc-900 border-zinc-700 focus:ring-[#7F56D9]"
                checked={formData.inflationRate.type === 'uniform'}
                onChange={() => handleInflationRateTypeChange('uniform')}
              />
              <span className="ml-2">Uniform Distribution</span>
            </label>
          </div>
          
          {/* Fixed Value Input */}
          {formData.inflationRate.type === 'fixed' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white">
                Rate (%) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={(formData.inflationRate as FixedValues).value}
                onChange={handleFixedInflationChange}
                className={`w-full px-3 py-2 bg-zinc-900 border ${
                  errors.some(err => err.includes('inflation')) ? 'border-red-500' : 'border-zinc-700'
                } rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#7F56D9]`}
              />
            </div>
          )}
          
          {/* Normal Distribution Inputs */}
          {formData.inflationRate.type === 'normal' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">
                  Mean (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={(formData.inflationRate as NormalDistributionValues).mean}
                  onChange={(e) => handleNormalInflationChange('mean', e)}
                  className={`w-full px-3 py-2 bg-zinc-900 border ${
                    errors.some(err => err.includes('mean')) ? 'border-red-500' : 'border-zinc-700'
                  } rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#7F56D9]`}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">
                  Standard Deviation (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={(formData.inflationRate as NormalDistributionValues).stdDev}
                  onChange={(e) => handleNormalInflationChange('stdDev', e)}
                  className={`w-full px-3 py-2 bg-zinc-900 border ${
                    errors.some(err => err.includes('deviation')) ? 'border-red-500' : 'border-zinc-700'
                  } rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#7F56D9]`}
                />
              </div>
            </div>
          )}
          
          {/* Uniform Distribution Inputs */}
          {formData.inflationRate.type === 'uniform' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">
                  Minimum (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={(formData.inflationRate as UniformDistributionValues).min}
                  onChange={(e) => handleUniformInflationChange('min', e)}
                  className={`w-full px-3 py-2 bg-zinc-900 border ${
                    errors.some(err => err.includes('minimum')) ? 'border-red-500' : 'border-zinc-700'
                  } rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#7F56D9]`}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">
                  Maximum (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={(formData.inflationRate as UniformDistributionValues).max}
                  onChange={(e) => handleUniformInflationChange('max', e)}
                  className={`w-full px-3 py-2 bg-zinc-900 border ${
                    errors.some(err => err.includes('maximum')) ? 'border-red-500' : 'border-zinc-700'
                  } rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#7F56D9]`}
                />
              </div>
            </div>
          )}
          
          <p className="text-sm text-zinc-400">
            The inflation rate impacts the future value of your investments and expenses.
            Historical US inflation has averaged around 2-3% annually.
          </p>
        </div>
      </div>
      
      {/* Form Data Preview (for development) */}
      <div className="mt-8 p-4 bg-zinc-900 rounded-lg">
        <h3 className="text-md font-semibold mb-2">Simulation Settings Configuration</h3>
        <pre className="text-xs text-zinc-400 overflow-auto">
          {JSON.stringify(formData, null, 2)}
        </pre>
      </div>
    </Card>
  );
} 