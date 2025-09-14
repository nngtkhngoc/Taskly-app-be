import jwt from "jsonwebtoken";

const generateTokenAndSetCookie = (id, res) => {
  const token = jwt.sign(
    {
      id: id,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRATION_TIME,
    }
  );

  res.cookie("token", jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // true khi deploy HTTPS
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
};

export default generateTokenAndSetCookie;
