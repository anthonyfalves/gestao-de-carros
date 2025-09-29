import 'dotenv/config';

export default {
  development: {
    username: process.env.DB_USER || 'gf_user',
    password: process.env.DB_PASS || 'gf_pass',
    database: process.env.DB_NAME || 'gf_db',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5432),
    dialect: 'postgres'
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    dialect: 'postgres'
  }
}
