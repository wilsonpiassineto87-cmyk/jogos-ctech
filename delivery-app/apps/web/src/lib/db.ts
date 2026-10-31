import "server-only";
import { createPrismaClient, type PrismaClient } from "@delivery/db";

// Uma instância por processo (no dev, sobrevive ao recarregamento do código).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = (globalForPrisma.prisma ??= createPrismaClient());
