import { Log } from '../types';

export interface DataService {
    generateId(): string;
    getCollection<T>(collectionName: string, filterFn?: (item: any) => boolean): Promise<T[]>;
    addDocument<T extends {id?: string}>(collectionName: string, doc: Omit<T, 'id'>): Promise<T>;
    updateDocument<T extends {id?: string}>(collectionName: string, docId: string, updates: Partial<T>): Promise<T>;
    deleteDocument(collectionName: string, docId: string): Promise<void>;
    addDataChangeListener(callback: EventListener): void;
    removeDataChangeListener(callback: EventListener): void;
}
