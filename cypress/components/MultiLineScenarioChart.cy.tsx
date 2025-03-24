import MultiLineScenarioChart from "@/app/simulation/components/MultiLineScenarioChart"
import { multiLineSampleData } from "@/app/simulation/sample-data/sampleData"

describe('MultiLineScenarioChart Complex Tests', () => {
  it('renders chart title', () => {
    cy.mount(<MultiLineScenarioChart data={multiLineSampleData} parameterName="Retirement Age" />)
    cy.contains('Probability of Success by Scenario Parameter').should('exist')
  })

  it('renders multiple scenario lines with different colors', () => {
    cy.mount(<MultiLineScenarioChart data={multiLineSampleData} parameterName="Retirement Age" />)
    cy.get('path[stroke]').should('have.length.greaterThan', 1) // Multiple lines
  })

  it('renders circle dots for scenario points', () => {
    cy.mount(<MultiLineScenarioChart data={multiLineSampleData} parameterName="Retirement Age" />)
    cy.get('circle').should('have.length.greaterThan', 2)
  })

  it('triggers hover and displays the correct tooltip content', () => {
    cy.mount(<MultiLineScenarioChart data={multiLineSampleData} parameterName="Retirement Age" />)

    // Hover on the hover interaction layer
    cy.get('rect[fill="transparent"]').eq(0)
      .trigger('mousemove', { clientX: 150, clientY: 250, force: true })

    cy.contains('Year:', { timeout: 5000 }).should('exist')
    cy.contains('Retirement Age:').should('exist')
    cy.contains('Success:').should('exist')
  })

  it('is responsive to window resizing', () => {
    cy.mount(<MultiLineScenarioChart data={multiLineSampleData} parameterName="Retirement Age" />)
    cy.viewport(1200, 800)
    cy.get('svg').should('be.visible')
    cy.viewport(800, 600)
    cy.get('svg').should('be.visible')
  })

  it('does not render tooltip if mouse is outside of data range', () => {
    cy.mount(<MultiLineScenarioChart data={multiLineSampleData} parameterName="Retirement Age" />)
    cy.get('rect[fill="transparent"]').eq(0)
      .trigger('mousemove', { clientX: 9999, clientY: 9999, force: true })
    cy.contains('Year:').should('not.exist')
  })
})
