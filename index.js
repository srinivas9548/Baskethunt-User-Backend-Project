const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());

const dbPath = path.join(__dirname, "database.db");

let db = null;

const initializeAndDBServer = async () => {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        app.listen(3000, () => {
            console.log("Server Running at http://localhost:3000/")
        })
    } catch (e) {
        console.log(`DB Error: ${e.message}`);
        process.exit(1);
    }
}

initializeAndDBServer();

// Create User API

app.post("/users/", async (request, response) => {
    const { username, name, password, gender, location } = request.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const selectUserQuery = `
      SELECT
        *
      FROM
        user
      WHERE 
        username = '${username}'`;
    const dbUser = await db.get(selectUserQuery);

    if (dbUser === undefined) {
        // Create user in user table
        const createUserQuery = `
          INSERT INTO
            user (username, name, password, gender, location)
          VALUES (
            '${username}',
            '${name}',
            '${hashedPassword}',
            '${gender}',
            '${location}'
          );`;
        await db.run(createUserQuery);
        response.send("User created successfully");
    } else {
        // Send invalid username as response
        response.status(400);
        response.send("User already exists");
    }
});

// User login API

app.post("/login/", async (request, response) => {
    const { username, password } = request.body;
    const selectUserQuery = `
      SELECT
        *
      FROM
        user
      WHERE 
        username = '${username}'`;
    const dbUser = await db.get(selectUserQuery);

    if (dbUser === undefined) {
        // user doesn't exist
        response.status(400);
        response.send("Invalid User");
    } else {
        // compare password, hashed password.
        const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
        if (isPasswordMatched === true) {
            const payload = {username: username, password: password};
            const jwtToken = jwt.sign(payload, "userKey");
            response.send({jwtToken});
        } else {
            response.status(400);
            response.send("Invalid Password");
        }
    }
});

app.get("/", (request, response) => {
  try {
    response.send("Welcome! This is a Backend Domain for User Login Page.")

  } catch (e) {
    console.log(e.message);
    response.status(500).json({error: "Internal Server Error"});
  }
})

module.exports = app;