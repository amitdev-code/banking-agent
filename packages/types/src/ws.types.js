"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORKFLOW_STEP_ORDER = exports.WORKFLOW_STEP_LABELS = void 0;
exports.WORKFLOW_STEP_LABELS = {
    planner: 'Query Planning',
    fetchCustomers: 'Fetching Customers',
    fetchTransactions: 'Fetching Transactions',
    scoring: 'Scoring Customers',
    recommendation: 'Recommending Products',
    message: 'Generating Messages',
};
exports.WORKFLOW_STEP_ORDER = [
    'planner',
    'fetchCustomers',
    'fetchTransactions',
    'scoring',
    'recommendation',
    'message',
];
