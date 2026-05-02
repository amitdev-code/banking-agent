# Skill: Create LangChain Tool

Use this template when adding a new LangChain tool to the AI package.

## Tool File Template

```typescript
// packages/ai/src/tools/<tool-name>.tool.ts
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { SomeService } from '../services/some.service';

const someToolSchema = z.object({
  paramOne: z.string().describe('Description of paramOne'),
  paramTwo: z.number().optional().describe('Description of paramTwo'),
});

export function createSomeTool(service: SomeService): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'some_tool_name',
    description: 'Clear one-sentence description of what this tool does and when to use it.',
    schema: someToolSchema,
    func: async ({ paramOne, paramTwo }) => {
      const result = await service.doSomething(paramOne, paramTwo);
      return JSON.stringify(result);
    },
  });
}
```

## Rules

- Schema defined with `zod` — never use plain objects
- Tool `func` must be `async` and return a serialized string
- Tool delegates entirely to a service — no logic inside `func` beyond calling service
- Tool name uses `snake_case` — must be unique across all tools in the graph
- Description must be precise — the LLM uses it to decide when to call the tool

## Structure

```
packages/ai/src/tools/
├── extract-filters.tool.ts      (custom mode filter extraction)
└── <future-tools>.tool.ts
```

## Integration with Planner Node

Tools are passed to the OpenAI model's `bindTools()` call in the planner service:

```typescript
const modelWithTools = model.bindTools([createExtractFiltersTool(filterService)]);
const response = await modelWithTools.invoke(messages);
```
