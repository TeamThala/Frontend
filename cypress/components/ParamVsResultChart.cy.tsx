import ParamVsResultChart from "@/app/simulation/components/ParamVsResultChart";
import { paramVsResultSample } from "@/app/simulation/sample-data/sampleData";

describe('ParamVsResultChart Complex Tests', () => {
  it('renders the correct chart title', () => {
    cy.mount(<ParamVsResultChart data={paramVsResultSample} parameterName="Retirement Age" yLabel="Success Probability" />);
    cy.contains('Success Probability').should('exist');
  });

  it('renders the line path and dots', () => {
    cy.mount(<ParamVsResultChart data={paramVsResultSample} parameterName="Retirement Age" />);
    cy.get('path[stroke="#7F56D9"]').should('exist');
    cy.get('circle').should('have.length', paramVsResultSample.length);
  });

  it('renders crosshair lines on hover', () => {
    cy.mount(<ParamVsResultChart data={paramVsResultSample} parameterName="Retirement Age" />);

    // Hover near the first data point (parameterValue: 60)
    cy.get('rect[fill="transparent"]').eq(0)
      .trigger('mousemove', { clientX: 80, clientY: 250, force: true });

    // Crosshair lines appear
    cy.get('line[stroke="#7F56D9"]').should('have.length', 2); // Vertical + horizontal
  });

  it('is responsive to window resizing', () => {
    cy.mount(<ParamVsResultChart data={paramVsResultSample} parameterName="Retirement Age" />);
    cy.viewport(1200, 800);
    cy.get('svg').should('be.visible');
    cy.viewport(800, 600);
    cy.get('svg').should('be.visible');
  });

  it('tooltip does not render if cursor is far from any data point', () => {
    cy.mount(<ParamVsResultChart data={paramVsResultSample} parameterName="Retirement Age" />);
    cy.get('rect[fill="transparent"]').eq(0)
      .trigger('mousemove', { clientX: 9999, clientY: 9999, force: true });
    cy.contains('Retirement Age:').should('not.exist');
  });
});
