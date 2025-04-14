import client from '@/lib/db';

export async function findOneAndUpdate(filter, update, options) {
  const collection = client.db().collection('rmdtables');
  return collection.findOneAndUpdate(filter, { $set: update }, { ...options });
}

export async function findOne(filter) {
  const collection = client.db().collection('rmdtables');
  return collection.findOne(filter);
}

export default {
  findOneAndUpdate,
  findOne
};