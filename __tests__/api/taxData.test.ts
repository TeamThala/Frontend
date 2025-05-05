import { getTaxData, getNumericRate } from '@/lib/taxData';
import { MongoClient } from 'mongodb';
import fs, { PathOrFileDescriptor } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import User from '@/models/User';
import { expect, jest, describe, it, beforeEach } from '@jest/globals';

// Define mock types
type MockUser = {
    stateTaxFiles: Map<string, string>;
};

// Mock file system operations
jest.mock('fs', () => ({
    readFileSync: jest.fn<typeof fs.readFileSync>(),
    existsSync: jest.fn<typeof fs.existsSync>()
}));

// Mock YAML loading
jest.mock('js-yaml', () => ({
    load: jest.fn<typeof yaml.load>()
}));

// Mock MongoDB operations
jest.mock('mongodb', () => ({
    MongoClient: jest.fn().mockImplementation(() => ({
        connect: jest.fn(),
        close: jest.fn()
    }))
}));

// Mock User model
jest.mock('@/models/User', () => ({
    findById: jest.fn<typeof User.findById>()
}));

describe('taxData', () => {
    const mockTaxBrackets = {
        single: [{ rate: '10%', from: '0', upto: '10000' }],
        'married-joint': [{ rate: '10%', from: '0', upto: '20000' }],
        'married-separate': [{ rate: '10%', from: '0', upto: '10000' }],
        'head-of-household': [{ rate: '10%', from: '0', upto: '15000' }]
    };

    const mockStandardDeductions = {
        standardDeductions: {
            'Single': 13850,
            'Married Filing Jointly': 27700,
            'Head of Household': 20800
        }
    };

    const mockCapitalGains = {
        capitalGainsRates: {
            zeroPercent: [{ status: 'Single', range: { from: '0', to: '40000' } }],
            fifteenPercent: [{ status: 'Single', range: { from: '40000', to: '441450' } }],
            twentyPercent: [{ status: 'Single', range: { from: '441450', to: 'Infinity' } }],
            specialRates: {
                qualifiedSmallBusinessStock: '28%',
                collectibles: '28%',
                unrecaptured1250Gain: '25%'
            }
        }
    };

    const mockStateTaxData = {
        'NY': {
            '2024': {
                married_jointly_or_surviving_spouse: [{
                    over: 0,
                    but_not_over: 17050,
                    base_tax: 0,
                    plus: null,
                    rate: 0.04,
                    of_excess_over: 0
                }],
                single_or_married_separately: [{
                    over: 0,
                    but_not_over: 8500,
                    base_tax: 0,
                    plus: null,
                    rate: 0.04,
                    of_excess_over: 0
                }],
                head_of_household: [{
                    over: 0,
                    but_not_over: 12800,
                    base_tax: 0,
                    plus: null,
                    rate: 0.04,
                    of_excess_over: 0
                }]
            }
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock default file reads
        const mockReadFileSync = jest.fn<typeof fs.readFileSync>();
        mockReadFileSync.mockImplementation((path: PathOrFileDescriptor, options?: BufferEncoding | { encoding?: BufferEncoding | null; flag?: string } | null) => {
            const filePath = path.toString();
            const content = (() => {
                if (filePath.includes('tax_brackets.yaml')) {
                    return JSON.stringify(mockTaxBrackets);
                } else if (filePath.includes('standard_deductions.yaml')) {
                    return JSON.stringify(mockStandardDeductions);
                } else if (filePath.includes('capital_gains.yaml')) {
                    return JSON.stringify(mockCapitalGains);
                } else if (filePath.includes('state_tax_data.yaml')) {
                    return JSON.stringify(mockStateTaxData);
                }
                return '';
            })();

            if (typeof options === 'string' || (options && options.encoding !== null)) {
                return content as string & Buffer;
            }
            return Buffer.from(content) as string & Buffer;
        });
        (fs.readFileSync as jest.Mock<typeof fs.readFileSync>) = mockReadFileSync;

        // Mock YAML loading
        (yaml.load as jest.Mock<typeof yaml.load>).mockImplementation((content) => {
            if (typeof content === 'string') {
                try {
                    return JSON.parse(content);
                } catch (error) {
                    // If JSON.parse fails, return the content as is
                    // This simulates YAML's ability to parse both JSON and YAML formats
                    return content;
                }
            }
            return content;
        });
    });

    describe('getTaxData', () => {
        it('should load default tax data when no state code is provided', async () => {
            const result = await getTaxData();
            
            expect(result).toEqual({
                taxBrackets: mockTaxBrackets,
                standardDeductions: mockStandardDeductions,
                capitalGainsRates: mockCapitalGains.capitalGainsRates,
                stateTaxData: mockStateTaxData
            });
        });

        it('should load custom state tax data when available', async () => {
            const customStateData = {
                'NY': {
                    '2024': {
                        married_jointly_or_surviving_spouse: [{
                            over: 0,
                            but_not_over: 20000,
                            base_tax: 0,
                            plus: null,
                            rate: 0.05,
                            of_excess_over: 0
                        }],
                        single_or_married_separately: [{
                            over: 0,
                            but_not_over: 10000,
                            base_tax: 0,
                            plus: null,
                            rate: 0.05,
                            of_excess_over: 0
                        }],
                        head_of_household: [{
                            over: 0,
                            but_not_over: 15000,
                            base_tax: 0,
                            plus: null,
                            rate: 0.05,
                            of_excess_over: 0
                        }]
                    }
                }
            };

            // Mock user with custom tax file
            (User.findById as jest.Mock<typeof User.findById>).mockResolvedValue({
                stateTaxFiles: new Map([['NY', 'custom-ny-tax']])
            } as MockUser);

            // Mock custom file existence and content
            (fs.existsSync as jest.Mock<typeof fs.existsSync>).mockReturnValue(true);
            (fs.readFileSync as jest.Mock<typeof fs.readFileSync>).mockImplementation((path: PathOrFileDescriptor, options?: BufferEncoding | { encoding?: BufferEncoding | null; flag?: string } | null) => {
                const filePath = path.toString();
                let content;
                if (filePath.includes('custom-ny-tax.yaml')) {
                    content = JSON.stringify(customStateData);
                } else if (filePath.includes('tax_brackets.yaml')) {
                    content = JSON.stringify(mockTaxBrackets);
                } else if (filePath.includes('standard_deductions.yaml')) {
                    content = JSON.stringify(mockStandardDeductions);
                } else if (filePath.includes('capital_gains.yaml')) {
                    content = JSON.stringify(mockCapitalGains);
                } else if (filePath.includes('state_tax_data.yaml')) {
                    content = JSON.stringify(mockStateTaxData);
                } else {
                    content = '';
                }

                if (typeof options === 'string' || (options && options.encoding !== null)) {
                    return content as string & Buffer;
                }
                return Buffer.from(content) as string & Buffer;
            });

            const result = await getTaxData('NY', 'user123');
            
            expect(result.stateTaxData['NY']).toEqual(customStateData['NY']);
        });

        it('should use default state data when custom file does not exist', async () => {
            // Mock user with custom tax file
            (User.findById as jest.Mock<typeof User.findById>).mockResolvedValue({
                stateTaxFiles: new Map([['NY', 'custom-ny-tax']])
            } as MockUser);

            // Mock custom file does not exist
            (fs.existsSync as jest.Mock<typeof fs.existsSync>).mockReturnValue(false);

            const result = await getTaxData('NY', 'user123');
            
            expect(result.stateTaxData['NY']).toEqual(mockStateTaxData['NY']);
        });

        it('should handle errors when loading custom state data', async () => {
            // Mock user with custom tax file
            (User.findById as jest.Mock<typeof User.findById>).mockResolvedValue({
                stateTaxFiles: new Map([['NY', 'custom-ny-tax']])
            } as MockUser);

            // Mock custom file exists but has invalid content
            (fs.existsSync as jest.Mock<typeof fs.existsSync>).mockReturnValue(true);
            (fs.readFileSync as jest.Mock<typeof fs.readFileSync>).mockImplementation(() => {
                throw new Error('Invalid YAML');
            });

            await expect(getTaxData('NY', 'user123')).rejects.toThrow('Invalid YAML');
        });

        it('should handle errors when loading tax data files', async () => {
            (fs.readFileSync as jest.Mock<typeof fs.readFileSync>).mockImplementation(() => {
                throw new Error('File not found');
            });

            await expect(getTaxData()).rejects.toThrow('File not found');
        });
    });

    describe('getNumericRate', () => {
        it('should convert percentage string to number', () => {
            expect(getNumericRate('10%')).toBe(0.1);
            expect(getNumericRate('25.5%')).toBe(0.255);
        });

        it('should handle invalid input', () => {
            expect(getNumericRate('invalid')).toBeNaN();
        });
    });
}); 