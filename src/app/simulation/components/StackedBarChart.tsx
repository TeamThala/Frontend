"use client";
import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Investment } from "@/types/investment";

interface YearlyInvestmentData {
  year: number;
  median: Investment[];
  average: Investment[];
}

export default function StackedBarChart({ data }: { data: YearlyInvestmentData[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{
    x: number;
    year: number;
    total: number;
    breakdown: Investment[];
  } | null>(null);
  const [useMedian, setUseMedian] = useState(true);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const width = window.innerWidth - 100;
    const height = 500;
    const margin = { top: 20, right: 30, bottom: 50, left: 70 };

    svg.selectAll("*").remove();

    const displayData = data.map(d => ({
        year: d.year,
        segments: (useMedian ? d.median : d.average) ?? []  // fallback to empty array
      }));

    const allYears = displayData.map(d => d.year);
    const x = d3.scaleBand<number>().domain(allYears).range([margin.left, width - margin.right]).padding(0.3);
    const maxY = d3.max(displayData, d => d3.sum(d.segments || [], s => s.value))!;
    const y = d3.scaleLinear().domain([0, maxY * 1.1]).range([height - margin.bottom, margin.top]);

    const color = (taxStatus: Investment["taxStatus"]) => ({
      "non-retirement": "#7F56D9",
      "pre-tax": "#FF4690",
      "after-tax": "#6366F1",
    }[taxStatus] || "#999");

    // Horizontal Grid Lines
    svg.append("g")
      .attr("stroke", "#333")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(y.ticks(5))
      .enter().append("line")
      .attr("x1", margin.left)
      .attr("x2", width - margin.right)
      .attr("y1", d => y(d))
      .attr("y2", d => y(d));

    // Draw Stacked Bars
    displayData.forEach(d => {
      let y0 = y(0);
      d.segments.forEach(segment => {
        const segmentHeight = y(0) - y(segment.value);
        svg.append("rect")
          .attr("x", x(d.year)!)
          .attr("y", y0 - segmentHeight)
          .attr("width", x.bandwidth())
          .attr("height", segmentHeight)
          .attr("fill", color(segment.taxStatus));
        y0 -= segmentHeight;
      });
    });

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")))
      .attr("color", "#aaa");

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).tickFormat(d3.format("$.2s")))
      .attr("color", "#aaa");

    // Hover Layer
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .on("mousemove", (event) => {
        const [mx] = d3.pointer(event);
        const yearIndex = Math.floor((mx - margin.left) / x.step());
        const year = allYears[yearIndex];
        const matched = displayData.find(d => d.year === year);
        if (matched) {
          const total = d3.sum(matched.segments, s => s.value);
          setHover({
            x: x(matched.year)! + x.bandwidth() / 2,
            year: matched.year,
            total,
            breakdown: matched.segments
          });
        } else {
          setHover(null);
        }
      })
      .on("mouseleave", () => setHover(null));

  }, [data, useMedian]);

  return (
    <Card
      className="text-white rounded-xl border border-[#7F56D9] shadow-lg w-full"
      style={{
        background: 'linear-gradient(to bottom right, #4E4E4E -40%, #333333 10%, #141313 30%, #000000 50%, #4E4E4E 150%)'
      }}
    >
      <CardHeader>
        <CardTitle className="text-lg">Investment Stacked Breakdown</CardTitle>
        <div className="mt-4">
        <Button
            onClick={() => setUseMedian(true)}
            className={`rounded-lg px-4 py-2 ${useMedian ? 'bg-[#7F56D9] text-white' : 'bg-transparent border border-[#7F56D9] text-white'}`}
            >
            Median
            </Button>
            <Button
            onClick={() => setUseMedian(false)}
            className={`rounded-lg px-4 py-2 ml-2 ${!useMedian ? 'bg-[#7F56D9] text-white' : 'bg-transparent border border-[#7F56D9] text-white'}`}
            >
            Average
        </Button>

        </div>
      </CardHeader>
      <CardContent className="p-0 relative">
        <svg ref={svgRef} height={500} className="w-full"></svg>

        {hover && (
          <>
            <div
              className="absolute top-5 bottom-12 border-l border-dashed border-[#7F56D9] pointer-events-none"
              style={{ left: `${hover.x}px` }}
            />
            <div
              className="absolute bg-[#1a1a1a] text-white p-2 rounded border border-[#7F56D9] max-w-[260px] whitespace-nowrap transform -translate-x-1/2"
              style={{ left: `${hover.x}px`, top: "50px" }}
            >
              <p>Year: {hover.year}</p>
              <p>Total: ${hover.total.toLocaleString()}</p>
              {hover.breakdown.map((s, i) => (
                <p key={i}>{s.investmentType.name}: ${s.value.toLocaleString()}</p>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
