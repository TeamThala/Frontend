import StackedBarChart from '@/app/simulation/components/StackedBarChart'
import { StackedBarChartData } from '@/app/simulation/sample-data/sampleData'

describe('StackedBarChart Complex Tests', () => {
  beforeEach(() => {
    cy.mount(<StackedBarChart data={StackedBarChartData} />)
  })

  it('renders the correct number of bars based on data', () => {
    // There should be N rects (bars + grid lines + overlay)
    cy.get('rect').should('have.length.greaterThan', 5)
  })

  it('renders correct axis years', () => {
    StackedBarChartData.forEach((d) => {
      cy.contains(d.year.toString()).should('exist')
    })
  })

  it('toggles between Median and Average and rerenders', () => {
    // Initially Median should be active
    cy.get('button').contains('Median').should('have.class', 'bg-[#7F56D9]')
    cy.get('button').contains('Average').click()
    cy.get('button').contains('Average').should('have.class', 'bg-[#7F56D9]')
  })
  
  it('is responsive on window resize', () => {
    cy.viewport(1200, 800)
    cy.get('svg').should('be.visible')
    cy.viewport(800, 600)
    cy.get('svg').should('be.visible')
  })

  it('does not render tooltip on empty hover (edge case)', () => {
    // Trigger hover far away from bars
    cy.get('rect[fill="transparent"]')
      .trigger('mousemove', { clientX: 9999, clientY: 9999, force: true })
    cy.contains('Total:').should('not.exist')
  })
})
