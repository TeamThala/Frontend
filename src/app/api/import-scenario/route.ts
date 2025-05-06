/*  src/app/api/import-scenario/route.ts
 *  POST /api/import-scenario
 *  Body ≙ multipart/form-data  field "file" (.yaml or .yml)
 *  ───────────────────────────────────────────────────────── */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions }   from "@/lib/auth";
import dbConnect         from "@/lib/dbConnect";
import { Types }         from "mongoose";

import User              from "@/models/User";
import Scenario          from "@/models/Scenario";
import InvestmentType    from "@/models/InvestmentType";
import Investment        from "@/models/Investment";
import Event             from "@/models/Event";
import RothConv          from "@/models/RothConversionStrategy";
import TaxFile           from "@/models/TaxFile";
import * as yaml         from "js-yaml";

/* ────────────────────────────────
   helpers
   ──────────────────────────────── */
type DistributionYaml =
  | { type: "fixed"  ; value : number }
  | { type: "normal" ; mean  : number ; stdev : number }
  | { type: "uniform"; lower : number ; upper : number };

type DistValue = {
  type      : "fixed" | "normal" | "uniform";
  valueType : "amount" | "percentage";
  value?    : number;
  mean?     : number;
  stdDev?   : number;
  min?      : number;
  max?      : number;
};

function dist(
  src?: DistributionYaml,
  valueType: "amount" | "percentage" = "amount"
): DistValue {
  if (!src) return { type: "fixed", valueType, value: 0 };
  switch (src.type) {
    case "fixed":
      return { type: "fixed", valueType, value: src.value };
    case "normal":
      return { type: "normal", valueType, mean: src.mean, stdDev: src.stdev };
    case "uniform":
      return { type: "uniform", valueType, min: src.lower, max: src.upper };
  }
}

/* keep harmless variants of an ID → ObjectId so we can
   match allocation names written slightly differently       */
function stashIdVariants(
  humanId: string,
  mongoId: Types.ObjectId,
  map: Map<string, Types.ObjectId>
):void {
  const norm = humanId.toLowerCase().replace(/[^\w]+/g, "").trim();
  map.set(humanId, mongoId);
  map.set(norm, mongoId);
  map.set(humanId.replace(/\s+/g, ""), mongoId);
  if (humanId.includes("S&P")) {
    map.set(humanId.replace(/S&P/g, "SP"), mongoId);
  }
}

function getUniqueInvestmentIds(
  map: Map<string, Types.ObjectId>
): Types.ObjectId[] {
  const seen = new Set<string>();
  const out: Types.ObjectId[] = [];
  for (const id of map.values()) {
    const s = id.toString();
    if (!seen.has(s)) {
      seen.add(s);
      out.push(id);
    }
  }
  return out;
}

/* ────────────────────────────────
   EXPORTS
   ──────────────────────────────── */
export const dynamic       = "force-dynamic";
export const dynamicParams = true;
export const revalidate    = 0;

/* ---------- local interfaces ---------- */
interface Allocation {
  type: "fixed" | "glidePath";
  investments: Types.ObjectId[];
  percentages?: number[];
  initialPercentages?: number[];
  finalPercentages?: number[];
}

interface YamlScenario {
  /* top‑level fields trimmed for brevity — they're unchanged      */
  name?: string;
  description?: string;
  financialGoal?: number;
  investmentTypes?: Array<{
    name: string;
    description?: string;
    returnDistribution?: DistributionYaml;
    returnAmtOrPct?: string;
    expenseRatio?: number;
    incomeDistribution?: DistributionYaml;
    incomeAmtOrPct?: string;
    taxability?: string;
  }>;
  investments?: Array<{
    id: string;
    value: number;
    investmentType: string;
    taxStatus: string;
  }>;
  eventSeries?: Array<{
    name: string;
    description?: string;
    type: string;
    start: {
      type: string;
      value?: number;
      mean?: number;
      stdev?: number;
      lower?: number;
      upper?: number;
      eventSeries?: string;
    };
    duration?: {
      type: string;
      value?: number;
      mean?: number;
      stdev?: number;
      lower?: number;
      upper?: number;
    };
    initialAmount?: number;
    changeDistribution?: DistributionYaml;
    changeAmtOrPct?: string;
    inflationAdjusted?: boolean;
    userFraction?: number;
    socialSecurity?: boolean;
    wage?: boolean;
    discretionary?: boolean;
    glidePath?: boolean;
    assetAllocation?: Record<string, number>;
    assetAllocation2?: Record<string, number>;
    maxCash?: number;
  }>;
  maritalStatus?: string;
  birthYears?: number[];
  lifeExpectancy?: DistributionYaml[];
  residenceState?: string;
  inflationAssumption?: DistributionYaml;
  spendingStrategy?: string[];
  expenseWithdrawalStrategy?: string[];
  RMDStrategy?: string[];
  RothConversionOpt?: boolean;
  RothConversionStrategy?: string[];
  RothConversionStart?: number;
  RothConversionEnd?: number;
  customStateTaxYaml?: string;
}

// Interface to be used for startYear fields
interface StartYear {
  type: string;
  year?: number | {
    mean?: number; stdDev?: number; min?: number; max?: number; valueType?: string;
  };
  eventTime?: "start" | "end";
  eventId?: Types.ObjectId | null;
  event?: Types.ObjectId | null; // Backwards compatibility
}

/* ────────────────────────────────
   POST handler
   ──────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    /* 1️⃣  Auth */
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json(
        { success: false, error: "Unauthenticated." },
        { status: 401 }
      );

    const user = await User.findOne({ email: session.user.email });
    if (!user)
      return NextResponse.json(
        { success: false, error: "User not found." },
        { status: 404 }
      );

    /* 2️⃣  Read YAML */
    const formData = await req.formData();
    const file     = formData.get("file") as File | null;
    if (!file || !/\.ya?ml$/i.test(file.name))
      return NextResponse.json(
        { success: false, error: "Upload a .yml / .yaml file." },
        { status: 400 }
      );
    const ymlText = await file.text();
    const yml     = yaml.load(ymlText) as YamlScenario;

    /* maps */
    const itTypeMap   = new Map<string, Types.ObjectId>(); // name ➜ _id
    const investMap   = new Map<string, Types.ObjectId>(); // label ➜ _id
    const investIdMap = new Map<string, Types.ObjectId>(); // strict id ➜ _id
    const eventMap    = new Map<string, Types.ObjectId>(); // name  ➜ _id
    const depTracker  = new Map<string, string>();         // child ➜ parent

    /* custom state‑tax YAML */
    if (yml.customStateTaxYaml && yml.residenceState) {
      const taxFile = await TaxFile.create({
        user: user._id,
        state: yml.residenceState,
        content: yml.customStateTaxYaml
      });
      user.stateTaxFiles.set(yml.residenceState, taxFile._id.toString());
      await user.save();
    }

    /* 3️⃣  Investment Types */
    for (const t of yml.investmentTypes ?? []) {
      const itType = await InvestmentType.create({
        name: t.name,
        description: t.description ?? "",
        expectedAnnualReturn: dist(
          t.returnDistribution,
          t.returnAmtOrPct === "percent" ? "percentage" : "amount"
        ),
        expenseRatio: t.expenseRatio ?? 0,
        expectedAnnualIncome: dist(
          t.incomeDistribution,
          t.incomeAmtOrPct === "percent" ? "percentage" : "amount"
        ),
        taxability: t.taxability
      });
      itTypeMap.set(t.name, itType._id);
    }

    /* 4️⃣  Investments */
    for (const inv of yml.investments ?? []) {
      const typeId = itTypeMap.get(inv.investmentType);
      if (!typeId)
        return NextResponse.json(
          { success: false, error: `Unknown investmentType: ${inv.investmentType}` },
          { status: 400 }
        );

      const doc = await Investment.create({
        value: inv.value,
        investmentType: typeId,
        taxStatus: inv.taxStatus
      });
      stashIdVariants(inv.id, doc._id, investMap);
      investIdMap.set(inv.id, doc._id);
    }

    /* 5️⃣  Events */
    for (const ev of yml.eventSeries ?? []) {
      /* 5a  startYear */
      let start: StartYear = { type: "fixed" };
      switch (ev.start.type) {
        case "fixed":
          start = { type: "fixed", year: ev.start.value };
          break;
        case "normal":
          start = {
            type: "normal",
            year: { mean: ev.start.mean, stdDev: ev.start.stdev, valueType: "amount" }
          };
          break;
        case "uniform":
          start = {
            type: "uniform",
            year: { min: ev.start.lower, max: ev.start.upper, valueType: "amount" }
          };
          break;
        case "startWith":
        case "startAfter":
          start = {
            type: "event",
            eventTime: ev.start.type === "startWith" ? "start" : "end",
            eventId: null
          };
          depTracker.set(ev.name, ev.start.eventSeries ?? "salary");
          break;
      }

      /* 5b  duration */
      interface Duration {
        type: string;
        valueType: "amount";
        value?: number;
        year?: {
          mean?: number; stdDev?: number; min?: number; max?: number; valueType: "amount";
        };
      }

      let duration: Duration | undefined;
      if (ev.duration) {
        duration = { type: ev.duration.type, valueType: "amount" };
        if (ev.duration.type === "fixed") {
          duration.value = ev.duration.value;
        } else if (ev.duration.type === "normal") {
          duration.year = { mean: ev.duration.mean, stdDev: ev.duration.stdev, valueType: "amount" };
        } else {
          duration.year = { min: ev.duration.lower, max: ev.duration.upper, valueType: "amount" };
        }
      }

      /* 5c  eventType */
      interface EventType {
        type: string;
        amount?: number;
        expectedAnnualChange?: DistValue;
        inflationAdjustment?: boolean;
        percentageOfIncome?: number;
        socialSecurity?: boolean;
        wage?: boolean;
        discretionary?: boolean;
        assetAllocation?: Allocation[];
        maxCash?: number;
        portfolioDistribution?: Allocation[];
      }

      const eventType: EventType = {
        type: ev.type === "invest" ? "investment" : ev.type
      };

      if (ev.type === "income" || ev.type === "expense") {
        eventType.amount = ev.initialAmount;
        eventType.expectedAnnualChange = dist(
          ev.changeDistribution,
          (ev.changeAmtOrPct ?? "amount") === "percent" ? "percentage" : "amount"
        );
        eventType.inflationAdjustment = ev.inflationAdjusted ?? false;
        eventType.percentageOfIncome = ev.userFraction;
        if (ev.type === "income") {
          eventType.socialSecurity = ev.socialSecurity ?? false;
          eventType.wage = ev.wage ?? false;
        } else {
          eventType.discretionary = ev.discretionary ?? false;
        }
      } else if (ev.type === "invest" || ev.type === "rebalance") {
        const alloc: Allocation = ev.glidePath
          ? { type: "glidePath", investments: [], initialPercentages: [], finalPercentages: [] }
          : { type: "fixed",     investments: [], percentages: [] };
      
        if (ev.assetAllocation) {
          for (const [label, pctRaw] of Object.entries(ev.assetAllocation)) {
            const oid =
              investMap.get(label) ??
              investMap.get(label.toLowerCase().replace(/[^\w]+/g, ""));
            if (!oid)
              return NextResponse.json(
                { success: false, error: `Allocation refers to unknown investment '${label}'` },
                { status: 400 }
              );
      
            const pct = Number(pctRaw);
            if (!Number.isFinite(pct))
              return NextResponse.json(
                { success: false, error: `Invalid percentage for '${label}'` },
                { status: 400 }
              );
      
            alloc.investments.push(oid);
      
            if (ev.glidePath) {
              alloc.initialPercentages!.push(pct);
              const finalPct =
                ev.assetAllocation2 && ev.assetAllocation2[label] !== undefined
                  ? Number(ev.assetAllocation2[label])
                  : pct;
              alloc.finalPercentages!.push(finalPct);
            } else {
              alloc.percentages!.push(pct);
            }
          }
        }
      
        if (ev.type === "invest") {
          eventType.assetAllocation = [alloc];
          eventType.maxCash = ev.maxCash ?? 0;
        } else {
          eventType.portfolioDistribution = [alloc];
        }
      }

      /* 5d  create Event */
      const eDoc = await Event.create({
        name: ev.name,
        description: ev.description ?? "",
        startYear: start,
        duration,
        eventType
      });
      eventMap.set(ev.name, eDoc._id);
    } // end for‑each event

    /* 6️⃣  resolve startWith / startAfter */
    /* 6️⃣  resolve startWith / startAfter
   ─────────────────────────────────── */
    /* 6️⃣  resolve startWith / startAfter
   ─────────────────────────────────── */
/* 6️⃣  resolve startWith / startAfter
   ─────────────────────────────────── */
   for (const [childName, parentName] of depTracker.entries()) {
    /* ① look the two Ids up in the map that was built while creating
          events in **this** import run                                   */
    const childId  = eventMap.get(childName);
    const parentId = eventMap.get(parentName);
  
    if (!childId || !parentId) {
      console.warn(`Could not resolve dependency '${childName}' → '${parentName}'`);
      continue;                     // nothing to update – skip
    }
  
    /* ② one atomic write – no double fetches, no stale matches           */
    await Event.updateOne(
      { _id: childId },
      { $set: { "startYear.eventId": parentId } }
    );
  }
  



    /* 7️⃣  Strategies */
    const normalizeKey = (s: string) => s.toLowerCase().replace(/[^\w]+/g, "").trim();
    const toIds = (arr: string[] | undefined, map: Map<string, Types.ObjectId>) =>
      (arr ?? []).map(s => map.get(s) || map.get(normalizeKey(s))).filter(Boolean) as Types.ObjectId[];

    const spendingIds            = toIds(yml.spendingStrategy,            eventMap);
    const expenseWithdrawalIds   = toIds(yml.expenseWithdrawalStrategy,   investIdMap);

    /* helper for Roth / RMD lookups */
    const findInvestmentById = (id: string): Types.ObjectId | null => {
      const direct = investIdMap.get(id);
      if (direct) return direct;

      const matched = [...investIdMap.entries()]
        .find(([key]) => normalizeKey(key) === normalizeKey(id));
      if (matched) return matched[1];

      if (id.includes("S&P")) {
        const sp = id.replace(/S&P/g, "SP");
        if (investIdMap.get(sp)) return investIdMap.get(sp)!;
      }
      for (const [key, val] of investIdMap.entries()) {
        if (key.toLowerCase() === id.toLowerCase()) return val;
      }
      return null;
    };

    /* RMD */
    const rmdIds: Types.ObjectId[] = [];
    if (yml.RMDStrategy?.length) {
      for (const rid of yml.RMDStrategy) {
        const oid = findInvestmentById(rid);
        if (oid) rmdIds.push(oid);
      }
    } else {
      for (const inv of yml.investments ?? []) {
        if (inv.taxStatus === "pre-tax") {
          const oid = investIdMap.get(inv.id);
          if (oid) rmdIds.push(oid);
        }
      }
    }

    /* Roth Conversion */
    const directRothIds: Types.ObjectId[] = [];
    if (yml.RothConversionOpt) {
      if (yml.RothConversionStrategy?.length) {
        for (const rid of yml.RothConversionStrategy) {
          const oid = findInvestmentById(rid);
          if (oid) directRothIds.push(oid);
        }
      }
      if (!directRothIds.length) {
        for (const inv of yml.investments ?? []) {
          if (inv.taxStatus === "pre-tax") {
            const oid = investIdMap.get(inv.id);
            if (oid) directRothIds.push(oid);
          }
        }
      }
    }

    /* 8️⃣  Scenario */
    const uniqueInvestmentIds = getUniqueInvestmentIds(investMap);

    let finalRothConv: Types.ObjectId[] | Types.ObjectId[] = [];
    if (yml.RothConversionOpt && directRothIds.length) {
      try {
        const rc = await RothConv.create({
          name: "Imported Strategy",
          investmentOrder: directRothIds,
          owner: user._id
        });
        finalRothConv = [rc._id];
      } catch (_e) {
        console.warn("Could not create RothConversionStrategy doc, storing direct IDs");
        finalRothConv = directRothIds;
        console.log(_e);
      }
    }

    const scenario = await Scenario.create({
      type:                 yml.maritalStatus === "couple" ? "couple" : "individual",
      name:                 yml.name,
      description:          yml.description ?? "",
      financialGoal:        yml.financialGoal ?? 0,
      investments:          uniqueInvestmentIds,
      eventSeries:          [...eventMap.values()],
      spendingStrategy:     spendingIds,
      expenseWithdrawalStrategy: expenseWithdrawalIds,
      inflationRate:        dist(yml.inflationAssumption, "percentage"),
      RMDStrategy:          rmdIds,
      RothConversionStrategy: finalRothConv,
      rothConversion: {
        rothConversion:          !!yml.RothConversionOpt,
        RothConversionStartYear: yml.RothConversionStart ?? null,
        RothConversionEndYear:   yml.RothConversionEnd   ?? null
      },
      residenceState:       yml.residenceState ?? "NY",
      owner:                user._id,
      ownerBirthYear:       yml.birthYears?.[0] ?? null,
      ownerLifeExpectancy:  yml.lifeExpectancy?.[0] ? dist(yml.lifeExpectancy[0], "amount") : undefined,
      spouseBirthYear:      yml.maritalStatus === "couple" ? yml.birthYears?.[1] : undefined,
      spouseLifeExpectancy: yml.maritalStatus === "couple" && yml.lifeExpectancy?.[1]
                              ? dist(yml.lifeExpectancy[1], "amount") : undefined,
      viewPermissions:      [],
      editPermissions:      [],
      updatedAt:            new Date()
    });

    /* 9️⃣  link scenario to user & respond */
    user.createdScenarios.push(scenario._id);
    await user.save();

    return NextResponse.json({ success: true, scenarioId: scenario._id });
  } catch (err) {
    console.error("import-scenario:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
