import secure from "./secure";
import {Application} from "express";
import validateFirebaseIdToken from "./auth/auth";


/**
 * Protect application from DDOS and XSS
 * @param {Request} app
 */
function useMiddlewares(app: Application) {
  secure(app);
  app.use(validateFirebaseIdToken);
}

export default useMiddlewares;
