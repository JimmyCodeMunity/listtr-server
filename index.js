const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const app = express();

// get environment variables
require("dotenv").config({
  path: ".env.local",
});

app.use(
  cors({
    origin: process.env.CLIENT_URL, //allowed front end url
    credentials: true, //allow cookies
    methods: ["GET", "POST", "PUT", "DELETE"], //allowed methods
    allowedHeaders: ["Content-Type", "Authorization"], //allowed headers
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// log in browser
app.get("/", (req, res) => {
  res.send("Listtr server up!");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const userroute = require("./routes/UserRoute");
const connectDB = require("./service/dbconnection");

// database connection
connectDB();

// auth routes
app.use("/api/v1/auth", userroute);
