import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';

export async function createCheckpointer(connectionString: string): Promise<PostgresSaver> {
  const saver = PostgresSaver.fromConnString(connectionString);
  await saver.setup();
  return saver;
}
