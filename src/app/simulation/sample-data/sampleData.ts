import { FixedValues } from "@/types/utils";
import { Investment } from "@/types/investment";



export const LineChartSample = [
  { parameterValue: 2025, finalResult: 80 },
  { parameterValue: 2026, finalResult: 82 },
  { parameterValue: 2027, finalResult: 85 },
  { parameterValue: 2028, finalResult: 87 },
  { parameterValue: 2029, finalResult: 90 },
  { parameterValue: 2030, finalResult: 88 },
  { parameterValue: 2031, finalResult: 92 },
  { parameterValue: 2032, finalResult: 95 },
];


export const ShadedDataSample = [
    { year: 2025, p10: 800000, p20: 900000, p30: 1000000, p40: 1100000, median: 1200000, p60: 1300000, p70: 1350000, p80: 1400000, p90: 1500000 },
    { year: 2026, p10: 850000, p20: 950000, p30: 1050000, p40: 1150000, median: 1250000, p60: 1350000, p70: 1400000, p80: 1450000, p90: 1550000 },
    { year: 2027, p10: 900000, p20: 1000000, p30: 1100000, p40: 1200000, median: 1300000, p60: 1400000, p70: 1450000, p80: 1500000, p90: 1600000 },
    { year: 2028, p10: 850000, p20: 950000, p30: 1050000, p40: 1150000, median: 1250000, p60: 1350000, p70: 1400000, p80: 1450000, p90: 1550000 },
    { year: 2029, p10: 800000, p20: 900000, p30: 1000000, p40: 1100000, median: 1200000, p60: 1300000, p70: 1350000, p80: 1400000, p90: 1500000 },
    { year: 2030, p10: 750000, p20: 850000, p30: 950000, p40: 1050000, median: 1150000, p60: 1250000, p70: 1300000, p80: 1350000, p90: 1450000 },
    { year: 2031, p10: 700000, p20: 800000, p30: 900000, p40: 1000000, median: 1100000, p60: 1200000, p70: 1250000, p80: 1300000, p90: 1400000 },
    { year: 2032, p10: 650000, p20: 750000, p30: 850000, p40: 950000, median: 1050000, p60: 1150000, p70: 1200000, p80: 1250000, p90: 1350000 },
    { year: 2033, p10: 600000, p20: 700000, p30: 800000, p40: 900000, median: 1000000, p60: 1100000, p70: 1150000, p80: 1200000, p90: 1300000 },
    { year: 2034, p10: 550000, p20: 650000, p30: 750000, p40: 850000, median: 950000, p60: 1050000, p70: 1100000, p80: 1150000, p90: 1250000 },
    { year: 2035, p10: 500000, p20: 600000, p30: 700000, p40: 800000, median: 900000, p60: 1000000, p70: 1050000, p80: 1100000, p90: 1200000 },
  ];

interface YearlyInvestmentData {
    year: number;
    median: Investment[];
    average: Investment[];
  }

const rothIRAType = {
  id: "inv-type-1",
  name: "Roth IRA - Growth Fund",
  description: "Tax-Free growth investment",
  expectedAnnualReturn: { type: "fixed", valueType: "percentage", value: 7 } as FixedValues,
  expenseRatio: 0.01,
  expectedAnnualIncome: { type: "fixed", valueType: "amount", value: 0 } as FixedValues,
  taxability: false,
};

const traditional401kType = {
  id: "inv-type-2",
  name: "401k - Index Fund",
  description: "Tax-Deferred retirement fund",
  expectedAnnualReturn: { type: "fixed", valueType: "percentage", value: 6 } as FixedValues,
  expenseRatio: 0.02,
  expectedAnnualIncome: { type: "fixed", valueType: "amount", value: 0 } as FixedValues,
  taxability: false,
};

const brokerageType = {
  id: "inv-type-3",
  name: "Brokerage - Tech Stocks",
  description: "Taxable high-growth stock",
  expectedAnnualReturn: { type: "fixed", valueType: "percentage", value: 8 } as FixedValues,
  expenseRatio: 0.015,
  expectedAnnualIncome: { type: "fixed", valueType: "amount", value: 0 } as FixedValues,
  taxability: true,
};

export const StackedBarChartData = [
  {
    year: 2025,
    median: [
      {
        id: "inv-1",
        value: 200000,
        investmentType: rothIRAType,
        taxStatus: "after-tax"
      },
      {
        id: "inv-2",
        value: 300000,
        investmentType: traditional401kType,
        taxStatus: "pre-tax"
      },
      {
        id: "inv-3",
        value: 150000,
        investmentType: brokerageType,
        taxStatus: "non-retirement"
      },
    ] as Investment[],
    average: [
      {
        id: "inv-1",
        value: 210000,
        investmentType: rothIRAType,
        taxStatus: "after-tax"
      },
      {
        id: "inv-2",
        value: 310000,
        investmentType: traditional401kType,
        taxStatus: "pre-tax"
      },
      {
        id: "inv-3",
        value: 160000,
        investmentType: brokerageType,
        taxStatus: "non-retirement"
      },
    ] as Investment[],
  },
  {
    year: 2026,
    median: [
      {
        id: "inv-1",
        value: 220000,
        investmentType: rothIRAType,
        taxStatus: "after-tax"
      },
      {
        id: "inv-2",
        value: 320000,
        investmentType: traditional401kType,
        taxStatus: "pre-tax"
      },
      {
        id: "inv-3",
        value: 180000,
        investmentType: brokerageType,
        taxStatus: "non-retirement"
      },
    ] as Investment[],
    average: [
      {
        id: "inv-1",
        value: 230000,
        investmentType: rothIRAType,
        taxStatus: "after-tax"
      },
      {
        id: "inv-2",
        value: 330000,
        investmentType: traditional401kType,
        taxStatus: "pre-tax"
      },
      {
        id: "inv-3",
        value: 190000,
        investmentType: brokerageType,
        taxStatus: "non-retirement"
      },
    ] as Investment[],
  },
] as YearlyInvestmentData[];

interface ScenarioLineData {
  parameterValue: string | number;  // E.g., Retirement Age 60, 62, 65
  points: { year: number; value: number }[];
}


export const multiLineSampleData: ScenarioLineData[] = [
  {
    parameterValue: 60,
    points: [
      { year: 2025, value: 80 },
      { year: 2026, value: 83 },
      { year: 2027, value: 79 },
      { year: 2028, value: 85 },
      { year: 2029, value: 82 },
      { year: 2030, value: 88 },
      { year: 2031, value: 86 },
      { year: 2032, value: 90 },
      { year: 2033, value: 87 },
      { year: 2034, value: 92 },
    ],
  },
  {
    parameterValue: 62,
    points: [
      { year: 2025, value: 78 },
      { year: 2026, value: 82 },
      { year: 2027, value: 80 },
      { year: 2028, value: 86 },
      { year: 2029, value: 83 },
      { year: 2030, value: 89 },
      { year: 2031, value: 85 },
      { year: 2032, value: 91 },
      { year: 2033, value: 88 },
      { year: 2034, value: 93 },
    ],
  },
  {
    parameterValue: 65,
    points: [
      { year: 2025, value: 75 },
      { year: 2026, value: 80 },
      { year: 2027, value: 78 },
      { year: 2028, value: 84 },
      { year: 2029, value: 81 },
      { year: 2030, value: 87 },
      { year: 2031, value: 83 },
      { year: 2032, value: 89 },
      { year: 2033, value: 86 },
      { year: 2034, value: 91 },
    ],
  },
];

interface ParamVsResultPoint {
  parameterValue: number;
  finalResult: number; // % or $
}

export const paramVsResultSample: ParamVsResultPoint[] = [
  { parameterValue: 60, finalResult: 75 }, // 75% probability at age 60
  { parameterValue: 62, finalResult: 80 },
  { parameterValue: 65, finalResult: 85 },
  { parameterValue: 67, finalResult: 83 },
];
