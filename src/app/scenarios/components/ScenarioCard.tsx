import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Import the proper types
import { Scenario } from '@/types/scenario'; 
import { Investment } from '@/types/investment';
import { Event } from '@/types/event';

export default function ScenarioCard({ scenario, accessType }: { scenario: Scenario, accessType: string }) {
  return (
    <Card className="bg-black text-white border-[#7F56D9]">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-museoModerno">
            {scenario.name}
          </CardTitle>
          <div className="px-2 py-1 bg-zinc-900 rounded text-sm border border-[#8F4DA2]">
            {scenario.type === "single" ? "Single" : "Married"}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-zinc-400">Financial Goal: ${scenario.financialGoal.toLocaleString()}</p>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Investments</h3>
            <div className="flex flex-wrap gap-2">
              {scenario.investments.slice(0, 3).map((investment, i) => (
                <span key={i} className="px-3 py-1 bg-zinc-900 rounded-full text-sm border border-[#FF4690]">
                  {(investment as unknown as Investment).investmentType?.name || "Investment"}
                </span>
              ))}
              {scenario.investments.length > 3 && (
                <span className="px-3 py-1 bg-zinc-900 rounded-full text-sm border border-[#FF4690]">
                  +{scenario.investments.length - 3} more
                </span>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Events</h3>
            <div className="flex flex-wrap gap-2">
              {scenario.eventSeries.slice(0, 3).map((event, index) => (
                <span key={index} className="px-3 py-1 bg-zinc-900 rounded-full text-sm border border-[#702DFF]">
                  {(event as unknown as Event).name}
                </span>
              ))}
              {scenario.eventSeries.length > 3 && (
                <span className="px-3 py-1 bg-zinc-900 rounded-full text-sm border border-[#702DFF]">
                  +{scenario.eventSeries.length - 3} more
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t border-zinc-800 pt-4">
        <span className="text-sm text-zinc-400">
          Last Modified: {new Date(scenario.updatedAt).toLocaleDateString()}
        </span>
        <div className="flex gap-2">
          <Link href={""}>
            <Button variant="outline" className="text-white border-zinc-800 hover:bg-zinc-900 hover:text-[#FF4690] bg-zinc-900" onClick={() => {alert("View/Edit functionality will be implemented here")}}>
              {accessType === "readWrite" || accessType === "create" ? "View/Edit" : "View"}
            </Button>
          </Link>
          {accessType === "readWrite" || accessType === "create" && (
            <Button variant="outline" className="text-white border-zinc-800 hover:bg-zinc-900 hover:text-[#FF4690] bg-zinc-900" onClick={() => {alert("Share functionality will be implemented here")}}>
              Share
            </Button>
          )}
          <Button variant="outline" className="text-white border-zinc-800 hover:bg-zinc-900 hover:text-[#FF4690] bg-zinc-900" onClick={() => {
    const fileName = scenario.name.replace(/\s+/g, "_") + ".yaml";
    fetch(`/api/export-scenario?id=${scenario._id}`)
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
      });
  }}>
            Export
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
} 