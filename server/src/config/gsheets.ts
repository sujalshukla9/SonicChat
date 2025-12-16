// Google Sheets Configuration
export const gsheetsConfig = {
    // Your Google Sheets ID
    spreadsheetId: process.env.GSHEET_SPREADSHEET_ID || '1Lh8y8m9TEiFvVDBT6MTayITxCpXNoGqp0f0ylgJb_ug',

    // Default sheet names for different data types
    sheets: {
        users: 'Users',
        messages: 'Messages',
        feedback: 'Feedback',
        analytics: 'Analytics',
        custom: 'CustomData',
    },

    // Google API Scopes
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
};

export default gsheetsConfig;
