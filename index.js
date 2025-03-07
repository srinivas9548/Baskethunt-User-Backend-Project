const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());

const dbPath = path.join(__dirname, "database.db");

// let db = null;

// const initializeAndDBServer = async () => {
//     try {
//         db = await open({
//             filename: dbPath,
//             driver: sqlite3.Database
//         });
//         app.listen(3000, () => {
//             console.log("Server Running at http://localhost:3000/")
//         })
//     } catch (e) {
//         console.log(`DB Error: ${e.message}`);
//         process.exit(1);
//     }
// }

// initializeAndDBServer();


const db = new sqlite3.Database(
  'users.db',
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
    } else {
      console.log('Connected to the users.db database.');

      // Start server only after DB connection
      app.listen(3000, () => {
        console.log("Server Running at http://localhost:3000/")
      })
    }
  }
);

// Root Route
app.get("/", (request, response) => {
  try {
    response.send("Welcome! This is a Backend Domain for User Login Page.")

  } catch (e) {
    console.log(e.message);
    response.status(500).json({ error: "Internal Server Error" });
  }
})

// // Create User API
// app.post("/users/", async (request, response) => {
//   const { username, name, password, gender, location } = request.body;
//   const hashedPassword = await bcrypt.hash(password, 10);
//   const selectUserQuery = `
//       SELECT
//         *
//       FROM
//         user
//       WHERE 
//         username = '${username}'`;
//   const dbUser = await db.get(selectUserQuery);

//   if (dbUser === undefined) {
//     // Create user in user table
//     const createUserQuery = `
//           INSERT INTO
//             user (username, name, password, gender, location)
//           VALUES (
//             '${username}',
//             '${name}',
//             '${hashedPassword}',
//             '${gender}',
//             '${location}'
//           );`;
//     await db.run(createUserQuery);
//     response.send("User created successfully");
//   } else {
//     // Send invalid username as response
//     response.status(400);
//     response.send("User already exists");
//   }
// });

// // User login API
// app.post("/login/", async (request, response) => {
//   const { username, password } = request.body;
//   const selectUserQuery = `
//       SELECT
//         *
//       FROM
//         user
//       WHERE 
//         username = '${username}'`;
//   const dbUser = await db.get(selectUserQuery);

//   if (dbUser === undefined) {
//     // user doesn't exist
//     response.status(400);
//     response.send("Invalid User");
//   } else {
//     // compare password, hashed password.
//     const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
//     if (isPasswordMatched === true) {
//       const payload = { username: username, password: password };
//       const jwtToken = jwt.sign(payload, "userKey");
//       response.send({ jwtToken });
//     } else {
//       response.status(400);
//       response.send("Invalid Password");
//     }
//   }
// });

// Create User API
app.post("/users/", (request, response) => {
  const { username, name, password, gender, location } = request.body;

  const selectUserQuery = `SELECT * FROM user WHERE username = ?`;
  db.get(selectUserQuery, [username], async (err, dbUser) => {
    if (err) {
      response.status(500).send("Database error");
    } else if (dbUser === undefined) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const createUserQuery = `
        INSERT INTO user (username, name, password, gender, location)
        VALUES (?, ?, ?, ?, ?)
      `;
      db.run(
        createUserQuery,
        [username, name, hashedPassword, gender, location],
        function (err) {
          if (err) {
            response.status(500).send("Error creating user");
          } else {
            response.send("User created successfully");
          }
        }
      );
    } else {
      response.status(400).send("User already exists");
    }
  });
});

// User Login API
app.post("/login/", (request, response) => {
  const { username, password } = request.body;

  const selectUserQuery = `SELECT * FROM user WHERE username = ?`;
  db.get(selectUserQuery, [username], async (err, dbUser) => {
    if (err) {
      response.status(500).send("Database error");
    } else if (dbUser === undefined) {
      response.status(400).send("Invalid User");
    } else {
      const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
      if (isPasswordMatched) {
        const payload = { username };
        const jwtToken = jwt.sign(payload, "userKey");
        response.send({ jwtToken });
      } else {
        response.status(400).send("Invalid Password");
      }
    }
  });
});

// Close the database when the app is terminated
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});

module.exports = app;