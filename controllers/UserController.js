const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const sendEmail = require("../utils/sendmail/sendEmail");
dotenv.config();
const crypto = require("crypto");

const createUser = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      phone,
      isVerified,
      resetPasswordToken,
      resetPasswordExpire,
    } = req.body;

    // check for existing users
    const existinguser = await User.findOne({ email });
    if (existinguser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // create verification link
    const verificationLink = `${process.env.CLIENT_URL}/auth/verify-email/${verificationToken}`;

    // send verification link to email
    const emailContent = `
    <h1>Verify Email</h1>
    <p>Click on the link to verify your email: <a href="${verificationLink}" target="_blank">Verify Email</a></p>
    <p>Link will expire in 1 hour</p>
    `;

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      phone,
      isVerified,
      verificationToken,
      resetPasswordToken,
      resetPasswordExpire,
    });

    await sendEmail(email, "Verify Email", emailContent);

    // response send to client
    res.status(201).json({
      user,
      message:
        "User created successfully.Please check email to verify your account.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// user login
const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("email", email);
    console.log("password", password);

    // check for existing users
    const existinguser = await User.findOne({ email });
    if (!existinguser) {
      return res.status(400).json({ message: "User does not exist" });
    }

    // check password
    const isPasswordMatched = await bcrypt.compare(
      password,
      existinguser.password
    );
    if (!isPasswordMatched) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // return jwt token
    const token = jwt.sign(
      { userId: existinguser?._id, userEmail: existinguser?.email },
      process.env.ACCESS_TOKEN,
      { expiresIn: "1h" }
    );

    // SEND TOKEN AS A COOKIE
    res
      .cookie("token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: 60 * 60 * 1000,
      })
      .status(201)
      .json({
        message: "User logged in successfully",
        token,
      });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// password forget
const sendForgotPasswordLink = async (req, res) => {
  try {
    const { email } = req.body;

    // check for existing users
    const existinguser = await User.findOne({ email });
    if (!existinguser) {
      return res.status(400).json({ message: "User does not exist" });
    }

    // generate reset password token
    const resetPasswordToken = crypto.randomBytes(32).toString("hex");
    // store the reset token in the users db record
    existinguser.resetPasswordToken = resetPasswordToken;
    existinguser.resetPasswordExpire = Date.now() + 3600000; //expire in 1 hour
    await existinguser.save();

    // create a reset password link
    const resetLink = `${process.env.CLIENT_URL}/auth/reset-password/${resetPasswordToken}`;

    // send reset Link to email
    const emailContent = `
    <h1>Reset Password</h1>
    <p>Click on the link to reset your password: <a href="${resetLink}" target="_blank">Reset Password</a></p>
    <p>Link will expire in 1 hour</p>
    `;

    // send email
    await sendEmail(existinguser.email, "Reset Password", emailContent);
    res.status(200).json({
      message: "Reset password link sent to email",
      resetPasswordToken,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

const userResetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    console.log("password", password);
    console.log("tokn", token);

    // check for existing users
    const existinguser = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    });
    if (!existinguser) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    existinguser.password = hashedPassword;

    // clear token fields
    existinguser.resetPasswordToken = "";
    existinguser.resetPasswordExpire = "";

    await existinguser.save();
    res
      .status(200)
      .json({ message: "Password reset successfully", existinguser });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// verify user account
const verifyUserAccount = async (req, res) => {
  try {
    const { token } = req.params;
    console.log(token);
    const existinguser = await User.findOne({ verificationToken: token });
    if (!existinguser) {
      console.log("Invalid or expired token");
      return res.status(400).json({ message: "Invalid or expired token" });
    }
    existinguser.isVerified = true;
    existinguser.verificationToken = "";
    await existinguser.save();
    console.log("User account verified successfully", existinguser);
    res
      .status(201)
      .json({ message: "User account verified successfully", existinguser });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// user logout
const userLogout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
    });
    res.status(200).json({ message: "User logged out successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// get userdata based on the logged in user token
const getUserData = async (req, res) => {
  try {
    const { token } = req.cookies;
    if (!token) {
      return res
        .status(401)
        .json({ message: "Access denied.Token not provided." });
    }
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN);
    const user = await User.findById(decoded.userId);
    res.status(200).json({ user });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createUser,
  userLogin,
  sendForgotPasswordLink,
  userResetPassword,
  verifyUserAccount,
  userLogout,
  getUserData,
};
