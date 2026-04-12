const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  postgresUrl:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/case_studies_react',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
};

module.exports = { config };
