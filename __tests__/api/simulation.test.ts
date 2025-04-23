import { updateIncomeEvents } from '@/app/api/simulation/updateIncomeEvents';
import { updateInvestmentEvent } from '@/app/api/simulation/updateInvestmentEvent';
import { Event } from '@/types/event';

const mockIncomeEvent: Event = {
    "id": "incomeEvent1",
    "name": "Income Event 1",
    "description": "Default fixed income event with inflation adjustment. Fixed start year and duration.",
    "startYear": {
        "type": "fixed",
        "year": 2025
    },
    "duration": {
        "type": "fixed",
        "year": 10
    },
    "eventType": {
        "type": "income",
        "amount": 70000,
        "inflationAdjustment": true,
        "expectedAnnualChange": {
            "type": "fixed",
            "valueType": "percentage",
            "value": 110
        },
        "socialSecurity": false,
        "wage": true
    }    
};

const mockInvestmentEvent: Event = {
    "id": "cashOnly",
    "name": "Cash Only Event",
    "description": "Default cash event and no other investments.",
    "startYear": {
        "type": "fixed",
        "year": 2025
    },
    "duration": {
        "type": "fixed",
        "year": 99
    },
    "eventType": {
        "type": "investment",
        "inflationAdjustment": true,
        "assetAllocation":{
            "type": "fixed",
            "investments":[
                {
                    "id": "cashInvestment",
                    "value": 10000,
                    "investmentType": {
                        "id": "cash",
                        "name": "Cash Account",
                        "description": "Default cash investment",
                        "expectedAnnualReturn": {
                            "type": "fixed",
                            "valueType": "percentage",
                            "value": 100
                        },
                        "expenseRatio": 0,
                        "expectedAnnualIncome": {
                            "type": "fixed",
                            "valueType": "amount",
                            "value": 0
                        },
                        "taxability": true
                    },
                    "taxStatus": "non-retirement",
                    "purchasePrice": 0
                }
            ],
            "percentages": [100]
        },
        "maxCash": 999999999
    }
};

const mockInvestmentEvent2: Event = {
    "id": "cashAndInvest1",
    "name": "Cash Only Event + Investment Event 1",
    "description": "Default cash event and investment event 1. Fixed allocation ratio.",
    "startYear": {
        "type": "fixed",
        "year": 2025
    },
    "duration": {
        "type": "fixed",
        "year": 99
    },
    "eventType": {
        "type": "investment",
        "inflationAdjustment": true,
        "assetAllocation":{
            "type": "fixed",
            "investments":[
                {
                    "id": "cashInvestment",
                    "value": 10000,
                    "investmentType": {
                        "id": "cash",
                        "name": "Cash Account",
                        "description": "Default cash investment",
                        "expectedAnnualReturn": {
                            "type": "fixed",
                            "valueType": "percentage",
                            "value": 100
                        },
                        "expenseRatio": 0,
                        "expectedAnnualIncome": {
                            "type": "fixed",
                            "valueType": "amount",
                            "value": 0
                        },
                        "taxability": true
                    },
                    "taxStatus": "non-retirement",
                    "purchasePrice": 0
                },
                {
                    "id": "investment1",
                    "value": 10000,
                    "investmentType": {
                        "id": "investmenttype1",
                        "name": "Fixed amounts investment",
                        "description": "All fixed",
                        "expectedAnnualReturn": {
                            "type": "fixed",
                            "valueType": "percentage",
                            "value": 110
                        },
                        "expenseRatio": 0,
                        "expectedAnnualIncome": {
                            "type": "fixed",
                            "valueType": "amount",
                            "value": 1000
                        },
                        "taxability": true
                    },
                    "taxStatus": "non-retirement",
                    "purchasePrice": 5000
                }
            ],
            "percentages": [50,50]
        },
        "maxCash": 999999999
    }
};

describe('Simulation: Run income events', () => {
    it('should update income events correctly', async () => {
        const updatedEvents = await updateIncomeEvents([mockIncomeEvent], 2025, mockInvestmentEvent, 1, "percentage");
        expect(updatedEvents).toBeDefined(); // Ensure the result is not undefined or null
        expect(updatedEvents).toHaveProperty('incomeEvents'); // Ensure 'incomeEvents' exists
        expect(updatedEvents).toHaveProperty('curYearIncome'); // Ensure 'curYearIncome' exists
        expect(updatedEvents).toHaveProperty('curYearSS'); // Ensure 'curYearSS' exists

        expect(updatedEvents.incomeEvents).toBeInstanceOf(Array); // Ensure 'incomeEvents' is an array
        expect(updatedEvents.incomeEvents).toHaveLength(1); // Check the number of income events
        expect(updatedEvents.incomeEvents[0].eventType.amount).toBeCloseTo(77000); // Check the amount

        expect(updatedEvents.curYearIncome).toBeCloseTo(77000); // Ensure income is calculated correctly
        expect(updatedEvents.curYearSS).toBeCloseTo(0); // Ensure social security is calculated correctly
    });
});

describe('Simulation: Update values of investments', () => {
    it('should update investment events correctly', () => {
        const dCurYearIncome = updateInvestmentEvent(mockInvestmentEvent2);
        expect(dCurYearIncome).toBeDefined(); // Ensure the result is not undefined or null
        expect(dCurYearIncome).toBe(1000); // non-retirement income from investment1

        expect(mockInvestmentEvent2.eventType.assetAllocation.investments[0].value).toBeCloseTo(10000); // cash account does not change
        expect(mockInvestmentEvent2.eventType.assetAllocation.investments[1].value).toBeCloseTo(12100); // (value + income) * annual return
    });
});