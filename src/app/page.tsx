"use client";

import { Jacques_Francois_Shadow } from "next/font/google";
import { Button } from "@/components/ui/button";
import ImportScenarioDialog from "@/components/import-scenario-dialog";
import CreateScenarioDialog from "@/components/create-scenario-dialog";

const jacquesFrancoisShadow = Jacques_Francois_Shadow({
  weight: "400",
  subsets: ["latin"],
});

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col justify-center bg-black text-white px-8 sm:px-20 -mt-18">
      {/* Hero Section */}
      <div className="w-full max-w-screen-xl mx-auto">
        <div
          className={`space-y-8 text-6xl sm:text-7xl md:text-8xl lg:text-9xl leading-none tracking-wider ${jacquesFrancoisShadow.className}`}
        >
          <h1 className="stroke-text">Your Goals</h1>
          <h1 className="stroke-text">Your Strategy</h1>
          <h1 className="stroke-text">Your Success</h1>
        </div>

        {/* CTA Buttons */}
        <div className="mt-12 flex gap-6">
          <CreateScenarioDialog>
            <Button className="px-8 py-4 bg-[#7F56D9] text-white text-lg font-semibold rounded-lg shadow-lg hover:bg-[#6b46c1] transition">
              Create a Scenario
            </Button>
          </CreateScenarioDialog>
          <ImportScenarioDialog>
            <Button className="px-8 py-4 bg-[#7F56D9] text-white text-lg font-semibold rounded-lg shadow-lg hover:bg-[#6b46c1] transition">
              Import a Scenario
            </Button>
          </ImportScenarioDialog>
        </div>
      </div>
    </div>
  );
}
