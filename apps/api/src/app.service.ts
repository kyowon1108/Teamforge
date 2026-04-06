import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  getHealth() {
    return {
      service: "teamforge-api",
      status: "ok",
      timestamp: new Date().toISOString()
    };
  }
}
