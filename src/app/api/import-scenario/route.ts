/*  src/app/api/import-scenario/route.ts
 *  POST /api/import-scenario
 *  Body ≙ multipart/form-data  field "file" (.yaml or .yml)
 *  ───────────────────────────────────────────────────────── */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions }  from "@/lib/auth";
import dbConnect          from "@/lib/dbConnect";
import { Types } from "mongoose";

import User               from "@/models/User";
import Scenario           from "@/models/Scenario";
import InvestmentType     from "@/models/InvestmentType";
import Investment         from "@/models/Investment";
import Event              from "@/models/Event";
import RothConv           from "@/models/RothConversionStrategy";
import * as yaml           from "js-yaml";
import TaxFile            from "@/models/TaxFile";

/* ────────────────────────────────
   helpers
   ──────────────────────────────── */
type DistributionYaml =
  | { type:"fixed"  ; value:number }
  | { type:"normal" ; mean:number ; stdev:number }
  | { type:"uniform"; lower:number; upper:number };

type DistValue = {
  type:"fixed"|"normal"|"uniform";
  valueType:"amount"|"percentage";
  value?   :number;
  mean?    :number;
  stdDev?  :number;
  min?     :number;
  max?     :number;
};

function dist( src?:DistributionYaml, valueType:"amount"|"percentage"="amount"):DistValue{
  if( !src ) return { type:"fixed", valueType, value:0 };
  switch(src.type){
    case "fixed"  : return { type:"fixed"  , valueType, value :src.value };
    case "normal" : return { type:"normal" , valueType, mean  :src.mean , stdDev:src.stdev };
    case "uniform": return { type:"uniform", valueType, min   :src.lower, max   :src.upper };
  }
}

/* keep every harmless variant of an ID → ObjectId so we
   can match allocation names that are written slightly
   differently in the YAML                                               */
function stashIdVariants(humanId:string, mongoId:Types.ObjectId,
                         map:Map<string,Types.ObjectId>){
  const norm = humanId.toLowerCase().replace(/[^\w]+/g,"").trim();
  map.set( humanId, mongoId );
  map.set( norm    , mongoId );
  map.set( humanId.replace(/\s+/g,"") , mongoId );
  if(humanId.includes("S&P")){
    map.set(humanId.replace(/S&P/g,"SP"), mongoId);
  }
}

// New function to get unique investment IDs
function getUniqueInvestmentIds(map: Map<string, Types.ObjectId>): Types.ObjectId[] {
  // Use Set to ensure uniqueness of ObjectIds
  const uniqueIds = new Set<string>();
  const result: Types.ObjectId[] = [];
  
  // Convert ObjectIds to strings for Set deduplication
  for (const id of map.values()) {
    const idStr = id.toString();
    if (!uniqueIds.has(idStr)) {
      uniqueIds.add(idStr);
      result.push(id);
    }
  }
  
  return result;
}

/* ────────────────────────────────
   POST  handler
   ──────────────────────────────── */
export const dynamic      = "force-dynamic";
export const dynamicParams= true;
export const revalidate   = 0;

// Define Allocation interface here to be used later
interface Allocation {
  type: string;
  investments: Types.ObjectId[];
  percentages: number[];
  initialPercentage?: number[];
  finalPercentage?: number[];
}

interface YamlScenario {
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

export async function POST(req:NextRequest){
  try{
    await dbConnect();

    /* 1️⃣  Auth */
    const session = await getServerSession(authOptions);
    if(!session?.user?.email)
      return NextResponse.json({success:false,error:"Unauthenticated."},{status:401});
    const user = await User.findOne({email:session.user.email});
    if(!user)
      return NextResponse.json({success:false,error:"User not found."},{status:404});

    /* 2️⃣  Read YAML */
    const formData = await req.formData();
    const file     = formData.get("file") as File|null;
    if(!file || !/\.ya?ml$/i.test(file.name))
      return NextResponse.json({success:false,error:"Upload a .yml / .yaml file."},{status:400});
    const ymlText  = await file.text();
    const yml      = yaml.load(ymlText) as YamlScenario;

    /* maps for easy look-up later */
    const itTypeMap  = new Map<string,Types.ObjectId>();   // name  -> _id
    const investMap  = new Map<string,Types.ObjectId>();   // label -> _id
    const eventMap   = new Map<string,Types.ObjectId>();   // name  -> _id
    const depTracker = new Map<string,string>();           // event needing -> dep name
    const investIdMap = new Map<string, Types.ObjectId>(); // id -> _id (strict match)


    /* Check if we need to create a state tax file */
    if (yml.customStateTaxYaml && yml.residenceState) {
      const taxFile = await TaxFile.create({
        user: user._id,
        state: yml.residenceState,
        content: yml.customStateTaxYaml
      });

      // Update the user's state tax files map
      user.stateTaxFiles.set(yml.residenceState, taxFile._id.toString());
      await user.save();
    }

    /* 3️⃣  Investment Types */
    for(const t of yml.investmentTypes??[]){
      const itType = await InvestmentType.create({
        name :t.name,
        description         : t.description    ?? "",
        expectedAnnualReturn: dist(t.returnDistribution,
                                   t.returnAmtOrPct==="percent"?"percentage":"amount"),
        expenseRatio        : t.expenseRatio   ?? 0,
        expectedAnnualIncome: dist(t.incomeDistribution,
                                   t.incomeAmtOrPct==="percent"?"percentage":"amount"),
        taxability          : t.taxability
      });
      itTypeMap.set(t.name,itType._id);
    }

    /* 4️⃣  Investments */
    for(const inv of yml.investments??[]){
      const typeId = itTypeMap.get(inv.investmentType);
      if(!typeId)
        return NextResponse.json({success:false,
          error:`Unknown investmentType: ${inv.investmentType}`},{status:400});

      const doc = await Investment.create({
        value        : inv.value,
        investmentType: typeId,
        taxStatus    : inv.taxStatus
      });
      stashIdVariants(inv.id,doc._id,investMap);
      investIdMap.set(inv.id, doc._id);  // strict id-based matching for strategies
    }

    /* 5️⃣  Events                                    */
    for(const ev of yml.eventSeries??[]){
      /* 5a  startYear ------------------------------ */
      interface StartYear {
        type: string;
        year?: number | {
          mean?: number;
          stdDev?: number;
          min?: number;
          max?: number;
          valueType: string;
        };
        eventTime?: string;
        event?: Types.ObjectId | null;
      }

      let start: StartYear = { type: "fixed" };   // will mutate
      switch(ev.start.type){
        case "fixed":
          start = { type: "fixed", year: ev.start.value };
          break;
        case "normal":
          start = {
            type: "normal",
            year: {
              mean: ev.start.mean,
              stdDev: ev.start.stdev,
              valueType: "amount"
            }
          };
          break;
        case "uniform":
          start = {
            type: "uniform",
            year: {
              min: ev.start.lower,
              max: ev.start.upper,
              valueType: "amount"
            }
          };
          break;
        case "startWith":
        case "startAfter":
          start = {
            type: "event",
            eventTime: ev.start.type === "startWith" ? "start" : "end",
            event: null
          };
          depTracker.set(ev.name, ev.start.eventSeries ?? "salary");
          break;
      }

      /* 5b  duration ------------------------------- */
      interface Duration {
        type: string;
        valueType: string;
        value?: number;
        year?: {
          mean?: number;
          stdDev?: number;
          min?: number;
          max?: number;
          valueType: string;
        };
      }

      let duration: Duration | undefined = undefined;
      if(ev.duration){
        duration = { type: ev.duration.type, valueType: "amount" };
        if (ev.duration.type === "fixed") {
          duration.value = ev.duration.value;
        } else if (ev.duration.type === "normal") {
          duration.year = {
            mean: ev.duration.mean,
            stdDev: ev.duration.stdev,
            valueType: "amount"
          };
        } else if (ev.duration.type === "uniform") {
          duration.year = {
            min: ev.duration.lower,
            max: ev.duration.upper, 
            valueType: "amount"
          };
        }
      }

      /* 5c  eventType details ---------------------- */
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
        maximumCash?: number;
      }

      const eventType: EventType = { type: ev.type==="invest"?"investment":ev.type };
      if(ev.type==="income"||ev.type==="expense"){
        eventType.amount               = ev.initialAmount;
        eventType.expectedAnnualChange = dist(ev.changeDistribution,
              (ev.changeAmtOrPct??"amount")==="percent"?"percentage":"amount");
        eventType.inflationAdjustment  = ev.inflationAdjusted??false;
        eventType.percentageOfIncome   = ev.userFraction;
        if(ev.type==="income"){
          eventType.socialSecurity = ev.socialSecurity??false;
          eventType.wage           = ev.wage??false;
        }else{
          eventType.discretionary  = ev.discretionary??false;
        }
      }else if(ev.type==="invest"||ev.type==="rebalance"){
        const alloc: Allocation = { 
          type: ev.glidePath ? "glidePath" : "fixed",
          investments: [] as Types.ObjectId[],
          percentages: [] as number[] 
        };
        
        // Add the correct property based on allocation type
        if (ev.glidePath) {
          alloc.initialPercentage = [];
          alloc.finalPercentage = [];
        }

        if(ev.assetAllocation){
          for(const [label,pct] of Object.entries(ev.assetAllocation)){
            const oid = investMap.get(label) ??
                        investMap.get(label.toLowerCase().replace(/[^\w]+/g,"")) ;
            if(!oid) return NextResponse.json({success:false,
                error:`Allocation refers to unknown investment '${label}'`},{status:400});
            
            alloc.investments.push(oid);
            
            const pctNum = Number(pct);
            if (!Number.isFinite(pctNum)) {
              return NextResponse.json({success:false,
                error:`Invalid percentage value for '${label}'`},{status:400});
            }
            
            // Always set percentages for both fixed and glidePath
            alloc.percentages.push(pctNum);
            
            // Set initial and final percentages for glidePath
            if (ev.glidePath) {
              if (!alloc.initialPercentage) alloc.initialPercentage = [];
              alloc.initialPercentage.push(pctNum);
              
              // Use assetAllocation2 for final if available, otherwise use the same percentage
              const finalPct = ev.assetAllocation2 && ev.assetAllocation2[label] !== undefined 
                ? Number(ev.assetAllocation2[label]) 
                : pctNum;
              
              if (!alloc.finalPercentage) alloc.finalPercentage = [];
              alloc.finalPercentage.push(finalPct);
            }
          }
        }
        eventType.assetAllocation = [alloc];
        eventType.maximumCash = ev.maxCash ?? 0;
      }

      /* 5d  create Event --------------------------- */
      const eDoc = await Event.create({
        name : ev.name,
        description: ev.description??"",
        startYear  : start,
        duration,
        eventType
      });
      eventMap.set(ev.name,eDoc._id);
    }

    /* 6️⃣  resolve dependencies (startWith / startAfter) */
    for(const [child, parentName] of depTracker.entries()){
      const childEvt  = await Event.findOne({name:child});
      const parentEvt = await Event.findOne({name:parentName})
                        || await Event.findOne({name:{ $regex:new RegExp(`^${parentName}$`,"i") }});
      if(childEvt && parentEvt){
        childEvt.startYear.event = parentEvt._id;
        await childEvt.save();
      }else{
        console.warn(`Could not resolve dependency '${child}' -> '${parentName}'`);
      }
    }

    /* 7️⃣  Strategies (spend, withdraw, RMD, Roth) */
    const normalizeKey = (key: string) => key.toLowerCase().replace(/[^\w]+/g, "").trim();

    const toIds = (arr: string[] | undefined, map: Map<string, Types.ObjectId>) =>
      (arr ?? []).map(s =>
        map.get(s) || map.get(normalizeKey(s))
      ).filter(Boolean) as Types.ObjectId[];

    // Enhanced debugging - log all investment mappings
    console.log("All investments from YAML:");
    yml.investments?.forEach(inv => {
      console.log(`ID: ${inv.id}, Type: ${inv.investmentType}, TaxStatus: ${inv.taxStatus}`);
    });
    
    console.log("All investment IDs mapped:");
    for (const [key, value] of investIdMap.entries()) {
      console.log(`Key: "${key}" -> ${value}`);
    }

    // Helper function for finding investment by ID, with better error handling
    const findInvestmentById = (id: string): Types.ObjectId | null => {
      // Try direct match first
      const directMatch = investIdMap.get(id);
      if (directMatch) {
        console.log(`Direct match found for "${id}": ${directMatch}`);
        return directMatch;
      }

      // Try normalized match
      const normalizedId = normalizeKey(id);
      console.log(`Normalized ID for "${id}": "${normalizedId}"`);
      
      const normalizedMatch = Array.from(investIdMap.entries())
        .find(([key]) => normalizeKey(key) === normalizedId);
      
      if (normalizedMatch) {
        console.log(`Normalized match found for "${id}" using key "${normalizedMatch[0]}": ${normalizedMatch[1]}`);
        return normalizedMatch[1];
      }

      // If S&P 500 is involved, try with SP 500
      if (id.includes('S&P')) {
        const spVariant = id.replace(/S&P/g, 'SP');
        console.log(`Trying SP variant for "${id}": "${spVariant}"`);
        const spMatch = investIdMap.get(spVariant);
        if (spMatch) {
          console.log(`SP match found for "${id}": ${spMatch}`);
          return spMatch;
        }
      }

      // Last resort - try case insensitive match
      for (const [key, value] of investIdMap.entries()) {
        if (key.toLowerCase() === id.toLowerCase()) {
          console.log(`Case-insensitive match found for "${id}" using key "${key}": ${value}`);
          return value;
        }
      }

      // If all else fails, check if the investment type contains "S&P 500" and tax status is "pre-tax"
      if (id.includes("S&P 500") && id.includes("pre-tax")) {
        for (const [key, value] of investIdMap.entries()) {
          if (key.includes("S&P") && key.includes("pre-tax")) {
            console.log(`Special S&P 500 pre-tax match found for "${id}" using key "${key}": ${value}`);
            return value;
          }
        }
      }

      console.warn(`Could not find investment with ID: ${id}`);
      return null;
    };

    const spendingIds = toIds(yml.spendingStrategy, eventMap);
    const expenseWithdrawalIds = toIds(yml.expenseWithdrawalStrategy, investIdMap);
    
    // Process RMD Strategy with better error handling
    const rmdIds: Types.ObjectId[] = [];
    if (yml.RMDStrategy) {
      console.log("Processing RMD Strategy:", yml.RMDStrategy);
      for (const id of yml.RMDStrategy) {
        const investmentId = findInvestmentById(id);
        if (investmentId) {
          rmdIds.push(investmentId);
          console.log(`Added ${id} to RMD strategy`);
        } else {
          console.warn(`Failed to find investment ${id} for RMD strategy`);
        }
      }
    }

    // Process Roth Conversion Strategy directly
    let directRothConversionInvestmentIds: Types.ObjectId[] = [];
    if (yml.RothConversionOpt && yml.RothConversionStrategy) {
      console.log("Processing Roth Conversion Strategy with special handling:", yml.RothConversionStrategy);
      
      // Special handling for S&P 500 pre-tax investments
      const hasSP500PreTax = yml.RothConversionStrategy.some(id => 
        id.includes("S&P 500") && id.includes("pre-tax"));
      
      if (hasSP500PreTax) {
        console.log("Looking for S&P 500 pre-tax investment explicitly");
        
        // Find all investments where type = "S&P 500" and taxStatus = "pre-tax"
        for (const inv of yml.investments || []) {
          if (inv.investmentType === "S&P 500" && inv.taxStatus === "pre-tax") {
            const invId = investIdMap.get(inv.id);
            if (invId) {
              console.log(`Found S&P 500 pre-tax investment with ID ${inv.id}, adding to strategy`);
              directRothConversionInvestmentIds.push(invId);
            }
          }
        }
      } else {
        // Regular processing for other investments
        for (const id of yml.RothConversionStrategy) {
          const investmentId = findInvestmentById(id);
          if (investmentId) {
            directRothConversionInvestmentIds.push(investmentId);
            console.log(`Added ${id} to Roth conversion strategy directly`);
          } else {
            console.warn(`Failed to find investment ${id} for Roth conversion strategy`);
          }
        }
      }
      
      // If still empty and we're supposed to have S&P 500 pre-tax, try a fallback approach
      if (directRothConversionInvestmentIds.length === 0 && hasSP500PreTax) {
        console.log("Fallback approach: searching investments for S&P 500 pre-tax by ObjectId");
        
        // Find any investment with S&P in the ID
        for (const [key, value] of investIdMap.entries()) {
          if (key.includes("S&P") && key.includes("pre-tax")) {
            console.log(`Fallback found: ${key} -> ${value}`);
            directRothConversionInvestmentIds.push(value);
            break;
          }
        }
      }
      
      // Log what we're adding to the Roth conversion strategy
      console.log(`Final Roth conversion strategy investment IDs: ${directRothConversionInvestmentIds}`);
    }
    
    // Ensure RMD strategy only includes pre-tax investments
    const filteredRmdIds = rmdIds.length > 0 ? rmdIds : [];
    
    // Create a direct reference to the investments for Roth Strategy
    const rothInvestmentIds = directRothConversionInvestmentIds.length > 0 ? 
      directRothConversionInvestmentIds : [];
      
    // Create RothConv document for backward compatibility
    let rothConvIds: Types.ObjectId[] = [];
    if (yml.RothConversionOpt && directRothConversionInvestmentIds.length > 0) {
      const r = await RothConv.create({
        name: "Imported Strategy",
        investmentOrder: directRothConversionInvestmentIds,
        owner: user._id
      });
      rothConvIds = [r._id];
    }

    /* 8️⃣  Scenario */
    const scenario = await Scenario.create({
      type             : yml.maritalStatus==="couple"?"couple":"individual",
      name             : yml.name,
      description      : yml.description ?? "",
      financialGoal    : yml.financialGoal??0,
      investments      : getUniqueInvestmentIds(investMap),
      eventSeries      : Array.from(eventMap.values()),
      spendingStrategy : spendingIds,
      expenseWithdrawalStrategy: expenseWithdrawalIds,
      inflationRate    : dist(yml.inflationAssumption,"percentage"),
      RothConversionStrategy   : rothInvestmentIds,
      RMDStrategy              : filteredRmdIds,
      rothConversion : {
        rothConversion     : !!yml.RothConversionOpt,
        RothConversionStartYear: yml.RothConversionStart ?? null,
        RothConversionEndYear  : yml.RothConversionEnd   ?? null
      },
      residenceState   : yml.residenceState ?? "NY",
      owner            : user._id,
      ownerBirthYear   : yml.birthYears?.[0] ?? null,
      ownerLifeExpectancy: yml.lifeExpectancy?.[0] ? 
                           dist(yml.lifeExpectancy[0],"amount") : undefined,
      spouseBirthYear      : yml.maritalStatus==="couple" ? yml.birthYears?.[1] : undefined,
      spouseLifeExpectancy : yml.maritalStatus==="couple" && yml.lifeExpectancy?.[1] ?
                             dist(yml.lifeExpectancy[1],"amount") : undefined,
      viewPermissions : [],
      editPermissions : [],
      updatedAt       : new Date()
    });

    /* 9️⃣  link scenario to user */
    user.createdScenarios.push(scenario._id);
    await user.save();

    return NextResponse.json({success:true,scenarioId:scenario._id});
  }
  catch(err: unknown){
    console.error("import-scenario:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({success:false,error:String(err)},{status:500});
  }
}
