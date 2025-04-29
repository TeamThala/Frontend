import fs from 'fs';
import path from 'path';
import { ObjectId } from 'mongodb';
import yaml from 'js-yaml';
import User from '@/models/User';
import dbConnect from './dbConnect';
import { StateTaxData } from './taxData';

export async function saveStateTaxFile(
  userId: string,
  stateCode: string,
  yamlContent: string
): Promise<{ success: boolean; error?: string; fileId?: string }> {
  try {
    // Validate YAML content
    const data = yaml.load(yamlContent) as any;
    if (!data || typeof data !== 'object' || !data[stateCode]) {
      return { success: false, error: 'Invalid YAML format or missing state data' };
    }

    // Generate a unique file ID
    const fileId = new ObjectId().toString();

    // Create state_tax directory if it doesn't exist
    const rootDir = process.cwd();
    const stateTaxDir = path.join(rootDir, 'data', 'state_tax');
    if (!fs.existsSync(stateTaxDir)) {
      fs.mkdirSync(stateTaxDir, { recursive: true });
    }

    // Save the file
    const filePath = path.join(stateTaxDir, `${fileId}.yaml`);
    fs.writeFileSync(filePath, yamlContent);

    // Update user's stateTaxFiles
    await dbConnect();
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!user.stateTaxFiles) {
      user.stateTaxFiles = new Map();
    }
    user.stateTaxFiles.set(stateCode, fileId);
    await user.save();

    return { success: true, fileId };
  } catch (error) {
    console.error('Error saving state tax file:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteStateTaxFile(
  userId: string,
  stateCode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbConnect();
    const user = await User.findById(userId);
    if (!user || !user.stateTaxFiles) {
      return { success: false, error: 'User or state tax files not found' };
    }

    const fileId = user.stateTaxFiles.get(stateCode);
    if (!fileId) {
      return { success: false, error: 'State tax file not found' };
    }

    // Delete the file
    const rootDir = process.cwd();
    const filePath = path.join(rootDir, 'data', 'state_tax', `${fileId}.yaml`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Update user's stateTaxFiles
    user.stateTaxFiles.delete(stateCode);
    await user.save();

    return { success: true };
  } catch (error) {
    console.error('Error deleting state tax file:', error);
    return { success: false, error: (error as Error).message };
  }
} 