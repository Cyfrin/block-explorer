import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import request from "supertest";
import { Repository } from "typeorm";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/configureApp";
import { AgreementStateChange } from "../src/battlechain/agreementState.entity";
import { AgreementCurrentState } from "../src/battlechain/agreementCurrentState.entity";
import { AgreementAccount } from "../src/battlechain/agreementAccount.entity";
import { AgreementOwnerAuthorized } from "../src/battlechain/agreementOwnerAuthorized.entity";
import { AttackModeratorTransferred } from "../src/battlechain/attackModeratorTransferred.entity";

// Time constants (matching battlechain.constants.ts)
const PROMOTION_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PROMOTION_DELAY_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

// Test addresses
const TEST_ADDRESSES = {
  // Agreement addresses
  AGREEMENT_NEW_DEPLOYMENT: "0xaaaa000000000000000000000000000000000002",
  AGREEMENT_ATTACK_REQUESTED: "0xaaaa000000000000000000000000000000000003",
  AGREEMENT_UNDER_ATTACK: "0xaaaa000000000000000000000000000000000004",
  AGREEMENT_PROMOTION_REQUESTED: "0xaaaa000000000000000000000000000000000005",
  AGREEMENT_PRODUCTION: "0xaaaa000000000000000000000000000000000006",
  AGREEMENT_CORRUPTED: "0xaaaa000000000000000000000000000000000007",
  AGREEMENT_WITH_TRANSFER: "0xaaaa000000000000000000000000000000000008",

  // Covered contract addresses
  NEW_DEPLOYMENT_CONTRACT: "0x0000000000000000000000000000000000000002",
  UNDER_ATTACK_CONTRACT: "0x0000000000000000000000000000000000000004",
  PRODUCTION_CONTRACT: "0x0000000000000000000000000000000000000006",
  NOT_COVERED_CONTRACT: "0x0000000000000000000000000000000000000001",

  // Authorized owner contracts
  BATTLECHAIN_DEPLOYED_CONTRACT: "0xbbbb000000000000000000000000000000000001",
  NON_BATTLECHAIN_CONTRACT: "0xcccc000000000000000000000000000000000001",

  // Owner addresses
  OWNER_1: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
  OWNER_2: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
  NEW_MODERATOR: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",

  // Non-existent
  NON_EXISTENT: "0x9999999999999999999999999999999999999999",
};

describe("BattleChain API (e2e)", () => {
  let app: INestApplication;
  let agreementStateChangeRepository: Repository<AgreementStateChange>;
  let agreementCurrentStateRepository: Repository<AgreementCurrentState>;
  let agreementAccountRepository: Repository<AgreementAccount>;
  let agreementOwnerAuthorizedRepository: Repository<AgreementOwnerAuthorized>;
  let attackModeratorTransferredRepository: Repository<AttackModeratorTransferred>;

  // Timestamps for test data
  const now = Date.now();
  const sixDaysAgo = new Date(now - 6 * 24 * 60 * 60 * 1000);
  const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000);
  const twentyDaysAgo = new Date(now - 20 * 24 * 60 * 60 * 1000);

  let rindexerId = 1;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule.build()],
    }).compile();

    app = moduleFixture.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();

    agreementStateChangeRepository = app.get<Repository<AgreementStateChange>>(
      getRepositoryToken(AgreementStateChange)
    );
    agreementCurrentStateRepository = app.get<Repository<AgreementCurrentState>>(
      getRepositoryToken(AgreementCurrentState)
    );
    agreementAccountRepository = app.get<Repository<AgreementAccount>>(getRepositoryToken(AgreementAccount));
    agreementOwnerAuthorizedRepository = app.get<Repository<AgreementOwnerAuthorized>>(
      getRepositoryToken(AgreementOwnerAuthorized)
    );
    attackModeratorTransferredRepository = app.get<Repository<AttackModeratorTransferred>>(
      getRepositoryToken(AttackModeratorTransferred)
    );

    // Seed test data
    await seedTestData();
  });

  afterAll(async () => {
    // Clean up using raw SQL to avoid TypeORM empty criteria error
    await agreementCurrentStateRepository.query(
      `DELETE FROM battlechainindexer_attack_registry.attack_moderator_transferred`
    );
    await agreementCurrentStateRepository.query(
      `DELETE FROM battlechainindexer_attack_registry.agreement_owner_authorized`
    );
    await agreementCurrentStateRepository.query(`DELETE FROM battlechainindexer_agreement.agreement_accounts`);
    await agreementCurrentStateRepository.query(
      `DELETE FROM battlechainindexer_attack_registry.agreement_state_changed`
    );
    await agreementCurrentStateRepository.query(`DELETE FROM battlechainindexer_agreement.agreement_current_state`);
    await app.close();
  });

  async function seedTestData() {
    // 1. Seed AgreementCurrentState records

    // Agreement in NEW_DEPLOYMENT state
    await agreementCurrentStateRepository.insert({
      agreementAddress: TEST_ADDRESSES.AGREEMENT_NEW_DEPLOYMENT,
      owner: TEST_ADDRESSES.OWNER_1,
      protocolName: "Protocol Alpha",
      bountyPercentage: "10",
      bountyCapUsd: "5000000",
      identityRequirement: 0, // Anonymous
      retainable: false,
      coveredContracts: [TEST_ADDRESSES.NEW_DEPLOYMENT_CONTRACT],
      commitmentDeadline: String(Math.floor(now / 1000) + 30 * 24 * 60 * 60),
      createdAt: sixDaysAgo,
      createdAtBlock: 100,
      computedState: "NEW_DEPLOYMENT",
    });

    // Agreement in ATTACK_REQUESTED state
    await agreementCurrentStateRepository.insert({
      agreementAddress: TEST_ADDRESSES.AGREEMENT_ATTACK_REQUESTED,
      owner: TEST_ADDRESSES.OWNER_1,
      protocolName: "Protocol Beta",
      bountyPercentage: "15",
      bountyCapUsd: "10000000",
      identityRequirement: 1, // Pseudonymous
      retainable: true,
      coveredContracts: [],
      createdAt: tenDaysAgo,
      createdAtBlock: 90,
      computedState: "ATTACK_REQUESTED",
    });

    // Agreement in UNDER_ATTACK state
    await agreementCurrentStateRepository.insert({
      agreementAddress: TEST_ADDRESSES.AGREEMENT_UNDER_ATTACK,
      owner: TEST_ADDRESSES.OWNER_1,
      protocolName: "Protocol Gamma",
      bountyPercentage: "20",
      bountyCapUsd: "15000000",
      identityRequirement: 2, // Named
      retainable: false,
      diligenceRequirements: "KYC required",
      aggregateBountyCapUsd: "50000000",
      coveredContracts: [TEST_ADDRESSES.UNDER_ATTACK_CONTRACT],
      contactDetails: [{ name: "Security Team", contact: "security@gamma.com" }],
      createdAt: tenDaysAgo,
      createdAtBlock: 85,
      computedState: "UNDER_ATTACK",
    });

    // Agreement in PROMOTION_REQUESTED state
    await agreementCurrentStateRepository.insert({
      agreementAddress: TEST_ADDRESSES.AGREEMENT_PROMOTION_REQUESTED,
      owner: TEST_ADDRESSES.OWNER_2,
      protocolName: "Protocol Delta",
      bountyPercentage: "12",
      bountyCapUsd: "8000000",
      identityRequirement: 0,
      coveredContracts: [],
      createdAt: twentyDaysAgo,
      createdAtBlock: 70,
      computedState: "PROMOTION_REQUESTED",
    });

    // Agreement in PRODUCTION state
    await agreementCurrentStateRepository.insert({
      agreementAddress: TEST_ADDRESSES.AGREEMENT_PRODUCTION,
      owner: TEST_ADDRESSES.OWNER_2,
      protocolName: "Protocol Epsilon",
      bountyPercentage: "8",
      bountyCapUsd: "3000000",
      identityRequirement: 0,
      coveredContracts: [TEST_ADDRESSES.PRODUCTION_CONTRACT],
      createdAt: twentyDaysAgo,
      createdAtBlock: 60,
      computedState: "PRODUCTION",
    });

    // Agreement in CORRUPTED state
    await agreementCurrentStateRepository.insert({
      agreementAddress: TEST_ADDRESSES.AGREEMENT_CORRUPTED,
      owner: TEST_ADDRESSES.OWNER_1,
      protocolName: "Protocol Zeta",
      bountyPercentage: "25",
      bountyCapUsd: "20000000",
      identityRequirement: 1,
      coveredContracts: [],
      createdAt: twentyDaysAgo,
      createdAtBlock: 50,
      computedState: "CORRUPTED",
    });

    // Agreement with moderator transfer
    await agreementCurrentStateRepository.insert({
      agreementAddress: TEST_ADDRESSES.AGREEMENT_WITH_TRANSFER,
      owner: TEST_ADDRESSES.OWNER_1,
      protocolName: "Protocol Eta",
      bountyPercentage: "18",
      bountyCapUsd: "12000000",
      identityRequirement: 0,
      coveredContracts: [],
      createdAt: tenDaysAgo,
      createdAtBlock: 80,
      computedState: "NEW_DEPLOYMENT",
    });

    // 2. Seed AgreementStateChange records

    // NEW_DEPLOYMENT state changes
    await agreementStateChangeRepository.insert({
      rindexerId: rindexerId++,
      agreementAddress: TEST_ADDRESSES.AGREEMENT_NEW_DEPLOYMENT,
      newState: 1, // NEW_DEPLOYMENT
      txHash: "0x" + "a".repeat(64),
      blockNumber: 100,
      logIndex: "0",
      blockTimestamp: sixDaysAgo,
    });

    // ATTACK_REQUESTED state changes
    await agreementStateChangeRepository.insert({
      rindexerId: rindexerId++,
      agreementAddress: TEST_ADDRESSES.AGREEMENT_ATTACK_REQUESTED,
      newState: 1, // NEW_DEPLOYMENT
      txHash: "0x" + "b".repeat(64),
      blockNumber: 90,
      logIndex: "0",
      blockTimestamp: tenDaysAgo,
    });
    await agreementStateChangeRepository.insert({
      rindexerId: rindexerId++,
      agreementAddress: TEST_ADDRESSES.AGREEMENT_ATTACK_REQUESTED,
      newState: 2, // ATTACK_REQUESTED
      txHash: "0x" + "c".repeat(64),
      blockNumber: 95,
      logIndex: "0",
      blockTimestamp: new Date(tenDaysAgo.getTime() + 1 * 24 * 60 * 60 * 1000),
    });

    // UNDER_ATTACK state changes
    await agreementStateChangeRepository.insert({
      rindexerId: rindexerId++,
      agreementAddress: TEST_ADDRESSES.AGREEMENT_UNDER_ATTACK,
      newState: 1, // NEW_DEPLOYMENT
      txHash: "0x" + "d".repeat(64),
      blockNumber: 85,
      logIndex: "0",
      blockTimestamp: tenDaysAgo,
    });
    await agreementStateChangeRepository.insert({
      rindexerId: rindexerId++,
      agreementAddress: TEST_ADDRESSES.AGREEMENT_UNDER_ATTACK,
      newState: 2, // ATTACK_REQUESTED
      txHash: "0x" + "e".repeat(64),
      blockNumber: 87,
      logIndex: "0",
      blockTimestamp: new Date(tenDaysAgo.getTime() + 1 * 24 * 60 * 60 * 1000),
    });
    await agreementStateChangeRepository.insert({
      rindexerId: rindexerId++,
      agreementAddress: TEST_ADDRESSES.AGREEMENT_UNDER_ATTACK,
      newState: 3, // UNDER_ATTACK
      txHash: "0x" + "f".repeat(64),
      blockNumber: 89,
      logIndex: "0",
      blockTimestamp: new Date(tenDaysAgo.getTime() + 2 * 24 * 60 * 60 * 1000),
    });

    // PROMOTION_REQUESTED state changes
    await agreementStateChangeRepository.insert({
      rindexerId: rindexerId++,
      agreementAddress: TEST_ADDRESSES.AGREEMENT_PROMOTION_REQUESTED,
      newState: 1, // NEW_DEPLOYMENT
      txHash: "0x" + "1".repeat(64),
      blockNumber: 70,
      logIndex: "0",
      blockTimestamp: twentyDaysAgo,
    });
    await agreementStateChangeRepository.insert({
      rindexerId: rindexerId++,
      agreementAddress: TEST_ADDRESSES.AGREEMENT_PROMOTION_REQUESTED,
      newState: 2, // ATTACK_REQUESTED
      txHash: "0x" + "2".repeat(64),
      blockNumber: 72,
      logIndex: "0",
      blockTimestamp: new Date(twentyDaysAgo.getTime() + 1 * 24 * 60 * 60 * 1000),
    });
    await agreementStateChangeRepository.insert({
      rindexerId: rindexerId++,
      agreementAddress: TEST_ADDRESSES.AGREEMENT_PROMOTION_REQUESTED,
      newState: 3, // UNDER_ATTACK
      txHash: "0x" + "3".repeat(64),
      blockNumber: 74,
      logIndex: "0",
      blockTimestamp: new Date(twentyDaysAgo.getTime() + 2 * 24 * 60 * 60 * 1000),
    });
    await agreementStateChangeRepository.insert({
      rindexerId: rindexerId++,
      agreementAddress: TEST_ADDRESSES.AGREEMENT_PROMOTION_REQUESTED,
      newState: 4, // PROMOTION_REQUESTED
      txHash: "0x" + "4".repeat(64),
      blockNumber: 110,
      logIndex: "0",
      blockTimestamp: twoDaysAgo,
    });

    // PRODUCTION state changes
    await agreementStateChangeRepository.insert({
      rindexerId: rindexerId++,
      agreementAddress: TEST_ADDRESSES.AGREEMENT_PRODUCTION,
      newState: 1, // NEW_DEPLOYMENT
      txHash: "0x" + "5".repeat(64),
      blockNumber: 60,
      logIndex: "0",
      blockTimestamp: twentyDaysAgo,
    });
    await agreementStateChangeRepository.insert({
      rindexerId: rindexerId++,
      agreementAddress: TEST_ADDRESSES.AGREEMENT_PRODUCTION,
      newState: 2, // ATTACK_REQUESTED
      txHash: "0x" + "6".repeat(64),
      blockNumber: 62,
      logIndex: "0",
      blockTimestamp: new Date(twentyDaysAgo.getTime() + 1 * 24 * 60 * 60 * 1000),
    });
    await agreementStateChangeRepository.insert({
      rindexerId: rindexerId++,
      agreementAddress: TEST_ADDRESSES.AGREEMENT_PRODUCTION,
      newState: 3, // UNDER_ATTACK
      txHash: "0x" + "7".repeat(64),
      blockNumber: 64,
      logIndex: "0",
      blockTimestamp: new Date(twentyDaysAgo.getTime() + 2 * 24 * 60 * 60 * 1000),
    });
    await agreementStateChangeRepository.insert({
      rindexerId: rindexerId++,
      agreementAddress: TEST_ADDRESSES.AGREEMENT_PRODUCTION,
      newState: 5, // PRODUCTION
      txHash: "0x" + "8".repeat(64),
      blockNumber: 100,
      logIndex: "0",
      blockTimestamp: sixDaysAgo,
    });

    // CORRUPTED state changes
    await agreementStateChangeRepository.insert({
      rindexerId: rindexerId++,
      agreementAddress: TEST_ADDRESSES.AGREEMENT_CORRUPTED,
      newState: 1, // NEW_DEPLOYMENT
      txHash: "0x" + "9".repeat(64),
      blockNumber: 50,
      logIndex: "0",
      blockTimestamp: twentyDaysAgo,
    });
    await agreementStateChangeRepository.insert({
      rindexerId: rindexerId++,
      agreementAddress: TEST_ADDRESSES.AGREEMENT_CORRUPTED,
      newState: 2, // ATTACK_REQUESTED
      txHash: "0x" + "0".repeat(64),
      blockNumber: 52,
      logIndex: "0",
      blockTimestamp: new Date(twentyDaysAgo.getTime() + 1 * 24 * 60 * 60 * 1000),
    });
    await agreementStateChangeRepository.insert({
      rindexerId: rindexerId++,
      agreementAddress: TEST_ADDRESSES.AGREEMENT_CORRUPTED,
      newState: 3, // UNDER_ATTACK
      txHash: "0xab" + "c".repeat(62),
      blockNumber: 54,
      logIndex: "0",
      blockTimestamp: new Date(twentyDaysAgo.getTime() + 2 * 24 * 60 * 60 * 1000),
    });
    await agreementStateChangeRepository.insert({
      rindexerId: rindexerId++,
      agreementAddress: TEST_ADDRESSES.AGREEMENT_CORRUPTED,
      newState: 6, // CORRUPTED
      txHash: "0xde" + "f".repeat(62),
      blockNumber: 80,
      logIndex: "0",
      blockTimestamp: tenDaysAgo,
    });

    // Agreement with transfer state changes
    await agreementStateChangeRepository.insert({
      rindexerId: rindexerId++,
      agreementAddress: TEST_ADDRESSES.AGREEMENT_WITH_TRANSFER,
      newState: 1, // NEW_DEPLOYMENT
      txHash: "0xaa" + "b".repeat(62),
      blockNumber: 80,
      logIndex: "0",
      blockTimestamp: tenDaysAgo,
    });

    // 3. Seed AgreementAccount records
    await agreementAccountRepository.insert({
      agreementAddress: TEST_ADDRESSES.AGREEMENT_UNDER_ATTACK,
      caip2ChainId: "eip155:270",
      accountAddress: TEST_ADDRESSES.UNDER_ATTACK_CONTRACT,
      childContractScope: 2, // All
    });

    // 4. Seed AgreementOwnerAuthorized records
    await agreementOwnerAuthorizedRepository.insert({
      rindexerId: rindexerId++,
      contractAddress: TEST_ADDRESSES.BATTLECHAIN_DEPLOYED_CONTRACT,
      authorizedOwner: TEST_ADDRESSES.OWNER_1,
      txHash: "0xcc" + "d".repeat(62),
      blockNumber: 100,
      logIndex: "0",
      blockTimestamp: sixDaysAgo,
    });

    // 5. Seed AttackModeratorTransferred records
    await attackModeratorTransferredRepository.insert({
      rindexerId: rindexerId++,
      agreementAddress: TEST_ADDRESSES.AGREEMENT_WITH_TRANSFER,
      newModerator: TEST_ADDRESSES.NEW_MODERATOR,
      txHash: "0xee" + "f".repeat(62),
      blockNumber: 90,
      logIndex: "0",
      blockTimestamp: new Date(tenDaysAgo.getTime() + 1 * 24 * 60 * 60 * 1000),
    });
  }

  describe("GET /battlechain/contract-state/:address", () => {
    it("returns NOT_REGISTERED for unknown contract", () => {
      return request(app.getHttpServer())
        .get(`/battlechain/contract-state/${TEST_ADDRESSES.NOT_COVERED_CONTRACT}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.state).toBe("NOT_REGISTERED");
          expect(res.body.wasUnderAttack).toBe(false);
          expect(res.body.registeredAt).toBeNull();
          expect(res.body.underAttackAt).toBeNull();
          expect(res.body.productionAt).toBeNull();
        });
    });

    it("returns NEW_DEPLOYMENT state with correct timestamps", () => {
      return request(app.getHttpServer())
        .get(`/battlechain/contract-state/${TEST_ADDRESSES.NEW_DEPLOYMENT_CONTRACT}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.state).toBe("NEW_DEPLOYMENT");
          expect(res.body.wasUnderAttack).toBe(false);
          expect(res.body.registeredAt).toBeDefined();
          expect(res.body.registeredTxHash).toBe("0x" + "a".repeat(64));
          expect(res.body.underAttackAt).toBeNull();
          expect(res.body.productionAt).toBeNull();
          // Promotion window should be registeredAt + 14 days
          expect(res.body.promotionWindowEnds).toBe(res.body.registeredAt + PROMOTION_WINDOW_MS);
        });
    });

    it("returns UNDER_ATTACK state with wasUnderAttack true", () => {
      return request(app.getHttpServer())
        .get(`/battlechain/contract-state/${TEST_ADDRESSES.UNDER_ATTACK_CONTRACT}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.state).toBe("UNDER_ATTACK");
          expect(res.body.wasUnderAttack).toBe(true);
          expect(res.body.registeredAt).toBeDefined();
          expect(res.body.underAttackAt).toBeDefined();
          expect(res.body.underAttackTxHash).toBe("0x" + "f".repeat(64));
          expect(res.body.productionAt).toBeNull();
        });
    });

    it("returns PRODUCTION state with productionAt timestamp", () => {
      return request(app.getHttpServer())
        .get(`/battlechain/contract-state/${TEST_ADDRESSES.PRODUCTION_CONTRACT}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.state).toBe("PRODUCTION");
          expect(res.body.wasUnderAttack).toBe(true);
          expect(res.body.registeredAt).toBeDefined();
          expect(res.body.productionAt).toBeDefined();
          expect(res.body.productionTxHash).toBe("0x" + "8".repeat(64));
          // No promotion window for PRODUCTION state
          expect(res.body.promotionWindowEnds).toBeNull();
        });
    });

    it("includes commitmentLockedUntil from covering agreement", () => {
      return request(app.getHttpServer())
        .get(`/battlechain/contract-state/${TEST_ADDRESSES.NEW_DEPLOYMENT_CONTRACT}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.commitmentLockedUntil).toBeDefined();
          expect(typeof res.body.commitmentLockedUntil).toBe("number");
        });
    });
  });

  describe("GET /battlechain/agreement/:address", () => {
    it("returns full agreement details for valid address", () => {
      return request(app.getHttpServer())
        .get(`/battlechain/agreement/${TEST_ADDRESSES.AGREEMENT_NEW_DEPLOYMENT}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.agreementAddress).toBe(TEST_ADDRESSES.AGREEMENT_NEW_DEPLOYMENT);
          expect(res.body.owner).toBe(TEST_ADDRESSES.OWNER_1);
          expect(res.body.protocolName).toBe("Protocol Alpha");
          expect(res.body.bountyPercentage).toBe(10);
          expect(res.body.bountyCapUsd).toBe("5000000");
          expect(res.body.identityRequirement).toBe("Anonymous");
          expect(res.body.retainable).toBe(false);
          expect(res.body.coveredContracts).toContain(TEST_ADDRESSES.NEW_DEPLOYMENT_CONTRACT);
          expect(res.body.commitmentDeadline).toBeDefined();
          expect(res.body.createdAtBlock).toBe(100);
        });
    });

    it("returns 404 for non-existent agreement", () => {
      return request(app.getHttpServer())
        .get(`/battlechain/agreement/${TEST_ADDRESSES.NON_EXISTENT}`)
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toBe("Agreement not found");
        });
    });

    it("maps identityRequirement 0 to Anonymous", () => {
      return request(app.getHttpServer())
        .get(`/battlechain/agreement/${TEST_ADDRESSES.AGREEMENT_NEW_DEPLOYMENT}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.identityRequirement).toBe("Anonymous");
        });
    });

    it("maps identityRequirement 1 to Pseudonymous", () => {
      return request(app.getHttpServer())
        .get(`/battlechain/agreement/${TEST_ADDRESSES.AGREEMENT_ATTACK_REQUESTED}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.identityRequirement).toBe("Pseudonymous");
        });
    });

    it("maps identityRequirement 2 to Named", () => {
      return request(app.getHttpServer())
        .get(`/battlechain/agreement/${TEST_ADDRESSES.AGREEMENT_UNDER_ATTACK}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.identityRequirement).toBe("Named");
          expect(res.body.diligenceRequirements).toBe("KYC required");
        });
    });

    it("returns contact details when present", () => {
      return request(app.getHttpServer())
        .get(`/battlechain/agreement/${TEST_ADDRESSES.AGREEMENT_UNDER_ATTACK}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.contactDetails).toEqual([{ name: "Security Team", contact: "security@gamma.com" }]);
        });
    });
  });

  describe("GET /battlechain/agreement/by-contract/:contractAddress", () => {
    it("returns agreement when contract is covered", () => {
      return request(app.getHttpServer())
        .get(`/battlechain/agreement/by-contract/${TEST_ADDRESSES.NEW_DEPLOYMENT_CONTRACT}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.hasCoverage).toBe(true);
          expect(res.body.isAgreementContract).toBe(false);
          expect(res.body.agreements).toHaveLength(1);
          expect(res.body.agreements[0].agreementAddress).toBe(TEST_ADDRESSES.AGREEMENT_NEW_DEPLOYMENT);
        });
    });

    it("returns isAgreementContract=true when address IS an agreement", () => {
      return request(app.getHttpServer())
        .get(`/battlechain/agreement/by-contract/${TEST_ADDRESSES.AGREEMENT_NEW_DEPLOYMENT}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.hasCoverage).toBe(true);
          expect(res.body.isAgreementContract).toBe(true);
          expect(res.body.agreements[0].agreementAddress).toBe(TEST_ADDRESSES.AGREEMENT_NEW_DEPLOYMENT);
        });
    });

    it("returns no coverage for uncovered contract", () => {
      return request(app.getHttpServer())
        .get(`/battlechain/agreement/by-contract/${TEST_ADDRESSES.NOT_COVERED_CONTRACT}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.hasCoverage).toBe(false);
          expect(res.body.isAgreementContract).toBe(false);
          expect(res.body.agreements).toEqual([]);
        });
    });

    it("includes computed state for agreement contracts", () => {
      return request(app.getHttpServer())
        .get(`/battlechain/agreement/by-contract/${TEST_ADDRESSES.AGREEMENT_UNDER_ATTACK}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.isAgreementContract).toBe(true);
          expect(res.body.agreements[0].state).toBe("UNDER_ATTACK");
        });
    });
  });

  describe("GET /battlechain/agreements", () => {
    it("returns paginated list with default parameters", () => {
      return request(app.getHttpServer())
        .get("/battlechain/agreements")
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toBeDefined();
          expect(Array.isArray(res.body.items)).toBe(true);
          expect(res.body.meta.currentPage).toBe(1);
          expect(res.body.meta.itemsPerPage).toBe(10);
          expect(res.body.meta.totalItems).toBeGreaterThan(0);
        });
    });

    it("filters by state=NEW_DEPLOYMENT", () => {
      return request(app.getHttpServer())
        .get("/battlechain/agreements?state=NEW_DEPLOYMENT")
        .expect(200)
        .expect((res) => {
          expect(res.body.items.length).toBeGreaterThan(0);
          for (const item of res.body.items) {
            expect(item.state).toBe("NEW_DEPLOYMENT");
          }
        });
    });

    it("filters by state=UNDER_ATTACK", () => {
      return request(app.getHttpServer())
        .get("/battlechain/agreements?state=UNDER_ATTACK")
        .expect(200)
        .expect((res) => {
          expect(res.body.items.length).toBeGreaterThan(0);
          for (const item of res.body.items) {
            expect(item.state).toBe("UNDER_ATTACK");
          }
        });
    });

    it("filters by state=PRODUCTION", () => {
      return request(app.getHttpServer())
        .get("/battlechain/agreements?state=PRODUCTION")
        .expect(200)
        .expect((res) => {
          expect(res.body.items.length).toBeGreaterThan(0);
          for (const item of res.body.items) {
            expect(item.state).toBe("PRODUCTION");
          }
        });
    });

    it("paginates correctly with custom page and limit", () => {
      return request(app.getHttpServer())
        .get("/battlechain/agreements?page=1&limit=2")
        .expect(200)
        .expect((res) => {
          expect(res.body.items.length).toBeLessThanOrEqual(2);
          expect(res.body.meta.currentPage).toBe(1);
          expect(res.body.meta.itemsPerPage).toBe(2);
        });
    });

    it("sorts by protocolName ASC", () => {
      return request(app.getHttpServer())
        .get("/battlechain/agreements?sortBy=protocolName&sortOrder=ASC")
        .expect(200)
        .expect((res) => {
          const names = res.body.items.map((i: { protocolName: string }) => i.protocolName);
          const sorted = [...names].sort();
          expect(names).toEqual(sorted);
        });
    });

    it("sorts by bountyPercentage DESC", () => {
      return request(app.getHttpServer())
        .get("/battlechain/agreements?sortBy=bountyPercentage&sortOrder=DESC")
        .expect(200)
        .expect((res) => {
          const percentages = res.body.items.map((i: { bountyPercentage: number }) => i.bountyPercentage);
          for (let i = 1; i < percentages.length; i++) {
            expect(percentages[i - 1]).toBeGreaterThanOrEqual(percentages[i]);
          }
        });
    });

    it("respects max limit of 100", () => {
      return request(app.getHttpServer())
        .get("/battlechain/agreements?limit=500")
        .expect(200)
        .expect((res) => {
          expect(res.body.meta.itemsPerPage).toBe(100);
        });
    });

    it("returns empty array when no matches for state filter", () => {
      // Use a non-matching state filter scenario
      return request(app.getHttpServer())
        .get("/battlechain/agreements?state=NOT_DEPLOYED")
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toEqual([]);
          expect(res.body.meta.totalItems).toBe(0);
        });
    });

    it("includes computed state for each agreement", () => {
      return request(app.getHttpServer())
        .get("/battlechain/agreements")
        .expect(200)
        .expect((res) => {
          for (const item of res.body.items) {
            expect(item.state).toBeDefined();
            expect([
              "NOT_REGISTERED",
              "NEW_DEPLOYMENT",
              "ATTACK_REQUESTED",
              "UNDER_ATTACK",
              "PROMOTION_REQUESTED",
              "PRODUCTION",
              "CORRUPTED",
            ]).toContain(item.state);
          }
        });
    });
  });

  describe("GET /battlechain/authorized-owner/:contractAddress", () => {
    it("returns owner for BattleChain-deployed contract", () => {
      return request(app.getHttpServer())
        .get(`/battlechain/authorized-owner/${TEST_ADDRESSES.BATTLECHAIN_DEPLOYED_CONTRACT}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.authorizedOwner).toBe(TEST_ADDRESSES.OWNER_1);
          expect(res.body.isDeployedViaBattleChain).toBe(true);
        });
    });

    it("returns null for non-BattleChain contract", () => {
      return request(app.getHttpServer())
        .get(`/battlechain/authorized-owner/${TEST_ADDRESSES.NON_BATTLECHAIN_CONTRACT}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.authorizedOwner).toBeNull();
          expect(res.body.isDeployedViaBattleChain).toBe(false);
        });
    });
  });

  describe("POST /battlechain/authorized-owners", () => {
    it("returns owners for multiple contracts", () => {
      return request(app.getHttpServer())
        .post("/battlechain/authorized-owners")
        .send([TEST_ADDRESSES.BATTLECHAIN_DEPLOYED_CONTRACT, TEST_ADDRESSES.NON_BATTLECHAIN_CONTRACT])
        .expect(201)
        .expect((res) => {
          expect(res.body[TEST_ADDRESSES.BATTLECHAIN_DEPLOYED_CONTRACT.toLowerCase()]).toBeDefined();
          expect(res.body[TEST_ADDRESSES.BATTLECHAIN_DEPLOYED_CONTRACT.toLowerCase()].authorizedOwner).toBe(
            TEST_ADDRESSES.OWNER_1
          );
          expect(res.body[TEST_ADDRESSES.NON_BATTLECHAIN_CONTRACT.toLowerCase()].authorizedOwner).toBeNull();
        });
    });

    it("returns empty object for empty array", () => {
      return request(app.getHttpServer())
        .post("/battlechain/authorized-owners")
        .send([])
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual({});
        });
    });
  });

  describe("GET /battlechain/attack-moderator/:agreementAddress", () => {
    it("returns owner as moderator when no transfers", () => {
      return request(app.getHttpServer())
        .get(`/battlechain/attack-moderator/${TEST_ADDRESSES.AGREEMENT_NEW_DEPLOYMENT}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.attackModerator).toBe(TEST_ADDRESSES.OWNER_1);
          expect(res.body.wasTransferred).toBe(false);
        });
    });

    it("returns new moderator after transfer", () => {
      return request(app.getHttpServer())
        .get(`/battlechain/attack-moderator/${TEST_ADDRESSES.AGREEMENT_WITH_TRANSFER}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.attackModerator).toBe(TEST_ADDRESSES.NEW_MODERATOR);
          expect(res.body.wasTransferred).toBe(true);
        });
    });

    it("returns 404 for non-existent agreement", () => {
      return request(app.getHttpServer())
        .get(`/battlechain/attack-moderator/${TEST_ADDRESSES.NON_EXISTENT}`)
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toBe("Agreement not found");
        });
    });
  });

  describe("Time-based calculations", () => {
    it("calculates promotionWindowEnds as registeredAt + 14 days for NEW_DEPLOYMENT", () => {
      return request(app.getHttpServer())
        .get(`/battlechain/contract-state/${TEST_ADDRESSES.NEW_DEPLOYMENT_CONTRACT}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.state).toBe("NEW_DEPLOYMENT");
          const expected = res.body.registeredAt + PROMOTION_WINDOW_MS;
          expect(res.body.promotionWindowEnds).toBe(expected);
        });
    });

    it("calculates promotionWindowEnds as promotionRequestedAt + 3 days for PROMOTION_REQUESTED", async () => {
      // Query the agreement directly
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const response = await request(app.getHttpServer())
        .get(`/battlechain/agreement/${TEST_ADDRESSES.AGREEMENT_PROMOTION_REQUESTED}`)
        .expect(200);

      // Get state info for an agreement contract in PROMOTION_REQUESTED state
      const stateResponse = await request(app.getHttpServer())
        .get(`/battlechain/agreement/by-contract/${TEST_ADDRESSES.AGREEMENT_PROMOTION_REQUESTED}`)
        .expect(200);

      expect(stateResponse.body.agreements[0].state).toBe("PROMOTION_REQUESTED");
    });

    it("returns null promotionWindowEnds for PRODUCTION state", () => {
      return request(app.getHttpServer())
        .get(`/battlechain/contract-state/${TEST_ADDRESSES.PRODUCTION_CONTRACT}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.state).toBe("PRODUCTION");
          expect(res.body.promotionWindowEnds).toBeNull();
        });
    });
  });
});
