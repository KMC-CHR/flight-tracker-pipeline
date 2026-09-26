import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    databaseUrl: process.env.DATABASE_URL || 'postgresql://test_user:test_password@localhost:5432/app_test',
};