import { test, expect, jest, beforeAll, afterAll, describe, beforeEach } from "@jest/globals"
import request from 'supertest'
import { app } from "../../index"
import { Cart } from "../../src/components/cart"
import { User, Role } from "../../src/components/user"
import { cleanup } from "../../src/db/cleanup"
import { ProductNotFoundError } from "../../src/errors/productError"
import {ExistingReviewError, NoReviewProductError} from "../../src/errors/reviewError"
import ReviewController from "../../src/controllers/reviewController"
import { ProductReview } from "../../src/components/review"
import Authenticator from "../../src/routers/auth"
import { mock } from "node:test"
import { body } from "express-validator"


const routePath = '/ezelectronics';
const customer = { username: "customer", name: "customer", 
                   surname: "customer", password: "customer", role: "Customer" };
const admin = { username: "admin", name: "admin",  surname: "admin", password: "admin", role: "Admin"};

let customerCookie: string;
let adminCookie: string;
let managerCookie: string;

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
    await postUser(customer);
    await postUser(admin);
    customerCookie = await login(customer);
    adminCookie = await login(admin);
});

afterAll(async () => {
    await cleanup();
});

/*beforeEach(async () => {
    jest.clearAllMocks();
})*/
const user = new User(customer.username, customer.name, customer.surname, Role.CUSTOMER, null, null);

const review = new ProductReview("model1", user.username, 5, "date1", "comment1" );
const review2 = new ProductReview("model1", 'username2', 5, "date2", "comment2" );



describe('Review route unit-tests', () => {

    describe('GET /reviews/:model', () => {
   
        test('Should return a 200 status code and the reviews', async () => {
            const reviews : ProductReview[] = [review,review2];
            jest.spyOn(ReviewController.prototype, 'getProductReviews').mockResolvedValue(reviews);  //cambiato (Once)

            /*jest.spyOn(Authenticator.prototype, "isLoggedIn").mockImplementation((req, res, next) => {
                console.log('isLoggedIn middleware called') // Debugging line
                return next()
            }) */
                const mockIsLoggedIn = jest.spyOn(Authenticator.prototype, "isLoggedIn");
                mockIsLoggedIn.mockImplementation((req, res, next) => {
                    return next();
                });   

            const response = await request(app).get(routePath + '/reviews/model1').set('Cookie', customerCookie);
            expect(response.status).toBe(200);
            expect(response.body).toEqual(reviews);
            expect(ReviewController.prototype.getProductReviews).toHaveBeenCalledTimes(1);
            expect(ReviewController.prototype.getProductReviews).toHaveBeenCalledWith(review.model);
        });

    });

    describe('POST /reviews/:model', () => {
        const mockedAddReview = jest.spyOn(ReviewController.prototype, 'addReview');

        test('Expecting a 200 status code', async () => {

            const mockIsLoggedIn = jest.spyOn(Authenticator.prototype, "isLoggedIn");
            mockIsLoggedIn.mockImplementation((req, res, next) => {
                return next();
            });
            const mockIsCustomer = jest.spyOn(Authenticator.prototype, "isCustomer");
            mockIsCustomer.mockImplementation((req, res, next) => {
                return next();
            });

            jest.mock('express-validator', () => ({
                param: jest.fn().mockImplementation(() => ({
                    isString: () => ({ isLength: () => ({}) }),
                    isIn: () => ({ isLength: () => ({}) }),
                })),
            }));

            jest.mock('express-validator', () => ({
                body: jest.fn().mockImplementation(() => ({
                    isInt: () => ({}) })),
            }));   //?
            
            mockedAddReview.mockResolvedValueOnce();
            const reqBody = {score: 5, comment: "A very cool smartphone!"};
            const response = await request(app).post(routePath + '/reviews/model1').send(reqBody).set("Cookie", customerCookie);
            expect(response.status).toBe(200);
            expect(ReviewController.prototype.addReview).toHaveBeenCalledTimes(1);
            expect(ReviewController.prototype.addReview).toHaveBeenCalledWith('model1', user, reqBody.score, reqBody.comment);
            mockedAddReview.mockClear() //clear information about mocking calls
        });
        

        test('Expecting a 404 status code', async () => {
            mockedAddReview.mockRejectedValueOnce(new ProductNotFoundError());
            const reqBody = {score: 5, comment: "A very cool smartphone!"};
            const response = await request(app).post(routePath + '/reviews/model1').send(reqBody).set("Cookie", customerCookie);
            expect(response.status).toBe(404);
            expect(ReviewController.prototype.addReview).toHaveBeenCalledTimes(1);
            expect(ReviewController.prototype.addReview).toHaveBeenCalledWith('model1', user, reqBody.score, reqBody.comment);
            mockedAddReview.mockClear()
        });

        test('Expecting a 409 status code', async () => {
            jest.spyOn(ReviewController.prototype, 'addReview').mockRejectedValueOnce(new ExistingReviewError());
            const reqBody = {score: 5, comment: "A very cool smartphone!"};
            const response = await request(app).post(routePath + '/reviews/model1').send(reqBody).set("Cookie", customerCookie);
            expect(response.status).toBe(409);
            expect(ReviewController.prototype.addReview).toHaveBeenCalledTimes(1);
            expect(ReviewController.prototype.addReview).toHaveBeenCalledWith('model1', user, reqBody.score, reqBody.comment);
            mockedAddReview.mockClear()
        });


    /*    test('Should return a 404 status code if score is not an integer between 1 and 5', async () => {
            const mockIsLoggedIn = jest.spyOn(Authenticator.prototype, "isLoggedIn").mockImplementation((req, res, next) => next());
            const mockIsCustomer = jest.spyOn(Authenticator.prototype, "isCustomer").mockImplementation((req, res, next) => next());
    
            let reqBody = { score: "not-an-integer", comment: "A valid comment" };
            let response = await request(app).post('/reviews/model1').send(reqBody).set("Cookie", customerCookie);
            expect(response.status).toBe(404);
    
            let reqBody2 = { score : 6, comment: "A valid comment" };
            response = await request(app).post('/reviews/model1').send(reqBody2).set("Cookie", customerCookie);
            expect(response.status).toBe(404);
        });
    
        test('Should return a 404 status code if comment is not a non-empty string', async () => {
            const mockIsLoggedIn = jest.spyOn(Authenticator.prototype, "isLoggedIn").mockImplementation((req, res, next) => next());
            const mockIsCustomer = jest.spyOn(Authenticator.prototype, "isCustomer").mockImplementation((req, res, next) => next());
    
            let reqBody = { score: 5, comment: null };
            let response = await request(app).post('/reviews/model1').send(reqBody).set("Cookie", customerCookie);
            expect(response.status).toBe(404);
    
            let reqBody2 = { score: 5, comment: "" };
            response = await request(app).post('/reviews/model1').send(reqBody2).set("Cookie", customerCookie);
            expect(response.status).toBe(404);
        });

     */

        
    });

    describe("Delete Review made by a user for one product", () => {
        const mockedDeleteReview = jest.spyOn(ReviewController.prototype, 'deleteReview');

        test("Expecting 200 success code ", async () => {

            const mockIsLoggedIn = jest.spyOn(Authenticator.prototype, "isLoggedIn");
            mockIsLoggedIn.mockImplementation((req, res, next) => {
                return next();
            });
            const mockIsCustomer = jest.spyOn(Authenticator.prototype, "isCustomer");
            mockIsCustomer.mockImplementation((req, res, next) => {
                return next();
            });
            mockedDeleteReview.mockResolvedValueOnce();
            
            await request(app).delete(routePath + "/reviews/model1").set("Cookie", customerCookie).expect(200);
            expect(ReviewController.prototype.deleteReview).toHaveBeenCalledTimes(1);
            expect(ReviewController.prototype.deleteReview).toHaveBeenCalledWith('model1', user);
            mockedDeleteReview.mockClear()
            
        
        });

        test('Expecting a 404 status code, product not found', async () => {

            mockedDeleteReview.mockRejectedValueOnce(new ProductNotFoundError());
            await request(app).delete(routePath + '/reviews/model1').set("Cookie", customerCookie).expect(404);
            expect(ReviewController.prototype.deleteReview).toHaveBeenCalledTimes(1);
            expect(ReviewController.prototype.deleteReview).toHaveBeenCalledWith('model1', user);
            mockedDeleteReview.mockClear()

        });

        test('Expecting a 404 status code, user did not reviewed the product', async () => {

            mockedDeleteReview.mockRejectedValueOnce(new NoReviewProductError());
            await request(app).delete(routePath + '/reviews/model2').set("Cookie", customerCookie).expect(404);
            expect(ReviewController.prototype.deleteReview).toHaveBeenCalledTimes(1);
            expect(ReviewController.prototype.deleteReview).toHaveBeenCalledWith('model2', user);
            mockedDeleteReview.mockClear()

        });

        
    });

    describe("Delete Reviews for a product", () => {
        const mockedDeleteProductReviews = jest.spyOn(ReviewController.prototype, 'deleteReviewsForProduct');

        test("Expecting 200 success code ", async () => {

            const mockIsLoggedIn = jest.spyOn(Authenticator.prototype, "isLoggedIn");
            mockIsLoggedIn.mockImplementation((req, res, next) => {
                return next();
            });
            const mockIsAdminOrManager = jest.spyOn(Authenticator.prototype, "isAdminOrManager");
            mockIsAdminOrManager.mockImplementation((req, res, next) => {
                return next();
            });
            mockedDeleteProductReviews.mockResolvedValueOnce();
            //const adm = Authenticator.prototype.isAdmin;
            //const man = Authenticator.prototype.isManager;
            //const currentRole = (adm ) ? ('adminCookie') : ('managerCookie'));
            await request(app).delete(routePath + "/reviews/model1/all").set("Cookie",adminCookie).expect(200);
            expect(ReviewController.prototype.deleteReviewsForProduct).toHaveBeenCalledTimes(1);
            expect(ReviewController.prototype.deleteReviewsForProduct).toHaveBeenCalledWith('model1');
            mockedDeleteProductReviews.mockClear()
            
        
        });

        test('Expecting a 404 status code, product not found', async () => {

            mockedDeleteProductReviews.mockRejectedValueOnce(new ProductNotFoundError());
            await request(app).delete(routePath + '/reviews/model1/all').set("Cookie", adminCookie).expect(404);
            expect(ReviewController.prototype.deleteReviewsForProduct).toHaveBeenCalledTimes(1);
            expect(ReviewController.prototype.deleteReviewsForProduct).toHaveBeenCalledWith('model1');
            mockedDeleteProductReviews.mockClear()

        });
        
    });


    describe("Delete all Reviews", () => {
        const mockedDeleteAllReviews = jest.spyOn(ReviewController.prototype, 'deleteAllReviews');

        test("Expecting 200 success code ", async () => {

            const mockIsLoggedIn = jest.spyOn(Authenticator.prototype, "isLoggedIn");
            mockIsLoggedIn.mockImplementation((req, res, next) => {
                return next();
            });
            const mockIsAdminOrManager = jest.spyOn(Authenticator.prototype, "isAdminOrManager");
            mockIsAdminOrManager.mockImplementation((req, res, next) => {
                return next();
            });
            mockedDeleteAllReviews.mockResolvedValueOnce();
            //const adm = Authenticator.prototype.isAdmin;
            //const man = Authenticator.prototype.isManager;
            //const currentRole = (adm ) ? ('adminCookie') : ('managerCookie'));
            await request(app).delete(routePath + "/reviews/").set("Cookie",adminCookie).expect(200);
            expect(ReviewController.prototype.deleteAllReviews).toHaveBeenCalledTimes(1);
            mockedDeleteAllReviews.mockClear()
            
        
        });
        
    });


});
