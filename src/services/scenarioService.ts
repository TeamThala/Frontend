import { Scenario, SingleScenario, CoupleScenario } from '@/types/scenario';
import { MongoClient, ObjectId } from 'mongodb';
import { Investment } from '@/types/investment';
import { Event } from '@/types/event';
import { User } from '@/types/user';

// Basic error types
export class ScenarioError extends Error {
    constructor(message: string, public code: string) {
        super(message);
        this.name = 'ScenarioError';
    }
}

export class ScenarioNotFoundError extends ScenarioError {
    constructor(id: string) {
        super(`Scenario with id ${id} not found`, 'SCENARIO_NOT_FOUND');
        this.name = 'ScenarioNotFoundError';
    }
}

export class ScenarioValidationError extends ScenarioError {
    constructor(message: string, public invalidFields: string[]) {
        super(`Invalid scenario data: ${message}`, 'SCENARIO_VALIDATION_ERROR');
        this.name = 'ScenarioValidationError';
    }
}

export class DatabaseConnectionError extends ScenarioError {
    constructor(message: string) {
        super(`Database connection failed: ${message}`, 'DB_CONNECTION_ERROR');
        this.name = 'DatabaseConnectionError';
    }
}

//connection handling
export class ScenarioService {
    private static instance: ScenarioService;
    private client: MongoClient;
    private readonly MONGODB_URI: string;
    private readonly DB_NAME = 'main';
    private readonly COLLECTION_NAME = 'scenarios';

    private constructor() {
        this.MONGODB_URI = process.env.MONGODB_URI || '';
        if (!this.MONGODB_URI) {
            throw new DatabaseConnectionError('MongoDB URI is not defined in environment variables');
        }
        this.client = new MongoClient(this.MONGODB_URI);
    }

    public static getInstance(): ScenarioService {
        if (!ScenarioService.instance) {
            ScenarioService.instance = new ScenarioService();
        }
        return ScenarioService.instance;
    }

    /**
     * Retrieves a scenario by its MongoDB _id
     * @param id The MongoDB ObjectId as a string
     * @returns Promise<Scenario>
     */
    public async getScenarioById(id: string): Promise<Scenario> {
        let isConnected = false;

        try {
            // Validate Object ID format
            if (!ObjectId.isValid(id)) {
                throw new ScenarioValidationError('Invalid scenario ID format', ['id']);
            }

            // Connect to MongoDB and fetch the scenario document
            try {
                await this.client.connect();
                isConnected = true;
            } catch (error) {
                throw new DatabaseConnectionError(
                    error instanceof Error ? error.message : 'Unknown connection error'
                );
            }

            const db = this.client.db(this.DB_NAME);
            const collection = db.collection(this.COLLECTION_NAME);

            // Find scenario
            const scenarioDoc = await collection.findOne({ _id: new ObjectId(id) });
            
            if (!scenarioDoc) {
                throw new ScenarioNotFoundError(id);
            }

            // Parse the document into a properly typed Scenario object
            const baseScenario = {
                _id: scenarioDoc._id.toString(),
                id: scenarioDoc.id,
                name: scenarioDoc.name,
                description: scenarioDoc.description,
                financialGoal: scenarioDoc.financialGoal,
                investments: scenarioDoc.investments as Investment[],
                eventSeries: scenarioDoc.eventSeries as Event[],
                spendingStrategy: scenarioDoc.spendingStrategy as Event[],
                expenseWithdrawalStrategy: scenarioDoc.expenseWithdrawalStrategy as Investment[],
                inflationRate: scenarioDoc.inflationRate,
                RothConversionStrategy: scenarioDoc.RothConversionStrategy as Investment[],
                RMDStrategy: scenarioDoc.RMDStrategy as Investment[],
                rothConversion: scenarioDoc.rothConversion,
                residenceState: scenarioDoc.residenceState,
                owner: scenarioDoc.owner as User,
                ownerBirthYear: scenarioDoc.ownerBirthYear,
                ownerLifeExpectancy: scenarioDoc.ownerLifeExpectancy,
                viewPermissions: scenarioDoc.viewPermissions as User[],
                editPermissions: scenarioDoc.editPermissions as User[],
                updatedAt: new Date(scenarioDoc.updatedAt),
                contributionsLimit: scenarioDoc.contributionsLimit,
            };

            // Return typed scenario based on type
            if (scenarioDoc.type === 'individual') {
                return {
                    ...baseScenario,
                    type: 'individual'
                } as SingleScenario;
            } else {
                return {
                    ...baseScenario,
                    type: 'couple',
                    spouseBirthYear: scenarioDoc.spouseBirthYear,
                    spouseLifeExpectancy: scenarioDoc.spouseLifeExpectancy
                } as CoupleScenario;
            }

        } catch (error) {
            // Rethrow ScenarioErrors as is
            if (error instanceof ScenarioError) {
                throw error;
            }

            // Convert unknown errors to ScenarioError
            throw new ScenarioError(
                `Failed to retrieve scenario: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'UNKNOWN_ERROR'
            );
        } finally {
            // Ensure connection is closed if it was opened
            if (isConnected) {
                await this.client.close().catch(console.error);
            }
        }
    }
}