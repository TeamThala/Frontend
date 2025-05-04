import { Event, RebalanceEvent } from "@/types/event";
import { FixedYear } from "@/types/event";

export function runRebalanceEvents(rebalanceEvents: Event[], year: number, simStartYear: number, log: string[]) {
    log.push(`=== RUNNING REBALANCE EVENTS ===`);
    let dCurYearGains = 0; // to return this change in curYearGains from rebalancing investments
    for (let i = 0; i < rebalanceEvents.length; i++) {
        const event = rebalanceEvents[i];
        const eventType = event.eventType as RebalanceEvent;
        const eventStartYear = event.startYear as FixedYear;
        const eventDuration = event.duration as FixedYear;
        
        if (year >= eventStartYear.year && year <= (eventStartYear.year + eventDuration.year)) {
            log.push(`Rebalance Event ${event.name} is active`);
            // Collect investments to rebalance
            const investments = eventType.portfolioDistribution.investments;
            if (!investments || investments.length === 0) {
                log.push(`No investments to rebalance for event ${event.name}`);
                continue;
            }
            else{
                // Net value of investments inside rebalance event
                let netValue = 0;
                for (let j = 0; j < investments.length; j++) {
                    const investment = investments[j];
                    if (investment === undefined || investment === null) {
                        log.push(`Error: Investment ${j} is undefined or null`);
                        return null;
                    }
                    netValue += investment.value;
                }
                // find target values based on asset allocation based on net value
                const targetInvestmentValues: number[] = [];
                if (eventType.portfolioDistribution.type === "fixed"){
                    log.push(`Rebalance is Fixed`);
                    for (let i=0; i<eventType.portfolioDistribution.percentages.length; i++){
                        const targetRatio = eventType.portfolioDistribution.percentages[i]/100;
                        if (targetRatio === undefined || targetRatio === null){
                            log.push(`Error: Target ratio ${targetRatio} is undefined or null in iteration ${i}`);
                            return null;
                        }
                        const targetValue = netValue * targetRatio; // target value of investment
                        log.push(`Target value of investment ${i} is ${targetValue} (net value: ${netValue}, target ratio: ${targetRatio})`);
                        targetInvestmentValues.push(targetValue);
                    }
            
                }
                else{ // glidePath
                    const elapseRatio = eventDuration.year !== 0 ? (year - eventStartYear.year) / eventDuration.year : 0; // percentage of how much current event has elapsed until end
                    log.push(`Rebalance is GlidePath with elapse ratio: ${elapseRatio}`);
                    for (let i=0; i<investments.length; i++){
                        if (eventType.portfolioDistribution.initialPercentages[i] === undefined || eventType.portfolioDistribution.finalPercentages[i] === undefined){
                            log.push(`Error: Target ratio ${eventType.portfolioDistribution.initialPercentages[i]} or ${eventType.portfolioDistribution.finalPercentages[i]} is undefined`);
                            return null;
                        }
                        const targetRatio = (eventType.portfolioDistribution.initialPercentages[i] + (eventType.portfolioDistribution.finalPercentages[i] - eventType.portfolioDistribution.initialPercentages[i]) * elapseRatio)/100; // target ratio of investment
                        const targetValue = netValue * targetRatio; // target value of investment
                        log.push(`Target value of investment ${i} is ${targetValue} (net value: ${netValue}, target ratio: ${targetRatio})`);
                        targetInvestmentValues.push(targetValue);
                    }
            
                }
                log.push(`Target investment values: ${targetInvestmentValues}`);
                for (let j = 0; j < investments.length; j++) {
                    const investment = investments[j];
                    const targetValue = targetInvestmentValues[j];
                    log.push(`Rebalancing investment ${investment.id} to target allocation of ${targetValue}`);
                    if (investment.value < targetValue){ // purchase, investment value will increase
                        const amountToBuy = targetValue - investment.value; // amount to buy
                        investment.value += amountToBuy; // buy investment
                        log.push(`Bought ${amountToBuy} of investment ${investment.id}, new value: ${investment.value}`);
                    }
                    else{ //sale, investment value will decrease
                        const amountToSell = investment.value - targetValue; // amount to sell
                        investment.value -= amountToSell; // sell investment
                        log.push(`Sold ${amountToSell} of investment ${investment.id}, new value: ${investment.value}`);
                        if (investment.taxStatus === "non-retirement"){
                            dCurYearGains += amountToSell; // capital gains on non-retirement investments
                        }
                    }
                }
            }
        }
    }
    return dCurYearGains; // return change in curYearGains from rebalancing investments
}