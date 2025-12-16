import { create } from 'zustand';
import { API_URL } from '../config/api';

// Types
export interface SheetInfo {
    title: string;
    sheets: string[];
}

export interface SheetData {
    headers: string[];
    data: (string | number | boolean | null)[][];
    rowCount: number;
}

interface DataState {
    sheetInfo: SheetInfo | null;
    currentSheetData: SheetData | null;
    isLoading: boolean;
    error: string | null;
    serviceReady: boolean;

    // Actions
    checkServiceStatus: () => Promise<void>;
    getSpreadsheetInfo: () => Promise<SheetInfo | null>;
    readSheet: (sheetName: string, range?: string) => Promise<SheetData | null>;
    appendRow: (sheetName: string, data: (string | number | boolean | null)[]) => Promise<boolean>;
    appendRows: (sheetName: string, rows: (string | number | boolean | null)[][]) => Promise<boolean>;
    updateRange: (sheetName: string, range: string, values: (string | number | boolean | null)[][]) => Promise<boolean>;
    createSheet: (sheetName: string) => Promise<boolean>;
    logActivity: (userId: string, username: string, action: string, details?: string) => Promise<boolean>;
    submitFeedback: (userId: string, username: string, feedbackType: string, message: string, rating?: number) => Promise<boolean>;
    storeCustomData: (sheetName: string, data: Record<string, any>) => Promise<boolean>;
    clearError: () => void;
}

export const useDataStore = create<DataState>((set, get) => ({
    sheetInfo: null,
    currentSheetData: null,
    isLoading: false,
    error: null,
    serviceReady: false,

    checkServiceStatus: async () => {
        try {
            const response = await fetch(`${API_URL}/api/data/status`);
            const data = await response.json();
            set({ serviceReady: data.ready });
        } catch (error) {
            console.error('Error checking data service status:', error);
            set({ serviceReady: false });
        }
    },

    getSpreadsheetInfo: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/api/data/spreadsheet/info`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get spreadsheet info');
            }

            const data = await response.json();
            const info: SheetInfo = {
                title: data.title,
                sheets: data.sheets,
            };

            set({ sheetInfo: info, isLoading: false });
            return info;
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            return null;
        }
    },

    readSheet: async (sheetName: string, range?: string) => {
        set({ isLoading: true, error: null });
        try {
            const url = range
                ? `${API_URL}/api/data/sheet/${encodeURIComponent(sheetName)}?range=${encodeURIComponent(range)}`
                : `${API_URL}/api/data/sheet/${encodeURIComponent(sheetName)}`;

            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to read sheet');
            }

            const data = await response.json();
            const sheetData: SheetData = {
                headers: data.headers,
                data: data.data,
                rowCount: data.rowCount,
            };

            set({ currentSheetData: sheetData, isLoading: false });
            return sheetData;
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            return null;
        }
    },

    appendRow: async (sheetName: string, data: (string | number | boolean | null)[]) => {
        try {
            const response = await fetch(`${API_URL}/api/data/sheet/${encodeURIComponent(sheetName)}/row`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to append row');
            }

            return true;
        } catch (error: any) {
            set({ error: error.message });
            return false;
        }
    },

    appendRows: async (sheetName: string, rows: (string | number | boolean | null)[][]) => {
        try {
            const response = await fetch(`${API_URL}/api/data/sheet/${encodeURIComponent(sheetName)}/rows`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rows }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to append rows');
            }

            return true;
        } catch (error: any) {
            set({ error: error.message });
            return false;
        }
    },

    updateRange: async (sheetName: string, range: string, values: (string | number | boolean | null)[][]) => {
        try {
            const response = await fetch(`${API_URL}/api/data/sheet/${encodeURIComponent(sheetName)}/range`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ range, values }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update range');
            }

            return true;
        } catch (error: any) {
            set({ error: error.message });
            return false;
        }
    },

    createSheet: async (sheetName: string) => {
        try {
            const response = await fetch(`${API_URL}/api/data/sheet/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sheetName }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create sheet');
            }

            // Refresh spreadsheet info
            await get().getSpreadsheetInfo();
            return true;
        } catch (error: any) {
            set({ error: error.message });
            return false;
        }
    },

    logActivity: async (userId: string, username: string, action: string, details?: string) => {
        try {
            const response = await fetch(`${API_URL}/api/data/analytics/log`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, username, action, details }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to log activity');
            }

            return true;
        } catch (error: any) {
            console.error('Error logging activity:', error);
            return false;
        }
    },

    submitFeedback: async (userId: string, username: string, feedbackType: string, message: string, rating?: number) => {
        try {
            const response = await fetch(`${API_URL}/api/data/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, username, feedbackType, message, rating }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to submit feedback');
            }

            return true;
        } catch (error: any) {
            set({ error: error.message });
            return false;
        }
    },

    storeCustomData: async (sheetName: string, data: Record<string, any>) => {
        try {
            const response = await fetch(`${API_URL}/api/data/custom/${encodeURIComponent(sheetName)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to store data');
            }

            return true;
        } catch (error: any) {
            set({ error: error.message });
            return false;
        }
    },

    clearError: () => set({ error: null }),
}));

export default useDataStore;
