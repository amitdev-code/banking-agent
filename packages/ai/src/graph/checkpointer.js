"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCheckpointer = createCheckpointer;
const langgraph_checkpoint_postgres_1 = require("@langchain/langgraph-checkpoint-postgres");
async function createCheckpointer(connectionString) {
    const saver = langgraph_checkpoint_postgres_1.PostgresSaver.fromConnString(connectionString);
    await saver.setup();
    return saver;
}
