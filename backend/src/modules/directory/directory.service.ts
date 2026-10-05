import { DirectoryModel } from './directory.model.js';
import type { CreateDirectoryInput } from './directory.schemas.js';

export const listDirectory = () => DirectoryModel.find().sort({ order: 1, unit: 1 });

export const createDirectoryEntry = (input: CreateDirectoryInput) => DirectoryModel.create(input);
