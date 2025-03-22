"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CreateScenarioPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center mb-8">
        <Link href="/scenarios">
          <Button variant="outline" className="text-white border-gray-700 hover:bg-gray-800 mr-4">
            Back to Scenarios
          </Button>
        </Link>
        <h1 className="text-4xl font-bold text-white">Create New Scenario</h1>
      </div>
      
      <div className="bg-gray-900 rounded-lg p-8 text-white">
        <p className="text-lg mb-4">Scenario creation form will be implemented here.</p>
        <p>This form will include:</p>
        <ul className="list-disc list-inside mb-6 space-y-2">
          <li>Basic scenario details (name, description)</li>
          <li>Financial goal setting</li>
          <li>Investment selection</li>
          <li>Event series configuration</li>
          <li>Spending strategy options</li>
          <li>Roth conversion options</li>
          <li>Other scenario parameters</li>
        </ul>
        
        <div className="flex gap-4 mt-8">
          <Link href="/scenarios">
            <Button variant="outline" className="text-white border-gray-700 hover:bg-gray-800">
              Cancel
            </Button>
          </Link>
          <Button className="bg-purple-600 hover:bg-purple-700" disabled>
            Save Scenario
          </Button>
        </div>
      </div>
    </div>
  );
} 