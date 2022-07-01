import { Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import { validate } from "class-validator";
import { User } from "../../models/user.model";
import { JWT_SECRET } from "../../utils/secrets";
import { ROLE } from '../../config/constant'
import { result } from "lodash";

class AuthController {
    static signup = async (req: Request, res: Response) => {
        //Get parameters from the body
        let { email, password, confirmPassword, roleID } = req.body;
        let user = new User();
        user.email = email;

        if (password == confirmPassword) {
            user.password = password;
        } else {
            res.status(400).send("incorrect confirm password");
            return;
        }
        if (roleID == ROLE.SUPPLIER) {
            user.roleID = roleID;
        }
        //Validade if the parameters are ok
        const errors = await validate(user);
        if (errors.length > 0) {
            res.status(400).send(errors);
            return;
        }

        //Try to save. If fails, the username is already in use
        try {
            await user.save();


            //If all ok, send 201 response
            res.status(201).send("sign up successfully");
        } catch (e) {
            res.status(409).send(e.errors[0].message);
            return;
        }
    };

    static signupp = async (req: Request, res: Response) => {
        res.status(200).send({ "ahihi": "ahihi" });
    }


    static login = async (req: Request, res: Response) => {
        // //Check if username and password are set
        // let { email, password } = req.body;
        // if (!(email && password)) {
        //     res.status(400).send();
        // }

        // //Get user from database
        // let user: User;
        // try {
        //     user = await User.findOneOrFail({ where: { email: email } });
        // } catch (error) {
        //     res.status(401).send();
        // }

        // //Check if encrypted password match
        // if (!user.checkIfUnencryptedPasswordIsValid(password)) {
        //     res.status(401).send();
        //     return;
        // }

        // //Sing JWT, valid for 1 hour
        // const token = jwt.sign(
        //     { userId: user.id, username: user.username },
        //     config.jwtSecret,
        //     { expiresIn: "1h" }
        // );

        // //Send the jwt in the response
        // res.send(token);
    };

    static changePassword = async (req: Request, res: Response) => {
        // //Get ID from JWT
        // const id = res.locals.jwtPayload.userId;

        // //Get parameters from the body
        // const { oldPassword, newPassword } = req.body;
        // if (!(oldPassword && newPassword)) {
        //     res.status(400).send();
        // }

        // //Get user from the database
        // const userRepository = getRepository(User);
        // let user: User;
        // try {
        //     user = await userRepository.findOneOrFail(id);
        // } catch (id) {
        //     res.status(401).send();
        // }

        // //Check if old password matchs
        // if (!user.checkIfUnencryptedPasswordIsValid(oldPassword)) {
        //     res.status(401).send();
        //     return;
        // }

        // //Validate de model (password lenght)
        // user.password = newPassword;
        // const errors = await validate(user);
        // if (errors.length > 0) {
        //     res.status(400).send(errors);
        //     return;
        // }
        // //Hash the new password and save
        // user.hashPassword();
        // userRepository.save(user);

        // res.status(204).send();
    };
}
export default AuthController;
