"use client";
import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface ParamVsResultPoint {
  parameterValue: number;
  finalResult: number;
}

export default function ParamVsResultChart({
  data,
  parameterName,
  yLabel,
}: {
  data: ParamVsResultPoint[];
  parameterName: string;
  yLabel?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ d: ParamVsResultPoint; xPos: number; yPos: number } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 500 });

  // Function to draw the chart
  const drawChart = () => {
    if (!svgRef.current || !containerRef.current || data.length === 0) return;
    
    const containerWidth = containerRef.current.clientWidth;
    setDimensions({ width: containerWidth, height: 500 });
    
    const svg = d3.select(svgRef.current);
    const width = containerWidth;
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

        const closest = data.reduce((prev, curr) =>
          Math.abs(curr.parameterValue - paramX) < Math.abs(prev.parameterValue - paramX) ? curr : prev
        );

        const distance = Math.abs(x(closest.parameterValue) - mx);
        if (distance < 30) { // Flicker prevention threshold
          setHover({
            d: closest,
            xPos: x(closest.parameterValue),
            yPos: y(closest.finalResult),
          });
        } else {
          setHover(null);
        }
      })
      .on("mouseleave", () => setHover(null));
  };

  // Effect to draw chart when data changes or on resize
  useEffect(() => {
    drawChart();
    
    // Add resize event listener
    const handleResize = () => {
      drawChart();
    };
    
    window.addEventListener('resize', handleResize);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <CardContent className="p-0 relative" ref={containerRef}>
        <svg ref={svgRef} width="100%" height={dimensions.height}></svg>

        {/* Crosshair Lines */}
        {hover && (
          <svg className="absolute top-0 left-0 pointer-events-none" width="100%" height={dimensions.height}>
            <line
              x1={hover.xPos}
              x2={hover.xPos}
              y1={0}
              y2={dimensions.height}
              stroke="#7F56D9"
              strokeWidth={1}
              strokeDasharray="4"
            />
            <line
              x1={0}
              x2={dimensions.width}
              y1={hover.yPos}
              y2={hover.yPos}
              stroke="#7F56D9"
              strokeWidth={1}
              strokeDasharray="4"
            />
          </svg>
        )}

        {/* Tooltip */}
        {hover && (
          <div
            className="absolute bg-[#1a1a1a] text-white p-2 rounded border border-[#7F56D9] max-w-[260px] whitespace-nowrap pointer-events-none"
            style={{
              left: `${hover.xPos}px`,
              top: "50px",
              transform: hover.xPos > dimensions.width - 220 ? "translateX(-100%)" : "translateX(-50%)",
            }}
          >
            <p>{parameterName}: {hover.d.parameterValue}</p>
            <p>{yLabel || "Final Probability"}: {hover.d.finalResult.toLocaleString()}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
