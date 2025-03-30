import ShadedProbabilityChart from "./components/ShadedProbabilityChart";
import StackedBarChart from "./components/StackedBarChart";
import MultiLineScenarioChart from "./components/MultiLineScenarioChart";
import ParamVsResultChart from "./components/ParamVsResultChart";
import { LineChartSample,  StackedBarChartData, ShadedDataSample, multiLineSampleData, paramVsResultSample } from "./sample-data/sampleData";

export default function Page() {

  return (
    <div className="p-8 bg-black">
      <ParamVsResultChart
        data={LineChartSample}
        parameterName="Year"
        yLabel="Final Probability of Success (%)"
      />
      <ShadedProbabilityChart data={ShadedDataSample} financialGoal={1000000} />
      <StackedBarChart data={StackedBarChartData} />
      <MultiLineScenarioChart data={multiLineSampleData} parameterName="Retirement Age" />
      <ParamVsResultChart
        data={paramVsResultSample}
        parameterName="Retirement Age"
        yLabel="Probability of Success (%)"
      />
    </div>
  );
}
