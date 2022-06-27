import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

let DB = process.env.DATABASE as string;
DB = DB.replace('<DATABASE_USERNAME>', process.env.DATABASE_USERNAME as string);
DB = DB.replace('<DATABASE_PASSWORD>', process.env.DATABASE_PASSWORD as string);

export default {
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    PORT: process.env.PORT ?? '3210',
    DB_URL: DB as string,
};