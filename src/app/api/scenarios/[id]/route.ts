// import { NextRequest, NextResponse } from 'next/server';
// import mongoose from 'mongoose';
// import dbConnect from '@/lib/dbConnect';

// import "@/models/Investment";
// import "@/models/Event";
// import "@/models/User";
// import "@/models/InvestmentType";

// import Scenario from '@/models/Scenario';
// import Event from '@/models/Event';
// import InvestmentType from '@/models/InvestmentType';
// import Investment from '@/models/Investment';
// import User from '@/models/User';
// import { FixedYear, UniformYear, NormalYear, EventYear, IncomeEvent, ExpenseEvent, InvestmentEvent, RebalanceEvent } from "@/types/event";
// import { getServerSession } from 'next-auth/next';
// import { authOptions } from '@/lib/auth';
// import { CoupleScenario } from '@/types/scenario';

// type YearInput = FixedYear | UniformYear | NormalYear | EventYear;
// type YearOutput = {
//   type: "fixed" | "uniform" | "normal" | "event";
//   year?: number | { min: number; max: number; } | { mean: number; stdDev: number; };
//   eventTime?: "start" | "end";
//   eventId?: mongoose.Types.ObjectId;
// };

// type DurationOutput = {
//   type: "fixed" | "uniform" | "normal";
//   valueType: "amount";
//   value?: number;
//   year?: { min: number; max: number; valueType: "amount"; } | { mean: number; stdDev: number; valueType: "amount"; };
// };

// // Create a type for all possible event types
// type EventTypeUnion = IncomeEvent | ExpenseEvent | InvestmentEvent | RebalanceEvent;

// // Interface for event data
// interface EventData {
//   _id?: string;
//   id?: string;
//   name: string;
//   description?: string;
//   startYear: YearOutput | YearInput;
//   duration: DurationOutput | YearInput;
//   eventType: EventTypeUnion;
// }

// // ─────────────────────────────────────────────
// // Helpers: normalize your TS shapes into the
// // exact objects your Mongoose schemas expect
// // ─────────────────────────────────────────────

// function normalizeStartYear(raw: YearInput): YearOutput {
//   switch (raw.type) {
//     case "fixed":
//       return { type: "fixed", year: raw.year };
//     case "uniform":
//       return {
//         type: "uniform",
//         year: { min: raw.year.min, max: raw.year.max }
//       };
//     case "normal":
//       return {
//         type: "normal",
//         year: { mean: raw.year.mean, stdDev: raw.year.stdDev }
//       };
//     case "event":
//       return {
//         type: "event",
//         eventTime: raw.eventTime,
//         eventId: new mongoose.Types.ObjectId(raw.eventId)
//       };
//     default:
//       return raw as unknown as YearOutput;
//   }
// }

// interface InvestmentLike {
//   _id?: string | mongoose.Types.ObjectId;
// }

// function extractInvestmentIds(investments: InvestmentLike[]): mongoose.Types.ObjectId[] {
//   return investments
//     .map(inv => {
//       if (!inv) return null;
//       if (typeof inv === "string" || inv instanceof mongoose.Types.ObjectId) return inv;
//       if (inv._id && mongoose.Types.ObjectId.isValid(inv._id)) return new mongoose.Types.ObjectId(inv._id);
//       return null;
//     })
//     .filter((id): id is mongoose.Types.ObjectId => id !== null);
// }

// function normalizeDuration(raw: YearInput): DurationOutput {
//   switch (raw.type) {
//     case "fixed":
//       return {
//         type: "fixed",
//         valueType: "amount",
//         value: raw.year
//       };
//     case "uniform":
//       return {
//         type: "uniform",
//         valueType: "amount",
//         year: { min: raw.year.min, max: raw.year.max, valueType: "amount" }
//       };
//     case "normal":
//       return {
//         type: "normal",
//         valueType: "amount",
//         year: { mean: raw.year.mean, stdDev: raw.year.stdDev, valueType: "amount" }
//       };
//     default:
//       // Handle "event" type (shouldn't happen for duration)
//       return {
//         type: "fixed",
//         valueType: "amount",
//         value: 0
//       };
//   }
// }

// // ─────────────────────────────────────────────
// // GET handler
// // ─────────────────────────────────────────────
// export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
//   await dbConnect();
//   const scenarioId = (await params).id;

//   if (!scenarioId || !mongoose.Types.ObjectId.isValid(scenarioId)) {
//     return NextResponse.json({ success: false, error: "Invalid scenario ID" }, { status: 400 });
//   }

//   const session = await getServerSession(authOptions);
//   if (!session?.user?.email) {
//     return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
//   }

//   try {
//     const scenario = await Scenario.findById(scenarioId)
//       .populate({ path: 'investments', populate: { path: 'investmentType' } })
//       .populate('eventSeries')
//       .populate('spendingStrategy')
//       .populate('expenseWithdrawalStrategy');

//     if (!scenario) {
//       return NextResponse.json({ success: false, error: 'Scenario not found' }, { status: 404 });
//     }

//     const isGuest = !scenario.owner || scenario.owner.toString() === "Guest";
//     if (isGuest) {
//       return NextResponse.json({
//         success: true,
//         scenario,
//         isOwner: false,
//         hasEditPermission: true,
//         hasViewPermission: true
//       }, { status: 200 });
//     }

//     const user = await User.findOne({ email: session.user.email });
//     if (!user) {
//       return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
//     }
//     const stateTaxFiles = Object.fromEntries(user.stateTaxFiles || []);

//     const isOwner = scenario.owner.toString() === user._id.toString();
//     const canEdit = user.readWriteScenarios.some(id => id.toString() === scenarioId);
//     const canView = scenario.viewPermissions.some(id => id.toString() === user._id.toString());

//     if (!isOwner && !canView && !canEdit) {
//       return NextResponse.json({ success: false, error: 'No permission' }, { status: 401 });
//     }

//     return NextResponse.json({
//       success: true,
//       scenario,
//       isOwner,
//       hasEditPermission: canEdit,
//       hasViewPermission: canView,
//       stateTaxFiles
//     }, { status: 200 });
//   } catch (err) {
//     console.error('Error fetching scenario:', err);
//     return NextResponse.json({ success: false, error: 'Failed to fetch scenario' }, { status: 500 });
//   }
// }

// // ─────────────────────────────────────────────
// // PUT handler
// // ─────────────────────────────────────────────
// export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
//   await dbConnect();
//   const scenarioId = (await params).id;

//   if (!scenarioId || !mongoose.Types.ObjectId.isValid(scenarioId)) {
//     return NextResponse.json({ success: false, error: "Invalid scenario ID" }, { status: 400 });
//   }

//   const session = await getServerSession(authOptions);
//   if (!session?.user?.email) {
//     return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
//   }

//   try {
//     const scenario = await Scenario.findById(scenarioId);
//     if (!scenario) {
//       return NextResponse.json({ success: false, error: 'Scenario not found' }, { status: 404 });
//     }

//     const body: CoupleScenario = await req.json();

//     // 1. General info
//     scenario.name = body.name;
//     scenario.description = body.description;
//     scenario.financialGoal = body.financialGoal;
//     scenario.residenceState = body.residenceState;
//     scenario.inflationRate = body.inflationRate;
//     scenario.ownerBirthYear = body.ownerBirthYear;
//     scenario.ownerLifeExpectancy = body.ownerLifeExpectancy;
//     scenario.type = body.type;
//     if (body.type === "couple") {
//       scenario.spouseBirthYear = body.spouseBirthYear;
//       scenario.spouseLifeExpectancy = body.spouseLifeExpectancy;
//     }

//     // 2. Investments
//     for (const inv of body.investments) {
//       let invTypeId: mongoose.Types.ObjectId;
//       if (inv.investmentType._id && mongoose.Types.ObjectId.isValid(inv.investmentType._id)) {
//         const existingType = await InvestmentType.findById(inv.investmentType._id);
//         if (existingType) {
//           existingType.name = inv.investmentType.name;
//           existingType.description = inv.investmentType.description;
//           existingType.expectedAnnualReturn = inv.investmentType.expectedAnnualReturn;
//           existingType.expectedAnnualIncome = inv.investmentType.expectedAnnualIncome;
//           existingType.taxability = inv.investmentType.taxability;
//           existingType.expenseRatio = inv.investmentType.expenseRatio;
//           await existingType.save();
//           invTypeId = existingType._id;
//         } else {
//           const newType = new InvestmentType({
//             name: inv.investmentType.name,
//             description: inv.investmentType.description,
//             expectedAnnualReturn: inv.investmentType.expectedAnnualReturn,
//             expectedAnnualIncome: inv.investmentType.expectedAnnualIncome,
//             taxability: inv.investmentType.taxability,
//             expenseRatio: inv.investmentType.expenseRatio
//           });
//           await newType.save();
//           invTypeId = newType._id;
//         }
//       } else {
//         const newType = new InvestmentType({
//           name: inv.investmentType.name,
//           description: inv.investmentType.description,
//           expectedAnnualReturn: inv.investmentType.expectedAnnualReturn,
//           expectedAnnualIncome: inv.investmentType.expectedAnnualIncome,
//           taxability: inv.investmentType.taxability,
//           expenseRatio: inv.investmentType.expenseRatio
//         });
//         await newType.save();
//         invTypeId = newType._id;
//       }

//       if (inv._id && mongoose.Types.ObjectId.isValid(inv._id)) {
//         const existingInv = await Investment.findById(inv._id);
//         if (existingInv) {
//           existingInv.investmentType = invTypeId;
//           existingInv.value = inv.value;
//           existingInv.purchasePrice = inv.purchasePrice;
//           existingInv.taxStatus = inv.taxStatus;
//           await existingInv.save();
//         }
//       } else {
//         const newInv = new Investment({
//           investmentType: invTypeId,
//           value: inv.value,
//           purchasePrice: inv.purchasePrice,
//           taxStatus: inv.taxStatus
//         });
//         await newInv.save();
//         scenario.investments.push(newInv._id);
//       }
//     }

//     // 3. Events
//     for (const evt of body.eventSeries) {
//       if (evt._id && mongoose.Types.ObjectId.isValid(evt._id)) {
//         const existingEvt = await Event.findById(evt._id);
//         if (!existingEvt) continue;

//         // normalize
//         existingEvt.startYear = normalizeStartYear(evt.startYear);
//         existingEvt.duration  = normalizeDuration(evt.duration);

//         const et = evt.eventType;
//         switch (et.type) {
//           case "investment": {
//             const alloc = Array.isArray(et.assetAllocation) ? et.assetAllocation[0] : et.assetAllocation;
//             if (alloc.type === "fixed") {
//               alloc.percentages = alloc.percentages || [];
//             } else {
//               alloc.initialPercentages = alloc.initialPercentages || [];
//               alloc.finalPercentages   = alloc.finalPercentages   || [];
//             }
//             alloc.investments = extractInvestmentIds(alloc.investments);
//             existingEvt.eventType.assetAllocation = alloc;
//             existingEvt.eventType.inflationAdjustment = et.inflationAdjustment;
//             existingEvt.eventType.maxCash             = et.maxCash;
//             break;
//           }
//           case "rebalance": {
//             const p = Array.isArray(et.portfolioDistribution) ? et.portfolioDistribution[0] : et.portfolioDistribution;
//             if (p.type === "fixed") {
//               p.percentages = p.percentages || [];
//             } else {
//               p.initialPercentages = p.initialPercentages || [];
//               p.finalPercentages   = p.finalPercentages   || [];
//             }
//             existingEvt.eventType.portfolioDistribution = p;
//             break;
//           }
//           case "income": {
//             existingEvt.eventType.amount               = et.amount;
//             existingEvt.eventType.inflationAdjustment  = et.inflationAdjustment;
//             existingEvt.eventType.socialSecurity       = et.socialSecurity;
//             existingEvt.eventType.wage                 = et.wage;
//             existingEvt.eventType.expectedAnnualChange = et.expectedAnnualChange;
//             if (et.percentageOfIncome !== undefined) {
//               existingEvt.eventType.percentageOfIncome = et.percentageOfIncome;
//             }
//             break;
//           }
//           case "expense": {
//             existingEvt.eventType.discretionary        = et.discretionary;
//             existingEvt.eventType.amount               = et.amount;
//             existingEvt.eventType.inflationAdjustment  = et.inflationAdjustment;
//             existingEvt.eventType.expectedAnnualChange = et.expectedAnnualChange;
//             if (et.percentageOfIncome !== undefined) {
//               existingEvt.eventType.percentageOfIncome = et.percentageOfIncome;
//             }
//             break;
//           }
//         }

//         existingEvt.name        = evt.name;
//         existingEvt.description = evt.description;
//         await existingEvt.save();

//       } else {
//         const data: EventData = { ...evt };
//         data.startYear = normalizeStartYear(evt.startYear);
//         data.duration  = normalizeDuration(evt.duration);

//         if (evt.eventType.type === "investment") {
//           const a = Array.isArray(evt.eventType.assetAllocation)
//             ? evt.eventType.assetAllocation[0]
//             : evt.eventType.assetAllocation;
//           if (a.type === "fixed") {
//             a.percentages = a.percentages || [];
//           } else {
//             a.initialPercentages = a.initialPercentages || [];
//             a.finalPercentages   = a.finalPercentages   || [];
//           }
//           a.investments = extractInvestmentIds(a.investments);
//           data.eventType = { ...evt.eventType, assetAllocation: a };

//         } else if (evt.eventType.type === "rebalance") {
//           const p = Array.isArray(evt.eventType.portfolioDistribution)
//             ? evt.eventType.portfolioDistribution[0]
//             : evt.eventType.portfolioDistribution;
//           if (p.type === "fixed") {
//             p.percentages = p.percentages || [];
//           } else {
//             p.initialPercentages = p.initialPercentages || [];
//             p.finalPercentages   = p.finalPercentages   || [];
//           }
//           data.eventType = { ...evt.eventType, portfolioDistribution: p };
//         } else {
//           data.eventType = evt.eventType;
//         }

//         // Per client's preference, use a simple approach without destructuring
//         const dataWithoutIds = { ...data };
        
//         // Make sure IDs are removed
//         if (dataWithoutIds._id) delete dataWithoutIds._id; 
//         if (dataWithoutIds.id) delete dataWithoutIds.id;

//         const newEvt = new Event(dataWithoutIds);
//         await newEvt.save();
//         scenario.eventSeries.push(newEvt._id);
//       }
//     }

//     // 4. Spending strategy
//     scenario.spendingStrategy = [];
//     if (Array.isArray(body.spendingStrategy)) {
//       for (const e of body.spendingStrategy) {
//         if (e._id && mongoose.Types.ObjectId.isValid(e._id) && await Event.findById(e._id)) {
//           scenario.spendingStrategy.push(e._id);
//         }
//       }
//     }

//     // 5. Expense withdrawal
//     scenario.expenseWithdrawalStrategy = [];
//     if (Array.isArray(body.expenseWithdrawalStrategy)) {
//       for (const inv of body.expenseWithdrawalStrategy) {
//         if (inv._id && mongoose.Types.ObjectId.isValid(inv._id) && await Investment.findById(inv._id)) {
//           scenario.expenseWithdrawalStrategy.push(inv._id);
//         }
//       }
//     }

//     // 6. RMD strategy
//     scenario.RMDStrategy = [];
//     if (Array.isArray(body.RMDStrategy)) {
//       for (const inv of body.RMDStrategy) {
//         if (inv._id && mongoose.Types.ObjectId.isValid(inv._id) && await Investment.findById(inv._id)) {
//           scenario.RMDStrategy.push(inv._id);
//         }
//       }
//     }

//     // 7. Roth conversion strategy
//     scenario.RothConversionStrategy = [];
//     if (Array.isArray(body.RothConversionStrategy)) {
//       for (const inv of body.RothConversionStrategy) {
//         if (inv._id && mongoose.Types.ObjectId.isValid(inv._id) && await Investment.findById(inv._id)) {
//           scenario.RothConversionStrategy.push(inv._id);
//         }
//       }
//     }

//     scenario.rothConversion = body.rothConversion || null;
//     scenario.inflationRate  = body.inflationRate;

//     await scenario.save();

//     return NextResponse.json({
//       success: true,
//       message: "Scenario updated successfully",
//       scenarioId: scenario._id
//     });
//   } catch (err) {
//     console.error('Error updating scenario:', err);
//     return NextResponse.json({
//       success: false,
//       error: 'Failed to update scenario',
//       details: err instanceof Error ? err.message : String(err)
//     }, { status: 500 });
//   }
// }

// import { NextRequest, NextResponse } from 'next/server';
// import mongoose from 'mongoose';
// import dbConnect from '@/lib/dbConnect';

// import '@/models/Investment';
// import '@/models/Event';
// import '@/models/User';
// import '@/models/InvestmentType';

// import Scenario from '@/models/Scenario';
// import Event from '@/models/Event';
// import InvestmentType from '@/models/InvestmentType';
// import Investment from '@/models/Investment';
// import User from '@/models/User';
// import { FixedYear, UniformYear, NormalYear, EventYear } from '@/types/event';
// import { getServerSession } from 'next-auth/next';
// import { authOptions } from '@/lib/auth';
// import { CoupleScenario } from '@/types/scenario';


// /* ────────────────────────────────
//    DB‑specific helper types
//    ──────────────────────────────── */
//    type DbStartYear =
//    | { type: 'fixed'; year: number }
//    | { type: 'uniform'; year: { min: number; max: number } }
//    | { type: 'normal'; year: { mean: number; stdDev: number } }
//    | { type: 'event'; eventTime: 'start' | 'end'; eventId: mongoose.Types.ObjectId };
 
//  type DbDuration =
//    | { type: 'fixed'; valueType: 'amount'; value: number }
//    | { type: 'uniform'; valueType: 'amount'; year: { min: number; max: number } }
//    | { type: 'normal'; valueType: 'amount'; year: { mean: number; stdDev: number } };

  
// // Helpers to normalize input
// function normalizeStartYear(
//   raw: FixedYear | UniformYear | NormalYear | EventYear,
// ): DbStartYear {
//   switch (raw.type) {
//     case 'fixed':
//       return { type: 'fixed', year: raw.year };
//     case 'uniform':
//       return { type: 'uniform', year: { min: raw.year.min, max: raw.year.max } };
//     case 'normal':
//       return { type: 'normal', year: { mean: raw.year.mean, stdDev: raw.year.stdDev } };
//     case 'event':
//       return {
//         type: 'event',
//         eventTime: raw.eventTime,
//         eventId: new mongoose.Types.ObjectId(raw.eventId),
//       };
//   }
// }

// function normalizeDuration(raw: FixedYear | UniformYear | NormalYear): DbDuration {
//   switch (raw.type) {
//     case 'fixed':
//       return { type: 'fixed', valueType: 'amount', value: raw.year };
//     case 'uniform':
//       return {
//         type: 'uniform',
//         valueType: 'amount',
//         year: { min: raw.year.min, max: raw.year.max },
//       };
//     case 'normal':
//       return {
//         type: 'normal',
//         valueType: 'amount',
//         year: { mean: raw.year.mean, stdDev: raw.year.stdDev },
//       };
//   }
// }


// function extractInvestmentIds(items: Array<{ _id?: string | mongoose.Types.ObjectId }>): mongoose.Types.ObjectId[] {
//   return items
//     .map(inv => inv._id)
//     .filter(id => mongoose.Types.ObjectId.isValid(String(id)))
//     .map(id => new mongoose.Types.ObjectId(String(id)));
// }

// export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
//   await dbConnect();
//   const scenarioId = (await params).id;
//   if (!mongoose.Types.ObjectId.isValid(scenarioId)) {
//     return NextResponse.json({ success: false, error: 'Invalid scenario ID' }, { status: 400 });
//   }
//   const session = await getServerSession(authOptions);
//   if (!session?.user?.email) {
//     return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
//   }
//   const scenario = await Scenario.findById(scenarioId)
//     .populate({ path: 'investments', populate: { path: 'investmentType' } })
//     .populate('eventSeries')
//     .populate('spendingStrategy')
//     .populate('expenseWithdrawalStrategy');
//   if (!scenario) {
//     return NextResponse.json({ success: false, error: 'Scenario not found' }, { status: 404 });
//   }
//   const user = await User.findOne({ email: session.user.email });
//   const isOwner = user && scenario.owner.toString() === user._id.toString();
//   const canEdit = user?.readWriteScenarios.some(id => id.toString() === scenarioId) ?? false;
//   const canView = scenario.viewPermissions.some(id => user?._id.toString() === id.toString());
//   if (!isOwner && !canEdit && !canView) {
//     return NextResponse.json({ success: false, error: 'No permission' }, { status: 403 });
//   }
//   return NextResponse.json({ success: true, scenario, isOwner, hasEditPermission: canEdit, hasViewPermission: canView });
// }

// export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
//   await dbConnect();
//   const scenarioId = (await params).id;
//   if (!mongoose.Types.ObjectId.isValid(scenarioId)) {
//     return NextResponse.json({ success: false, error: 'Invalid scenario ID' }, { status: 400 });
//   }
//   const session = await getServerSession(authOptions);
//   if (!session?.user?.email) {
//     return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
//   }
//   const scenario = await Scenario.findById(scenarioId);
//   if (!scenario) {
//     return NextResponse.json({ success: false, error: 'Scenario not found' }, { status: 404 });
//   }
//   const body: CoupleScenario = await req.json();

//   // 1. General Info
//   scenario.name = body.name;
//   scenario.description = body.description;
//   scenario.financialGoal = body.financialGoal;
//   scenario.residenceState = body.residenceState;
//   scenario.inflationRate = body.inflationRate;
//   scenario.ownerBirthYear = body.ownerBirthYear;
//   scenario.ownerLifeExpectancy = body.ownerLifeExpectancy;
//   scenario.type = body.type;
//   if (body.type === 'couple') {
//     scenario.spouseBirthYear = body.spouseBirthYear;
//     scenario.spouseLifeExpectancy = body.spouseLifeExpectancy;
//   }

//   // 2. Investments - reset and repopulate to prevent duplicates
//   const updatedInvestmentIds: mongoose.Types.ObjectId[] = [];
//   for (const inv of body.investments) {
//     let invTypeId: mongoose.Types.ObjectId;
//     // find or create investmentType
//     if (inv.investmentType._id && mongoose.Types.ObjectId.isValid(inv.investmentType._id)) {
//       const existingType = await InvestmentType.findById(inv.investmentType._id);
//       if (existingType) {
//         existingType.name = inv.investmentType.name;
//         existingType.description = inv.investmentType.description;
//         existingType.expectedAnnualReturn = inv.investmentType.expectedAnnualReturn;
//         existingType.expectedAnnualIncome = inv.investmentType.expectedAnnualIncome;
//         existingType.taxability = inv.investmentType.taxability;
//         existingType.expenseRatio = inv.investmentType.expenseRatio;
//         await existingType.save();
//         invTypeId = existingType._id;
//       } else {
//         const newType = await new InvestmentType({
//           name: inv.investmentType.name,
//           description: inv.investmentType.description,
//           expectedAnnualReturn: inv.investmentType.expectedAnnualReturn,
//           expectedAnnualIncome: inv.investmentType.expectedAnnualIncome,
//           taxability: inv.investmentType.taxability,
//           expenseRatio: inv.investmentType.expenseRatio
//         }).save();
//         invTypeId = newType._id;
//       }
//     } else {
//       const newType = await new InvestmentType({
//         name: inv.investmentType.name,
//         description: inv.investmentType.description,
//         expectedAnnualReturn: inv.investmentType.expectedAnnualReturn,
//         expectedAnnualIncome: inv.investmentType.expectedAnnualIncome,
//         taxability: inv.investmentType.taxability,
//         expenseRatio: inv.investmentType.expenseRatio
//       }).save();
//       invTypeId = newType._id;
//     }
//     // update or create investment
//     if (inv._id && mongoose.Types.ObjectId.isValid(inv._id)) {
//       const existingInv = await Investment.findById(inv._id);
//       if (existingInv) {
//         existingInv.investmentType = invTypeId;
//         existingInv.value = inv.value;
//         existingInv.purchasePrice = inv.purchasePrice;
//         existingInv.taxStatus = inv.taxStatus;
//         await existingInv.save();
//         updatedInvestmentIds.push(existingInv._id);
//         continue;
//       }
//     }
//     const newInv = await new Investment({
//       investmentType: invTypeId,
//       value: inv.value,
//       purchasePrice: inv.purchasePrice,
//       taxStatus: inv.taxStatus
//     }).save();
//     updatedInvestmentIds.push(newInv._id);
//   }
//   scenario.investments = updatedInvestmentIds;

//   // 3. Events - reset and repopulate to prevent duplicates
//   const updatedEventIds: mongoose.Types.ObjectId[] = [];
//   for (const evt of body.eventSeries) {
//     if (evt._id && mongoose.Types.ObjectId.isValid(evt._id)) {
//       const existingEvt = await Event.findById(evt._id);
//       if (!existingEvt) continue;
//       existingEvt.startYear = normalizeStartYear(evt.startYear);
//       existingEvt.duration  = normalizeDuration(evt.duration);
//       Object.assign(existingEvt, { name: evt.name, description: evt.description });
//       // update eventType fields generically
//       existingEvt.eventType = Object.assign(existingEvt.eventType, evt.eventType);
//       await existingEvt.save();
//       updatedEventIds.push(existingEvt._id);
//       continue;
//     }
//     // new event
//     const data = {
//       ...evt,
//       startYear: normalizeStartYear(evt.startYear),
//       duration : normalizeDuration(evt.duration),
//     };
//     const newEvt = await new Event(data).save();
//     updatedEventIds.push(newEvt._id);
//   }
//   scenario.eventSeries = updatedEventIds;

//   // 4. Spending strategy
//   scenario.spendingStrategy = [];
//   for (const e of body.spendingStrategy || []) {
//     if (e._id && mongoose.Types.ObjectId.isValid(e._id)) {
//       scenario.spendingStrategy.push(new mongoose.Types.ObjectId(e._id));
//     }
//   }

//   // 5. Expense withdrawal strategy
//   scenario.expenseWithdrawalStrategy = [];
//   for (const inv of body.expenseWithdrawalStrategy || []) {
//     if (inv._id && mongoose.Types.ObjectId.isValid(inv._id)) {
//       scenario.expenseWithdrawalStrategy.push(new mongoose.Types.ObjectId(inv._id));
//     }
//   }

//   // 6. RMD and Roth strategies
//   scenario.RMDStrategy = extractInvestmentIds(body.RMDStrategy || []);
//   scenario.RothConversionStrategy = extractInvestmentIds(body.RothConversionStrategy || []);
//   scenario.rothConversion = body.rothConversion || null;

//   await scenario.save();
//   return NextResponse.json({ success: true, message: 'Scenario updated successfully' });
// }

// new chanhed version
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
  RebalanceEvent
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

type DbDuration =
  | { type: "fixed"; valueType: "amount"; value: number }
  | {
      type: "uniform";
      valueType: "amount";
      year: { min: number; max: number };
    }
  | {
      type: "normal";
      valueType: "amount";
      year: { mean: number; stdDev: number };
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

function normalizeStartYear(
  raw: FixedYear | UniformYear | NormalYear | EventYear
): DbStartYear {
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
      return {
        type: "event",
        eventTime: raw.eventTime,
        ...(isMongoId(raw.eventId)
          ? { eventId: new mongoose.Types.ObjectId(raw.eventId) }
          : {}),
      };
  }
}

function normalizeDuration(raw: FixedYear | UniformYear | NormalYear): DbDuration {
  switch (raw.type) {
    case "fixed":
      return { type: "fixed", valueType: "amount", value: raw.year };
    case "uniform":
      return {
        type: "uniform",
        valueType: "amount",
        year: { min: raw.year.min, max: raw.year.max },
      };
    case "normal":
      return {
        type: "normal",
        valueType: "amount",
        year: { mean: raw.year.mean, stdDev: raw.year.stdDev },
      };
  }
}

function extractInvestmentIds(
  items: Array<
    | string
    | mongoose.Types.ObjectId
    | { _id?: string | mongoose.Types.ObjectId; id?: string | mongoose.Types.ObjectId }
  > | null
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

/* ────────────────────────────────
   GET
   ──────────────────────────────── */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const scenarioId = (await params).id;

  if (!mongoose.Types.ObjectId.isValid(scenarioId)) {
    return NextResponse.json(
      { success: false, error: "Invalid scenario ID" },
      { status: 400 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
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
      { status: 404 }
    );
  }

  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.json(
      { success: false, error: "User not found" },
      { status: 404 }
    );
  }

  const isOwner = scenario.owner.toString() === user._id.toString();
  const canEdit = user.readWriteScenarios.some((id) => id.toString() === scenarioId);
  const canView = scenario.viewPermissions.some(
    (id) => id.toString() === user._id.toString()
  );

  if (!isOwner && !canEdit && !canView) {
    return NextResponse.json(
      { success: false, error: "No permission" },
      { status: 403 }
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
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const scenarioId = (await params).id;

  if (!mongoose.Types.ObjectId.isValid(scenarioId)) {
    return NextResponse.json(
      { success: false, error: "Invalid scenario ID" },
      { status: 400 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  const [scenario, user] = await Promise.all([
    Scenario.findById(scenarioId),
    User.findOne({ email: session.user.email }),
  ]);

  if (!scenario)
    return NextResponse.json(
      { success: false, error: "Scenario not found" },
      { status: 404 }
    );
  if (!user)
    return NextResponse.json(
      { success: false, error: "User not found" },
      { status: 404 }
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

    /* 2-a InvestmentType */
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

    /* 2-b Investment */
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
      )._id
    );
  }
  scenario.investments = updatedInvestmentIds;

  /* 3 — events (deduped) */
  const updatedEventIds: mongoose.Types.ObjectId[] = [];

  const normaliseAlloc = (alloc: any) => {
    alloc.investments = extractInvestmentIds(alloc.investments ?? []);
    if (alloc.type === "fixed") {
      alloc.percentages = alloc.percentages ?? [];
    } else {
      alloc.initialPercentages = alloc.initialPercentages ?? [];
      alloc.finalPercentages = alloc.finalPercentages ?? [];
    }
    return alloc;
  };

  // now safe: only call normalisePd when we actually have a pd object
  const normalisePd = (pd: any) => {
    pd.investments = extractInvestmentIds(pd.investments ?? []);
    if (pd.type === "fixed") {
      pd.percentages = pd.percentages ?? [];
    } else {
      pd.initialPercentages = pd.initialPercentages ?? [];
      pd.finalPercentages = pd.finalPercentages ?? [];
    }
    return pd;
  };

  for (const evt of body.eventSeries) {
    // ── UPDATE path ─────────────────────────────────────
    if (evt._id && isMongoId(evt._id)) {
      const existingEvt = await Event.findById(evt._id);
      if (!existingEvt) continue;

      existingEvt.startYear = normalizeStartYear(evt.startYear);
      existingEvt.duration = normalizeDuration(evt.duration);
      existingEvt.name = evt.name;
      existingEvt.description = evt.description;

      let dbEventType: any;
      if (evt.eventType.type === "investment") {
        const ie = evt.eventType as InvestmentEvent;
        const allocRaw = Array.isArray(ie.assetAllocation)
          ? ie.assetAllocation[0]
          : ie.assetAllocation;
        dbEventType = {
          type: "investment",
          inflationAdjustment: ie.inflationAdjustment,
          maxCash: ie.maxCash,
          assetAllocation: [normaliseAlloc(allocRaw)],
        };

      } else if (evt.eventType.type === "rebalance") {
        const re = evt.eventType as RebalanceEvent;
        // ←————— guard here
        if (!re.portfolioDistribution) {
          dbEventType = { ...re };
        } else {
          const rawPd = Array.isArray(re.portfolioDistribution)
            ? re.portfolioDistribution[0]
            : re.portfolioDistribution;
          const { _id, id, ...pdFields } = rawPd;
          dbEventType = {
            type: "rebalance",
            portfolioDistribution: [normalisePd(pdFields)],
          };
        }

      } else {
        dbEventType = { ...evt.eventType };
      }

      existingEvt.eventType = dbEventType;
      await existingEvt.save();
      updatedEventIds.push(existingEvt._id);
      continue;
    }

    // ── CREATE path ─────────────────────────────────────
    const { _id: _drop1, id: _drop2, ...evtWithoutIds } = evt as any;

    let dbEventType: any;
    if (evt.eventType.type === "investment") {
      const ie = evt.eventType as InvestmentEvent;
      const allocRaw = Array.isArray(ie.assetAllocation)
        ? ie.assetAllocation[0]
        : ie.assetAllocation;
      dbEventType = {
        type: "investment",
        inflationAdjustment: ie.inflationAdjustment,
        maxCash: ie.maxCash,
        assetAllocation: [normaliseAlloc(allocRaw)],
      };

    } else if (evt.eventType.type === "rebalance") {
      const re = evt.eventType as RebalanceEvent;
      // ←————— same guard here
      if (!re.portfolioDistribution) {
        dbEventType = { ...re };
      } else {
        const rawPd = Array.isArray(re.portfolioDistribution)
          ? re.portfolioDistribution[0]
          : re.portfolioDistribution;
        const { _id, id, ...pdFields } = rawPd;
        dbEventType = {
          type: "rebalance",
          portfolioDistribution: [normalisePd(pdFields)],
        };
      }

    } else {
      dbEventType = { ...evt.eventType };
    }

    const newEvt = await new Event({
      ...evtWithoutIds,
      startYear: normalizeStartYear(evt.startYear),
      duration: normalizeDuration(evt.duration),
      eventType: dbEventType,
    }).save();

    updatedEventIds.push(newEvt._id);
  }

  scenario.eventSeries = updatedEventIds;

  /* 4 — spending / expense withdrawal strategies */
  scenario.spendingStrategy = extractInvestmentIds(body.spendingStrategy ?? []);
  scenario.expenseWithdrawalStrategy = extractInvestmentIds(
    body.expenseWithdrawalStrategy ?? []
  );

  /* 5 — RMD & Roth */
  scenario.RMDStrategy = extractInvestmentIds(body.RMDStrategy ?? []);
  scenario.RothConversionStrategy = extractInvestmentIds(
    body.RothConversionStrategy ?? []
  );
  scenario.rothConversion = body.rothConversion ?? null;

  /* 6 — state-tax files (user-level) */
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
