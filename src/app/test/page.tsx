"use client"
import { useEffect } from "react"


export default function TestPage() {
    useEffect(() => {
        const fetchData = async () => {
            const response = await fetch("/api/simulation", {
                method: "POST",
                body: JSON.stringify({ filepath: "src/data/jsonScenarios/scenario2.json", simulationCount: 10 }),
                headers: {
                    "Content-Type": "application/json",
                },
            });
            const data = await response.json();
            console.log(data);
        };
        fetchData();
    }, []);

    return <div>Test</div>;
}

