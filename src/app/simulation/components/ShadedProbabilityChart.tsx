"use client";
import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface ShadedDataPoint {
  year: number;
  p10: number;
  p20: number;
  p30: number;
  p40: number;
  median: number;
  p60: number;
  p70: number;
  p80: number;
  p90: number;
}

export default function ShadedProbabilityChart({ data, financialGoal }: { data: ShadedDataPoint[]; financialGoal?: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ x: number; d: ShadedDataPoint } | null>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const width = window.innerWidth - 100;
    const height = 500;
    const margin = { top: 20, right: 30, bottom: 50, left: 70 };

    svg.selectAll("*").remove();

    const x = d3.scaleLinear()
      .domain(d3.extent(data, d => d.year) as [number, number])
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.p90)! * 1.1])
      .range([height - margin.bottom, margin.top]);

    const area = (low: keyof ShadedDataPoint, high: keyof ShadedDataPoint) =>
      d3.area<ShadedDataPoint>()
        .x(d => x(d.year))
        .y0(d => y(d[low]))
        .y1(d => y(d[high]));

    // Background
    svg.append("rect").attr("width", width).attr("height", height).attr("fill", "transparent");

    // Horizontal grid
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

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")))
      .attr("color", "#aaa");

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).tickFormat(d3.format("$.2s")))
      .attr("color", "#aaa");

    // Shaded Areas
    svg.append("path").datum(data).attr("d", area('p10', 'p90')).attr("fill", "#7F56D9").attr("opacity", 0.15);
    svg.append("path").datum(data).attr("d", area('p20', 'p80')).attr("fill", "#7F56D9").attr("opacity", 0.25);
    svg.append("path").datum(data).attr("d", area('p30', 'p70')).attr("fill", "#7F56D9").attr("opacity", 0.35);
    svg.append("path").datum(data).attr("d", area('p40', 'p60')).attr("fill", "#7F56D9").attr("opacity", 0.5);

    // Median Line
    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#FF4690")
      .attr("stroke-width", 3)
      .attr("d", d3.line<ShadedDataPoint>().x(d => x(d.year)).y(d => y(d.median)));

    // Financial Goal Line
    if (financialGoal) {
      svg.append("line")
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
        .attr("y1", y(financialGoal))
        .attr("y2", y(financialGoal))
        .attr("stroke", "#FFD600")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");
    }

    // Hover Layer
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .on("mousemove", (event) => {
        const [mx] = d3.pointer(event);
        const yearEstimate = x.invert(mx);
        const bisect = d3.bisector((d: ShadedDataPoint) => d.year).left;
        const index = bisect(data, yearEstimate);

        if (index > 0 && index < data.length) {
          const d0 = data[index - 1];
          const d1 = data[index];
          const closest = (yearEstimate - d0.year) > (d1.year - yearEstimate) ? d1 : d0;
          setHover({ x: x(closest.year), d: closest });
        } else {
          const closest = data[Math.min(index, data.length - 1)];
          setHover({ x: x(closest.year), d: closest });
        }
      })
      .on("mouseleave", () => setHover(null));

  }, [data, financialGoal]);

  const tooltipLeft = hover?.x && hover.x > window.innerWidth - 150 ? hover.x - 150 : hover?.x;

  return (
    <Card
      className="text-white rounded-xl border border-[#7F56D9] shadow-lg w-full"
      style={{
        background: 'linear-gradient(to bottom right, #4E4E4E -40%, #333333 10%, #141313 30%, #000000 50%, #4E4E4E 150%)'
      }}
    >
      <CardHeader>
        <CardTitle className="text-lg">Total Investment Range Over Time</CardTitle>
      </CardHeader>
      <CardContent className="p-0 relative">
        <svg ref={svgRef} height={500} className="w-full"></svg>

        {hover && (
          <>
            {/* Hover Vertical Line */}
            <div
              className="absolute top-5 bottom-12 border-l border-dashed border-[#7F56D9] pointer-events-none"
              style={{ left: `${hover.x}px` }}
            />
            {/* Hover Tooltip */}
            <div
            className="absolute bg-[#1a1a1a] text-white p-2 rounded border border-[#7F56D9] max-w-[240px] whitespace-nowrap transform -translate-x-1/2"
            style={{ left: `${tooltipLeft}px`, top: "50px" }}
            >
                <p>Year: {hover.d.year}</p>
                <p>Median: ${hover.d.median.toLocaleString()}</p>
                <p>Range: ${hover.d.p10.toLocaleString()} - ${hover.d.p90.toLocaleString()}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
