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
import { Filter, UpdateFilter, FindOneAndUpdateOptions, Document } from 'mongodb';
import client from '@/lib/db';

export async function findOneAndUpdate(
  filter: Filter<Document>,
  update: UpdateFilter<Document>,
  options?: FindOneAndUpdateOptions
) {
  const collection = client.db().collection('rmdtables');
  return collection.findOneAndUpdate(filter, { $set: update }, { ...options });
}

export async function findOne(filter: Filter<Document>) {
  const collection = client.db().collection('rmdtables');
  return collection.findOne(filter);
}

const RMDTable = {
  findOneAndUpdate,
  findOne,
};

export default RMDTable;
