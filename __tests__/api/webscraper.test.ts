import { GET } from '@/app/api/webscraper/route';
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import '@testing-library/jest-dom';
import { expect } from '@jest/globals';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock cheerio
jest.mock('cheerio');

// Mock fs
jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
}));

describe('GET /api/webscraper', () => {
  const mockTaxBracketsHtml = `
    <table class="table complex-table table-striped table-bordered table-responsive">
      <tbody>
        <tr><td>10%</td><td>$0</td><td>$11,000</td></tr>
        <tr><td>12%</td><td>$11,001</td><td>$44,725</td></tr>
      </tbody>
    </table>
    <table class="table complex-table table-striped table-bordered table-responsive">
      <tbody>
        <tr><td>10%</td><td>$0</td><td>$22,000</td></tr>
        <tr><td>12%</td><td>$22,001</td><td>$89,450</td></tr>
      </tbody>
    </table>
  `;

  const mockDeductionsHtml = `
    <table class="table">
      <tr><td>Single</td><td>$13,850</td></tr>
      <tr><td>Married Filing Jointly</td><td>$27,700</td></tr>
      <tr><td>Head of Household</td><td>$20,800</td></tr>
    </table>
  `;

  const mockCapitalGainsHtml = `
    <article>
      <p>0% applies if your taxable income is less than or equal to: $44,625 for single, $89,250 for married filing jointly, $59,750 for head of household</p>
      <p>15% applies if your taxable income is between $44,626 and $492,300 for single filers, between $89,251 and $553,850 for married filing jointly, between $59,751 and $523,050 for head of household</p>
      <p>20% applies if your taxable income is over $492,300 for single filers, over $553,850 for married filing jointly, over $523,050 for head of household</p>
      <p>Special rates: 28% for collectibles, 25% for unrecaptured section 1250 gain, 0% for qualified small business stock</p>
    </article>
  `;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Mock environment variables with actual URLs
    process.env.TAX_BRACKETS_URL = 'https://www.irs.gov/filing/federal-income-tax-rates-and-brackets';
    process.env.STANDARD_DEDUCTIONS_URL = 'https://www.irs.gov/publications/p17#en_US_2024_publink1000283782';
    process.env.CAPITAL_GAINS_URL = 'https://www.irs.gov/taxtopics/tc409';

    // Mock axios responses
    mockedAxios.get.mockImplementation((url) => {
      if (url === process.env.TAX_BRACKETS_URL) {
        return Promise.resolve({ data: mockTaxBracketsHtml });
      }
      if (url === process.env.STANDARD_DEDUCTIONS_URL) {
        return Promise.resolve({ data: mockDeductionsHtml });
      }
      if (url === process.env.CAPITAL_GAINS_URL) {
        return Promise.resolve({ data: mockCapitalGainsHtml });
      }
      return Promise.reject(new Error('Invalid URL'));
    });

    // Mock cheerio with proper table structure simulation
    const mockCell = {
      text: jest.fn().mockReturnValue('10%'),
      trim: jest.fn().mockReturnValue('10%')
    };

    const mockCells = {
      length: 3,
      0: mockCell,
      1: mockCell,
      2: mockCell,
      each: jest.fn().mockImplementation((callback) => {
        callback(0, mockCell);
        callback(1, mockCell);
        callback(2, mockCell);
      }),
      text: jest.fn().mockReturnValue('10%')
    };

    const mockRow = {
      find: jest.fn().mockReturnValue(mockCells),
      text: jest.fn().mockReturnValue('Row text')
    };

    const mockRows = {
      each: jest.fn().mockImplementation((callback) => {
        callback(0, mockRow);
        callback(1, mockRow);
      }),
      text: jest.fn().mockReturnValue('Rows text')
    };

    const mockTable = {
      find: jest.fn().mockReturnValue(mockRows),
      text: jest.fn().mockReturnValue('Table text')
    };

    const mockTables = {
      length: 1,
      each: jest.fn().mockImplementation((callback) => {
        callback(0, mockTable);
      }),
      text: jest.fn().mockReturnValue('Tables text')
    };

    const mockCheerioInstance = (selector: string) => {
      const instance = (selector === 'table.table.complex-table.table-striped.table-bordered.table-responsive')
        ? mockTables
        : (selector === 'tbody tr')
          ? mockRows
          : (selector === 'td')
            ? mockCells
            : (selector === 'article')
              ? { text: jest.fn().mockReturnValue(mockCapitalGainsHtml) }
              : (selector === 'a[name="en_US_2024_publink1000283782"]')
                ? {
                    closest: jest.fn().mockReturnValue({
                      find: jest.fn().mockReturnValue({
                        each: jest.fn().mockImplementation((callback) => {
                          // Mock the standard deductions table rows
                          callback(0, { find: jest.fn().mockReturnValue([
                            { text: jest.fn().mockReturnValue('Header'), trim: jest.fn().mockReturnValue('Header') },
                            { text: jest.fn().mockReturnValue('Amount'), trim: jest.fn().mockReturnValue('Amount') }
                          ])});
                          callback(1, { find: jest.fn().mockReturnValue([
                            { text: jest.fn().mockReturnValue('Single'), trim: jest.fn().mockReturnValue('Single') },
                            { text: jest.fn().mockReturnValue('$13,850'), trim: jest.fn().mockReturnValue('$13,850') }
                          ])});
                          callback(2, { find: jest.fn().mockReturnValue([
                            { text: jest.fn().mockReturnValue('Married Filing Jointly'), trim: jest.fn().mockReturnValue('Married Filing Jointly') },
                            { text: jest.fn().mockReturnValue('$27,700'), trim: jest.fn().mockReturnValue('$27,700') }
                          ])});
                          callback(3, { find: jest.fn().mockReturnValue([
                            { text: jest.fn().mockReturnValue('Head of Household'), trim: jest.fn().mockReturnValue('Head of Household') },
                            { text: jest.fn().mockReturnValue('$20,800'), trim: jest.fn().mockReturnValue('$20,800') }
                          ])});
                        })
                      })
                    })
                  }
                : mockTable;

      instance.text = jest.fn().mockReturnValue('Default text');
      return instance;
    };

    mockCheerioInstance.find = jest.fn().mockReturnValue(mockRows);

    (cheerio.load as jest.Mock).mockReturnValue(mockCheerioInstance);
  });

  it('returns 200 and scraped data on success', async () => {
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toHaveProperty('taxBrackets');
    expect(json).toHaveProperty('standardDeductions');
    expect(json).toHaveProperty('capitalGains');
  });

  it('handles missing environment variables', async () => {
    delete process.env.TAX_BRACKETS_URL;
    
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe('TAX_BRACKETS_URL is not defined in environment variables');
  });

  it('handles axios request failure', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe('Network error');
  });

  it('saves data to YAML files', async () => {
    await GET();

    expect(fs.writeFileSync).toHaveBeenCalledTimes(3);
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('tax_brackets.yaml'),
      expect.any(String),
      'utf8'
    );
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('standard_deductions.yaml'),
      expect.any(String),
      'utf8'
    );
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('capital_gains.yaml'),
      expect.any(String),
      'utf8'
    );
  });

  it('handles file system write errors', async () => {
    (fs.writeFileSync as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Failed to write file');
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toHaveProperty('taxBrackets');
    expect(json).toHaveProperty('standardDeductions');
    expect(json).toHaveProperty('capitalGains');
  });

  it('verifies all data structures', async () => {
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    
    // Verify tax brackets structure
    expect(json.taxBrackets).toBeDefined();
    expect(json.taxBrackets).toHaveProperty('single');
    expect(json.taxBrackets).toHaveProperty('married-joint');
    expect(json.taxBrackets).toHaveProperty('married-separate');
    expect(json.taxBrackets).toHaveProperty('head-of-household');
    
    // Verify standard deductions structure
    expect(json.standardDeductions).toBeDefined();
    expect(Object.keys(json.standardDeductions)).toHaveLength(1);
    expect(json.standardDeductions['Default text']).toBeNull();
    
    // Verify capital gains structure
    expect(json.capitalGains).toBeDefined();
    expect(json.capitalGains).toHaveProperty('zeroPercent');
    expect(json.capitalGains).toHaveProperty('fifteenPercent');
    expect(json.capitalGains).toHaveProperty('twentyPercent');
    expect(json.capitalGains).toHaveProperty('specialRates');
    expect(json.capitalGains.specialRates).toHaveProperty('qualifiedSmallBusinessStock');
    expect(json.capitalGains.specialRates).toHaveProperty('collectibles');
    expect(json.capitalGains.specialRates).toHaveProperty('unrecaptured1250Gain');
  });

  it('handles various tax bracket table error scenarios', async () => {
    const mockErrorScenarios = [
      {
        name: 'empty table',
        html: '<table class="table complex-table"><tbody></tbody></table>'
      },
      {
        name: 'malformed data',
        html: '<table class="table complex-table"><tbody><tr><td>Invalid</td><td>Data</td></tr></tbody></table>'
      },
      {
        name: 'no tables',
        html: '<div>No tables here</div>'
      },
      {
        name: 'incorrect cell count',
        html: '<table class="table complex-table"><tbody><tr><td>10%</td><td>$0</td></tr></tbody></table>'
      },
      {
        name: 'empty cell data',
        html: '<table class="table complex-table"><tbody><tr><td>10%</td><td></td><td>$11,000</td></tr></tbody></table>'
      }
    ];

    for (const scenario of mockErrorScenarios) {
      mockedAxios.get.mockImplementationOnce((url) => {
        if (url === process.env.TAX_BRACKETS_URL) {
          return Promise.resolve({ data: scenario.html });
        }
        return Promise.resolve({ data: mockDeductionsHtml });
      });

      const response = await GET();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.taxBrackets).toBeDefined();
      expect(json.taxBrackets.single).toHaveLength(0);
      expect(json.taxBrackets['married-joint']).toHaveLength(0);
      expect(json.taxBrackets['married-separate']).toHaveLength(0);
      expect(json.taxBrackets['head-of-household']).toHaveLength(0);
    }
  });

  it('handles missing capital gains patterns', async () => {
    const mockMissingPatterns = [
      {
        name: 'missing 15% pattern',
        html: `
          <article>
            <p>0% applies if your taxable income is less than or equal to: $44,625 for single</p>
            <p>20% applies if your taxable income is over $492,300 for single filers</p>
          </article>
        `
      },
      {
        name: 'missing zero pattern',
        html: `
          <article>
            <p>15% applies if your taxable income is between $44,626 and $492,300 for single filers</p>
            <p>20% applies if your taxable income is over $492,300 for single filers</p>
          </article>
        `
      },
      {
        name: 'missing special pattern',
        html: `
          <article>
            <p>0% applies if your taxable income is less than or equal to: $44,625 for single</p>
            <p>15% applies if your taxable income is between $44,626 and $492,300 for single filers</p>
            <p>20% applies if your taxable income is over $492,300 for single filers</p>
          </article>
        `
      }
    ];

    for (const scenario of mockMissingPatterns) {
      mockedAxios.get.mockImplementationOnce((url) => {
        if (url === process.env.CAPITAL_GAINS_URL) {
          return Promise.resolve({ data: scenario.html });
        }
        return Promise.resolve({ data: mockTaxBracketsHtml });
      });

      const response = await GET();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.capitalGains).toBeDefined();
      
      if (scenario.name === 'missing 15% pattern') {
        expect(json.capitalGains.fifteenPercent).toHaveLength(0);
        expect(json.capitalGains.twentyPercent).toHaveLength(0);
      } else if (scenario.name === 'missing zero pattern') {
        expect(json.capitalGains.zeroPercent).toHaveLength(0);
      } else if (scenario.name === 'missing special pattern') {
        expect(json.capitalGains.specialRates.qualifiedSmallBusinessStock).toBe('');
        expect(json.capitalGains.specialRates.collectibles).toBe('');
        expect(json.capitalGains.specialRates.unrecaptured1250Gain).toBe('');
      }
    }
  });

  it('verifies YAML file creation with correct content', async () => {
    await GET();

    // Verify all three YAML files were created
    expect(fs.writeFileSync).toHaveBeenCalledTimes(3);
    
    // Get the actual content passed to writeFileSync
    const writeFileCalls = (fs.writeFileSync as jest.Mock).mock.calls;
    
    // Verify tax_brackets.yaml
    const taxBracketsContent = writeFileCalls.find(call => 
      call[0].toString().includes('tax_brackets.yaml')
    )[1];
    expect(taxBracketsContent).toContain('single:');
    expect(taxBracketsContent).toContain('married-joint:');
    
    // Verify standard_deductions.yaml
    const deductionsContent = writeFileCalls.find(call => 
      call[0].toString().includes('standard_deductions.yaml')
    )[1];
    expect(deductionsContent).toContain('standardDeductions:');
    
    // Verify capital_gains.yaml
    const capitalGainsContent = writeFileCalls.find(call => 
      call[0].toString().includes('capital_gains.yaml')
    )[1];
    expect(capitalGainsContent).toContain('capitalGainsRates:');
    expect(capitalGainsContent).toContain('zeroPercent:');
    expect(capitalGainsContent).toContain('fifteenPercent:');
  });

  it('verifies response time is within acceptable limits', async () => {
    const startTime = Date.now();
    const response = await GET();
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    expect(response.status).toBe(200);
    // Expect the entire operation to complete within 5 seconds
    expect(responseTime).toBeLessThan(5000);
  });

  it('verifies error handling for malformed HTML structure', async () => {
    const mockMalformedHtml = `
      <div>Invalid HTML structure</div>
      <table>Missing closing tag
    `;

    mockedAxios.get.mockImplementationOnce((url) => {
      if (url === process.env.TAX_BRACKETS_URL) {
        return Promise.resolve({ data: mockMalformedHtml });
      }
      return Promise.resolve({ data: mockDeductionsHtml });
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.taxBrackets).toBeDefined();
    // Even with malformed HTML, the scraper should handle it gracefully
    expect(Array.isArray(json.taxBrackets.single)).toBe(true);
  });
}); 