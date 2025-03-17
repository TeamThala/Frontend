import { Scenario } from "./scenario";

export interface User {
    id: string;
    name: string;
    email: string;
    image: string;
    createdScenarios: Scenario[];
    readScenarios: Scenario[];
    readWriteScenarios: Scenario[];
}
