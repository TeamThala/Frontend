// import client from '@/lib/db';

// export async function findOneAndUpdate(filter, update, options) {
//   const collection = client.db().collection('rmdtables');
//   return collection.findOneAndUpdate(filter, { $set: update }, { ...options });
// }

// export async function findOne(filter) {
//   const collection = client.db().collection('rmdtables');
//   return collection.findOne(filter);
// }

// export default {
//   findOneAndUpdate,
//   findOne
// };
import { Filter, UpdateFilter, FindOneAndUpdateOptions, Document, ObjectId } from 'mongodb';
import client from '@/lib/db';

/**
 * Interface for RMD table document in MongoDB
 * The year field represents the tax year for which these factors apply
 * Example: 2023 table is used for RMDs determined as of Dec 31, 2023, paid in 2024
 */
interface RmdTableDocument {
  _id?: ObjectId;  // MongoDB document ID
  year: number;  // Tax year for which these factors apply
  table: Array<{
    age: number;  // Age of the account owner as of Dec 31 of the tax year
    distributionPeriod: number;  // Life expectancy factor from IRS Uniform Lifetime Table
  }>;
  updatedAt: Date;
  isDefault: boolean;  // Indicates if this is the fallback default table
}

export async function findOneAndUpdate(
  filter: Filter<Document>,
  update: UpdateFilter<Document>,
  options?: FindOneAndUpdateOptions
) {
  const collection = client.db().collection<RmdTableDocument>('rmdtables');
  return collection.findOneAndUpdate(filter, { $set: update }, { ...options });
}

export async function findOne(filter: Filter<Document>) {
  const collection = client.db().collection<RmdTableDocument>('rmdtables');
  return collection.findOne(filter);
}

const RMDTable = {
  findOneAndUpdate,
  findOne,
};

export default RMDTable;
export type { RmdTableDocument };
