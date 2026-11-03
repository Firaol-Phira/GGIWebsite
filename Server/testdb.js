const pool = require("./src/config/db");

pool
  .query("SHOW TABLES")
  .then(([rows]) => {
    console.log("MySQL connected. Tables found:", rows.length);
    console.log(rows);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Connection failed:", err.message);
    process.exit(1);
  });
