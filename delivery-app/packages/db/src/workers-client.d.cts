import type { PrismaClient } from "../generated/client/index.js";

declare function loadWorkersPrismaClient(): typeof PrismaClient;
export = loadWorkersPrismaClient;
