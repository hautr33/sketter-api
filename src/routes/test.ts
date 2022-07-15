import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import RESDocument from "../controllers/factory/RESDocument";
import AppError from "../utils/appError";
import { standardPipeline } from "../pipes";
import catchAsync from "../utils/catchAsync";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { initializeApp } from "firebase/app";
const firebaseConfig = {
    apiKey: "AIzaSyCNWPlCF1b0oZ_HtdJALXOULrUdsKS3FGs",
    authDomain: "emailpasswordauth-afc3d.firebaseapp.com",
    projectId: "emailpasswordauth-afc3d",
    storageBucket: "emailpasswordauth-afc3d.appspot.com",
    messagingSenderId: "374477633930",
    appId: "1:374477633930:web:1dc2753a5a6c0899a37073"
};

initializeApp(firebaseConfig);

const router = Router();

// JUST FOR TEST
router.post('/login',
    standardPipeline(
        catchAsync(
            async (req, res, next) => {
                const { email, password } = req.body;

                if (!(email || password)) {
                    return next(
                        new AppError(
                            'Cannot find account or password!',
                            StatusCodes.BAD_REQUEST
                        )
                    );
                }
                const auth = getAuth();
                signInWithEmailAndPassword(auth, email, password)
                    .then((userCredential) => {
                        // Signed in 
                        const user = userCredential.user;
                        // ...
                        user.getIdToken()
                            .then(token => {
                                res.resDocument = new RESDocument(StatusCodes.OK, 'success', token)
                                next()
                            })

                    })
                    .catch((error) => {
                        const errorMessage = error.message;
                        return next(new AppError(errorMessage, StatusCodes.BAD_REQUEST));
                    });


            }
        )
    )
);

export default router;