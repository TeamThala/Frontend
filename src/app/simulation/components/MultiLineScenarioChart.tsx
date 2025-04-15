"use client";
import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export interface ScenarioLineData {
  parameterValue: string | number;
  points: { year: number; value: number }[];
}

export default function MultiLineScenarioChart({
  data,
  parameterName,
}: {
  data: ScenarioLineData[];
  parameterName: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{
    x: number;
    year: number;
    parameterValue: string | number;
    value: number;
  } | null>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const width = window.innerWidth - 100;
    const height = 500;
    const margin = { top: 20, right: 30, bottom: 50, left: 70 };

    svg.selectAll("*").remove();

    // Guard: use fallback in case points is undefined
    const allYears = Array.from(new Set(
      data.flatMap(d => (d.points || []).map(p => p.year))
    ));
    if (allYears.length === 0) return;

    const x = d3.scaleLinear()
      .domain(d3.extent(allYears) as [number, number])
      .range([margin.left, width - margin.right]);
    const y = d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top]);
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
      .domain(data.map(d => d.parameterValue.toString()));

    // Horizontal grid lines
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

    // Line generator
    const lineGen = d3.line<{ year: number; value: number }>()
      .x(d => x(d.year))
      .y(d => y(d.value));

    // Plot each scenario's line and dots
    data.forEach(scenario => {
      svg.append("path")
        .datum(scenario.points || [])
        .attr("fill", "none")
        .attr("stroke", colorScale(scenario.parameterValue.toString()))
        .attr("stroke-width", 2.5)
        .attr("d", lineGen);

      svg.selectAll(`.dot-${scenario.parameterValue}`)
        .data(scenario.points || [])
        .enter()
        .append("circle")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.value))
        .attr("r", 4)
        .attr("fill", colorScale(scenario.parameterValue.toString()));
    });

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")))
      .attr("color", "#aaa");

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).tickFormat(d => `${d}%`))
      .attr("color", "#aaa");

    // Hover interaction
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .on("mousemove", (event) => {
        const [mx] = d3.pointer(event);
        let closest: { dist: number; scenario?: ScenarioLineData; point?: { year: number; value: number } } = { dist: Infinity };

        data.forEach(scenario => {
          (scenario.points || []).forEach(point => {
            const screenX = x(point.year);
            const dist = Math.abs(mx - screenX);
            if (dist < closest.dist) {
              closest = { dist, scenario, point };
            }
          });
        });

        if (closest.scenario && closest.point) {
          setHover({
            x: x(closest.point.year),
            year: closest.point.year,
            parameterValue: closest.scenario.parameterValue,
            value: closest.point.value
          });
        } else {
          setHover(null);
        }
      })
      .on("mouseleave", () => setHover(null));

  }, [data]);

  return (
    <Card className="text-white rounded-xl border border-[#7F56D9] shadow-lg w-full"
      style={{ backgroundColor: "#000000" }}>
      <CardHeader>
        <CardTitle className="text-lg">Probability of Success by Scenario Parameter</CardTitle>
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
              className="absolute bg-[#1a1a1a] text-white p-2 rounded border border-[#7F56D9] max-w-[280px] whitespace-nowrap transform -translate-x-1/2"
              style={{ left: `${hover.x}px`, top: "50px" }}
            >
              <p>Year: {hover.year}</p>
              <p>{parameterName}: {hover.parameterValue}</p>
              <p>Success: {hover.value}%</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
