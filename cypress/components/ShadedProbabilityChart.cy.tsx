import ShadedProbabilityChart from "@/app/simulation/components/ShadedProbabilityChart"
import { ShadedDataSample } from "@/app/simulation/sample-data/sampleData"

describe('ShadedProbabilityChart Complex Tests', () => {
  it('renders chart title', () => {
    cy.mount(<ShadedProbabilityChart data={ShadedDataSample} financialGoal={120000} />)
    cy.contains('Total Investment Range Over Time').should('exist')
  })

  it('renders 4 shaded probability layers with correct opacities', () => {
    cy.mount(<ShadedProbabilityChart data={ShadedDataSample} />)

    cy.get('path[opacity="0.15"]').should('exist')  // p10-p90
    cy.get('path[opacity="0.25"]').should('exist')  // p20-p80
    cy.get('path[opacity="0.35"]').should('exist')  // p30-p70
    cy.get('path[opacity="0.5"]').should('exist')   // p40-p60
  })

  it('renders the median line in pink', () => {
    cy.mount(<ShadedProbabilityChart data={ShadedDataSample} />)
    cy.get('path[stroke="#FF4690"]').should('exist')
  })

  it('renders the financial goal line if provided', () => {
    cy.mount(<ShadedProbabilityChart data={ShadedDataSample} financialGoal={120000} />)
    cy.get('line[stroke="#FFD600"]').should('exist')
  })

  it('triggers hover and displays the tooltip with correct content', () => {
    cy.mount(<ShadedProbabilityChart data={ShadedDataSample} />)

    // Trigger hover on the D3 transparent layer
    cy.get('rect[fill="transparent"]').eq(1).trigger('mousemove', { clientX: 150, clientY: 250, force: true })

    
    cy.contains('Year:', { timeout: 5000 }).should('exist')
    cy.contains('Median:').should('exist')
    cy.contains('Range:').should('exist')
  })

  it('resizes responsively', () => {
    cy.mount(<ShadedProbabilityChart data={ShadedDataSample} />)
    cy.viewport(1200, 800)
    cy.get('svg').should('be.visible')
    cy.viewport(800, 600)
    cy.get('svg').should('be.visible')
  })

  it('does not render tooltip if mouse moves outside data', () => {
    cy.mount(<ShadedProbabilityChart data={ShadedDataSample} />)
    cy.get('rect[fill="transparent"]').eq(1).trigger('mousemove', { clientX: 9999, clientY: 9999, force: true })
    cy.contains('Year:').should('not.exist')
  })
})
