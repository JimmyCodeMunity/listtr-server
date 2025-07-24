const jwt = require("jsonwebtoken");
// env variables
require("dotenv").config();

const authMiddleware = (req, res, next) => {
  try {
    const { token } = req.cookies;

    if (!token) {
      return res
        .status(401)
        .json({ message: "Access denied.Token not provided." });
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN);
    req.user = decoded; //attach userdata to the request

    next();
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = authMiddleware;
