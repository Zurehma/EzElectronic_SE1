import { test, expect, jest, describe, beforeAll, afterAll, afterEach, beforeEach } from "@jest/globals"
import request from 'supertest'
import { app } from "../index"
import { cleanup, cleanupNoUsers } from "../src/db/cleanup"
import { Utility } from "../src/utilities";
import db from "../src/db/db"
import {User, Role} from "../src/components/user"
import Authenticator from "../src/routers/auth";
import { body } from "express-validator";

const routePath = '/ezelectronics';
const customer = { username: "customer", name: "customer", surname: "customer", password: "customer", role: Role.CUSTOMER, address:null, birthdate:null };
const admin = { username: "admin", name: "admin", surname: "admin", password: "admin", role: Role.ADMIN, address:null, birthdate:null};
const manager = {username:"manager",name:"manager",surname:"manager",password:"manager",role:Role.MANAGER, address:null, birthdate:null};
let customerCookie: string;
let adminCookie: string;
let managerCookie:string;

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
    await postUser(customer);
    await postUser(manager);
    adminCookie = await login(admin);
    customerCookie = await login(customer);
    managerCookie = await login(manager);
});

beforeEach(async () => {
    await cleanupNoUsers();
});

const postUsers = async (user: any) => {
    const res = await request(app)
        .post(routePath + '/users')
        .send(user)
        .set('Cookie', adminCookie)
    return res.status;
}

describe("User APIs Integration Tests",()=>{
    const testAdmin = new User("zurehmaR","Zurehma","Rameez",Role.ADMIN,null,null)
    const testUser = new User("johnSmith","John","Smith",Role.CUSTOMER,null,null);
    const manager = new User("manager","manager","manager",Role.MANAGER,null,null)
    const admin = new User("admin","admin","admin",Role.ADMIN,null,null)
    const customer = new User("customer","customer","customer",Role.CUSTOMER,null,null)

    describe("POST /users",()=>{
        test("It should create a user and return 200 status code",async()=>{
            const user = {
                username: "JSmith",
                name: "Jane",
                surname: "Smith",
                password: "12345",
                role: "Customer"
            }
            const response = await request(app).post(routePath + '/users').send(user);
            expect(response.status).toBe(200)
        })

        test("It should return a 409 error (username already exists)",async()=>{
            const user = {
                username: "JSmith",
                name: "Jane",
                surname: "Smith",
                password: "12345",
                role: "Customer"
            }
            const response = await request(app).post(routePath + '/users').send(user);
            expect(response.status).toBe(409)
        })

        test("It should return a 422 error (parameters incorrect)",async()=>{
            const user = {
                username: "JSmith",
                name: "Jane",
                surname: "Smith",
                password: "12345",
                role: "Student"
            }
            const response = await request(app).post(routePath + '/users').send(user);
            expect(response.status).toBe(422)
        })
     })

     describe("GET /users",()=>{
        test("It should return the list of users and a 200 status code",async()=>{
            const response = await request(app).get(routePath + '/users').set("Cookie",adminCookie);
            expect(response.status).toBe(200)
            expect(response.body).toEqual([admin,customer,manager,
            new User("JSmith","Jane","Smith",Role.CUSTOMER,null,null)])
        })

        test("It should return a 401 unauthorized error",async()=>{
            const response = await request(app).get(routePath + '/users').set("Cookie",managerCookie);
            expect(response.status).toBe(401)
        })
     })

     describe("GET /users/roles/:role",()=>{
        test("It should return all users with role customer and 200 status code",async()=>{
            const response = await request(app).get(routePath + '/users/roles/Customer').set("Cookie",adminCookie)
            expect(response.status).toBe(200)
            expect(response.body).toEqual([customer, new User("JSmith","Jane","Smith",Role.CUSTOMER,null,null)])
        })

        test("It should return 422 error (invalid role)",async()=>{
            const response = await request(app).get(routePath + '/users/roles/Student').set("Cookie",adminCookie)
            expect(response.status).toBe(422)
        })

        test("It should return 401 unauthorized error",async()=>{
            const response = await request(app).get(routePath + '/users/roles/Customer').set("Cookie",customerCookie)
            expect(response.status).toBe(401)
        })

     })

     describe("GET /users/:username",()=>{
        test("It should return the user and 200 status code (admin accessing other manager)",async()=>{
            const response = await request(app).get(routePath + '/users/manager').set("Cookie",adminCookie)
            expect(response.status).toBe(200)
            expect(response.body).toEqual(manager)
        })

        test("It should return the user and 200 status code (customer accessing own info)",async()=>{
            const response = await request(app).get(routePath + '/users/customer').set("Cookie",customerCookie)
            expect(response.status).toBe(200)
            expect(response.body).toEqual(customer)
        })

        test("It should return 401 error (unauthorized access)",async()=>{
            const response = await request(app).get(routePath + '/users/manager').set("Cookie",customerCookie)
            expect(response.status).toBe(401)
        })

        test("It should return 404 error (user does not exist)",async()=>{
            const response = await request(app).get(routePath + '/users/zurehma').set("Cookie",adminCookie)
            expect(response.status).toBe(404)
        })
     })

     describe("PATCH /users/:username",()=>{
        test("Update manager info and return 200 status code along with updated user",async()=>{
            const updateInfo = {name:"Zurehma",surname:"Rameez",address:"Torino",birthdate:"1999-08-18"};
            const response = await request(app).patch(routePath+'/users/manager').send({
                name:updateInfo.name,
                surname:updateInfo.surname,
                address:updateInfo.address,
                birthdate:updateInfo.birthdate
            }).set("Cookie",adminCookie)
            
            expect(response.status).toBe(200)
            expect(response.body).toEqual(new User("manager",updateInfo.name,updateInfo.surname,Role.MANAGER,updateInfo.address,updateInfo.birthdate))
        })

        test("It should return 404 (user does not exist)",async()=>{
            const updateInfo = {name:"Zurehma",surname:"Rameez",address:"Torino",birthdate:"1999-08-18"};
            const response = await request(app).patch(routePath+'/users/zurehma').send({
                name:updateInfo.name,
                surname:updateInfo.surname,
                address:updateInfo.address,
                birthdate:updateInfo.birthdate
            }).set("Cookie",adminCookie)
            
            expect(response.status).toBe(404)
        })

        test("It should return 401 unauthorized user (customer changing manager)",async()=>{
            const updateInfo = {name:"Zurehma",surname:"Rameez",address:"Torino",birthdate:"1999-08-18"};
            const response = await request(app).patch(routePath+'/users/manager').send({
                name:updateInfo.name,
                surname:updateInfo.surname,
                address:updateInfo.address,
                birthdate:updateInfo.birthdate
            }).set("Cookie",customerCookie)
            
            expect(response.status).toBe(401)
        })

        test("It should return 400 error (birthdate in future)",async()=>{
            const updateInfo = {name:"Zurehma",surname:"Rameez",address:"Torino",birthdate:"2025-08-18"};
            const response = await request(app).patch(routePath+'/users/manager').send({
                name:updateInfo.name,
                surname:updateInfo.surname,
                address:updateInfo.address,
                birthdate:updateInfo.birthdate
            }).set("Cookie",adminCookie)
            
            expect(response.status).toBe(400)
        })

        test("It should return 401 unauthorized (admin changing other admin)",async()=>{
            const admin2 = {
                username:"zurehmaR",
                name:"Zurehma",
                surname:"Rameez",
                role:"Admin",
                password:"12345"
            }
            expect(await postUsers(admin2)).toBe(200)
            const updateInfo = {name:"Zurehma",surname:"Rameez",address:"Torino",birthdate:"1999-08-18"};

            const response = await request(app).patch(routePath+'/users/zurehmaR').send({
                name:updateInfo.name,
                surname:updateInfo.surname,
                address:updateInfo.address,
                birthdate:updateInfo.birthdate
            }).set("Cookie",adminCookie)
            
            expect(response.status).toBe(401)
        })
     })

     describe("DELETE /users/:username",()=>{
        test("It should return 200 status code",async()=>{
            const response = await request(app).delete(routePath+'/users/JSmith').set("Cookie",adminCookie)
            expect(response.status).toBe(200)
        })

        test("It should return 404 error (user not found)",async()=>{
            const response = await request(app).delete(routePath+'/users/zurehma').set("Cookie",adminCookie)
            expect(response.status).toBe(404)
        })

        test("It should return 401 error (unauthorized access-customer deleting manager)",async()=>{
            const response = await request(app).delete(routePath+'/users/manager').set("Cookie",customerCookie)
            expect(response.status).toBe(401)
        })

        test("It should return 401 error (admin deleting other admin)",async()=>{
            const response = await request(app).delete(routePath+'/users/zurehmaR').set("Cookie",adminCookie)
            expect(response.status).toBe(401)
        })
     })

     describe("DELETE /users",()=>{
        test("Delete all non-admin users and return status code 200",async()=>{
            const response = await request(app).delete(routePath + "/users").set("Cookie", adminCookie)
            expect(response.status).toBe(200)
        })

        test("Return 401 status code (unauthorized user)",async()=>{
            const response = await request(app).delete(routePath + '/users').set("Cookie",managerCookie)
            expect(response.status).toBe
        })
     })
})

