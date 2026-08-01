import { PrismaClient } from "@prisma/client";

// Shared PrismaClient instance to reuse connections in SQLite
export const prisma = new PrismaClient();
