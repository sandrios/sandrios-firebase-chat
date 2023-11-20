import {
  getAuth,
} from "firebase-admin/auth";
import {
  log,
} from "firebase-functions/logger";
import {
  NextFunction,
  Request,
  Response,
} from "express";

const auth = getAuth();

const validateFirebaseIdToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (
    (!req.headers.authorization ||
      !req.headers.authorization.startsWith("Bearer ")) &&
    !(req.cookies && req.cookies.__session)
  ) {
    log("No Firebase ID token was passed");
    res.status(403).send("Unauthorized");
    return;
  }

  let idToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    // Read the ID Token from the Authorization header.
    idToken = req.headers.authorization.split("Bearer ")[1];
  } else if (req.cookies) {
    // Read the ID Token from cookie.
    idToken = req.cookies.__session;
  } else {
    // No cookie
    res.status(403).send("Unauthorized");
    return;
  }

  try {
    const token = await auth.verifyIdToken(idToken);

    const role = token.email ? "user" : "anonymous";
    token.uid && (await grantUserRole(token.uid, role));

    console.log(token);

    next();
    return;
  } catch (error) {
    log("Error while verifying Firebase ID token:", error);
    res.status(403).send("Unauthorized");
    return;
  }
};

const grantUserRole = async (uid: string, role: string) => {
  const user = await auth.getUser(uid);
  // console.log("grantUserRole", user);
  if (user.customClaims && user.customClaims.role === role) {
    return;
  }
  return auth.setCustomUserClaims(user.uid, {
    role: [role],
  });
};

export default validateFirebaseIdToken;
