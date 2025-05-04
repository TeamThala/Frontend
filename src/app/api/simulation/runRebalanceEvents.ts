import { Event, RebalanceEvent, AssetAllocationFixed, AssetAllocationGlidePath } from "@/types/event";
import { FixedYear } from "@/types/event";

// Helper function to process a single asset allocation
function processAllocation(
    allocation: AssetAllocationFixed | AssetAllocationGlidePath,
    year: number,
    simStartYear: number,
    eventDurationYear: number,
    log: string[]
): number {
    let allocationGains = 0;
    const investments = allocation.investments;

    if (!investments || investments.length === 0) {
        log.push(`No investments found for this allocation part.`);
        return 0;
    }

    // Net value of investments within this allocation part
    let netValue = 0;
    for (const investment of investments) {
        if (!investment) {
            log.push(`Error: Found undefined/null investment in allocation.`);
            // Decide how to handle this error, maybe skip or throw
            continue; // Skip this investment
        }
        netValue += investment.value;
    }

    if (netValue === 0) {
        log.push(`Net value is zero for this allocation part, skipping rebalance.`);
        return 0;
    }

    // Find target values based on the specific allocation type
    const targetInvestmentValues: number[] = [];
    if (allocation.type === "fixed") {
        for (let i = 0; i < allocation.percentages.length; i++) {
            const targetRatio = allocation.percentages[i];
            if (targetRatio === undefined || targetRatio === null) {
                log.push(`Error: Target ratio is undefined/null for fixed allocation at index ${i}`);
                // Decide error handling, maybe skip this allocation part
                return 0; // Cannot proceed with this allocation
            }
            targetInvestmentValues.push(netValue * targetRatio);
        }
    } else { // glidePath
        const elapseRatio = eventDurationYear !== 0 ? (year - simStartYear) / eventDurationYear : 0;
        for (let i = 0; i < investments.length; i++) { // Use investments.length for glide path loop
             if (allocation.initialPercentages[i] === undefined || allocation.finalPercentages[i] === undefined) {
                 log.push(`Error: Glide path percentages undefined/null at index ${i}`);
                 return 0; // Cannot proceed
             }
            const targetRatio = allocation.initialPercentages[i] + (allocation.finalPercentages[i] - allocation.initialPercentages[i]) * elapseRatio;
            targetInvestmentValues.push(netValue * targetRatio);
        }
    }

    log.push(`Target investment values for this part: ${targetInvestmentValues}`);

    // Perform rebalancing for this allocation part
    for (let j = 0; j < investments.length; j++) {
        const investment = investments[j];
        // Added null check for investment which might have been skipped earlier
        if (!investment) continue;
        const targetValue = targetInvestmentValues[j];

         // Added check for undefined targetValue which could happen if loops lengths mismatch
         if (targetValue === undefined) {
            log.push(`Error: Target value undefined for investment ${investment.id} at index ${j}`);
            continue; // Skip this investment
         }

        log.push(`Rebalancing investment ${investment.id} (current value: ${investment.value}) to target value: ${targetValue}`);
        if (investment.value < targetValue) { // purchase
            const amountToBuy = targetValue - investment.value;
            investment.value += amountToBuy;
            log.push(`Bought ${amountToBuy} of investment ${investment.id}, new value: ${investment.value}`);
        } else if (investment.value > targetValue) { // sale
            const amountToSell = investment.value - targetValue;
            investment.value -= amountToSell;
            log.push(`Sold ${amountToSell} of investment ${investment.id}, new value: ${investment.value}`);
            if (investment.taxStatus === "non-retirement") {
                allocationGains += amountToSell; // Add capital gains
            }
        } else {
             log.push(`Investment ${investment.id} is already at target value.`);
        }
    }

    return allocationGains;
}


export function runRebalanceEvents(rebalanceEvents: Event[], year: number, simStartYear: number, log: string[]) {
    log.push(`=== RUNNING REBALANCE EVENTS for Year ${year} ===`);
    let totalDCurYearGains = 0; // Accumulate gains across all active events and allocations

    for (let i = 0; i < rebalanceEvents.length; i++) {
        const event = rebalanceEvents[i];
        // Type assertion for RebalanceEvent - ensure this event is indeed a RebalanceEvent if filtering isn't done upstream
        if (event.eventType.type !== 'rebalance') continue;

        const eventType = event.eventType as RebalanceEvent;
        const eventStartYear = event.startYear as FixedYear; // Assuming FixedYear for simplicity, adjust if needed
        const eventDuration = event.duration as FixedYear; // Assuming FixedYear for simplicity, adjust if needed

        // Basic check for year validity, consider refining based on exact start/duration types
        if (year >= eventStartYear.year && year < (eventStartYear.year + eventDuration.year)) {
            log.push(`Rebalance Event ${event.name} is active for year ${year}`);

            const portfolioDistribution = eventType.portfolioDistribution;
            const eventDurationYear = eventDuration.year; // Store duration year for helper function

            if (Array.isArray(portfolioDistribution)) {
                // Handle array of allocations
                 log.push(`Event ${event.name} has multiple allocation parts.`);
                for (const allocation of portfolioDistribution) {
                   totalDCurYearGains += processAllocation(allocation, year, simStartYear, eventDurationYear, log);
                }
            } else {
                // Handle single allocation object
                 log.push(`Event ${event.name} has a single allocation part.`);
                 totalDCurYearGains += processAllocation(portfolioDistribution, year, simStartYear, eventDurationYear, log);
            }
        }
    }
    log.push(`=== FINISHED REBALANCE EVENTS for Year ${year}, Total Gains: ${totalDCurYearGains} ===`);
    return totalDCurYearGains; // Return total change in curYearGains from all rebalancing
}