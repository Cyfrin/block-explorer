import { Test, TestingModule } from "@nestjs/testing";
import { VersionController } from "./version.controller";

describe("VersionController", () => {
  let versionController: VersionController;
  const originalEnv = process.env.API_VERSION;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [VersionController],
    }).compile();
    versionController = app.get<VersionController>(VersionController);
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.API_VERSION;
    } else {
      process.env.API_VERSION = originalEnv;
    }
  });

  describe("getVersion", () => {
    it("returns the value of API_VERSION when set", () => {
      process.env.API_VERSION = "1.2.3";
      expect(versionController.getVersion()).toEqual({ version: "1.2.3" });
    });

    it('returns "0.0.0" when API_VERSION is not set', () => {
      delete process.env.API_VERSION;
      expect(versionController.getVersion()).toEqual({ version: "0.0.0" });
    });
  });
});
