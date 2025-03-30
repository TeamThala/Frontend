import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";

import User from "@/models/User";
import InvestmentType from "@/models/InvestmentType";
import Investment from "@/models/Investment";
import Event from "@/models/Event";
import Scenario from "@/models/Scenario";

export async function POST() {
  await dbConnect();

  try {
    const user = await User.findOne({ email: "uday.turakhia@stonybrook.edu" });
    await InvestmentType.deleteMany({});
    await Investment.deleteMany({});
    await Event.deleteMany({});
    await Scenario.deleteMany({});

    if (!user) {
      return NextResponse.json({ success: false, error: "User Anuj not found" }, { status: 404 });
    }
    // Create investment types
    const [cashType, stocksType, bondsType, realEstateType, cryptoType] = await InvestmentType.create([
      {
        name: "Cash",
        description: "Cash or savings account with minimal return",
        expectedAnnualReturn: { type: "fixed", valueType: "percentage", value: 1 },
        expenseRatio: 0,
        expectedAnnualIncome: { type: "fixed", valueType: "amount", value: 0 },
        taxability: false,
      },
      {
        name: "Stocks",
        description: "Broad market equities",
        expectedAnnualReturn: { type: "normal", valueType: "percentage", mean: 7, stdDev: 2 },
        expenseRatio: 0.01,
        expectedAnnualIncome: { type: "fixed", valueType: "amount", value: 200 },
        taxability: true,
      },
      {
        name: "Bonds",
        description: "Government or corporate bonds",
        expectedAnnualReturn: { type: "fixed", valueType: "percentage", value: 3 },
        expenseRatio: 0.005,
        expectedAnnualIncome: { type: "fixed", valueType: "amount", value: 100 },
        taxability: true,
      },
      {
        name: "Real Estate",
        description: "Real estate holdings or REITs",
        expectedAnnualReturn: { type: "uniform", valueType: "percentage", min: 3, max: 8 },
        expenseRatio: 0.02,
        expectedAnnualIncome: { type: "fixed", valueType: "amount", value: 300 },
        taxability: true,
      },
      {
        name: "Crypto",
        description: "Cryptocurrency assets",
        expectedAnnualReturn: { type: "normal", valueType: "percentage", mean: 10, stdDev: 5 },
        expenseRatio: 0.02,
        expectedAnnualIncome: { type: "fixed", valueType: "amount", value: 0 },
        taxability: true,
      },
    ]);

    const [investmentCash, investmentStocks, investmentBonds, investmentRealEstate, investmentCrypto] =
      await Investment.create([
        { value: 5000, investmentType: cashType._id, taxStatus: "non-retirement" },
        { value: 10000, investmentType: stocksType._id, taxStatus: "non-retirement" },
        { value: 5000, investmentType: bondsType._id, taxStatus: "pre-tax" },
        { value: 20000, investmentType: realEstateType._id, taxStatus: "non-retirement" },
        { value: 3000, investmentType: cryptoType._id, taxStatus: "after-tax" },
      ]);

    const eventIncome = await Event.create({
      name: "Salary",
      description: "Monthly salary income",
      startYear: { type: "fixed", year: 2025 },
      duration: { type: "fixed", year: 10 },
      eventType: {
        type: "income",
        amount: 4000,
        expectedAnnualChange: { type: "fixed", valueType: "percentage", value: 3 },
        inflationAdjustment: true,
        socialSecurity: false,
      },
    });

    const eventExpense = await Event.create({
      name: "Rent",
      description: "Monthly rent or mortgage",
      startYear: { type: "fixed", year: 2025 },
      duration: { type: "fixed", year: 10 },
      eventType: {
        type: "expense",
        amount: 1500,
        expectedAnnualChange: { type: "fixed", valueType: "percentage", value: 2 },
        inflationAdjustment: true,
        discretionary: false,
      },
    });

    const eventInvestment = await Event.create({
      name: "Allocate to Stocks",
      description: "Invest some savings into stocks portfolio",
      startYear: { type: "fixed", year: 2026 },
      duration: { type: "fixed", year: 5 },
      eventType: {
        type: "investment",
        assetAllocation: [
          { type: "fixed", investment: investmentStocks._id, percentage: 100 }
        ],
        maximumCash: 5000,
      },
    });

    const eventRebalance = await Event.create({
      name: "Portfolio Rebalance",
      description: "Rebalance the portfolio to 50% stocks, 50% bonds",
      startYear: { type: "fixed", year: 2027 },
      duration: { type: "fixed", year: 1 },
      eventType: {
        type: "rebalance",
        assetAllocation: [
          { type: "fixed", investment: investmentStocks._id, percentage: 50 },
          { type: "fixed", investment: investmentBonds._id, percentage: 50 },
        ],
      },
    });

    const eventAdvanced = await Event.create({
      name: "Advanced Investment Strategy",
      description: "Implements a glide path allocation",
      startYear: { type: "normal", mean: 2030, stdDev: 1 },
      duration: { type: "uniform", startYear: 5, endYear: 10 },
      eventType: {
        type: "investment",
        assetAllocation: [
          {
            type: "glidePath",
            investment: investmentStocks._id,
            initialPercentage: 80,
            finalPercentage: 50,
          },
          {
            type: "glidePath",
            investment: investmentBonds._id,
            initialPercentage: 20,
            finalPercentage: 50,
          },
        ],
        maximumCash: 10000,
      },
    });

    const singleScenario = await Scenario.create({
      type: "single",
      name: "Complete Financial Plan",
      description: "Scenario with one event each for income, expense, investment, rebalance",
      financialGoal: 1000000,
      investments: [
        investmentCash._id,
        investmentStocks._id,
        investmentBonds._id,
        investmentRealEstate._id,
        investmentCrypto._id,
      ],
      eventSeries: [
        eventIncome._id,
        eventExpense._id,
        eventInvestment._id,
        eventRebalance._id,
        eventAdvanced._id,
      ],
      spendingStrategy: [eventExpense._id],
      expenseWithdrawalStrategy: [eventInvestment._id],
      inflationRate: { type: "normal", valueType: "percentage", mean: 2, stdDev: 0.5 },
      RothConversionStrategy: [{
        startYear: 2050,
        endYear: 2054,
        investmentOrder: [investmentBonds._id, investmentStocks._id],
        maxTaxBracket: 28,
      }],
      RMDStrategy: [{
        startAge: 72,
        investmentOrder: [investmentBonds._id, investmentStocks._id],
        percentage: { type: "fixed", valueType: "percentage", value: 4 }
      }],
      rothConversion: { rothConversion: false },
      residenceState: "CA",
      owner: user._id,
      viewPermissions: [user._id],
      editPermissions: [user._id],
      userBirthYear: 1980,
      userLifeExpectancy: { type: "fixed", valueType: "year", value: 87 },
    });

    const coupleScenario = await Scenario.create({
      type: "married",
      name: "Couple Financial Plan",
      description: "Financial plan for a married couple",
      financialGoal: 1500000,
      investments: [investmentCash._id, investmentStocks._id, investmentBonds._id],
      eventSeries: [eventIncome._id, eventExpense._id],
      spendingStrategy: [eventExpense._id],
      expenseWithdrawalStrategy: [eventInvestment._id],
      inflationRate: { type: "normal", valueType: "percentage", mean: 2, stdDev: 0.5 },
      RothConversionStrategy: [{
        startYear: 2040,
        endYear: 2044,
        investmentOrder: [investmentBonds._id, investmentStocks._id],
        maxTaxBracket: 28,
      }],
      RMDStrategy: [{
        startAge: 72,
        investmentOrder: [investmentBonds._id, investmentStocks._id],
        percentage: { type: "fixed", valueType: "percentage", value: 4 }
      }],
      rothConversion: { rothConversion: false },
      residenceState: "NY",
      owner: user._id,
      viewPermissions: [singleScenario._id],
      editPermissions: [user._id],
      userBirthYear: 1980,
      userLifeExpectancy: { type: "normal", valueType: "year", mean: 85, stdDev: 5 },
      spouseBirthYear: 1982,
      spouseLifeExpectancy: { type: "fixed", valueType: "year", value: 87 },
    });

    const rothScenario = await Scenario.create({
      type: "single",
      name: "Roth Conversion Plan",
      description: "Financial plan with Roth conversion strategy",
      financialGoal: 1200000,
      investments: [investmentCash._id, investmentStocks._id, investmentBonds._id],
      eventSeries: [eventIncome._id, eventExpense._id],
      spendingStrategy: [eventExpense._id],
      expenseWithdrawalStrategy: [eventInvestment._id],
      inflationRate: { type: "fixed", valueType: "percentage", value: 2.5 },
      RothConversionStrategy: [{
        startYear: 2030,
        endYear: 2035,
        investmentOrder: [investmentBonds._id, investmentStocks._id],
        maxTaxBracket: 24,
      }],
      RMDStrategy: [{
        startAge: 72,
        investmentOrder: [investmentBonds._id, investmentStocks._id],
        percentage: { type: "fixed", valueType: "percentage", value: 4 }
      }],
      rothConversion: {
        rothConversion: true,
        RothConversionStartYear: 2030,
        RothConversionEndYear: 2035,
      },
      residenceState: "FL",
      owner: user._id,
      viewPermissions: [singleScenario._id, coupleScenario._id],
      editPermissions: [user._id, coupleScenario._id, singleScenario._id],
      userBirthYear: 1975,
      userLifeExpectancy: { type: "fixed", valueType: "year", value: 85 },
    });

    await Scenario.findByIdAndUpdate(rothScenario._id, {
      $set: { editPermissions: [rothScenario._id] }
    });

    await User.findByIdAndUpdate(user._id, {
      $set: {
        createdScenarios: [singleScenario._id, coupleScenario._id, rothScenario._id]
      }
    });

    return NextResponse.json({
      message: "Successfully seeded the database with data matching the exact TypeScript interfaces",
      data: {
        investmentTypes: [cashType, stocksType, bondsType, realEstateType, cryptoType],
        investments: [investmentStocks, investmentBonds, investmentRealEstate, investmentCrypto],
        events: [eventIncome, eventExpense, eventInvestment, eventRebalance, eventAdvanced],
        user: user,
        scenarios: [singleScenario, coupleScenario, rothScenario]
      }
    }, { status: 200 });
  } catch (error) {
    console.error("Seeding error:", error);
    return NextResponse.json({ error: "Seeding failed" }, { status: 500 });
  }
}
