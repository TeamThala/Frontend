"use client"

import React, { useState, useEffect } from 'react';

interface SliderProps {
  value: number[];
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: number[]) => void;
  className?: string;
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onValueChange,
  className = "",
}: SliderProps) {
  const [currentValue, setCurrentValue] = useState(value[0]);
  
  // Update internal state when prop changes
  useEffect(() => {
    setCurrentValue(value[0]);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    setCurrentValue(newValue);
    onValueChange([newValue]);
  };

  const percentage = ((currentValue - min) / (max - min)) * 100;

  return (
    <div className={`relative w-full ${className}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        onChange={handleChange}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #7F56D9 0%, #7F56D9 ${percentage}%, #333 ${percentage}%, #333 100%)`
        }}
      />
    </div>
  );
}