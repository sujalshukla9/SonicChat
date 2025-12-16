import express from 'express';
import gsheetsService from '../services/gsheetsService';
import gsheetsConfig from '../config/gsheets';

const router = express.Router();

/**
 * @route   GET /api/data/status
 * @desc    Check Google Sheets service status
 * @access  Public
 */
router.get('/status', (req, res) => {
    res.json({
        ready: gsheetsService.isReady(),
        spreadsheetId: gsheetsConfig.spreadsheetId,
        defaultSheets: gsheetsConfig.sheets,
    });
});

/**
 * @route   GET /api/data/spreadsheet/info
 * @desc    Get spreadsheet metadata
 * @access  Private (should add auth middleware)
 */
router.get('/spreadsheet/info', async (req, res) => {
    try {
        if (!gsheetsService.isReady()) {
            res.status(503).json({
                error: 'Google Sheets service is not available',
                message: 'Please configure GOOGLE_SERVICE_ACCOUNT_JSON in environment variables'
            });
            return;
        }

        const info = await gsheetsService.getSpreadsheetInfo();

        if (!info.success) {
            res.status(400).json({ error: info.error });
            return;
        }

        res.json({
            title: info.title,
            sheets: info.sheets,
        });
    } catch (error: any) {
        console.error('Error getting spreadsheet info:', error);
        res.status(500).json({ error: error.message || 'Failed to get spreadsheet info' });
    }
});

/**
 * @route   GET /api/data/sheet/:sheetName
 * @desc    Read data from a sheet
 * @access  Private (should add auth middleware)
 */
router.get('/sheet/:sheetName', async (req, res) => {
    try {
        if (!gsheetsService.isReady()) {
            res.status(503).json({
                error: 'Google Sheets service is not available',
                message: 'Please configure GOOGLE_SERVICE_ACCOUNT_JSON in environment variables'
            });
            return;
        }

        const { sheetName } = req.params;
        const { range } = req.query;

        const result = await gsheetsService.readSheet(
            sheetName,
            range as string | undefined
        );

        if (!result.success) {
            res.status(400).json({ error: result.error });
            return;
        }

        res.json({
            headers: result.headers,
            data: result.data,
            rowCount: result.rowCount,
        });
    } catch (error: any) {
        console.error('Error reading sheet:', error);
        res.status(500).json({ error: error.message || 'Failed to read sheet' });
    }
});

/**
 * @route   POST /api/data/sheet/:sheetName/row
 * @desc    Append a row to a sheet
 * @access  Private (should add auth middleware)
 */
router.post('/sheet/:sheetName/row', async (req, res) => {
    try {
        if (!gsheetsService.isReady()) {
            res.status(503).json({
                error: 'Google Sheets service is not available',
                message: 'Please configure GOOGLE_SERVICE_ACCOUNT_JSON in environment variables'
            });
            return;
        }

        const { sheetName } = req.params;
        const { data } = req.body;

        if (!data || !Array.isArray(data)) {
            res.status(400).json({ error: 'Data must be an array of values' });
            return;
        }

        const result = await gsheetsService.appendRow(sheetName, data);

        if (!result.success) {
            res.status(400).json({ error: result.error });
            return;
        }

        res.status(201).json({
            message: 'Row added successfully',
            updatedRows: result.updatedRows,
            updatedRange: result.updatedRange,
        });
    } catch (error: any) {
        console.error('Error appending row:', error);
        res.status(500).json({ error: error.message || 'Failed to append row' });
    }
});

/**
 * @route   POST /api/data/sheet/:sheetName/rows
 * @desc    Append multiple rows to a sheet
 * @access  Private (should add auth middleware)
 */
router.post('/sheet/:sheetName/rows', async (req, res) => {
    try {
        if (!gsheetsService.isReady()) {
            res.status(503).json({
                error: 'Google Sheets service is not available',
                message: 'Please configure GOOGLE_SERVICE_ACCOUNT_JSON in environment variables'
            });
            return;
        }

        const { sheetName } = req.params;
        const { rows } = req.body;

        if (!rows || !Array.isArray(rows)) {
            res.status(400).json({ error: 'Rows must be an array of arrays' });
            return;
        }

        const result = await gsheetsService.appendRows(sheetName, rows);

        if (!result.success) {
            res.status(400).json({ error: result.error });
            return;
        }

        res.status(201).json({
            message: 'Rows added successfully',
            updatedRows: result.updatedRows,
            updatedRange: result.updatedRange,
        });
    } catch (error: any) {
        console.error('Error appending rows:', error);
        res.status(500).json({ error: error.message || 'Failed to append rows' });
    }
});

/**
 * @route   PUT /api/data/sheet/:sheetName/range
 * @desc    Update a range in a sheet
 * @access  Private (should add auth middleware)
 */
router.put('/sheet/:sheetName/range', async (req, res) => {
    try {
        if (!gsheetsService.isReady()) {
            res.status(503).json({
                error: 'Google Sheets service is not available',
                message: 'Please configure GOOGLE_SERVICE_ACCOUNT_JSON in environment variables'
            });
            return;
        }

        const { sheetName } = req.params;
        const { range, values } = req.body;

        if (!range || !values || !Array.isArray(values)) {
            res.status(400).json({ error: 'Range and values are required' });
            return;
        }

        const result = await gsheetsService.updateRange(sheetName, range, values);

        if (!result.success) {
            res.status(400).json({ error: result.error });
            return;
        }

        res.json({
            message: 'Range updated successfully',
            updatedCells: result.updatedCells,
            updatedRange: result.updatedRange,
        });
    } catch (error: any) {
        console.error('Error updating range:', error);
        res.status(500).json({ error: error.message || 'Failed to update range' });
    }
});

/**
 * @route   DELETE /api/data/sheet/:sheetName/clear
 * @desc    Clear a range or entire sheet
 * @access  Private (should add auth middleware)
 */
router.delete('/sheet/:sheetName/clear', async (req, res) => {
    try {
        if (!gsheetsService.isReady()) {
            res.status(503).json({
                error: 'Google Sheets service is not available',
                message: 'Please configure GOOGLE_SERVICE_ACCOUNT_JSON in environment variables'
            });
            return;
        }

        const { sheetName } = req.params;
        const { range } = req.query;

        const success = await gsheetsService.clearRange(
            sheetName,
            range as string | undefined
        );

        if (!success) {
            res.status(400).json({ error: 'Failed to clear range' });
            return;
        }

        res.json({ message: 'Range cleared successfully' });
    } catch (error: any) {
        console.error('Error clearing range:', error);
        res.status(500).json({ error: error.message || 'Failed to clear range' });
    }
});

/**
 * @route   POST /api/data/sheet/create
 * @desc    Create a new sheet in the spreadsheet
 * @access  Private (should add auth middleware)
 */
router.post('/sheet/create', async (req, res) => {
    try {
        if (!gsheetsService.isReady()) {
            res.status(503).json({
                error: 'Google Sheets service is not available',
                message: 'Please configure GOOGLE_SERVICE_ACCOUNT_JSON in environment variables'
            });
            return;
        }

        const { sheetName } = req.body;

        if (!sheetName) {
            res.status(400).json({ error: 'Sheet name is required' });
            return;
        }

        const success = await gsheetsService.createSheet(sheetName);

        if (!success) {
            res.status(400).json({ error: 'Failed to create sheet' });
            return;
        }

        res.status(201).json({ message: 'Sheet created successfully', sheetName });
    } catch (error: any) {
        console.error('Error creating sheet:', error);
        res.status(500).json({ error: error.message || 'Failed to create sheet' });
    }
});

// ===== Convenience Endpoints =====

/**
 * @route   POST /api/data/analytics/log
 * @desc    Log user activity
 * @access  Private (should add auth middleware)
 */
router.post('/analytics/log', async (req, res) => {
    try {
        if (!gsheetsService.isReady()) {
            res.status(503).json({
                error: 'Google Sheets service is not available',
                message: 'Please configure GOOGLE_SERVICE_ACCOUNT_JSON in environment variables'
            });
            return;
        }

        const { userId, username, action, details } = req.body;

        if (!userId || !action) {
            res.status(400).json({ error: 'userId and action are required' });
            return;
        }

        const result = await gsheetsService.logUserActivity(
            userId,
            username || 'Unknown',
            action,
            details
        );

        if (!result.success) {
            res.status(400).json({ error: result.error });
            return;
        }

        res.status(201).json({ message: 'Activity logged successfully' });
    } catch (error: any) {
        console.error('Error logging activity:', error);
        res.status(500).json({ error: error.message || 'Failed to log activity' });
    }
});

/**
 * @route   POST /api/data/feedback
 * @desc    Submit user feedback
 * @access  Private (should add auth middleware)
 */
router.post('/feedback', async (req, res) => {
    try {
        if (!gsheetsService.isReady()) {
            res.status(503).json({
                error: 'Google Sheets service is not available',
                message: 'Please configure GOOGLE_SERVICE_ACCOUNT_JSON in environment variables'
            });
            return;
        }

        const { userId, username, feedbackType, message, rating } = req.body;

        if (!message) {
            res.status(400).json({ error: 'Message is required' });
            return;
        }

        const result = await gsheetsService.storeFeedback(
            userId || 'anonymous',
            username || 'Anonymous',
            feedbackType || 'general',
            message,
            rating
        );

        if (!result.success) {
            res.status(400).json({ error: result.error });
            return;
        }

        res.status(201).json({ message: 'Feedback submitted successfully' });
    } catch (error: any) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({ error: error.message || 'Failed to submit feedback' });
    }
});

/**
 * @route   POST /api/data/custom/:sheetName
 * @desc    Store custom data (JSON object)
 * @access  Private (should add auth middleware)
 */
router.post('/custom/:sheetName', async (req, res) => {
    try {
        if (!gsheetsService.isReady()) {
            res.status(503).json({
                error: 'Google Sheets service is not available',
                message: 'Please configure GOOGLE_SERVICE_ACCOUNT_JSON in environment variables'
            });
            return;
        }

        const { sheetName } = req.params;
        const data = req.body;

        if (!data || typeof data !== 'object') {
            res.status(400).json({ error: 'Request body must be a JSON object' });
            return;
        }

        const result = await gsheetsService.storeCustomData(sheetName, data);

        if (!result.success) {
            res.status(400).json({ error: result.error });
            return;
        }

        res.status(201).json({ message: 'Data stored successfully' });
    } catch (error: any) {
        console.error('Error storing custom data:', error);
        res.status(500).json({ error: error.message || 'Failed to store data' });
    }
});

/**
 * @route   GET /api/data/search/:sheetName
 * @desc    Search for a row by column value
 * @access  Private (should add auth middleware)
 */
router.get('/search/:sheetName', async (req, res) => {
    try {
        if (!gsheetsService.isReady()) {
            res.status(503).json({
                error: 'Google Sheets service is not available',
                message: 'Please configure GOOGLE_SERVICE_ACCOUNT_JSON in environment variables'
            });
            return;
        }

        const { sheetName } = req.params;
        const { column, value } = req.query;

        if (column === undefined || !value) {
            res.status(400).json({ error: 'Column index and value are required' });
            return;
        }

        const result = await gsheetsService.findRow(
            sheetName,
            parseInt(column as string),
            value as string
        );

        if (!result.success) {
            res.status(400).json({ error: result.error });
            return;
        }

        if (result.rowIndex === -1) {
            res.status(404).json({ message: 'Row not found' });
            return;
        }

        res.json({
            rowIndex: result.rowIndex,
            rowData: result.rowData,
        });
    } catch (error: any) {
        console.error('Error searching:', error);
        res.status(500).json({ error: error.message || 'Failed to search' });
    }
});

export default router;
