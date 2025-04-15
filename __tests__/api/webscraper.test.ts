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
  `;

  const mockDeductionsHtml = `
    <table class="table">
      <tr><td>Single</td><td>$13,850</td></tr>
      <tr><td>Married Filing Jointly</td><td>$27,700</td></tr>
    </table>
  `;

  const mockCapitalGainsHtml = `
    <article>
      <p>15% applies if your taxable income is between $44,626 and $492,300 for single filers</p>
      <p>0% applies if your taxable income is less than or equal to: $44,625 for single</p>
    </article>
  `;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Mock environment variables
    process.env.TAX_BRACKETS_URL = 'https://example.com/tax-brackets';
    process.env.STANDARD_DEDUCTIONS_URL = 'https://example.com/deductions';
    process.env.CAPITAL_GAINS_URL = 'https://example.com/capital-gains';

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
}); 