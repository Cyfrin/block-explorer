import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("version")
@Controller("version")
export class VersionController {
  @Get()
  public getVersion(): { version: string } {
    return { version: process.env.API_VERSION ?? "0.0.0" };
  }
}
