import { Button } from "@/components/ui/button";
import { ScenarioFormData } from "../page";


export default function SummaryStep({ scenarioData }: { scenarioData: ScenarioFormData }) {

    const handleSaveScenario = async () => {
        const response = await fetch("/api/senarios/new", {
            method: "POST",
            body: JSON.stringify(scenarioData),
        });

        if (response.ok) {
            const data = await response.json();
            console.log(data);
        } else {
            console.error("Failed to save scenario");
        }
    }

    return (
    <>
    <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleSaveScenario}>Save Scenario</Button>
    </>
    );
  } 