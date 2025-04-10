import ParamVsResultChart from "@/app/simulation/components/ParamVsResultChart"
import { LineChartSample } from "@/app/simulation/sample-data/sampleData"

describe('ParamVsResultChart Complex Tests', () => {
  it('renders the correct chart title', () => {
    cy.mount(<ParamVsResultChart data={LineChartSample} parameterName="Retirement Age" yLabel="Success Probability" />)
    cy.contains('Success Probability').should('exist')
  })

  it('renders the line path and dots', () => {
    cy.mount(<ParamVsResultChart data={LineChartSample} parameterName="Retirement Age" />)
    cy.get('path[stroke="#7F56D9"]').should('exist')
    cy.get('circle').should('have.length', LineChartSample.length)
  })

  it('triggers hover and displays the tooltip with correct content', () => {
    cy.mount(<ParamVsResultChart data={LineChartSample} parameterName="Retirement Age" yLabel="Success Probability" />)

    cy.get('rect[fill="transparent"]').eq(0)
      .trigger('mousemove', { clientX: 200, clientY: 250, force: true })

    cy.contains('Retirement Age:').should('exist')
    cy.contains('Success Probability:').should('exist')
  })

  it('renders crosshair lines on hover', () => {
    cy.mount(<ParamVsResultChart data={LineChartSample} parameterName="Retirement Age" />)

    cy.get('rect[fill="transparent"]').eq(0)
      .trigger('mousemove', { clientX: 200, clientY: 250, force: true })

    cy.get('line[stroke="#7F56D9"]').should('have.length', 2) // Vertical and horizontal lines
  })

  it('is responsive to window resizing', () => {
    cy.mount(<ParamVsResultChart data={LineChartSample} parameterName="Retirement Age" />)
    cy.viewport(1200, 800)
    cy.get('svg').should('be.visible')
    cy.viewport(800, 600)
    cy.get('svg').should('be.visible')
  })

  it('tooltip does not render if cursor is far from any data point', () => {
    cy.mount(<ParamVsResultChart data={LineChartSample} parameterName="Retirement Age" />)
    cy.get('rect[fill="transparent"]').eq(0)
      .trigger('mousemove', { clientX: 9999, clientY: 9999, force: true })
    cy.contains('Retirement Age:').should('not.exist')
  })
})
