import { Scenario } from "@/types/scenario";

interface InvestmentsProps {
    scenario: Scenario;
    canEdit: boolean;
    onUpdate: (updatedScenario: Scenario) => void;
}

export default function Investments({ scenario, canEdit, onUpdate }: InvestmentsProps) {
    
    return (
        <div>
            <h1>Investments</h1>
        </div>
    );
}