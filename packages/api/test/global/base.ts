import { config } from "dotenv";
import { resolve } from "path";
import { DataSource } from "typeorm";

interface RunConfig {
  prividium?: boolean;
}

export const run = async (action: (dataSource: DataSource) => Promise<void>, { prividium }: RunConfig = {}) => {
  const envPath = resolve(__dirname, "..", "..", prividium ? ".env.prividium-test" : ".env.test");
  const result = config({ path: envPath });
  if (result.error) {
    throw new Error(`Failed to load env file at ${envPath}: ${result.error.message}`);
  }

  const { DATABASE_URL } = process.env;
  if (!DATABASE_URL) {
    throw new Error(`DATABASE_URL missing from ${envPath}`);
  }
  const connectionStringWithoutDbName = DATABASE_URL.substring(0, DATABASE_URL.lastIndexOf("/"));

  const dataSource = new DataSource({
    type: "postgres",
    url: connectionStringWithoutDbName,
  });

  await dataSource.initialize();

  try {
    await action(dataSource);
  } finally {
    await dataSource.destroy();
  }
};
