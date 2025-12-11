import prisma from "./index.js";

async function testDB() {
  try {
    await prisma.$connect();
    console.log("Database connected successfully");
  } catch (e) {
    console.error("Database connection failed", e);
  } finally {
    await prisma.$disconnect();
  }
}

testDB();
