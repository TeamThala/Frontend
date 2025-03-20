import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import client from '@/lib/db'

export async function POST(req: NextRequest) {
    // Expects the POST request to send {"id": id} as a body to the server
    // Expects raw JSON file from body of the request (not form-data)
    try{
        const data = await req.json(); // Assuming body is never null
        const scenario = await getScenario(data.id);
        return NextResponse.json(scenario); // Placeholder, debug
    } catch(e) {
        return NextResponse.json({ message: "Error: Invalid Request", error: e })
    }
}

async function getScenario(id: string) {
    const targetId = new ObjectId(id);
    console.log(targetId);
    const db = client.db("main");
    const targetScenario = db.collection("scenarios").findOne({_id: targetId });
    return targetScenario
}

function simulation(scenario: any){

    return
}