import { ScenarioService } from '@/services/scenarioService';
import { MongoClient, ObjectId } from 'mongodb';
import { SingleScenario, CoupleScenario } from '@/types/scenario';
import { FixedValues, NormalDistributionValues } from '@/types/utils';
import '@testing-library/jest-dom';
import { expect } from '@jest/globals';

// Mock MongoDB client and ObjectId
const mockClose = jest.fn().mockResolvedValue(undefined);
const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockFindOne = jest.fn();
const mockCollection = {
    findOne: mockFindOne
};
const mockDb = {
    collection: jest.fn().mockReturnValue(mockCollection)
};

jest.mock('mongodb', () => {
    const mockObjectId = function(id?: string) {
        return {
            toString: () => id || 'mock-object-id',
            toHexString: () => id || 'mock-object-id'
        };
    };
    mockObjectId.isValid = (id: string) => {
        return /^[0-9a-fA-F]{24}$/.test(id);
    };

    return {
        MongoClient: jest.fn().mockImplementation(() => ({
            connect: mockConnect,
            close: mockClose,
            db: jest.fn().mockReturnValue(mockDb)
        })),
        ObjectId: mockObjectId
    };
});

// Mock environment variables
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

describe('ScenarioService', () => {
    let scenarioService: ScenarioService;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Create new instance of service
        scenarioService = ScenarioService.getInstance();
    });

    describe('getScenarioById', () => {
        const validObjectId = '507f1f77bcf86cd799439011'; // Valid 24-character hex string
        const mockSingleScenario: SingleScenario = {
            _id: validObjectId,
            id: 'scenario1',
            name: 'Test Single Scenario',
            type: 'individual',
            description: 'Test description',
            financialGoal: 1000000,
            investments: [],
            eventSeries: [],
            spendingStrategy: [],
            expenseWithdrawalStrategy: [],
            inflationRate: { type: 'fixed', valueType: 'percentage', value: 2 },
            RothConversionStrategy: [],
            RMDStrategy: [],
            rothConversion: null,
            residenceState: 'CA',
            owner: { 
                id: 'user1', 
                name: 'Test User',
                email: 'test@example.com',
                image: 'https://example.com/image.jpg',
                createdScenarios: [],
                readScenarios: [],
                readWriteScenarios: []
            },
            ownerBirthYear: 1980,
            ownerLifeExpectancy: { type: 'fixed', valueType: 'amount', value: 85 },
            viewPermissions: [],
            editPermissions: [],
            updatedAt: new Date(),
            contributionsLimit: 10000
        };

        const mockCoupleScenario: CoupleScenario = {
            ...mockSingleScenario,
            type: 'couple',
            spouseBirthYear: 1982,
            spouseLifeExpectancy: { type: 'fixed', valueType: 'amount', value: 87 }
        };

        it('should successfully retrieve a single scenario', async () => {
            mockFindOne.mockResolvedValueOnce(mockSingleScenario);

            const result = await scenarioService.getScenarioById(validObjectId);
            
            expect(result).toEqual(mockSingleScenario);
            expect(mockConnect).toHaveBeenCalled();
            expect(mockClose).toHaveBeenCalled();
        });

        it('should successfully retrieve a couple scenario', async () => {
            mockFindOne.mockResolvedValueOnce(mockCoupleScenario);

            const result = await scenarioService.getScenarioById(validObjectId);
            
            expect(result).toEqual(mockCoupleScenario);
            expect(mockConnect).toHaveBeenCalled();
            expect(mockClose).toHaveBeenCalled();
        });

        it('should throw ScenarioNotFoundError when scenario does not exist', async () => {
            mockFindOne.mockResolvedValueOnce(null);

            await expect(scenarioService.getScenarioById(validObjectId))
                .rejects.toThrow(`Scenario with id ${validObjectId} not found`);
        });

        it('should throw ScenarioValidationError for invalid ObjectId', async () => {
            await expect(scenarioService.getScenarioById('invalid-id'))
                .rejects.toThrow('Invalid scenario ID format');
        });

        it('should throw DatabaseConnectionError when connection fails', async () => {
            mockConnect.mockRejectedValueOnce(new Error('Connection failed'));

            await expect(scenarioService.getScenarioById(validObjectId))
                .rejects.toThrow('Database connection failed');
        });
    });
}); 