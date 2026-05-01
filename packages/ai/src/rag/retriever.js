"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductTemplate = getProductTemplate;
exports.buildRagContext = buildRagContext;
const fs_1 = require("fs");
const path_1 = require("path");
const TEMPLATE_FILES = {
    PERSONAL_LOAN: 'personal-loan.md',
    HOME_LOAN: 'home-loan.md',
    CREDIT_CARD: 'credit-card.md',
};
const templateCache = new Map();
function getProductTemplate(product) {
    const cached = templateCache.get(product);
    if (cached)
        return cached;
    const fileName = TEMPLATE_FILES[product];
    const filePath = (0, path_1.join)(__dirname, 'templates', fileName);
    const content = (0, fs_1.readFileSync)(filePath, 'utf-8');
    templateCache.set(product, content);
    return content;
}
function buildRagContext(products) {
    const unique = [...new Set(products)];
    return unique
        .map((p) => `## ${p}\n${getProductTemplate(p)}`)
        .join('\n\n---\n\n');
}
