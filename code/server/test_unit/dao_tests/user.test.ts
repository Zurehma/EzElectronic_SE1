import { describe, test, expect, beforeAll, afterAll, jest } from "@jest/globals"
import UserController from "../../src/controllers/userController"
import UserDAO from "../../src/dao/userDAO"
import crypto from "crypto"
import db from "../../src/db/db"
import { Database } from "sqlite3"
import { User, Role } from "../../src/components/user"
import { UserIsAdminError, UserNotAdminError, UserNotFoundError } from "../../src/errors/userError"

jest.mock("crypto")
jest.mock("../../src/db/db")

beforeEach(() => {
    jest.clearAllMocks();
})


//Example of unit test for the createUser method
//It mocks the database run method to simulate a successful insertion and the crypto randomBytes and scrypt methods to simulate the hashing of the password
//It then calls the createUser method and expects it to resolve true

test("It should resolve true", async () => {
    const userDAO = new UserDAO()
    const mockDBRun = jest.spyOn(db, "run").mockImplementationOnce((sql, params, callback) => {
        callback(null);
        return db;
    });
    const mockRandomBytes = jest.spyOn(crypto, "randomBytes").mockImplementation((size) => {
        return (Buffer.from("salt"))
    })
    const mockScrypt = jest.spyOn(crypto, "scrypt").mockImplementation(async (password, salt, keylen) => {
        return Buffer.from("hashedPassword")
    })
    const result = await userDAO.createUser("username", "name", "surname", "password", "role")
    expect(result).toBe(true);
    mockRandomBytes.mockRestore();
    mockDBRun.mockRestore();
    mockScrypt.mockRestore();
    jest.unmock('../../src/db/db');
})


describe("User DAO Unit-tests",()=>{
    const userDAO = new UserDAO()
    const mockDBGet = jest.spyOn(db, 'get');
    const mockDBRun = jest.spyOn(db, 'run');
    const mockDBAll = jest.spyOn(db, 'all');
    const testCustomer = new User("testCustomer","name","surname",Role.CUSTOMER,null,null)
    const testAdmin = new User("testAdmin","name","surname",Role.ADMIN,null,null)

    test("createUser: should resolve to true",async()=>{
        mockDBRun.mockImplementationOnce((sql,params,callback)=>{
            callback(null)
            return db
        })

        const mockRandomBytes = jest.spyOn(crypto, "randomBytes").mockImplementation((size) => {
            return (Buffer.from("salt"))
        })
        const mockScrypt = jest.spyOn(crypto, "scrypt").mockImplementation(async (password, salt, keylen) => {
            return Buffer.from("hashedPassword")
        })
        const result = await userDAO.createUser("username", "name", "surname", "password", "role")
        expect(result).toBe(true);
        mockRandomBytes.mockRestore();
        mockDBRun.mockRestore();
        mockScrypt.mockRestore();
    })

    test("getUserByUsername: should resolve to a user object",async()=>{
        const row = {username:"test1",name:"test1",surname:"test1",role:Role.CUSTOMER,address:null,birthdate:null}
        mockDBGet.mockImplementationOnce((sql,params,callback)=>{
            callback(null,row)
            return db
        })

        const response = await userDAO.getUserByUsername("test1")
        expect(mockDBGet).toHaveBeenCalled()
        expect(response).toEqual(new User(row.username,row.name,row.surname,row.role,row.address,row.birthdate))

    })

    test("getUserByUsername: should reject with 404 user not found",async()=>{
        mockDBGet.mockImplementationOnce((sql,params,callback)=>{
            callback(null,null)
            return db
        })

        await expect(userDAO.getUserByUsername("test")).rejects.toThrow(new UserNotFoundError())
        expect(mockDBGet).toHaveBeenCalled()

    })

    test("getUserByUsername: should reject with 401 user not authorized",async()=>{
        mockDBGet.mockImplementationOnce((sql,params,callback)=>{
            callback(null,null)
            return db
        })

        await expect(userDAO.getUserByUsername("test")).rejects.toThrow(new UserNotAdminError())
        expect(mockDBGet).toHaveBeenCalled()

    })

    test("getAllUsers: should resolve to an array of users",async()=>{
        const rows = [
            {username:"test1",name:"test1",surname:"test1",role:Role.CUSTOMER,address:null,birthdate:null},
            {username:"test2",name:"test2",surname:"test2",role:Role.CUSTOMER,address:null,birthdate:null}
        ]
        mockDBAll.mockImplementationOnce((sql, callback) => {
            callback(null, rows);
            return db;
        });

        const response = await userDAO.getAllUsers()
        expect(mockDBAll).toHaveBeenCalled()
        for(let i=0;i<rows.length;i++){
            expect(response).toContainEqual(new User(rows[i].username,rows[i].name,rows[i].surname,rows[i].role,rows[i].address,rows[i].birthdate))
        }
    })

    test("getUsersByRole: should resolve to an array of users",async()=>{
        const rows = [
            {username:"test1",name:"test1",surname:"test1",role:Role.CUSTOMER,address:null,birthdate:null},
            {username:"test2",name:"test2",surname:"test2",role:Role.CUSTOMER,address:null,birthdate:null}
        ]

        mockDBAll.mockImplementationOnce((sql,params,callback)=>{
            callback(null,rows)
            return db
        })

        const response = await userDAO.getUsersByRole("Customer")
        expect(mockDBAll).toHaveBeenCalled()
        for(let i=0;i<rows.length;i++){
            expect(response).toContainEqual(new User(rows[i].username,rows[i].name,rows[i].surname,rows[i].role,rows[i].address,rows[i].birthdate))
        }
    })

    test("deleteAll: should resolve to true",async()=>{
        mockDBRun.mockImplementation((sql,callback)=>{
            callback(null)
            return db
        })

        const response = await userDAO.deleteAll()
        expect(mockDBRun).toHaveBeenCalled()
        expect(response).toBe(true)
    })

    test("deleteByUsername: should resolve to true",async()=>{
        const row = {username:"test1",name:"test1",surname:"test1",role:Role.CUSTOMER,address:null,birthdate:null}

        mockDBGet.mockImplementationOnce((sql,params,callback)=>{
            callback(null,row)
            return db
        })

        mockDBRun.mockImplementationOnce((sql,params,callback)=>{
            callback(null)
            return db
        })

        const response = await userDAO.deleteByUsername(testAdmin,"test1")
        expect(mockDBGet).toHaveBeenCalled()
        expect(mockDBRun).toHaveBeenCalled()
        expect(response).toBe(true)
        
    })

    test("deleteByUsername: should reject with 404 user not found",async()=>{

        mockDBGet.mockImplementationOnce((sql,params,callback)=>{
            callback(null,null)
            return db
        })

        await expect(userDAO.deleteByUsername(testAdmin,"test1")).rejects.toThrow(new UserNotFoundError())
        expect(mockDBGet).toHaveBeenCalled()
    })

    test("deleteByUsername: should reject with 401 user not authorized",async()=>{

        mockDBGet.mockImplementationOnce((sql,params,callback)=>{
            callback(null,null)
            return db
        })

        await expect(userDAO.deleteByUsername(testAdmin,"test1")).rejects.toThrow(new UserNotAdminError())
        expect(mockDBGet).toHaveBeenCalled()
    })

    test("deleteByUsername: should reject with 401 trying to delete admin",async()=>{

        mockDBGet.mockImplementationOnce((sql,params,callback)=>{
            callback(null,null)
            return db
        })

        await expect(userDAO.deleteByUsername(testAdmin,"test1")).rejects.toThrow(new UserIsAdminError())
        expect(mockDBGet).toHaveBeenCalled()
    })


    test("updateUser: should resolve to updated user object",async()=>{
        const row = {username:"test1",name:"test1",surname:"test1",role:Role.CUSTOMER,address:null,birthdate:null}
        const updateInfo = {name:"test1",surname:"test2",address:"Torino",birthdate:"2012-12-12"}
        const rowUpdated = {username:"test1",name:"test1",surname:"test1",role:Role.CUSTOMER,address:"Torino",birthdate:"2012-12-12"}

        mockDBGet.mockImplementationOnce((sql,params,callback)=>{
            callback(null,row)
            return db
        })

        mockDBRun.mockImplementationOnce((sql,params,callback)=>{
            callback.call({changes:1},null)
            return db
        })

        mockDBGet.mockImplementationOnce((sql,params,callback)=>{
            callback(null,rowUpdated)
            return db
        })

        const response = await userDAO.updateUser(testAdmin,updateInfo.name,updateInfo.surname,updateInfo.address,updateInfo.birthdate,"test1",false)
        expect(mockDBGet).toHaveBeenCalledTimes(2)
        expect(mockDBRun).toHaveBeenCalled()
        expect(response).toEqual(new User(rowUpdated.username,rowUpdated.name,rowUpdated.surname,rowUpdated.role,rowUpdated.address,rowUpdated.birthdate))
    })

})
