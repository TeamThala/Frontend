"use client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2, Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import { Scenario } from "@/types/scenario";
import { Investment } from "@/types/investment";

/* ------------------------------------------------------------ */
/*  helpers                                                     */
/* ------------------------------------------------------------ */
const invId = (inv: Partial<Investment> | string | undefined) =>
  typeof inv === "string"
    ? inv
    : (inv?.id as string) ??
      (inv?._id as string) ??
      ""; // last fallback – never undefined

interface Props {
  scenario: Scenario | null;
  canEdit: boolean;
  onUpdate: (s: Scenario) => void;
  handlePrevious: () => void;
  handleNext: () => void;
}

type SectionType = "roth" | "rmd";

export default function RothAndRMD({
  scenario,
  canEdit,
  onUpdate,
  handlePrevious,
  handleNext,
}: Props) {
  /* ---------------------------------------------------------- */
  /*  state                                                     */
  /* ---------------------------------------------------------- */
  const [data, setData] = useState<Scenario | null>(scenario);
  const [rothEnabled, setRothEnabled] = useState(false);
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [endYear, setEndYear] = useState(new Date().getFullYear() + 5);
  const [rmdOrder, setRmdOrder] = useState<string[]>([]);
  const [rothOrder, setRothOrder] = useState<string[]>([]);
  const [section, setSection] = useState<SectionType>("roth");

  /* ---------------------------------------------------------- */
  /*  load / refresh from props                                 */
  /* ---------------------------------------------------------- */
  useEffect(() => {
    if (!scenario) return;

    setData(scenario);

    setRmdOrder(scenario.RMDStrategy.map(invId));
    setRothOrder(scenario.RothConversionStrategy.map(invId));

    if (scenario.rothConversion) {
      setRothEnabled(true);
      setStartYear(
        scenario.rothConversion.RothConversionStartYear ?? startYear
      );
      setEndYear(scenario.rothConversion.RothConversionEndYear ?? endYear);
    } else {
      setRothEnabled(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario]);

  /* ---------------------------------------------------------- */
  /*  helpers                                                   */
  /* ---------------------------------------------------------- */
  const mapIdsToInvestments = (ids: string[]) =>
    ids
      .map((id) => data?.investments.find((inv) => invId(inv) === id))
      .filter(Boolean) as Investment[];

  const commit = () => {
    if (!data) return;
    const updated: Scenario = {
      ...data,
      RMDStrategy: mapIdsToInvestments(rmdOrder),
      RothConversionStrategy: mapIdsToInvestments(rothOrder),
      rothConversion: rothEnabled
        ? {
            rothConversion: true,
            RothConversionStartYear: startYear,
            RothConversionEndYear: endYear,
          }
        : null,
    };
    onUpdate(updated);
  };

  /* ---------------------------------------------------------- */
  /*  move / add / remove                                       */
  /* ---------------------------------------------------------- */
  const move = (id: string, dir: "up" | "down", type: "rmd" | "roth") => {
    const list = type === "rmd" ? [...rmdOrder] : [...rothOrder];
    const idx = list.indexOf(id);
    if (idx < 0) return;

    if (dir === "up" && idx > 0) {
      [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
    }
    if (dir === "down" && idx < list.length - 1) {
      [list[idx], list[idx + 1]] = [list[idx + 1], list[idx]];
    }
    
    if (type === "rmd") {
      setRmdOrder(list);
    } else {
      setRothOrder(list);
    }
  };

  const add = (id: string, type: "rmd" | "roth") => {
    const clean = id.trim();
    if (!clean) return;

    if (type === "rmd") {
      setRmdOrder((p) => (p.includes(clean) ? p : [...p, clean]));
    } else {
      setRothOrder((p) => (p.includes(clean) ? p : [...p, clean]));
    }
  };

  const remove = (id: string, type: "rmd" | "roth") =>
    type === "rmd"
      ? setRmdOrder((p) => p.filter((x) => x !== id))
      : setRothOrder((p) => p.filter((x) => x !== id));

  /* ---------------------------------------------------------- */
  /*  filters for dropdowns                                     */
  /* ---------------------------------------------------------- */
  const eligible = (forType: "rmd" | "roth") =>
    data?.investments.filter(
      (inv) =>
        inv.taxStatus === "pre-tax" &&
        (forType === "rmd" 
          ? !rmdOrder.includes(invId(inv))
          : !rothOrder.includes(invId(inv)))
    ) ?? [];

  /* ---------------------------------------------------------- */
  /*  render guards                                             */
  /* ---------------------------------------------------------- */
  if (!data) return <div>Loading...</div>;

  const curYear = new Date().getFullYear();
  const rmdStart = data.ownerBirthYear + 73;

  /* ---------------------------------------------------------- */
  /*  JSX starts here                                           */
  /* ---------------------------------------------------------- */
  return (
    <div className="space-y-6 p-4 border rounded-md">
      {/* Tabs -------------------------------------------------- */}
      <div className="flex border-b border-gray-600 mb-6">
        {["roth", "rmd"].map((s) => (
          <button
            key={s}
            className={`px-4 py-2 font-medium ${
              section === s
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-gray-400"
            }`}
            onClick={() => setSection(s === "roth" ? "roth" : "rmd")}
          >
            {s === "roth" ? "Roth Conversion" : "Required Minimum Distributions"}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------ */}
      {/*       ROTH TAB                                         */}
      {/* ------------------------------------------------------ */}
      {section === "roth" && (
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enable-roth"
              checked={rothEnabled}
              onCheckedChange={(c) => setRothEnabled(c === true)}
              disabled={!canEdit}
              className="border-purple-400 data-[state=checked]:bg-purple-600"
            />
            <Label htmlFor="enable-roth" className="font-semibold">
              Enable Roth Conversion Strategy
            </Label>
          </div>

          {rothEnabled && (
            <div className="mt-4 pl-6 border-l-2 border-purple-200 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-year">Start Year</Label>
                  <Input
                    id="start-year"
                    type="number"
                    min={curYear}
                    max={endYear}
                    value={startYear}
                    onChange={(e) => setStartYear(+e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="end-year">End Year</Label>
                  <Input
                    id="end-year"
                    type="number"
                    min={startYear}
                    value={endYear}
                    onChange={(e) => setEndYear(+e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
              </div>

              {/* priority list */}
              <PriorityList
                title="Conversion Priority"
                note="Arrange investments in order of conversion priority"
                order={rothOrder}
                all={data.investments}
                move={(id, dir) => move(id, dir, "roth")}
                remove={(id) => remove(id, "roth")}
                canEdit={canEdit}
              />

              {/* add dropdown */}
              {canEdit && (
                <AddDropdown
                  label="Add Investment"
                  eligible={eligible("roth")}
                  onAdd={(id) => add(id, "roth")}
                  disabled={!eligible("roth").length}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------ */}
      {/*       RMD TAB                                          */}
      {/* ------------------------------------------------------ */}
      {section === "rmd" ? (
        <div className="space-y-6">
          <div className="mb-4">
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-lg">
                Required Minimum Distributions (RMDs)
              </h3>
              <RmdInfoPanel />
            </div>
            <p className="text-zinc-400 mt-1">
              RMDs will start in {rmdStart} (age&nbsp;73). Define the order in which
              investments should be withdrawn.
            </p>
          </div>

          <PriorityList
            title="RMD Withdrawal Priority"
            note="Arrange investments in order of withdrawal priority"
            order={rmdOrder}
            all={data.investments}
            move={(id, dir) => move(id, dir, "rmd")}
            remove={(id) => remove(id, "rmd")}
            canEdit={canEdit}
          />

          {canEdit && (
            <AddDropdown
              label="Add Investment"
              eligible={eligible("rmd")}
              onAdd={(id) => add(id, "rmd")}
              disabled={!eligible("rmd").length}
            />
          )}
        </div>
      ) : null}

      {!canEdit && (
        <p className="text-sm text-yellow-400 bg-zinc-800 p-2 rounded">
          Viewing in read-only mode. Editing is disabled.
        </p>
      )}

      {/* nav buttons */}
      <div className="flex justify-end pt-4 border-t mt-6 space-x-4">
        <button
          type="button"
          onClick={() => {
            commit();
            handlePrevious();
          }}
          className="bg-zinc-700 text-white px-4 py-2 rounded hover:bg-zinc-600 transition"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => {
            commit();
            handleNext();
          }}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}

/* ====================================================================== */
/*  reusable sub-components                                               */
/* ====================================================================== */
type ListProps = {
  title: string;
  note: string;
  order: string[];
  all: Investment[];
  move: (id: string, dir: "up" | "down") => void;
  remove: (id: string) => void;
  canEdit: boolean;
};

const PriorityList = ({
  title,
  note,
  order,
  all,
  move,
  remove,
  canEdit,
}: ListProps) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-zinc-400">{note}</p>
    </div>

    <div className="space-y-2 border rounded-md p-4 bg-zinc-800">
      {order.length === 0 ? (
        <p className="text-zinc-400 italic">No investments selected</p>
      ) : (
        order.map((id, idx) => {
          const inv = all.find((i) => invId(i) === id);
          if (!inv) {
            console.warn("Investment not found for id", id);
            return null;
          }

          return (
            <div
              key={`${title}-${id}`}
              className="flex items-center justify-between py-2 border-b border-zinc-700"
            >
              <div className="flex items-center">
                <span className="w-6 h-6 rounded-full bg-purple-700 flex items-center justify-center text-xs mr-3">
                  {idx + 1}
                </span>
                <span>
                  {inv.investmentType.name} ({inv.taxStatus})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => move(id, "up")}
                  disabled={!canEdit || idx === 0}
                  className="h-8 w-8 bg-zinc-700"
                >
                  ↑
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => move(id, "down")}
                  disabled={!canEdit || idx === order.length - 1}
                  className="h-8 w-8 bg-zinc-700"
                >
                  ↓
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => remove(id)}
                  disabled={!canEdit}
                  className="h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })
      )}
    </div>
  </div>
);

type DropProps = {
  label: string;
  eligible: Investment[];
  onAdd: (id: string) => void;
  disabled: boolean;
};

const AddDropdown = ({ label, eligible, onAdd, disabled }: DropProps) => (
  <div className="mt-4">
    <Label>{label}</Label>
    <Select
      onValueChange={onAdd}
      disabled={disabled}
      // closes & clears after select
      defaultValue=""
    >
      <SelectTrigger>
        <SelectValue placeholder="Select an investment" />
      </SelectTrigger>
      <SelectContent>
        {eligible.map((inv) => (
          <SelectItem key={invId(inv)} value={invId(inv)}>
            {inv.investmentType.name} ({inv.taxStatus})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    {disabled && (
      <p className="text-yellow-400 text-sm mt-2">
        No eligible pre-tax accounts available. Add them in the Investments step
        first.
      </p>
    )}
  </div>
);

const RmdInfoPanel = () => (
  <div className="flex items-start space-x-2">
    <HoverCard>
      <HoverCardTrigger asChild>
        <button 
          type="button"
          aria-label="RMD Information"
          className="inline-flex items-center text-zinc-400 hover:text-zinc-300"
        >
          <Info className="h-5 w-5" />
          <span className="ml-2 text-base">About RMDs</span>
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-[500px] bg-white border border-zinc-200 p-6">
        <div className="space-y-4">
          <h4 className="font-semibold text-purple-600 text-lg">
            Required Minimum Distributions (RMDs)
          </h4>
          <ul className="space-y-3 text-base text-zinc-900">
            <li className="flex items-start">
              <span className="mr-3">•</span>
              <span>Required by IRS starting at age 73 (SECURE 2.0 Act)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3">•</span>
              <span>Based on December 31 balance of previous year</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3">•</span>
              <span>Assets are transferred in-kind from pre-tax to non-retirement accounts</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3">•</span>
              <span>Uses IRS Uniform Life Table (Table III) for calculations</span>
            </li>
          </ul>
        </div>
      </HoverCardContent>
    </HoverCard>
  </div>
);
