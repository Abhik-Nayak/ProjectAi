const pool = require("./db");

async function main() {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("DB connected successfully. Server time:", res.rows[0].now);
  } catch (err) {
    console.error("DB connection failed:", err.message);
    process.exit(1);
  }
}

main();
