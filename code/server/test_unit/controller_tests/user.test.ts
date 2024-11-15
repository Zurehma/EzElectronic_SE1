import { test, expect, jest } from "@jest/globals"
import UserController from "../../src/controllers/userController"
import UserDAO from "../../src/dao/userDAO"
import {User, Role} from "../../src/components/user"
import { UserAlreadyExistsError, UserIsAdminError, UserNotAdminError, UserNotFoundError } from "../../src/errors/userError"
import { DateError } from "../../src/utilities"

jest.mock("../../src/dao/userDAO")


describe("POST /users",()=>{
    test("Creating new user, expected to resolve with true",async()=>{
        const testUser = {username:"test", name:"test", surname:"test", password:"test", role: "Customer"}

        jest.spyOn(UserDAO.prototype,"createUser").mockResolvedValueOnce(true)
        
        const controller = new UserController()
        const response = await controller.createUser(testUser.username,testUser.name,testUser.surname,testUser.password,testUser.role)

        expect(UserDAO.prototype.createUser).toHaveBeenCalled()
        expect(UserDAO.prototype.createUser).toHaveBeenCalledWith(testUser.username,testUser.name,testUser.surname,testUser.password,testUser.role)
        expect(response).toBe(true)
    })

    test("Creating new user, username already exists, expecting to be rejected",async()=>{
        const testUser = {username:"test", name:"test", surname:"test", password:"test", role: "Customer"}

        jest.spyOn(UserDAO.prototype,"createUser").mockRejectedValueOnce(new UserAlreadyExistsError())
        
        const controller = new UserController()
        const response = await expect(controller.createUser(testUser.username,testUser.name,testUser.surname,testUser.password,testUser.role))
        .rejects.toThrow(new UserAlreadyExistsError())

        expect(UserDAO.prototype.createUser).toHaveBeenCalled()
        expect(UserDAO.prototype.createUser).toHaveBeenCalledWith(testUser.username,testUser.name,testUser.surname,testUser.password,testUser.role)
        
    })
})

describe("GET /users",()=>{
    test("Retrieving all users, expect to resolve to an array of users",async()=>{
        const testUser= new User("test","test","test",Role.CUSTOMER,null,null)

        jest.spyOn(UserDAO.prototype,"getAllUsers").mockResolvedValueOnce([testUser])

        const controller = new UserController()
        const response = await controller.getUsers()

        expect(UserDAO.prototype.getAllUsers).toHaveBeenCalled()
        expect(response).toEqual([testUser])

    })
})


describe("GET /users/roles/:role",()=>{
    test("Retrieve users by role, expect to receive an array of users",async()=>{
        const testUser= new User("test","test","test",Role.MANAGER,null,null)

        jest.spyOn(UserDAO.prototype,"getUsersByRole").mockResolvedValueOnce([testUser])

        const controller = new UserController()
        const response = await controller.getUsersByRole("Manager")

        expect(UserDAO.prototype.getUsersByRole).toHaveBeenCalled()
        expect(UserDAO.prototype.getUsersByRole).toHaveBeenCalledWith("Manager")
        expect(response).toEqual([testUser])

    })
})

describe("GET /users/:username",()=>{
    test("Retrieving user by username, expect to resolve to a user object",async()=>{
        const callingUser = new User("test","test","test",Role.ADMIN,null,null)
        const testUser= new User("test","test","test",Role.CUSTOMER,null,null)

        jest.spyOn(UserDAO.prototype,"getUserByUsername").mockResolvedValueOnce(testUser)

        const controller = new UserController()
        const response = await controller.getUserByUsername(callingUser,"test")

        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalled()
        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalledWith("test")
        expect(response).toEqual(testUser)
    })

    test("User (not admin) trying to access info of other user, expect to reject",async()=>{
        const callingUser = new User("test","test","test",Role.CUSTOMER,null,null)
        const testUser= new User("test","test","test",Role.CUSTOMER,null,null)

        jest.spyOn(UserDAO.prototype,"getUserByUsername").mockRejectedValueOnce(new UserNotAdminError())

        const controller = new UserController()
        const response = await expect(controller.getUserByUsername(callingUser,"test"))
        .rejects.toThrow(new UserNotAdminError())

        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalled()
        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalledWith("test")
    })

    test("Username does not exist, expect to reject",async()=>{
        const callingUser = new User("test","test","test",Role.ADMIN,null,null)
        const testUser= new User("test","test","test",Role.CUSTOMER,null,null)

        jest.spyOn(UserDAO.prototype,"getUserByUsername").mockRejectedValueOnce(new UserNotFoundError())

        const controller = new UserController()
        const response = await expect(controller.getUserByUsername(callingUser,"test"))
        .rejects.toThrow(new UserNotFoundError())

        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalled()
        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalledWith("test")
    })
})

describe("DELETE /users/:username",()=>{
    test("Admin deleting a user, expect to resolve to true",async()=>{
        const callingUser = new User("test","test","test",Role.ADMIN,null,null)
        const testUser= new User("test","test","test",Role.CUSTOMER,null,null)

        jest.spyOn(UserDAO.prototype,"deleteByUsername").mockResolvedValue(true)

        const controller = new UserController()
        const response = await controller.deleteUser(callingUser, "test")

        expect(UserDAO.prototype.deleteByUsername).toHaveBeenCalled()
        expect(UserDAO.prototype.deleteByUsername).toHaveBeenCalledWith(callingUser,"test")
        expect(response).toBe(true)
    })

    test("Non-admin user trying to delete someone else, expect to be rejected",async()=>{
        const callingUser = new User("test","test","test",Role.CUSTOMER,null,null)
        const testUser= new User("test","test","test",Role.CUSTOMER,null,null)

        jest.spyOn(UserDAO.prototype,"deleteByUsername").mockRejectedValueOnce(new UserNotAdminError())

        const controller = new UserController()
        const response = await expect(controller.deleteUser(callingUser, "test"))
        .rejects.toThrow(new UserNotAdminError())

        expect(UserDAO.prototype.deleteByUsername).toHaveBeenCalled()
        expect(UserDAO.prototype.deleteByUsername).toHaveBeenCalledWith(callingUser,"test")
    })

    test("Admin trying to delete other admin, expect to be rejected",async()=>{
        const callingUser = new User("test","test","test",Role.ADMIN,null,null)
        const testUser= new User("test","test","test",Role.ADMIN,null,null)

        jest.spyOn(UserDAO.prototype,"deleteByUsername").mockRejectedValueOnce(new UserIsAdminError())

        const controller = new UserController()
        const response = await expect(controller.deleteUser(callingUser, "test"))
        .rejects.toThrow(new UserIsAdminError())

        expect(UserDAO.prototype.deleteByUsername).toHaveBeenCalled()
        expect(UserDAO.prototype.deleteByUsername).toHaveBeenCalledWith(callingUser,"test")
    })

    test("Username not found, expect to be rejected",async()=>{
        const callingUser = new User("test","test","test",Role.ADMIN,null,null)
        const testUser= new User("test","test","test",Role.CUSTOMER,null,null)

        jest.spyOn(UserDAO.prototype,"deleteByUsername").mockRejectedValueOnce(new UserNotFoundError())

        const controller = new UserController()
        const response = await expect(controller.deleteUser(callingUser, "test"))
        .rejects.toThrow(new UserNotFoundError())

        expect(UserDAO.prototype.deleteByUsername).toHaveBeenCalled()
        expect(UserDAO.prototype.deleteByUsername).toHaveBeenCalledWith(callingUser,"test")
    })
})

describe("DELETE /users",()=>{
    test("Delete all users, expect to resolve to true",async()=>{
        jest.spyOn(UserDAO.prototype,"deleteAll").mockResolvedValueOnce(true)

        const controller = new UserController()
        const response = await controller.deleteAll()

        expect(UserDAO.prototype.deleteAll).toHaveBeenCalled()
        expect(response).toBe(true)
    })
})

describe("PATCH /users/:username",()=>{
    test("Update user information, expect to resolve to updated user",async()=>{
        const user = new User("test","test","test",Role.ADMIN,null,null)
        const updateInfo = {name:"testUser",surname:"testUser",address:"Torino",birthdate:"2012-12-12"}
        const updatedUser = new User("test","testUser","testUser",Role.ADMIN,"Torino","2012-12-12")

        jest.spyOn(UserDAO.prototype,"updateUser").mockResolvedValueOnce(updatedUser)

        const controller = new UserController()
        const response = await controller.updateUserInfo(user,updateInfo.name,updateInfo.surname,updateInfo.address,updateInfo.birthdate,"test")

        expect(UserDAO.prototype.updateUser).toHaveBeenCalled()
        expect(UserDAO.prototype.updateUser).toHaveBeenCalledWith(user,updateInfo.name,updateInfo.surname,updateInfo.address,updateInfo.birthdate,"test",false)
        expect(response).toEqual(updatedUser)
    })

    test("Non-admin trying to update someone else's info, expect to reject",async()=>{
        const user = new User("test","test","test",Role.CUSTOMER,null,null)
        const updateInfo = {name:"testUser",surname:"testUser",address:"Torino",birthdate:"2012-12-12"}

        jest.spyOn(UserDAO.prototype,"updateUser").mockRejectedValueOnce(new UserNotAdminError())

        const controller = new UserController()
        const response = await expect(controller.updateUserInfo(user,updateInfo.name,updateInfo.surname,updateInfo.address,updateInfo.birthdate,"test"))
        .rejects.toThrow(new UserNotAdminError())

        expect(UserDAO.prototype.updateUser).toHaveBeenCalled()
        expect(UserDAO.prototype.updateUser).toHaveBeenCalledWith(user,updateInfo.name,updateInfo.surname,updateInfo.address,updateInfo.birthdate,"test",false)

    })

    test("Birthdate entered to be after current date, expect to be rejected",async()=>{
        const user = new User("test","test","test",Role.CUSTOMER,null,null)
        const updateInfo = {name:"testUser",surname:"testUser",address:"Torino",birthdate:"2025-10-10"}

        jest.spyOn(UserDAO.prototype,"updateUser").mockRejectedValueOnce(new DateError())

        const controller = new UserController()
        const response = await expect(controller.updateUserInfo(user,updateInfo.name,updateInfo.surname,updateInfo.address,updateInfo.birthdate,"test"))
        .rejects.toThrow(new DateError())

        expect(UserDAO.prototype.updateUser).toHaveBeenCalled()
        expect(UserDAO.prototype.updateUser).toHaveBeenCalledWith(user,updateInfo.name,updateInfo.surname,updateInfo.address,updateInfo.birthdate,"test",false)
    })

    test("User does not exist, expect to be rejected",async()=>{
        const user = new User("test","test","test",Role.CUSTOMER,null,null)
        const updateInfo = {name:"testUser",surname:"testUser",address:"Torino",birthdate:"2012-12-12"}

        jest.spyOn(UserDAO.prototype,"updateUser").mockRejectedValueOnce(new UserNotFoundError())

        const controller = new UserController()
        const response = await expect(controller.updateUserInfo(user,updateInfo.name,updateInfo.surname,updateInfo.address,updateInfo.birthdate,"test"))
        .rejects.toThrow(new UserNotFoundError())

        expect(UserDAO.prototype.updateUser).toHaveBeenCalled()
        expect(UserDAO.prototype.updateUser).toHaveBeenCalledWith(user,updateInfo.name,updateInfo.surname,updateInfo.address,updateInfo.birthdate,"test",false)

    })

    test("Admin trying to update other admin, expect to be rejected",async()=>{
        const user = new User("test","test","test",Role.CUSTOMER,null,null)
        const updateInfo = {name:"testUser",surname:"testUser",address:"Torino",birthdate:"2012-12-12"}

        jest.spyOn(UserDAO.prototype,"updateUser").mockRejectedValueOnce(new UserIsAdminError())

        const controller = new UserController()
        const response = await expect(controller.updateUserInfo(user,updateInfo.name,updateInfo.surname,updateInfo.address,updateInfo.birthdate,"test"))
        .rejects.toThrow(new UserNotAdminError())

        expect(UserDAO.prototype.updateUser).toHaveBeenCalled()
        expect(UserDAO.prototype.updateUser).toHaveBeenCalledWith(user,updateInfo.name,updateInfo.surname,updateInfo.address,updateInfo.birthdate,"test",false)

    })
})