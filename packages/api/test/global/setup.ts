import { DataSource } from "typeorm";
import { run } from "./base";

export default async () =>
  run(async (dataSource) => {
    const { DATABASE_URL } = process.env;
    const databaseName = DATABASE_URL.split("/").pop();
    await dataSource.query(`DROP DATABASE IF EXISTS "${databaseName}";`);
    await dataSource.query(`CREATE DATABASE "${databaseName}";`);

    // Create schemas required for BattleChain entities
    // These schemas are normally created by rindexer but need to exist for TypeORM sync
    const connectionStringWithoutDbName = DATABASE_URL.substring(0, DATABASE_URL.lastIndexOf("/"));
    const dbDataSource = new DataSource({
      type: "postgres",
      url: `${connectionStringWithoutDbName}/${databaseName}`,
    });
    await dbDataSource.initialize();
    try {
      await dbDataSource.query(`CREATE SCHEMA IF NOT EXISTS battlechainindexer_attack_registry;`);
      await dbDataSource.query(`CREATE SCHEMA IF NOT EXISTS battlechainindexer_agreement;`);
      await dbDataSource.query(`CREATE SCHEMA IF NOT EXISTS battlechainindexer_agreement_factory;`);
    } finally {
      await dbDataSource.destroy();
    }
  });
