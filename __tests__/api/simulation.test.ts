import { updateIncomeEvents } from '@/app/api/simulation/updateIncomeEvents';
import { updateInvestmentEvent } from '@/app/api/simulation/updateInvestmentEvent';
import { Event } from '@/types/event';
import { Investment } from '@/types/investment';
import { rothConversion } from '@/app/api/simulation/rothConversion';
import { getTaxData } from '@/lib/taxData';

const mockLog: string[] = [];
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

const mockIncomeEvent2: Event = {
    "id": "incomeEvent2",
    "name": "Income Event 2",
    "description": "Income event with SS and normal annual change. Very unlikely to decrease.",
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
            "type": "normal",
            "valueType": "percentage",
            "mean": 200,
            "stdDev": 0.01
        },
        "socialSecurity": true,
        "wage": false
    }    
};

const mockIncomeEvent3: Event = {
    "id": "incomeEvent3",
    "name": "Income Event 3",
    "description": "Income event FLAT INFLATION,  SS, and uniform annual change. Impossible event.",
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
            "type": "uniform",
            "valueType": "percentage",
            "min": 110,
            "max": 120
        },
        "socialSecurity": true,
        "wage": false
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

const mockNoCash: Event = {
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
                    "id": "investment1",
                    "value": 10000,
                    "investmentType": {
                        "id": "investmenttype1",
                        "name": "Variable amounts investment",
                        "description": "Normal annual % return, normal annual amount income",
                        "expectedAnnualReturn": {
                            "type": "normal",
                            "valueType": "percentage",
                            "mean": 100,
                            "stdDev": 1
                        },
                        "expenseRatio": 0,
                        "expectedAnnualIncome": {
                            "type": "normal",
                            "valueType": "amount",
                            "mean": 1000,
                            "stdDev": 50
                        },
                        "taxability": true
                    },
                    "taxStatus": "non-retirement",
                    "purchasePrice": 5000
                }
            ],
            "percentages": [100]
        },
        "maxCash": 999999999
    }
};

const mockCashInvestment: Investment = {
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
};
const mockInvestment1: Investment = {
    "id": "investment1",
    "value": 10000,
    "investmentType": {
        "id": "investmenttype1",
        "name": "Variable amounts investment",
        "description": "Normal annual % return, normal annual amount income",
        "expectedAnnualReturn": {
            "type": "normal",
            "valueType": "percentage",
            "mean": 100,
            "stdDev": 1
        },
        "expenseRatio": 0,
        "expectedAnnualIncome": {
            "type": "normal",
            "valueType": "amount",
            "mean": 1000,
            "stdDev": 50
        },
        "taxability": true
    },
    "taxStatus": "non-retirement",
    "purchasePrice": 5000
};
const mockInvestment2: Investment = {
    "id": "investment2",
    "value": 100000,
    "investmentType": {
        "id": "investmenttype1",
        "name": "Variable amounts investment",
        "description": "Normal annual % return, normal annual amount income",
        "expectedAnnualReturn": {
            "type": "normal",
            "valueType": "percentage",
            "mean": 100,
            "stdDev": 1
        },
        "expenseRatio": 0,
        "expectedAnnualIncome": {
            "type": "normal",
            "valueType": "amount",
            "mean": 1000,
            "stdDev": 50
        },
        "taxability": true
    },
    "taxStatus": "pre-tax",
    "purchasePrice": 5000
};
const mockInvestment3: Investment = {
    "id": "investment3",
    "value": 10000,
    "investmentType": {
        "id": "investmenttype1",
        "name": "Variable amounts investment",
        "description": "Normal annual % return, normal annual amount income",
        "expectedAnnualReturn": {
            "type": "normal",
            "valueType": "percentage",
            "mean": 100,
            "stdDev": 1
        },
        "expenseRatio": 0,
        "expectedAnnualIncome": {
            "type": "normal",
            "valueType": "amount",
            "mean": 1000,
            "stdDev": 50
        },
        "taxability": true
    },
    "taxStatus": "after-tax",
    "purchasePrice": 5000
};

describe('Simulation: Run income events', () => {
    it('should update income events correctly', async () => {
        const updatedEvents = await updateIncomeEvents([mockIncomeEvent], 2025, mockInvestmentEvent, 1, "percentage", mockLog);
        expect(updatedEvents).toBeDefined(); // Ensure the result is not undefined or null
        expect(updatedEvents).toHaveProperty('incomeEvents'); // Ensure 'incomeEvents' exists
        expect(updatedEvents).toHaveProperty('curYearIncome'); // Ensure 'curYearIncome' exists
        expect(updatedEvents).toHaveProperty('curYearSS'); // Ensure 'curYearSS' exists

        expect(updatedEvents.incomeEvents).toBeInstanceOf(Array); // Ensure 'incomeEvents' is an array
        expect(updatedEvents.incomeEvents).toHaveLength(1); // Check the number of income events
        expect(updatedEvents.incomeEvents[0].eventType.amount).toBeCloseTo(77000); // Check the amount

        expect(updatedEvents.curYearIncome).toBeCloseTo(77000); // Ensure income is calculated correctly
        expect(updatedEvents.curYearSS).toBeCloseTo(0); // Ensure social security is calculated correctly

        const failedEvents = await updateIncomeEvents([mockIncomeEvent], 2025, mockNoCash, 1, "percentage", mockLog);
        expect(failedEvents).toBeNull(); // Ensure the result is null when no cash investment is found

        const normalTest = await updateIncomeEvents([mockIncomeEvent2], 2025, mockInvestmentEvent, 1, "percentage", mockLog);
        expect(normalTest).toBeDefined(); // Ensure the result is not undefined or null
        expect(normalTest.curYearIncome).toBeGreaterThan(70000);
        expect(normalTest.curYearSS).toBeGreaterThan(70000);

        const uniformTest = await updateIncomeEvents([mockIncomeEvent3], 2025, mockInvestmentEvent, 0, "amount", mockLog);
        expect(uniformTest).toBeDefined(); // Ensure the result is not undefined or null
        expect(uniformTest.curYearIncome).toBeGreaterThan(77000);
        expect(uniformTest.curYearSS).toBeGreaterThan(77000);
    });
});

describe('Simulation: Update values of investments', () => {
    it('should update investment events correctly', () => {
        const dCurYearIncome = updateInvestmentEvent(mockInvestmentEvent2, mockLog);
        expect(dCurYearIncome).toBeDefined(); // Ensure the result is not undefined or null
        expect(dCurYearIncome).toBe(1000); // non-retirement income from investment1

        expect(mockInvestmentEvent2.eventType.assetAllocation.investments[0].value).toBeCloseTo(10000); // cash account does not change
        expect(mockInvestmentEvent2.eventType.assetAllocation.investments[1].value).toBeCloseTo(12100); // (value + income) * annual return // Ensure the result is null
    });
});

describe('Simulation: Roth Conversion optimizer', () => {
    it('should transfer investments correctly', async () => {
        const taxData = await getTaxData(); // has 2025 tax data
        const rc = rothConversion(70000, 0, taxData, false, 2025, [mockInvestment2], [mockCashInvestment, mockInvestment1, mockInvestment2, mockInvestment3], mockLog);
        expect(rc).toBeDefined(); // Ensure the result is not undefined or null
        expect(rc).toBeCloseTo(45125);
    });
})