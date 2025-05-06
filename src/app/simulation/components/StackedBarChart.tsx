/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface BarSegment {
  id: string;
  name?: string;
  value: number;
  taxStatus?: "pre-tax" | "after-tax" | "non-retirement";
}

interface StackedBarChartEntry {
  year: number;
  median: BarSegment[];
  average: BarSegment[];
}

export default function StackedBarChart({ 
  data,
  title,
  chartType
}: { 
  data: StackedBarChartEntry[];
  title?: string;
  chartType?: "investments" | "income" | "expenses";
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 500 });
  const [hover, setHover] = useState<{
    x: number;
    year: number;
    total: number;
    breakdown: BarSegment[];
  } | null>(null);
  const [useMedian, setUseMedian] = useState(true);

  // Move the color function to component scope so it can be used in the tooltip
  const color = (taxStatus?: string, investmentKey?: string) => {
    // For investment chart type with investment key provided, use investment-based colors
    if (chartType === "investments" && investmentKey) {
      // Create a colorful palette for investments
      const investmentColors = [
        "#7F56D9", // Purple
        "#FF4690", // Pink
        "#6EE7B7", // Green
        "#6366F1", // Indigo
        "#F59E0B", // Amber
        "#EC4899", // Fuchsia
        "#10B981", // Emerald
        "#3B82F6", // Blue
        "#8B5CF6", // Violet
        "#EF4444"  // Red
      ];
      
      // Use a hash function to consistently map investment names to colors
      const hashCode = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return Math.abs(hash);
      };
      
      const colorIndex = hashCode(investmentKey) % investmentColors.length;
      return investmentColors[colorIndex];
    } 
    // Keep the original tax status based coloring as fallback
    else if (chartType === "investments" && taxStatus) {
      return {
        "non-retirement": "#7F56D9", // Purple
        "pre-tax": "#FF4690",        // Pink
        "after-tax": "#6EE7B7",      // Green
      }[taxStatus] || "#999";
    } else if (chartType === "income") {
      return "#6366F1"; // Income color
    } else if (chartType === "expenses") {
      return "#FF4690"; // Expense color
    }
    
    // Default color scheme
    return "#999"; // Gray as default
  };

  // AI tool (ChatGPT) was used to assist with generating 
  // chart code, sample data, and visualization design. 
  // All content was reviewed and revised by the author.
  // It was used to first generate chart in observablehq.com
  // and then converted to React code.
  const drawChart = () => {
    if (!svgRef.current || !containerRef.current || data.length === 0) return;
    
    const containerWidth = containerRef.current.clientWidth;
    setDimensions({ width: containerWidth, height: 500 });
    
    const svg = d3.select(svgRef.current);
    const width = containerWidth;
    const height = 500;
    const margin = { top: 20, right: 30, bottom: 80, left: 70 };

    svg.selectAll("*").remove();

    const displayData = data.map(d => ({
        year: d.year,
        segments: (useMedian ? d.median : d.average) ?? []  // fallback to empty array
      }));

    const allYears = displayData.map(d => d.year);
    const x = d3.scaleBand<number>().domain(allYears).range([margin.left, width - margin.right]).padding(0.3);
    const maxY = d3.max(displayData, d => d3.sum(d.segments || [], s => s.value))!;
    const y = d3.scaleLinear().domain([0, maxY * 1.1]).range([height - margin.bottom, margin.top]);

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

    // Prepare data for D3 stack
    const stackKeys: string[] = Array.from(
      new Set(
        displayData.flatMap(d => d.segments.map(s => s.name || s.id))
      )
    );

    // Create a map of investment name -> value for each year
    const stackData = displayData.map(d => {
      const entry: Record<string, any> = { year: d.year };
      // Initialize all keys with 0
      stackKeys.forEach(key => {
        entry[key] = 0;
      });
      // Fill in actual values
      d.segments.forEach(segment => {
        const key = segment.name || segment.id;
        entry[key] = segment.value;
        // Store tax status for coloring
        if (!entry[`${key}_taxStatus`]) {
          entry[`${key}_taxStatus`] = segment.taxStatus;
        }
      });
      // Store the original segments for tooltip
      entry.originalSegments = d.segments;
      return entry;
    });

    // Create stack generator
    const stack = d3.stack()
      .keys(stackKeys)
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);

    // Generate stacked data
    const stackedSeries = stack(stackData);

    // Draw stacked bars
    stackedSeries.forEach((series, i) => {
      svg.append("g")
        .selectAll("rect")
        .data(series)
        .join("rect")
        .attr("x", d => x(d.data.year)!)
        .attr("y", d => y(d[1]))
        .attr("height", d => y(d[0]) - y(d[1]))
        .attr("width", x.bandwidth())
        .attr("fill", d => {
          // Using proper type annotations to fix TypeScript error
          const key = String(stackKeys[i]);
          // Color based on investment key rather than tax status
          return color(undefined, key);
        })
        .on("mouseover", (event, d) => {
          const originalSegments = d.data.originalSegments as unknown as BarSegment[];
          setHover({
            x: x(d.data.year)! + x.bandwidth() / 2,
            year: d.data.year,
            total: d3.sum(originalSegments, s => s.value),
            breakdown: originalSegments
          });
        });
    });

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")))
      .attr("color", "#aaa")
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em");

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
        if (yearIndex >= 0 && yearIndex < allYears.length) {
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
          }
        } else {
          setHover(null);
        }
      })
      .on("mouseleave", () => setHover(null));

    // Clear previous hover overlay
    svg.selectAll(".hover-overlay").remove();

    // Add colored legend at the bottom if we're showing investments
    if (chartType === "investments") {
      // Get unique investment names/ids across all data
      const uniqueInvestments = Array.from(
        new Set(
          data.flatMap(entry => 
            (useMedian ? entry.median : entry.average).map(seg => seg.name || seg.id)
          )
        )
      ).slice(0, 5); // Limit to first 5 to avoid overcrowding
      
      const legend = svg.append("g")
        .attr("transform", `translate(${margin.left + 20}, ${height - 30})`);
      
      uniqueInvestments.forEach((investmentName, i) => {
        // Find an example of this investment to get its tax status for coloring
        const exampleSegment = data.flatMap(entry => 
          (useMedian ? entry.median : entry.average)
        ).find(seg => (seg.name || seg.id) === investmentName);
        
        const legendItem = legend.append("g")
          .attr("transform", `translate(${i * 150}, 0)`);
        
        legendItem.append("rect")
          .attr("width", 16)
          .attr("height", 16)
          .attr("fill", color(exampleSegment?.taxStatus, investmentName as string));
        
        // Truncate long investment names
        const displayName = investmentName.length > 15 
          ? investmentName.substring(0, 15) + "..." 
          : investmentName;
        
        legendItem.append("text")
          .attr("x", 24)
          .attr("y", 12)
          .attr("fill", "#fff")
          .text(displayName);
      });
    }
  };

  // Draw chart on data change or window resize
  useEffect(() => {
    drawChart();
    
    const handleResize = () => {
      drawChart();
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, useMedian, chartType]);

  const getChartTitle = () => {
    if (title) return title;
    
    if (chartType === "investments") {
      return "Investment Breakdown";
    } else if (chartType === "income") {
      return "Income Breakdown";
    } else if (chartType === "expenses") {
      return "Expense Breakdown";
    }
    
    return "Stacked Breakdown";
  };

  return (
    <Card
      className="text-white rounded-xl border border-[#7F56D9] shadow-lg w-full"
      style={{
        background: 'linear-gradient(to bottom right, #4E4E4E -40%, #333333 10%, #141313 30%, #000000 50%, #4E4E4E 150%)'
      }}
    >
      <CardHeader>
        <CardTitle className="text-lg">{getChartTitle()}</CardTitle>
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
      <CardContent className="p-0 relative" ref={containerRef}>
        <svg 
          ref={svgRef} 
          width="100%" 
          height={dimensions.height}
        ></svg>

        {hover && (
          <>
            <div
              className="absolute top-5 bottom-12 border-l border-dashed border-[#7F56D9] pointer-events-none"
              style={{ left: `${hover.x}px` }}
            />
            <div
              className="absolute bg-[#1a1a1a] text-white p-2 rounded border border-[#7F56D9] max-w-[300px] whitespace-nowrap transform -translate-x-1/2"
              style={{ 
                left: `${hover.x > dimensions.width - 150 ? dimensions.width - 150 : hover.x}px`, 
                top: "50px",
                transform: hover.x > dimensions.width - 150 ? "none" : "translateX(-50%)"
              }}
            >
              <p>Year: {hover.year}</p>
              <p>Total: ${hover.total.toLocaleString()}</p>
              {hover.breakdown.map((s, i) => (
                <p key={i} className="flex items-center">
                  <span 
                    className="inline-block w-3 h-3 mr-2 rounded-sm" 
                    style={{ backgroundColor: color(undefined, s.name || s.id) }}
                  ></span>
                  <span className="font-medium">{s.name || s.id}: </span>
                  <span className="ml-1">${s.value.toLocaleString()}</span>
                  {s.taxStatus && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{
                      backgroundColor: s.taxStatus === 'non-retirement' ? 'rgba(127, 86, 217, 0.2)' : 
                                     s.taxStatus === 'pre-tax' ? 'rgba(255, 70, 144, 0.2)' : 
                                     'rgba(110, 231, 183, 0.2)',
                      color: s.taxStatus === 'non-retirement' ? '#a78bec' : 
                             s.taxStatus === 'pre-tax' ? '#ff7eb0' : 
                             '#95f1d0'
                    }}>
                      {s.taxStatus === 'non-retirement' ? 'Non-Retirement' : 
                       s.taxStatus === 'pre-tax' ? 'Pre-Tax' : 
                       'After-Tax'}
                    </span>
                  )}
                </p>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
