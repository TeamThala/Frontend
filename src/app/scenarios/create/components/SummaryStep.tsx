import { Button } from "@/components/ui/button";
import { ScenarioFormData } from "../page";
import { useState } from "react";

export default function SummaryStep({ scenarioData }: { scenarioData: ScenarioFormData }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSaveScenario = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            const response = await fetch("/api/senarios", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(scenarioData),
            });

            const data = await response.json();
            
            if (response.ok) {
                console.log("Scenario saved successfully:", data);
                // You can add success notification or redirect here
            } else {
                const errorMsg = data.error || "Failed to save scenario";
                console.error("Error saving scenario:", errorMsg);
                setError(errorMsg);
            }
        } catch (err) {
            console.error("Exception while saving scenario:", err);
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
    <>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <Button 
            className="bg-purple-600 hover:bg-purple-700" 
            onClick={handleSaveScenario}
            disabled={isLoading}
        >
            {isLoading ? "Saving..." : "Save Scenario"}
        </Button>
    </>
    );
} 