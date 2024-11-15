import { test, expect, jest } from "@jest/globals"
import request from 'supertest'
import { app } from "../../index"
import { cleanup } from "../../src/db/cleanup"
import UserController from "../../src/controllers/userController"
import {User, Role} from "../../src/components/user"
import ErrorHandler from "../../src/helper"
import { UserAlreadyExistsError, UserIsAdminError, UserNotAdminError, UserNotFoundError } from "../../src/errors/userError"
import Authenticator from "../../src/routers/auth"
import { DateError } from "../../src/utilities"

const routePath = '/ezelectronics';
const admin = { username: "admin", name: "admin", surname: "admin", password: "admin", role: Role.ADMIN, birthdate:null, address:null };
const manager = { username: "manager", name: "manager", surname: "manager", password: "manager", role: Role.MANAGER, birthdate:null, address:null};
const customer = { username: "customer", name: "customer", surname: "customer", password: "customer", role:Role.CUSTOMER,birthdate:null, address:null };

let adminCookie: string;
let managerCookie: string;
let customerCookie: string;

const postUser = async (userInfo: any) => {
    await request(app)
        .post(`${routePath}/users`)
        .send(userInfo)
        .expect(200)
}

const login = async (userInfo: any) => {
    return new Promise<string>((resolve, reject) => {
        request(app)
            .post(`${routePath}/sessions`)
            .send(userInfo)
            .expect(200)
            .end((err, res) => {
                if (err) {
                    reject(err)
                }
                resolve(res.header["set-cookie"][0])
            })
    })
}

beforeAll(async () => {
    await cleanup();
    await postUser(admin);
    await postUser(manager);
    await postUser(customer);
    adminCookie = await login(admin);
    managerCookie = await login(manager);
    customerCookie = await login(customer);
});

afterAll(async () => {
    await cleanup();
});





describe("POST /users",()=>{
    test("It should return 200 status code",async()=>{
        const testUser = {
            username:"test",
            name:"test",
            surname:"test",
            password:"test",
            role:"Customer"
        }

        jest.mock('express-validator', () => ({
            body: jest.fn().mockImplementation(() => ({
                isString: () => ({ isLength: () => ({}) }),
                isIn: () => ({ isLength: () => ({}) }),
            })),
        }))

        jest.spyOn(ErrorHandler.prototype, "validateRequest").mockImplementation((req, res, next) => {
            return next()
        })

        jest.spyOn(UserController.prototype, "createUser").mockResolvedValueOnce(true)

        const response = await request(app).post(routePath + '/users').send(testUser)
        expect(response.status).toBe(200)
        expect(UserController.prototype.createUser).toHaveBeenCalled()
        expect(UserController.prototype.createUser).toHaveBeenCalledWith(testUser.username,testUser.name,testUser.surname,testUser.password,testUser.role)

    })

    test("It should return a 409 error (user already exists)",async()=>{
        const testUser = {
            username:"test",
            name:"test",
            surname:"test",
            password:"test",
            role:"Customer"
        }
        jest.mock('express-validator', () => ({
            body: jest.fn().mockImplementation(() => ({
                isString: () => ({ isLength: () => ({}) }),
                isIn: () => ({ isLength: () => ({}) }),
            })),
        }))

        jest.spyOn(ErrorHandler.prototype, "validateRequest").mockImplementation((req, res, next) => {
            return next()
        })

        jest.spyOn(UserController.prototype, "createUser").mockRejectedValueOnce(new UserAlreadyExistsError())

        const response = await request(app).post(routePath + '/users').send(testUser)
        expect(response.status).toBe(409)
        expect(UserController.prototype.createUser).toHaveBeenCalled()
        expect(UserController.prototype.createUser).toHaveBeenCalledWith(testUser.username,testUser.name,testUser.surname,testUser.password,testUser.role)

    })

    test("It should return a 422 error (parameters incorrect)",async()=>{
        const testUser = {
            username:"",
            name:"test",
            surname:"test",
            password:"test",
            role:"Customer"
        }
        jest.mock('express-validator', () => ({
            body: jest.fn().mockImplementation(() => ({
                isString: () => ({ isLength: () => ({}) }),
                isIn: () => ({ isLength: () => ({}) }),
            })),
        }))

        jest.spyOn(ErrorHandler.prototype, "validateRequest").mockImplementation((req, res, next) => {
            return next()
        })

        jest.spyOn(UserController.prototype, "createUser").mockResolvedValueOnce(true)

        const response = await request(app).post(routePath + '/users').send(testUser)
        expect(response.status).toBe(422)
    })
})

describe ("GET /users",()=>{
    test("It should return 200 status code & an array of users",async()=>{
        jest.spyOn(UserController.prototype,"getUsers").mockResolvedValue([admin,manager,customer])
        
        jest.spyOn(Authenticator.prototype,"isLoggedIn").mockImplementation((req,res,next)=>{
            return next() //is logged in
        })

        jest.spyOn(Authenticator.prototype,"isAdmin").mockImplementation((req,res,next)=>{
            return next() //is an admin
        })

        const response = await request(app).get(routePath + "/users").set("Cookie", adminCookie)
        expect(response.status).toBe(200)
        expect(UserController.prototype.getUsers).toHaveBeenCalled()
        expect(response.body).toEqual([admin,manager,customer])
    })

    test("It should return 401 unathorized error",async()=>{
        jest.spyOn(Authenticator.prototype,"isLoggedIn").mockImplementation((req,res,next)=>{
            return next() //is logged in
        })

        jest.spyOn(Authenticator.prototype,"isAdmin").mockImplementation((req,res,next)=>{
            return res.status(401).json({ error: "Not an admin" }) //is not an admin
        })

        const response = await request(app).get(routePath + "/users")
        expect(response.status).toBe(401)
    })

    test("It should return 401 unathorized error",async()=>{
        jest.spyOn(Authenticator.prototype,"isLoggedIn").mockImplementation((req,res,next)=>{
            return res.status(401).json({ error: "Not logged in" }) //is not logged in
        })

        const response = await request(app).get(routePath + "/users")
        expect(response.status).toBe(401)
    })
})

describe("GET users/roles/:role",()=>{
    test("It should return 200 status code and array of users", async()=>{
        jest.spyOn(UserController.prototype,"getUsersByRole").mockResolvedValueOnce([customer])

        jest.spyOn(Authenticator.prototype,"isLoggedIn").mockImplementation((req,res,next)=>{
            return next()
        })
        
        jest.spyOn(Authenticator.prototype,"isAdmin").mockImplementation((req,res,next)=>{
            return next()
        })

        jest.mock('express-validator', () => ({
            param: jest.fn().mockImplementation(() => ({
                isString: () => ({ isLength: () => ({}) }),
                isIn: () => ({ isLength: () => ({}) }),
            })),
        }))

        jest.spyOn(ErrorHandler.prototype, "validateRequest").mockImplementation((req, res, next) => {
            return next()
        })
        
        const response = await request(app).get(routePath + "/users/roles/Customer").set("Cookie",adminCookie)
        expect(response.status).toBe(200)
        expect(UserController.prototype.getUsersByRole).toHaveBeenCalled()
        expect(UserController.prototype.getUsersByRole).toHaveBeenCalledWith("Customer")
        expect(response.body).toEqual([customer])

    })

    test("It should return 422 status code (invalid role entered)", async()=>{

        jest.spyOn(Authenticator.prototype,"isLoggedIn").mockImplementation((req,res,next)=>{
            return next()
        })
        
        jest.spyOn(Authenticator.prototype,"isAdmin").mockImplementation((req,res,next)=>{
            return next()
        })

        jest.mock('express-validator', () => ({
            param: jest.fn().mockImplementation(() => {
                throw new Error("Invalid Role")
            }),
        }))

        jest.spyOn(ErrorHandler.prototype, "validateRequest").mockImplementation((req, res, next) => {
            return res.status(422).json({error:"Input parameters not formatted correctly"})
        })
        
        const response = await request(app).get(routePath + "/users/roles/Invalid").set("Cookie",adminCookie)
        expect(response.status).toBe(422)
    })
})


describe("GET users/:username",()=>{

    test("It should return 200 status code and a user object (logged in as admin)",async()=>{
        const testCustomer = new User("testCustomer","testCustomer","testCustomer",Role.CUSTOMER,null,null)
        const testAdmin = new User("admin","admin","admin",Role.ADMIN,null,null)

        jest.spyOn(Authenticator.prototype,"isLoggedIn").mockImplementation((req,res,next)=>{
            return next()
        })

        jest.mock('express-validator', () => ({
            param: jest.fn().mockImplementation(() => ({
                isString: () => ({ isLength: () => ({}) }),
                isIn: () => ({ isLength: () => ({}) }),
            })),
        }))

        jest.spyOn(ErrorHandler.prototype, "validateRequest").mockImplementation((req, res, next) => {
            return next()
        })

        jest.spyOn(UserController.prototype,"getUserByUsername").mockResolvedValueOnce(testCustomer)

        const response = await request(app).get(routePath + "/users/testCustomer").set("Cookie",adminCookie)

        expect(response.status).toBe(200)
        expect(UserController.prototype.getUserByUsername).toHaveBeenCalled()
        expect(UserController.prototype.getUserByUsername).toHaveBeenCalledWith(testAdmin, "testCustomer")
        expect(response.body).toEqual(testCustomer)
    })

    test("It should return 401 status code (logged in as user requesting someone else's info)",async()=>{
        const testCustomer = new User("testCustomer","testCustomer","testCustomer",Role.CUSTOMER,null,null)

        jest.spyOn(Authenticator.prototype,"isLoggedIn").mockImplementation((req,res,next)=>{
            return next()
        })

        jest.mock('express-validator', () => ({
            param: jest.fn().mockImplementation(() => ({
                isString: () => ({ isLength: () => ({}) }),
                isIn: () => ({ isLength: () => ({}) }),
            })),
        }))

        jest.spyOn(ErrorHandler.prototype, "validateRequest").mockImplementation((req, res, next) => {
            return next()
        })

        jest.spyOn(UserController.prototype,"getUserByUsername").mockRejectedValueOnce(new UserNotAdminError())

        const response = await request(app).get(routePath + "/users/testCustomer").set("Cookie",customerCookie)

        expect(response.status).toBe(401)
    })

    test("It should return 404 error (user not found)",async()=>{
        const testCustomer = new User("testCustomer","testCustomer","testCustomer",Role.CUSTOMER,null,null)
        const testAdmin = new User("admin","admin","admin",Role.ADMIN,null,null)

        jest.spyOn(Authenticator.prototype,"isLoggedIn").mockImplementation((req,res,next)=>{
            return next()
        })

        jest.mock('express-validator', () => ({
            param: jest.fn().mockImplementation(() => ({
                isString: () => ({ isLength: () => ({}) }),
                isIn: () => ({ isLength: () => ({}) }),
            })),
        }))

        jest.spyOn(ErrorHandler.prototype, "validateRequest").mockImplementation((req, res, next) => {
            return next()
        })

        jest.spyOn(UserController.prototype,"getUserByUsername").mockRejectedValueOnce(new UserNotFoundError())

        const response = await request(app).get(routePath + "/users/testCustomer").set("Cookie",adminCookie)

        expect(response.status).toBe(404)
        expect(UserController.prototype.getUserByUsername).toHaveBeenCalled()
        expect(UserController.prototype.getUserByUsername).toHaveBeenCalledWith(testAdmin, "testCustomer")

    })
})

describe("DELETE users/:username",()=>{
    test("It should return 200 status code (admin deleting customer)",async()=>{
        const testCustomer = new User("testCustomer","testCustomer","testCustomer",Role.CUSTOMER,null,null)
        const testAdmin = new User("admin","admin","admin",Role.ADMIN,null,null)

        jest.spyOn(Authenticator.prototype,"isLoggedIn").mockImplementation((req,res,next)=>{
            return next()
        })

        jest.mock('express-validator', () => ({
            param: jest.fn().mockImplementation(() => ({
                isString: () => ({ isLength: () => ({}) }),
                isIn: () => ({ isLength: () => ({}) }),
            })),
        }))

        jest.spyOn(ErrorHandler.prototype, "validateRequest").mockImplementation((req, res, next) => {
            return next()
        })

        jest.spyOn(UserController.prototype,"deleteUser").mockResolvedValueOnce(true)

        const response = await request(app).delete(routePath + '/users/testCustomer').set("Cookie",adminCookie)

        expect(response.status).toBe(200)
        expect(UserController.prototype.deleteUser).toHaveBeenCalled()
        expect(UserController.prototype.deleteUser).toHaveBeenCalledWith(testAdmin, "testCustomer")

    })

    test("It should return 404 error (user does not exist)",async()=>{
        const testCustomer = new User("testCustomer","testCustomer","testCustomer",Role.CUSTOMER,null,null)
        const testAdmin = new User("admin","admin","admin",Role.ADMIN,null,null)

        jest.spyOn(Authenticator.prototype,"isLoggedIn").mockImplementation((req,res,next)=>{
            return next()
        })

        jest.mock('express-validator', () => ({
            param: jest.fn().mockImplementation(() => ({
                isString: () => ({ isLength: () => ({}) }),
                isIn: () => ({ isLength: () => ({}) }),
            })),
        }))

        jest.spyOn(ErrorHandler.prototype, "validateRequest").mockImplementation((req, res, next) => {
            return next()
        })

        jest.spyOn(UserController.prototype,"deleteUser").mockRejectedValueOnce(new UserNotFoundError())

        const response = await request(app).delete(routePath + "/users/testCustomer").set("Cookie",adminCookie)

        expect(response.status).toBe(404)
        expect(UserController.prototype.deleteUser).toHaveBeenCalled()
        expect(UserController.prototype.deleteUser).toHaveBeenCalledWith(testAdmin, "testCustomer")
    })

    test("It should return 401 status code (logged in as user deleting someone else's info)",async()=>{
        const testCustomer = new User("testCustomer","testCustomer","testCustomer",Role.CUSTOMER,null,null)

        jest.spyOn(Authenticator.prototype,"isLoggedIn").mockImplementation((req,res,next)=>{
            return next()
        })

        jest.mock('express-validator', () => ({
            param: jest.fn().mockImplementation(() => ({
                isString: () => ({ isLength: () => ({}) }),
                isIn: () => ({ isLength: () => ({}) }),
            })),
        }))

        jest.spyOn(ErrorHandler.prototype, "validateRequest").mockImplementation((req, res, next) => {
            return next()
        })

        jest.spyOn(UserController.prototype,"deleteUser").mockRejectedValueOnce(new UserNotAdminError())

        const response = await request(app).delete(routePath + "/users/testCustomer").set("Cookie",customerCookie)

        expect(response.status).toBe(401)
    })

    test("It should return 401 status code (admin deleting other admin",async()=>{
        const testAdmin = new User("testAdmin","testAdmin","testAdmin",Role.ADMIN,null,null)
        const admin2 = new User("admin","admin","admin",Role.ADMIN,null,null)

        jest.spyOn(Authenticator.prototype,"isLoggedIn").mockImplementation((req,res,next)=>{
            return next()
        })

        jest.mock('express-validator', () => ({
            param: jest.fn().mockImplementation(() => ({
                isString: () => ({ isLength: () => ({}) }),
                isIn: () => ({ isLength: () => ({}) }),
            })),
        }))

        jest.spyOn(ErrorHandler.prototype, "validateRequest").mockImplementation((req, res, next) => {
            return next()
        })

        jest.spyOn(UserController.prototype,"deleteUser").mockRejectedValueOnce(new UserNotAdminError)

        const response = await request(app).delete(routePath + "/users/testAdmin").set("Cookie",adminCookie)

        expect(response.status).toBe(401)
        expect(UserController.prototype.deleteUser).toHaveBeenCalled()
        expect(UserController.prototype.deleteUser).toHaveBeenCalledWith(admin2, "testAdmin")
    })
})

describe ("DELETE /users",()=>{
    test("It should return 200 status code",async()=>{
        jest.spyOn(UserController.prototype,"deleteAll").mockResolvedValue(true)
        
        jest.spyOn(Authenticator.prototype,"isLoggedIn").mockImplementation((req,res,next)=>{
            return next() //is logged in
        })

        jest.spyOn(Authenticator.prototype,"isAdmin").mockImplementation((req,res,next)=>{
            return next() //is an admin
        })

        const response = await request(app).delete(routePath + "/users").set("Cookie", adminCookie)
        expect(response.status).toBe(200)
        expect(UserController.prototype.deleteAll).toHaveBeenCalled()
    })

    test("It should return 401 unauthorized error",async()=>{
        jest.spyOn(Authenticator.prototype,"isLoggedIn").mockImplementation((req,res,next)=>{
            return next() //is logged in
        })

        jest.spyOn(Authenticator.prototype,"isAdmin").mockImplementation((req,res,next)=>{
            return res.status(401).json({ error: "Not an admin" }) //is not an admin
        })

        const response = await request(app).delete(routePath + "/users")
        expect(response.status).toBe(401)
    })

    test("It should return 401 unathorized error",async()=>{
        jest.spyOn(Authenticator.prototype,"isLoggedIn").mockImplementation((req,res,next)=>{
            return res.status(401).json({ error: "Not logged in" }) //is not logged in
        })

        const response = await request(app).delete(routePath + "/users")
        expect(response.status).toBe(401)
    })
})



describe("PATCH users/:username",()=>{
    let testAdmin = new User("admin", "admin", "admin", Role.ADMIN, null,null);
    let testCustomer = new User("customer", "customer", "customer", Role.CUSTOMER, null, null);

    test("It should return 200 status code and updated user",async()=>{
        const updateInfo = {name:"customer",surname:"customer",address:"Torino",birthdate:"2012-12-12"}
        const testUser = new User("customer","customer","customer",Role.CUSTOMER,null,null)
        const testUserUpdated = {
            ...testUser,
            name:updateInfo.name,
            surname:updateInfo.surname,
            address:updateInfo.address,
            birthdate:updateInfo.birthdate
        }

        jest.spyOn(Authenticator.prototype,"isLoggedIn").mockImplementation((req,res,next)=>{
            return next() //is logged in
        })

        jest.spyOn(Authenticator.prototype,"isAdmin").mockImplementation((req,res,next)=>{
            return next()
        })
    
        jest.mock('express-validator', () => ({
            param: jest.fn().mockImplementation(() => ({
                isString: () => ({ isLength: () => ({}) }),
                isIn: () => ({ isLength: () => ({}) }),
            })),
            body:jest.fn().mockImplementation(()=>({
                isString: () => ({ isLength: () => ({}) }),
                isIn: () => ({ isLength: () => ({}) }),
            }))
        }))
    
        jest.spyOn(ErrorHandler.prototype, "validateRequest").mockImplementation((req, res, next) => {
            return next()
        })

        jest.spyOn(UserController.prototype,"updateUserInfo").mockResolvedValueOnce(testUserUpdated)

        const response = await request(app).patch(routePath + '/users/customer').send({
            name:updateInfo.name,
            surname:updateInfo.surname,
            address:updateInfo.address,
            birthdate:updateInfo.birthdate
        }).set("Cookie",customerCookie)

        expect(response.status).toBe(200)
        expect(UserController.prototype.updateUserInfo).toHaveBeenCalled()
        expect(UserController.prototype.updateUserInfo).toHaveBeenCalledWith(testUser,updateInfo.name,updateInfo.surname,updateInfo.address,updateInfo.birthdate,"customer")
        expect(response.body).toEqual(testUserUpdated)

    })
    
    test("It should return 404 (user does not exist)",async()=>{
        const updateInfo = {name:"customer",surname:"customer",address:"Torino",birthdate:"2012-12-12"}
        const testUser = new User("customer","customer","customer",Role.CUSTOMER,null,null)
        const testUserUpdated = {
            ...testUser,
            name:updateInfo.name,
            surname:updateInfo.surname,
            address:updateInfo.address,
            birthdate:updateInfo.birthdate
        }

        jest.spyOn(Authenticator.prototype,"isLoggedIn").mockImplementation((req,res,next)=>{
            return next() //is logged in
        })
    
        jest.mock('express-validator', () => ({
            param: jest.fn().mockImplementation(() => ({
                isString: () => ({ isLength: () => ({}) }),
                isIn: () => ({ isLength: () => ({}) }),
            })),
            body:jest.fn().mockImplementation(()=>({
                isString: () => ({ isLength: () => ({}) }),
                isIn: () => ({ isLength: () => ({}) }),
            }))
        }))
    
        jest.spyOn(ErrorHandler.prototype, "validateRequest").mockImplementation((req, res, next) => {
            return next()
        })

        jest.spyOn(UserController.prototype,"updateUserInfo").mockRejectedValueOnce(new UserNotFoundError())

        const response = await request(app).patch(routePath + '/users/customer').send({
            name:updateInfo.name,
            surname:updateInfo.surname,
            address:updateInfo.address,
            birthdate:updateInfo.birthdate
        }).set("Cookie",customerCookie)

        expect(response.status).toBe(404)
        expect(UserController.prototype.updateUserInfo).toHaveBeenCalled()
        expect(UserController.prototype.updateUserInfo).toHaveBeenCalledWith(testUser,updateInfo.name,updateInfo.surname,updateInfo.address,updateInfo.birthdate,"customer")
    })

    test("It should return 401 (user trying to change other user)",async()=>{
        const updateInfo = {name:"customer",surname:"customer",address:"Torino",birthdate:"2012-12-12"}
        const testUser = new User("customer","customer","customer",Role.CUSTOMER,null,null)
        const testUserUpdated = {
            ...testUser,
            name:updateInfo.name,
            surname:updateInfo.surname,
            address:updateInfo.address,
            birthdate:updateInfo.birthdate
        }
        const testManager = new User("manager","manager","manager",Role.MANAGER,null,null)

        jest.spyOn(Authenticator.prototype,"isLoggedIn").mockImplementation((req,res,next)=>{
            return next() //is logged in
        })
    
        jest.mock('express-validator', () => ({
            param: jest.fn().mockImplementation(() => ({
                isString: () => ({ isLength: () => ({}) }),
                isIn: () => ({ isLength: () => ({}) }),
            })),
            body:jest.fn().mockImplementation(()=>({
                isString: () => ({ isLength: () => ({}) }),
                isIn: () => ({ isLength: () => ({}) }),
            }))
        }))
    
        jest.spyOn(ErrorHandler.prototype, "validateRequest").mockImplementation((req, res, next) => {
            return next()
        })

        jest.spyOn(UserController.prototype,"updateUserInfo").mockRejectedValueOnce(new UserNotAdminError())

        const response = await request(app).patch(routePath + '/users/customer').send({
            name:updateInfo.name,
            surname:updateInfo.surname,
            address:updateInfo.address,
            birthdate:updateInfo.birthdate
        }).set("Cookie",managerCookie)

        expect(response.status).toBe(401)
        expect(UserController.prototype.updateUserInfo).toHaveBeenCalled()
        expect(UserController.prototype.updateUserInfo).toHaveBeenCalledWith(testManager,updateInfo.name,updateInfo.surname,updateInfo.address,updateInfo.birthdate,"customer")
    })

    test("It should return 400 error (birthdate after current date)",async()=>{
        const updateInfo = {name:"customer",surname:"customer",address:"Torino",birthdate:"2012-12-12"}
        const testUser = new User("customer","customer","customer",Role.CUSTOMER,null,null)
        const testUserUpdated = {
            ...testUser,
            name:updateInfo.name,
            surname:updateInfo.surname,
            address:updateInfo.address,
            birthdate:updateInfo.birthdate
        }

        jest.spyOn(Authenticator.prototype,"isLoggedIn").mockImplementation((req,res,next)=>{
            return next() //is logged in
        })
    
        jest.mock('express-validator', () => ({
            param: jest.fn().mockImplementation(() => ({
                isString: () => ({ isLength: () => ({}) }),
                isIn: () => ({ isLength: () => ({}) }),
            })),
            body:jest.fn().mockImplementation(()=>({
                isString: () => ({ isLength: () => ({}) }),
                isIn: () => ({ isLength: () => ({}) }),
            }))
        }))
    
        jest.spyOn(ErrorHandler.prototype, "validateRequest").mockImplementation((req, res, next) => {
            return next()
        })

        jest.spyOn(UserController.prototype,"updateUserInfo").mockRejectedValueOnce(new DateError())

        const response = await request(app).patch(routePath + '/users/customer').send({
            name:updateInfo.name,
            surname:updateInfo.surname,
            address:updateInfo.address,
            birthdate:updateInfo.birthdate
        }).set("Cookie",customerCookie)

        expect(response.status).toBe(400)
        expect(UserController.prototype.updateUserInfo).toHaveBeenCalled()
        expect(UserController.prototype.updateUserInfo).toHaveBeenCalledWith(testUser,updateInfo.name,updateInfo.surname,updateInfo.address,updateInfo.birthdate,"customer")
    })

    test("It should return 401 (admin trying to change other admin)",async()=>{
        const updateInfo = {name:"TestAdmin",surname:"admin",address:"Torino",birthdate:"2012-12-12"}
        const testUser = new User("adminTest","test","admin",Role.ADMIN,null,null)
        const testUserUpdated = {
            ...testUser,
            name:updateInfo.name,
            surname:updateInfo.surname,
            address:updateInfo.address,
            birthdate:updateInfo.birthdate
        }
        const admin2 = new User("admin","admin","admin",Role.ADMIN,null,null)

        jest.spyOn(Authenticator.prototype,"isLoggedIn").mockImplementation((req,res,next)=>{
            return next() //is logged in
        })
    
        jest.mock('express-validator', () => ({
            param: jest.fn().mockImplementation(() => ({
                isString: () => ({ isLength: () => ({}) }),
                isIn: () => ({ isLength: () => ({}) }),
            })),
            body:jest.fn().mockImplementation(()=>({
                isString: () => ({ isLength: () => ({}) }),
                isIn: () => ({ isLength: () => ({}) }),
            }))
        }))
    
        jest.spyOn(ErrorHandler.prototype, "validateRequest").mockImplementation((req, res, next) => {
            return next()
        })

        jest.spyOn(UserController.prototype,"updateUserInfo").mockRejectedValueOnce(new UserIsAdminError())

        const response = await request(app).patch(routePath + '/users/adminTest').send({
            name:updateInfo.name,
            surname:updateInfo.surname,
            address:updateInfo.address,
            birthdate:updateInfo.birthdate
        }).set("Cookie",adminCookie)

        expect(response.status).toBe(401)
        expect(UserController.prototype.updateUserInfo).toHaveBeenCalled()
        expect(UserController.prototype.updateUserInfo).toHaveBeenCalledWith(admin2,updateInfo.name,updateInfo.surname,updateInfo.address,updateInfo.birthdate,"adminTest")
    })
})

