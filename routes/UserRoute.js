const express = require("express");
const {
  createUser,
  userLogin,
  sendForgotPasswordLink,
  userResetPassword,
  verifyUserAccount,
  userLogout,
  getUserData,
} = require("../controllers/UserController");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
// allow url encoding
router.use(express.urlencoded({ extended: true }));

router.post("/createuser", createUser);
router.post("/userlogin", userLogin);
router.post("/send-forgot-password-link", sendForgotPasswordLink);
router.post("/reset-password/:token", userResetPassword);
router.post("/verify-email/:token", verifyUserAccount);
router.post("/user-logout", authMiddleware, userLogout);
router.post("/user-data", authMiddleware, getUserData);

module.exports = router;
