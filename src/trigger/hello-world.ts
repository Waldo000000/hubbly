import { logger, task } from "@trigger.dev/sdk/v3";

export const helloWorldTask = task({
  id: "hello-world",
  maxDuration: 60,
  run: async (_payload: { name?: string } = {}) => {
    const timestamp = new Date().toISOString();
    const message = `hello from trigger.dev at ${timestamp}`;
    logger.log(message);
    return { message };
  },
});
