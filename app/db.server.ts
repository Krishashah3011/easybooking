import { PrismaClient } from "@prisma/client";

declare global {
  var prismaGlobalML: PrismaClient;
}

if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobalML) {
    global.prismaGlobalML = new PrismaClient();
  }
}

const prismaML = global.prismaGlobalML ?? new PrismaClient();

export default prismaML;