/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useRef, useState } from "react";
import { SurfacePlotDataPoint } from "../functions/transformToTwoDimensionalData";

// Custom type for Plotly's colorscale which is an array of [number, string] tuples
type ColorScale = Array<[number, string]>;

interface ContourPlotProps {
  data: SurfacePlotDataPoint[];
  xLabel: string;
  yLabel: string;
  zLabel: string;
  colorScale?: ColorScale;
  title?: string;
  width?: number;
  height?: number;
  showColorbar?: boolean;
}

export default function ContourPlot({
  data,
  xLabel,
  yLabel,
  zLabel,
  colorScale = [
    [0, "rgb(0, 0, 100)"],
    [0.25, "rgb(0, 50, 180)"],
    [0.5, "rgb(100, 100, 240)"],
    [0.75, "rgb(180, 50, 180)"],
    [1, "rgb(240, 0, 130)"]
  ],
  title = "",
  width = 700,
  height = 500,
  showColorbar = true
}: ContourPlotProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [plotlyInstance, setPlotlyInstance] = useState<any>(null);

  // Sort data to prepare for contour plot
  const prepareData = () => {
    // Get unique x and y values
    const xValues = Array.from(new Set(data.map(point => point.x))).sort((a, b) => a - b);
    const yValues = Array.from(new Set(data.map(point => point.y))).sort((a, b) => a - b);
    
    // Create z-value matrix
    const zValues: number[][] = [];
    
    // Initialize z-value matrix with zeros
    for (let i = 0; i < yValues.length; i++) {
      zValues[i] = new Array(xValues.length).fill(null);
    }
    
    // Fill z-value matrix
    data.forEach(point => {
      const xIndex = xValues.indexOf(point.x);
      const yIndex = yValues.indexOf(point.y);
      
      if (xIndex !== -1 && yIndex !== -1) {
        zValues[yIndex][xIndex] = point.z;
      }
    });
    
    return { xValues, yValues, zValues };
  };

  // Dynamically import Plotly only on the client side
  useEffect(() => {
    setIsClient(true);
    
    // Import Plotly only on the client
    if (typeof window !== 'undefined') {
      import('plotly.js-dist-min').then(module => {
        setPlotlyInstance(module.default);
      });
    }
  }, []);

  useEffect(() => {
    if (isClient && plotRef.current && plotlyInstance && data.length > 0) {
      const { xValues, yValues, zValues } = prepareData();
      
      const plotData = [{
        type: 'contour',
        x: xValues,
        y: yValues,
        z: zValues,
        colorscale: colorScale,
        contours: {
          coloring: 'heatmap',
          showlabels: true,
          labelfont: {
            color: 'white',
          }
        },
        colorbar: {
          title: zLabel,
          titlefont: { color: 'white' },
          tickfont: { color: 'white' },
          outlinecolor: 'rgba(255, 255, 255, 0.3)',
          thickness: 20,
          len: 0.85,
          xpad: 10
        },
        showscale: showColorbar,
        hoverinfo: 'x+y+z'
      }];
      
      const layout = {
        title: {
          text: title,
          font: { color: 'white' }
        },
        width: width,
        height: height,
        margin: {
          l: 65,
          r: 50,
          b: 65,
          t: 90,
        },
        xaxis: {
          title: xLabel,
          titlefont: { color: "white" },
          tickfont: { color: "white" },
          gridcolor: "rgba(255, 255, 255, 0.1)",
          zerolinecolor: "white",
        },
        yaxis: {
          title: yLabel,
          titlefont: { color: "white" },
          tickfont: { color: "white" },
          gridcolor: "rgba(255, 255, 255, 0.1)",
          zerolinecolor: "white",
        },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: {
          color: "white"
        },
        annotations: [
          {
            text: `Contour lines represent ${zLabel} values`,
            showarrow: false,
            x: 0.5,
            y: -0.15,
            xref: 'paper',
            yref: 'paper',
            font: {
              color: 'rgba(255, 255, 255, 0.6)',
              size: 12
            }
          }
        ]
      };
      
      plotlyInstance.newPlot(plotRef.current, plotData, layout);
      
      return () => {
        if (plotRef.current && plotlyInstance) {
          plotlyInstance.purge(plotRef.current);
        }
      };
    }
  }, [data, xLabel, yLabel, zLabel, colorScale, title, width, height, isClient, showColorbar, plotlyInstance]);

  return (
    <div className="flex justify-center items-center">
      {!plotlyInstance && isClient && (
        <div className="text-white bg-gray-900 p-6 rounded-xl border border-[#7F56D9] shadow-xl">
          Loading plot...
        </div>
      )}
      <div 
        ref={plotRef} 
        className="bg-gray-900 rounded-xl border border-[#7F56D9] shadow-xl"
        style={{ display: !plotlyInstance ? 'none' : 'block' }}
      />
    </div>
  );
} 