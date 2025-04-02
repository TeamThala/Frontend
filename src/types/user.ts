export interface User {
    id: string;
    name: string;
    email: string;
    image: string;
    createdScenarios: string[]; // only store IDs to prevent infinite recursion
    readScenarios: string[]; // only store IDs to prevent infinite recursion
    readWriteScenarios: string[]; // only store IDs to prevent infinite recursion
}
