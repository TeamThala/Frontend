"use client";
import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface ParamVsResultPoint {
  parameterValue: number; // e.g., Retirement Age
  finalResult: number;    // e.g., Probability % or Investment $
}

export default function ParamVsResultChart({
  data,
  parameterName,
  yLabel,
}: {
  data: ParamVsResultPoint[];
  parameterName: string;   // e.g., "Retirement Age"
  yLabel?: string;         // e.g., "Probability of Success (%)"
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<ParamVsResultPoint | null>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const width = window.innerWidth - 100;
    const height = 500;
    const margin = { top: 20, right: 30, bottom: 50, left: 70 };

    svg.selectAll("*").remove();

    const x = d3.scaleLinear()
      .domain(d3.extent(data, d => d.parameterValue) as [number, number])
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.finalResult)! * 1.1])
      .range([height - margin.bottom, margin.top]);

    // Grid lines
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
    const line = d3.line<ParamVsResultPoint>()
      .x(d => x(d.parameterValue))
      .y(d => y(d.finalResult));

    // Draw line
    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#7F56D9")
      .attr("stroke-width", 3)
      .attr("d", line);

    // Dots
    svg.selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", d => x(d.parameterValue))
      .attr("cy", d => y(d.finalResult))
      .attr("r", 5)
      .attr("fill", "#7F56D9");

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")))
      .attr("color", "#aaa");

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .attr("color", "#aaa");

    // Hover
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .on("mousemove", (event) => {
        const [mx] = d3.pointer(event);
        const paramX = x.invert(mx);
        // Find closest
        const closest = data.reduce((prev, curr) =>
          Math.abs(curr.parameterValue - paramX) < Math.abs(prev.parameterValue - paramX) ? curr : prev
        );
        setHover(closest);
      })
      .on("mouseleave", () => setHover(null));

  }, [data]);

  return (
    <Card
      className="text-white rounded-xl border border-[#7F56D9] shadow-lg w-full"
      style={{
        background: 'linear-gradient(to bottom right, #4E4E4E -40%, #333333 10%, #141313 30%, #000000 50%, #4E4E4E 150%)'
      }}
    >
      <CardHeader>
        <CardTitle className="text-lg">{yLabel || "Final Probability of Success"}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 relative">
        <svg ref={svgRef} height={500} className="w-full"></svg>

        {hover && (
          <div
            className="absolute bg-[#1a1a1a] text-white p-2 rounded border border-[#7F56D9] max-w-[260px] whitespace-nowrap transform -translate-x-1/2"
            style={{ left: `${(hover.parameterValue - data[0].parameterValue) * 80 + 80}px`, top: "50px" }}
          >
            <p>{parameterName}: {hover.parameterValue}</p>
            <p>{yLabel || "Final Probability"}: {hover.finalResult}%</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
