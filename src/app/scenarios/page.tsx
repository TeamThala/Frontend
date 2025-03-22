"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import ScenarioCard from "./components/ScenarioCard";
import ScenarioSkeleton from "./components/ScenarioSkeleton";
import { Scenario } from "@/types/scenario"; 

// Mock data for testing the UI while the backend is fixed
const MOCK_SCENARIOS = [
  {
    id: "1",
    name: "Future Saver",
    type: "single",
    description: "Saving for the future",
    financialGoal: 80000,
    userBirthYear: 1990,
    userLifeExpectancy: { type: "fixed", valueType: "year", value: 85 },
    investments: [
      { id: "i1", investmentType: {
        name: "Cash"
      } },
      { id: "i2", investmentType: {
        name: "Index Fund"
      } },
    ],
    eventSeries: [
      { id: "e1", name: "Rent Payment" },
      { id: "e2", name: "Annual Salary" },
      { id: "e3", name: "Development Program" },
    ],
    spendingStrategy: [],
    expenseWithdrawalStrategy: [],
    inflationRate: { type: "fixed", valueType: "percentage", value: 2.5 },
    RothConversionStrategy: [],
    RMDStrategy: [],
    rothConversion: { rothConversion: false },
    residenceState: "NY",
    owner: { id: "u1", name: "User", email: "user@example.com" },
    viewPermissions: [],
    editPermissions: [],
    updatedAt: "2025-02-16T00:00:00.000Z",
    createdAt: "2025-02-10T00:00:00.000Z"
  },
  {
    id: "2",
    name: "Married Couple with Diverse Investments",
    type: "couple",
    description: "Planning for a couple",
    financialGoal: 300000,
    userBirthYear: 1985,
    userLifeExpectancy: { type: "fixed", valueType: "year", value: 85 },
    spouseBirthYear: 1986,
    spouseLifeExpectancy: { type: "fixed", valueType: "year", value: 87 },
    investments: [
      { id: "i3", investmentType: {
        name: "401(k) Account"
      } },
      { id: "i4", investmentType: {
        name: "Municipal Bonds 2"
      } },
      { id: "i5", investmentType: {
        name: "Real Estate Investment Trust (REIT)"
      } },
    ],
    eventSeries: [
      { id: "e4", name: "Child College Fund" },
      { id: "e5", name: "Social Security Income" },
      { id: "e6", name: "Vacation Fund" },
    ],
    spendingStrategy: [],
    expenseWithdrawalStrategy: [],
    inflationRate: { type: "fixed", valueType: "percentage", value: 2.5 },
    RothConversionStrategy: [],
    RMDStrategy: [],
    rothConversion: { rothConversion: false },
    residenceState: "CA",
    owner: { id: "u1", name: "User", email: "user@example.com" },
    viewPermissions: [],
    editPermissions: [],
    updatedAt: "2025-02-13T00:00:00.000Z",
    createdAt: "2025-02-01T00:00:00.000Z"
  },
  {
    id: "3",
    name: "Single Parent Managing Dynamics",
    type: "single",
    description: "Financial planning for a single parent",
    financialGoal: 40000,
    userBirthYear: 1980,
    userLifeExpectancy: { type: "fixed", valueType: "year", value: 85 },
    investments: [
      { id: "i6", investmentType: {
        name: "Cash"
      } },
      { id: "i7", investmentType: {
        name: "Stock Portfolio"
      } },
      { id: "i8", investmentType: {
        name: "Tax-Deferred Retirement Fund"
      } },
    ],
    eventSeries: [
      { id: "e7", name: "New Car Purchase" },
      { id: "e8", name: "Part-Time Freelance Income" },
      { id: "e9", name: "Medical Expenses" },
      { id: "e10", name: "Child Education Fund" },
    ],
    spendingStrategy: [],
    expenseWithdrawalStrategy: [],
    inflationRate: { type: "fixed", valueType: "percentage", value: 2.5 },
    RothConversionStrategy: [],
    RMDStrategy: [],
    rothConversion: { rothConversion: false },
    residenceState: "TX",
    owner: { id: "u1", name: "User", email: "user@example.com" },
    viewPermissions: [],
    editPermissions: [],
    updatedAt: "2025-01-31T00:00:00.000Z",
    createdAt: "2025-01-15T00:00:00.000Z"
  },
  {
    id: "4",
    name: "Early Retirement Aspirations",
    type: "single",
    description: "Planning for early retirement",
    financialGoal: 500000,
    userBirthYear: 1975,
    userLifeExpectancy: { type: "fixed", valueType: "year", value: 90 },
    investments: [
      { id: "i9", name: "High-Interest Savings Account" },
      { id: "i10", investmentType: {
        name: "Growth Mutual Fund"
      } },
      { id: "i11", investmentType: {
        name: "Roth IRA"
      } },
      { id: "i12", investmentType: {
        name: "Dividend Stocks"
      } },
    ],
    eventSeries: [
      { id: "e11", name: "Career Change to Part-Time Work" },
      { id: "e12", name: "Health Insurance Premiums" },
      { id: "e13", name: "Retirement Age" },
      { id: "e14", name: "Vacation Fund" },
    ],
    spendingStrategy: [],
    expenseWithdrawalStrategy: [],
    inflationRate: { type: "fixed", valueType: "percentage", value: 2.5 },
    RothConversionStrategy: [],
    RMDStrategy: [],
    rothConversion: { rothConversion: false },
    residenceState: "FL",
    owner: { id: "u1", name: "User", email: "user@example.com" },
    viewPermissions: [],
    editPermissions: [],
    updatedAt: "2024-12-23T00:00:00.000Z",
    createdAt: "2024-12-01T00:00:00.000Z"
  }
];

// Flag to use mock data instead of API
const USE_MOCK_DATA = true;

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Ensure the page has a black background
    if (document) {
      document.body.classList.add('bg-black');
    }
    
    const fetchScenarios = async () => {
      // Use mock data for testing the UI
      if (USE_MOCK_DATA) {
        setTimeout(() => {
          setScenarios(MOCK_SCENARIOS as unknown as Scenario[]);
          setLoading(false);
        }, 1000); // Simulate loading delay
        return;
      }

      try {
        const response = await fetch('/api/senarios');
        if (!response.ok) {
          console.error('Failed to fetch scenarios');
          setScenarios([]);
          return;
        }
        const data = await response.json();
        setScenarios(data.data || []);
      } catch (error) {
        console.error('Error fetching scenarios:', error);
        setScenarios([]);
      } finally {
        setLoading(false);
      }
    };

    fetchScenarios();
    
    // Cleanup function
    return () => {
      if (document) {
        document.body.classList.remove('bg-black');
      }
    };
  }, []);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-white">Scenarios</h1>
        <div className="flex gap-4">
          <Link href="/scenarios/create">
            <Button className="bg-purple-600 hover:bg-purple-700">
              Create a Scenario
            </Button>
          </Link>
          <Button 
            className="bg-purple-600 hover:bg-purple-700"
            onClick={() => {
              alert("Import functionality will be implemented here");
              // setShowImportDialog(true);
            }}
          >
            Import a Scenario
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, index) => (
            <ScenarioSkeleton key={index} />
          ))}
        </div>
      ) : scenarios.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white text-lg mb-4">No scenarios found.</p>
          <Link href="/scenarios/create">
            <Button className="bg-purple-600 hover:bg-purple-700">
              Create Your First Scenario
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {scenarios.map((scenario) => (
            <ScenarioCard key={scenario.id} scenario={scenario} />
          ))}
        </div>
      )}
    </div>
  );
} 