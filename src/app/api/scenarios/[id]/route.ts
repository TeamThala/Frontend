// new chanhed version
/* eslint-disable */
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";

import "@/models/Investment";
import "@/models/Event";
import "@/models/User";
import "@/models/InvestmentType";

import Scenario from "@/models/Scenario";
import Event from "@/models/Event";
import InvestmentType from "@/models/InvestmentType";
import Investment from "@/models/Investment";
import User from "@/models/User";
import {
  FixedYear,
  UniformYear,
  NormalYear,
  EventYear,
  InvestmentEvent,
  RebalanceEvent,
} from "@/types/event";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { CoupleScenario } from "@/types/scenario";

/* ────────────────────────────────
   Helper / aux types
   ──────────────────────────────── */
type DbStartYear =
  | { type: "fixed"; year: number }
  | { type: "uniform"; year: { min: number; max: number } }
  | { type: "normal"; year: { mean: number; stdDev: number } }
  | {
      type: "event";
      eventTime: "start" | "end";
      eventId?: mongoose.Types.ObjectId;
    };

    //  ──  types / helper section  ──────────────────────────────
type DbDuration =
| {
    type: "fixed";
    valueType: "amount";
    year: number;                          //  ← plain number
  }
| {
    type: "uniform";
    valueType: "amount";
    year: { min: number; max: number; valueType: "amount" };
  }
| {
    type: "normal";
    valueType: "amount";
    year: { mean: number; stdDev: number; valueType: "amount" };
  };

  

type StateTaxFileEntry = [stateCode: string, fileId: string];

type ScenarioUpdateBody = CoupleScenario & {
  stateTaxFiles?: StateTaxFileEntry[];
};

/* ────────────────────────────────
   Utilities
   ──────────────────────────────── */
const isMongoId = (v: unknown): v is string =>
  typeof v === "string" && mongoose.Types.ObjectId.isValid(v);

async function normalizeStartYear(
  raw: FixedYear | UniformYear | NormalYear | EventYear,
): Promise<DbStartYear> {
  switch (raw.type) {
    case "fixed":
      return { type: "fixed", year: raw.year };
    case "uniform":
      return { type: "uniform", year: { min: raw.year.min, max: raw.year.max } };
    case "normal":
      return {
        type: "normal",
        year: { mean: raw.year.mean, stdDev: raw.year.stdDev },
      };
    case "event":
      // return {
      //   type: "event",
      //   eventTime: raw.eventTime,
      //   ...(isMongoId(raw.eventId)
      //     ? { eventId: new mongoose.Types.ObjectId(raw.eventId) }
      //     : {}),
      // };
      if (isMongoId((raw as any).eventId)) {
              return {
                type: "event",
                eventTime: raw.eventTime,
                eventId: new mongoose.Types.ObjectId((raw as any).eventId),
              };
            }
        
            // ② Otherwise try the name → _id lookup
            if ((raw as any).eventSeries) {
              const parent = await Event.findOne({ name: (raw as any).eventSeries });
              if (parent) {
              return {
                  type: "event",
                  eventTime: raw.eventTime,
                  eventId: parent._id,
                };
              }
            }
        
            // ③ Couldn’t resolve → just store the stub
            return { type: "event", eventTime: raw.eventTime };
  }
}

function normalizeDuration(
  raw: FixedYear | UniformYear | NormalYear
): DbDuration {
  switch (raw.type) {
    case "fixed":
      return {
        type: "fixed",
        valueType: "amount",
        year: raw.year           // ✅ now matches `number`
      };

    case "uniform":
      return {
        type: "uniform",
        valueType: "amount",
        year: {
          min: raw.year.min,
          max: raw.year.max,
          valueType: "amount",
        },
      };

    case "normal":
      return {
        type: "normal",
        valueType: "amount",
        year: {
          mean: raw.year.mean,
          stdDev: raw.year.stdDev,
          valueType: "amount",
        },
      };
  }
}


function extractInvestmentIds(
  items:
    | null
    | Array<
        | string
        | mongoose.Types.ObjectId
        | { _id?: string | mongoose.Types.ObjectId; id?: string | mongoose.Types.ObjectId }
      >,
): mongoose.Types.ObjectId[] {
  if (!items) return [];
  return items
    .map((ref) => {
      if (!ref) return null;
      if (ref instanceof mongoose.Types.ObjectId) return ref;
      if (typeof ref === "string" && mongoose.Types.ObjectId.isValid(ref))
        return new mongoose.Types.ObjectId(ref);
      const candidate =
        (ref as { _id?: string | mongoose.Types.ObjectId })._id ??
        (ref as { id?: string | mongoose.Types.ObjectId }).id;
      return candidate && mongoose.Types.ObjectId.isValid(String(candidate))
        ? new mongoose.Types.ObjectId(String(candidate))
        : null;
    })
    .filter((id): id is mongoose.Types.ObjectId => Boolean(id));
}

/* helper: first non‑null element or null */
const firstOrNull = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? v[0] ?? null : v ?? null;

/* ────────────────────────────────
   GET
   ──────────────────────────────── */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await dbConnect();
  const scenarioId = (await params).id;

  if (!mongoose.Types.ObjectId.isValid(scenarioId)) {
    return NextResponse.json(
      { success: false, error: "Invalid scenario ID" },
      { status: 400 },
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }

  const scenario = await Scenario.findById(scenarioId)
    .populate({ path: "investments", populate: { path: "investmentType" } })
    .populate("eventSeries")
    .populate("spendingStrategy")
    .populate("expenseWithdrawalStrategy");

  if (!scenario) {
    return NextResponse.json(
      { success: false, error: "Scenario not found" },
      { status: 404 },
    );
  }

  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.json(
      { success: false, error: "User not found" },
      { status: 404 },
    );
  }

  const isOwner = scenario.owner.toString() === user._id.toString();
  const canEdit = user.readWriteScenarios.some(
    (id) => id.toString() === scenarioId,
  );
  const canView = scenario.viewPermissions.some(
    (id) => id.toString() === user._id.toString(),
  );

  if (!isOwner && !canEdit && !canView) {
    return NextResponse.json(
      { success: false, error: "No permission" },
      { status: 403 },
    );
  }

  const stateTaxFiles = Object.fromEntries(user.stateTaxFiles ?? []);

  return NextResponse.json({
    success: true,
    scenario,
    isOwner,
    hasEditPermission: canEdit,
    hasViewPermission: canView,
    stateTaxFiles,
  });
}

/* eslint-disable */
/* ────────────────────────────────
   PUT
   ──────────────────────────────── */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await dbConnect();
  const scenarioId = (await params).id;

  if (!mongoose.Types.ObjectId.isValid(scenarioId)) {
    return NextResponse.json(
      { success: false, error: "Invalid scenario ID" },
      { status: 400 },
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }

  const [scenario, user] = await Promise.all([
    Scenario.findById(scenarioId),
    User.findOne({ email: session.user.email }),
  ]);

  if (!scenario)
    return NextResponse.json(
      { success: false, error: "Scenario not found" },
      { status: 404 },
    );
  if (!user)
    return NextResponse.json(
      { success: false, error: "User not found" },
      { status: 404 },
    );

  const body: ScenarioUpdateBody = await req.json();

  /* 1 — general info */
  scenario.name = body.name;
  scenario.description = body.description;
  scenario.financialGoal = body.financialGoal;
  scenario.residenceState = body.residenceState;
  scenario.inflationRate = body.inflationRate;
  scenario.ownerBirthYear = body.ownerBirthYear;
  scenario.ownerLifeExpectancy = body.ownerLifeExpectancy;
  scenario.type = body.type;
  if (body.type === "couple") {
    scenario.spouseBirthYear = body.spouseBirthYear;
    scenario.spouseLifeExpectancy = body.spouseLifeExpectancy;
  }

  /* 2 — investments (deduped) */
  const updatedInvestmentIds: mongoose.Types.ObjectId[] = [];
  for (const inv of body.investments) {
    let invTypeId: mongoose.Types.ObjectId;

    /* 2‑a InvestmentType */
    if (inv.investmentType._id && isMongoId(inv.investmentType._id)) {
      const existingType = await InvestmentType.findById(inv.investmentType._id);
      if (existingType) {
        existingType.name = inv.investmentType.name;
        existingType.description = inv.investmentType.description;
        existingType.expectedAnnualReturn =
          inv.investmentType.expectedAnnualReturn;
        existingType.expectedAnnualIncome =
          inv.investmentType.expectedAnnualIncome;
        existingType.taxability = inv.investmentType.taxability;
        existingType.expenseRatio = inv.investmentType.expenseRatio;
        await existingType.save();
        invTypeId = existingType._id;
      } else {
        invTypeId = (
          await new InvestmentType({
            name: inv.investmentType.name,
            description: inv.investmentType.description,
            expectedAnnualReturn: inv.investmentType.expectedAnnualReturn,
            expectedAnnualIncome: inv.investmentType.expectedAnnualIncome,
            taxability: inv.investmentType.taxability,
            expenseRatio: inv.investmentType.expenseRatio,
          }).save()
        )._id;
      }
    } else {
      invTypeId = (
        await new InvestmentType({
          name: inv.investmentType.name,
          description: inv.investmentType.description,
          expectedAnnualReturn: inv.investmentType.expectedAnnualReturn,
          expectedAnnualIncome: inv.investmentType.expectedAnnualIncome,
          taxability: inv.investmentType.taxability,
          expenseRatio: inv.investmentType.expenseRatio,
        }).save()
      )._id;
    }

    /* 2‑b Investment */
    if (inv._id && isMongoId(inv._id)) {
      const existingInv = await Investment.findById(inv._id);
      if (existingInv) {
        existingInv.investmentType = invTypeId;
        existingInv.value = inv.value;
        existingInv.purchasePrice = inv.purchasePrice;
        existingInv.taxStatus = inv.taxStatus;
        await existingInv.save();
        updatedInvestmentIds.push(existingInv._id);
        continue;
      }
    }
    updatedInvestmentIds.push(
      (
        await new Investment({
          investmentType: invTypeId,
          value: inv.value,
          purchasePrice: inv.purchasePrice,
          taxStatus: inv.taxStatus,
        }).save()
      )._id,
    );
  }
  scenario.investments = updatedInvestmentIds;

  /* 3 — events (deduped) */
  const updatedEventIds: mongoose.Types.ObjectId[] = [];

  const normaliseAlloc = (alloc: any) => {
    alloc.investments = extractInvestmentIds(scenario.investments ?? []);
    if (alloc.type === "fixed") {
      alloc.percentages = alloc.percentages ?? [];
      // Filter out entries with 0 percentages
      const validIndices = alloc.percentages.map((p: number, i: number) => p !== 0 ? i : -1).filter((i: number) => i !== -1);
      alloc.percentages = alloc.percentages.filter((_: number, i: number) => validIndices.includes(i));
      alloc.percentages = alloc.percentages.map((p: number) => p * 100);
      alloc.investments = alloc.investments.filter((_: any, i: number) => validIndices.includes(i));
    } else {
      alloc.initialPercentages = alloc.initialPercentages ?? [];
      alloc.initialPercentages = alloc.initialPercentages.map((p: number) => p * 100);
      alloc.finalPercentages = alloc.finalPercentages ?? [];
      alloc.finalPercentages = alloc.finalPercentages.map((p: number) => p * 100);
      // Filter out entries where both initial and final percentages are 0
      const validIndices = alloc.initialPercentages.map((ip: number, i: number) => 
        (ip !== 0 || alloc.finalPercentages[i] !== 0) ? i : -1
      ).filter((i: number) => i !== -1);
      alloc.initialPercentages = alloc.initialPercentages.filter((_: number, i: number) => validIndices.includes(i));
      alloc.finalPercentages = alloc.finalPercentages.filter((_: number, i: number) => validIndices.includes(i));
      alloc.investments = alloc.investments.filter((_: any, i: number) => validIndices.includes(i));
    }
    return alloc;
  };

  const normalisePd = (pd: any) => {
    pd.investments = extractInvestmentIds(scenario.investments ?? []);
    if (pd.type === "fixed") {
      pd.percentages = pd.percentages ?? [];
      // Filter out entries with 0 percentages
      const validIndices = pd.percentages.map((p: number, i: number) => p !== 0 ? i : -1).filter((i: number) => i !== -1);
      pd.percentages = pd.percentages.filter((_: number, i: number) => validIndices.includes(i));
      // Multiply percentages by 100 to convert from decimal to percentage
      pd.percentages = pd.percentages.map((p: number) => p * 100);
      pd.investments = pd.investments.filter((_: any, i: number) => validIndices.includes(i));
    } else {
      pd.initialPercentages = pd.initialPercentages ?? [];
      pd.finalPercentages = pd.finalPercentages ?? [];
      // Filter out entries where both initial and final percentages are 0
      const validIndices = pd.initialPercentages.map((ip: number, i: number) => 
        (ip !== 0 || pd.finalPercentages[i] !== 0) ? i : -1
      ).filter((i: number) => i !== -1);
      pd.initialPercentages = pd.initialPercentages.filter((_: number, i: number) => validIndices.includes(i));
      pd.finalPercentages = pd.finalPercentages.filter((_: number, i: number) => validIndices.includes(i));
      pd.initialPercentages = pd.initialPercentages.map((p: number) => p * 100);
      pd.finalPercentages = pd.finalPercentages.map((p: number) => p * 100);
      pd.investments = pd.investments.filter((_: any, i: number) => validIndices.includes(i));
    }
    return pd;
  };

  for (const evt of body.eventSeries) {
    /* ---------- UPDATE path ---------- */
    if (evt._id && isMongoId(evt._id)) {
      const existingEvt = await Event.findById(evt._id);
      if (!existingEvt) continue;

      existingEvt.startYear = await normalizeStartYear(evt.startYear);
      existingEvt.duration = normalizeDuration(evt.duration);
      existingEvt.name = evt.name;
      existingEvt.description = evt.description;

      let dbEventType: any;
      if (evt.eventType.type === "investment") {
        const ie = evt.eventType as InvestmentEvent;
        const alloc = firstOrNull(ie.assetAllocation);
        dbEventType = {
          type: "investment",
          inflationAdjustment: ie.inflationAdjustment,
          maxCash: ie.maxCash,
          assetAllocation: alloc ? [normaliseAlloc(alloc)] : [],
        };
      } else if (evt.eventType.type === "rebalance") {
        const re = evt.eventType as RebalanceEvent;
        const pd = firstOrNull(re.portfolioDistribution);
        dbEventType = {
          type: "rebalance",
          portfolioDistribution: pd ? [normalisePd(pd)] : [],
        };
      } else {
        dbEventType = { ...evt.eventType };
      }

      existingEvt.eventType = dbEventType;
      await existingEvt.save();
      updatedEventIds.push(existingEvt._id);
      continue;
    }

    /* ---------- CREATE path ---------- */
    const { _id: _drop1, id: _drop2, ...evtWithoutIds } = evt as any;

    let dbEventType: any;
    if (evt.eventType.type === "investment") {
      const ie = evt.eventType as InvestmentEvent;
      const alloc = firstOrNull(ie.assetAllocation);
      dbEventType = {
        type: "investment",
        inflationAdjustment: ie.inflationAdjustment,
        maxCash: ie.maxCash,
        assetAllocation: alloc ? normaliseAlloc(alloc) : {},
      };
    } else if (evt.eventType.type === "rebalance") {
      const re = evt.eventType as RebalanceEvent;
      const pd = firstOrNull(re.portfolioDistribution);
      dbEventType = {
        type: "rebalance",
        portfolioDistribution: pd ? [normalisePd(pd)] : [],
      };
    } else {
      dbEventType = { ...evt.eventType };
    }

    const newEvt = await new Event({
      ...evtWithoutIds,
      startYear: await normalizeStartYear(evt.startYear),
      duration: normalizeDuration(evt.duration),
      eventType: dbEventType,
    }).save();

    updatedEventIds.push(newEvt._id);
  }

  scenario.eventSeries = updatedEventIds;

  /* 4 — spending / expense withdrawal strategies */
  scenario.spendingStrategy = extractInvestmentIds(body.spendingStrategy ?? []);
  scenario.expenseWithdrawalStrategy = extractInvestmentIds(
    body.expenseWithdrawalStrategy ?? [],
  );

  /* 5 — RMD & Roth */
  scenario.RMDStrategy = extractInvestmentIds(body.RMDStrategy ?? []);
  scenario.RothConversionStrategy = extractInvestmentIds(
    body.RothConversionStrategy ?? [],
  );
  scenario.rothConversion = body.rothConversion ?? null;

  /* 6 — state‑tax files (user‑level) */
  if (body.stateTaxFiles) {
    user.stateTaxFiles = body.stateTaxFiles;
    await user.save();
  }

  await scenario.save();
  return NextResponse.json({
    success: true,
    message: "Scenario updated successfully",
  });
}
