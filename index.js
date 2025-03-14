const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());

const dbPath = path.join(__dirname, "users.db");

const db = new sqlite3.Database(
  dbPath,
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  (err) => {
    if (err) {
      console.error("Error opening database:", err.message);
    } else {
      console.log("Connected to the users.db database.");

      // Create 'user' table if it doesn't exist
      db.run(
        `CREATE TABLE IF NOT EXISTS user (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE,
          name TEXT,
          password TEXT,
          gender TEXT,
          location TEXT
        )`,
        (err) => {
          if (err) {
            console.error("Error creating table:", err.message);
            process.exit(1);
          } else {
            console.log("User table is ready.");
          }
        }
      );

      // Start server after DB is ready
      app.listen(3000, () => {
        console.log("Server running at http://localhost:3000/");
      });
    }
  }
);

// Home route
app.get("/", (request, response) => {
  response.send("Welcome! This is a Backend Domain for User Login Page.");
});

// Create User API
app.post("/users/", async (request, response) => {
  try {
    const { username, name, password, gender, location } = request.body;

    db.get(
      `SELECT * FROM user WHERE username = ?`, [username], async (err, dbUser) => {
        if (err) {
          response.status(500).send("Database error");
        } else if (dbUser) {
          response.status(400).json({ error: "User already exists" });
        } else {
          const hashedPassword = await bcrypt.hash(password, 10);

          db.run(
            `INSERT INTO user (username, name, password, gender, location)
            VALUES (?, ?, ?, ?, ?)`,
            [username, name, hashedPassword, gender, location],
            function (err) {
              if (err) {
                response.status(500).send("Error creating user");
              } else {
                response.json({ message: "User created successfully" });
              }
            }
          );
        }
      }
    );
  } catch (e) {
    console.error(e.message);
    response.status(500).send("Internal Server Error");
  }
});

// User Login API
app.post("/login/", (request, response) => {
  const { username, password } = request.body;

  if (!username || !password) {
    return response.status(400).json({ error_msg: "Username and password is invalid" });
  }

  db.get(
    `SELECT * FROM user WHERE username = ?`, [username], async (err, dbUser) => {
      if (err) {
        response.status(500).send("Database error");
      } else if (!dbUser) {
        response.status(400).json({ error_msg: "Invalid Username" });
      } else {
        const isPasswordMatched = await bcrypt.compare(
          password,
          dbUser.password
        );
        if (isPasswordMatched) {
          const payload = { username: username, password: password };
          const jwtToken = jwt.sign(payload, "userKey");
          response.json({ jwtToken });
        } else {
          response.status(400).json({ error_msg: "Username and password didn't match" });
        }
      }
    }
  );
});

// Graceful shutdown on CTRL+C
process.on("SIGINT", () => {
  db.close((err) => {
    if (err) {
      console.error("Error closing database:", err.message);
    } else {
      console.log("Database connection closed.");
    }
    process.exit(0);
  });
});

module.exports = app;
