import { google, sheets_v4 } from 'googleapis';
import gsheetsConfig from '../config/gsheets';

// Type for service account credentials
interface ServiceAccountCredentials {
    type: string;
    project_id: string;
    private_key_id: string;
    private_key: string;
    client_email: string;
    client_id: string;
    auth_uri: string;
    token_uri: string;
    auth_provider_x509_cert_url: string;
    client_x509_cert_url: string;
}

// Type for row data
export type RowData = (string | number | boolean | null)[];

// Type for sheet data result
export interface SheetDataResult {
    success: boolean;
    data?: RowData[];
    headers?: string[];
    rowCount?: number;
    error?: string;
}

// Type for append result
export interface AppendResult {
    success: boolean;
    updatedRows?: number;
    updatedRange?: string;
    error?: string;
}

// Type for update result
export interface UpdateResult {
    success: boolean;
    updatedCells?: number;
    updatedRange?: string;
    error?: string;
}

class GoogleSheetsService {
    private sheets: sheets_v4.Sheets | null = null;
    private isInitialized: boolean = false;

    constructor() {
        this.initialize();
    }

    private async initialize(): Promise<void> {
        try {
            // Check for service account credentials
            const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

            if (!credentialsJson) {
                console.warn('⚠️ GOOGLE_SERVICE_ACCOUNT_JSON not found in environment variables');
                console.warn('📋 Google Sheets integration will not work without service account credentials');
                return;
            }

            const credentials: ServiceAccountCredentials = JSON.parse(credentialsJson);

            // Create JWT auth client
            const auth = new google.auth.JWT({
                email: credentials.client_email,
                key: credentials.private_key,
                scopes: gsheetsConfig.scopes,
            });

            // Authorize
            await auth.authorize();

            // Create Sheets client
            this.sheets = google.sheets({ version: 'v4', auth });
            this.isInitialized = true;

            console.log('✅ Google Sheets service initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Google Sheets service:', error);
            this.isInitialized = false;
        }
    }

    /**
     * Check if the service is ready to use
     */
    public isReady(): boolean {
        return this.isInitialized && this.sheets !== null;
    }

    /**
     * Get the spreadsheet ID
     */
    public getSpreadsheetId(): string {
        return gsheetsConfig.spreadsheetId;
    }

    /**
     * Read data from a sheet
     */
    async readSheet(sheetName: string, range?: string): Promise<SheetDataResult> {
        if (!this.isReady()) {
            return {
                success: false,
                error: 'Google Sheets service is not initialized. Please check your credentials.'
            };
        }

        try {
            const fullRange = range ? `${sheetName}!${range}` : sheetName;

            const response = await this.sheets!.spreadsheets.values.get({
                spreadsheetId: gsheetsConfig.spreadsheetId,
                range: fullRange,
            });

            const rows = response.data.values || [];
            const headers = rows.length > 0 ? rows[0] as string[] : [];
            const data = rows.slice(1) as RowData[];

            return {
                success: true,
                headers,
                data,
                rowCount: data.length,
            };
        } catch (error: any) {
            console.error('Error reading from Google Sheets:', error);
            return {
                success: false,
                error: error.message || 'Failed to read from Google Sheets'
            };
        }
    }

    /**
     * Append a row to a sheet
     */
    async appendRow(sheetName: string, rowData: RowData): Promise<AppendResult> {
        if (!this.isReady()) {
            return {
                success: false,
                error: 'Google Sheets service is not initialized. Please check your credentials.'
            };
        }

        try {
            const response = await this.sheets!.spreadsheets.values.append({
                spreadsheetId: gsheetsConfig.spreadsheetId,
                range: sheetName,
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
                requestBody: {
                    values: [rowData],
                },
            });

            return {
                success: true,
                updatedRows: response.data.updates?.updatedRows || 1,
                updatedRange: response.data.updates?.updatedRange || '',
            };
        } catch (error: any) {
            console.error('Error appending to Google Sheets:', error);
            return {
                success: false,
                error: error.message || 'Failed to append to Google Sheets'
            };
        }
    }

    /**
     * Append multiple rows to a sheet
     */
    async appendRows(sheetName: string, rows: RowData[]): Promise<AppendResult> {
        if (!this.isReady()) {
            return {
                success: false,
                error: 'Google Sheets service is not initialized. Please check your credentials.'
            };
        }

        try {
            const response = await this.sheets!.spreadsheets.values.append({
                spreadsheetId: gsheetsConfig.spreadsheetId,
                range: sheetName,
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
                requestBody: {
                    values: rows,
                },
            });

            return {
                success: true,
                updatedRows: response.data.updates?.updatedRows || rows.length,
                updatedRange: response.data.updates?.updatedRange || '',
            };
        } catch (error: any) {
            console.error('Error appending rows to Google Sheets:', error);
            return {
                success: false,
                error: error.message || 'Failed to append rows to Google Sheets'
            };
        }
    }

    /**
     * Update a specific range in a sheet
     */
    async updateRange(sheetName: string, range: string, values: RowData[]): Promise<UpdateResult> {
        if (!this.isReady()) {
            return {
                success: false,
                error: 'Google Sheets service is not initialized. Please check your credentials.'
            };
        }

        try {
            const fullRange = `${sheetName}!${range}`;

            const response = await this.sheets!.spreadsheets.values.update({
                spreadsheetId: gsheetsConfig.spreadsheetId,
                range: fullRange,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: values,
                },
            });

            return {
                success: true,
                updatedCells: response.data.updatedCells || 0,
                updatedRange: response.data.updatedRange || '',
            };
        } catch (error: any) {
            console.error('Error updating Google Sheets:', error);
            return {
                success: false,
                error: error.message || 'Failed to update Google Sheets'
            };
        }
    }

    /**
     * Clear a range in a sheet
     */
    async clearRange(sheetName: string, range?: string): Promise<boolean> {
        if (!this.isReady()) {
            console.error('Google Sheets service is not initialized');
            return false;
        }

        try {
            const fullRange = range ? `${sheetName}!${range}` : sheetName;

            await this.sheets!.spreadsheets.values.clear({
                spreadsheetId: gsheetsConfig.spreadsheetId,
                range: fullRange,
            });

            return true;
        } catch (error) {
            console.error('Error clearing Google Sheets range:', error);
            return false;
        }
    }

    /**
     * Get spreadsheet metadata (sheet names, etc.)
     */
    async getSpreadsheetInfo(): Promise<{
        success: boolean;
        title?: string;
        sheets?: string[];
        error?: string;
    }> {
        if (!this.isReady()) {
            return {
                success: false,
                error: 'Google Sheets service is not initialized. Please check your credentials.'
            };
        }

        try {
            const response = await this.sheets!.spreadsheets.get({
                spreadsheetId: gsheetsConfig.spreadsheetId,
            });

            const sheetNames = response.data.sheets?.map(
                sheet => sheet.properties?.title || ''
            ).filter(name => name !== '') || [];

            return {
                success: true,
                title: response.data.properties?.title || '',
                sheets: sheetNames,
            };
        } catch (error: any) {
            console.error('Error getting spreadsheet info:', error);
            return {
                success: false,
                error: error.message || 'Failed to get spreadsheet info'
            };
        }
    }

    /**
     * Create a new sheet in the spreadsheet
     */
    async createSheet(sheetName: string): Promise<boolean> {
        if (!this.isReady()) {
            console.error('Google Sheets service is not initialized');
            return false;
        }

        try {
            await this.sheets!.spreadsheets.batchUpdate({
                spreadsheetId: gsheetsConfig.spreadsheetId,
                requestBody: {
                    requests: [
                        {
                            addSheet: {
                                properties: {
                                    title: sheetName,
                                },
                            },
                        },
                    ],
                },
            });

            return true;
        } catch (error) {
            console.error('Error creating sheet:', error);
            return false;
        }
    }

    /**
     * Log user activity
     */
    async logUserActivity(
        userId: string,
        username: string,
        action: string,
        details?: string
    ): Promise<AppendResult> {
        const timestamp = new Date().toISOString();
        return this.appendRow('Analytics', [timestamp, userId, username, action, details || '']);
    }

    /**
     * Store user feedback
     */
    async storeFeedback(
        userId: string,
        username: string,
        feedbackType: string,
        message: string,
        rating?: number
    ): Promise<AppendResult> {
        const timestamp = new Date().toISOString();
        return this.appendRow('Feedback', [
            timestamp,
            userId,
            username,
            feedbackType,
            message,
            rating?.toString() || '',
        ]);
    }

    /**
     * Store custom data
     */
    async storeCustomData(sheetName: string, data: Record<string, any>): Promise<AppendResult> {
        const timestamp = new Date().toISOString();
        const values = [timestamp, JSON.stringify(data)];
        return this.appendRow(sheetName, values);
    }

    /**
     * Find row by value in a column
     */
    async findRow(
        sheetName: string,
        searchColumn: number,
        searchValue: string
    ): Promise<{ success: boolean; rowIndex?: number; rowData?: RowData; error?: string }> {
        const result = await this.readSheet(sheetName);

        if (!result.success || !result.data) {
            return { success: false, error: result.error };
        }

        const rowIndex = result.data.findIndex(
            row => row[searchColumn]?.toString() === searchValue
        );

        if (rowIndex === -1) {
            return { success: true, rowIndex: -1 };
        }

        return {
            success: true,
            rowIndex: rowIndex + 2, // +2 because: 1 for header, 1 for 1-based indexing
            rowData: result.data[rowIndex],
        };
    }
}

// Export singleton instance
export const gsheetsService = new GoogleSheetsService();
export default gsheetsService;
