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
  yLabel = "Value (%)",
}: {
  data: ScenarioLineData[];
  parameterName: string;
  yLabel?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{
    x: number;
    year: number;
    values: Array<{
      parameterValue: string | number;
      value: number;
      color: string;
    }>;
  } | null>(null);
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

    // Guard: use fallback in case points is undefined
    const allYears = Array.from(new Set(
      data.flatMap(d => (d.points || []).map(p => p.year))
    ));
    if (allYears.length === 0) return;

    // Find max value to determine y scale range
    const maxValue = d3.max(data.flatMap(d => (d.points || []).map(p => p.value))) || 100;
    
    const x = d3.scaleLinear()
      .domain(d3.extent(allYears) as [number, number])
      .range([margin.left, width - margin.right]);
    
    const y = d3.scaleLinear()
      .domain([0, maxValue * 1.1]) // Add 10% padding on top
      .range([height - margin.bottom, margin.top]);
      
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
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX); // Smooth the curve

    // Plot each scenario's line and dots
    data.forEach(scenario => {
      svg.append("path")
        .datum(scenario.points || [])
        .attr("fill", "none")
        .attr("stroke", colorScale(scenario.parameterValue.toString()))
        .attr("stroke-width", 3)
        .attr("d", lineGen);

      svg.selectAll(`.dot-${scenario.parameterValue}`)
        .data(scenario.points || [])
        .enter()
        .append("circle")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.value))
        .attr("r", 5)
        .attr("fill", colorScale(scenario.parameterValue.toString()));
    });

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")))
      .attr("color", "#aaa");

    const yAxis = d3.axisLeft(y);
    // If values are likely percentages, format them as such
    if (maxValue <= 100) {
      yAxis.tickFormat(d => `${d}%`);
    } else {
      // Use appropriate number formatting based on magnitude
      yAxis.tickFormat(d => {
        const value = Number(d);
        return d3.format(value > 1000 ? ",.0f" : ".2f")(value);
      });
    }
    
    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(yAxis)
      .attr("color", "#aaa");

    // Hover interaction - updated to show all lines at the hovered year
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .on("mousemove", (event) => {
        const [mx] = d3.pointer(event);
        const xYear = x.invert(mx);

        // Find the closest year in our data
        const sortedYears = [...allYears].sort((a, b) => a - b);
        const closestYear = sortedYears.reduce((prev, curr) => 
          Math.abs(curr - xYear) < Math.abs(prev - xYear) ? curr : prev
        );

        const valuesAtYear: Array<{
          parameterValue: string | number;
          value: number;
          color: string;
        }> = [];

        // For each scenario, find the closest point to that year
        data.forEach((scenario, i) => {
          const point = scenario.points.find(p => p.year === closestYear);
          if (point) {
            valuesAtYear.push({
              parameterValue: scenario.parameterValue,
              value: point.value,
              color: d3.schemeCategory10[i % 10]
            });
          }
        });

        // Only update if we found values for this year
        if (valuesAtYear.length > 0) {
          setHover({
            x: x(closestYear),
            year: closestYear,
            values: valuesAtYear
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
        <CardTitle className="text-lg">{yLabel}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 relative" ref={containerRef}>
        <svg ref={svgRef} width="100%" height={dimensions.height}></svg>
        
        {/* Crosshair Lines */}
        {hover && (
          <svg className="absolute top-0 left-0 pointer-events-none" width="100%" height={dimensions.height}>
            <line
              x1={hover.x}
              x2={hover.x}
              y1={0}
              y2={dimensions.height}
              stroke="#7F56D9"
              strokeWidth={1}
              strokeDasharray="4"
            />
          </svg>
        )}
        
        {/* Legend */}
        <div className="absolute top-2 right-4 bg-black/60 p-2 rounded border border-gray-700">
          <div className="text-sm font-medium mb-1">Parameter Values</div>
          {data.map((scenario, i) => (
            <div key={i} className="flex items-center text-xs mb-1">
              <span className="h-3 w-3 mr-2 rounded-full" 
                style={{ backgroundColor: d3.schemeCategory10[i % 10] }}></span>
              <span>{scenario.parameterValue}</span>
            </div>
          ))}
        </div>
        
        {/* Enhanced Tooltip */}
        {hover && (
          <div
            className="absolute bg-[#1a1a1a] text-white p-3 rounded border border-[#7F56D9] max-w-[350px] transform"
            style={{ 
              left: hover.x > dimensions.width - 180 ? hover.x - 180 : hover.x,
              top: "50px",
              zIndex: 10,
              transform: hover.x > dimensions.width - 180 ? "" : "translateX(-50%)"
            }}
          >
            <div className="font-medium border-b border-gray-700 pb-1 mb-2">Year: {hover.year}</div>
            <div className="max-h-[200px] overflow-y-auto">
              {/* Sort values by parameter value for consistent display */}
              {hover.values
                .sort((a, b) => {
                  // Try numeric comparison first
                  const aVal = Number(a.parameterValue);
                  const bVal = Number(b.parameterValue);
                  if (!isNaN(aVal) && !isNaN(bVal)) {
                    return aVal - bVal;
                  }
                  // Fall back to string comparison
                  return a.parameterValue.toString().localeCompare(b.parameterValue.toString());
                })
                .map((item, i) => (
                <div key={i} className="flex items-center mb-1 text-sm">
                  <span className="h-3 w-3 mr-2 rounded-full" 
                    style={{ backgroundColor: item.color }}></span>
                  <span className="flex-1">{parameterName}: {item.parameterValue}</span>
                  <span className="font-medium ml-2">
                    {item.value.toLocaleString()}{item.value <= 100 ? '%' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
