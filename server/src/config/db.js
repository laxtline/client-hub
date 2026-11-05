// Creates and exports a single shared PrismaClient instance.
// Reusing one client across the app avoids exhausting DB connections.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;
