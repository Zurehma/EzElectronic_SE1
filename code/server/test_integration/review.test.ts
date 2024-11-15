import { jest, describe, test, it, expect, beforeEach, beforeAll, afterEach, afterAll } from "@jest/globals";
import request from 'supertest';
import db from "../src/db/db"
import { app } from "../index";
import dayjs from "dayjs";
import { cleanup, cleanupNoUsers} from "../src/db/cleanup";



const routePath = "/ezelectronics";
const customer = { username: "customer", name: "customer", surname: "customer", password: "customer", role: "Customer" };
const admin = { username: "admin", name: "admin", surname: "admin", password: "admin", role: "Admin" };
const manager = { username: "manager", name: "manager", surname: "manager", password: "manager", role: "Manager" };
let customerCookie: string;
let adminCookie: string;
let managerCookie: string;

//Helper function that creates a new user in the database.
const postUser = async (userInfo: any) => {
    await request(app)
    .post(`${routePath}/users`)
    .send(userInfo)
    .expect(200);
};

//Helper function that insert a new product in the database.
const postProduct = async (product: any) => {
    const res = await request(app)
        .post(routePath + '/products')
        .send(product)
        .set('Cookie', adminCookie)
    return res.status;
}

//Helper function that logs in a user and returns the cookie
const login = async (userInfo: any) => {
    return new Promise<string>((resolve, reject) => {
        request(app)
        .post(`${routePath}/sessions`)
        .send(userInfo)
        .expect(200)
        .end((err, res) => {
            if (err) reject(err);
            resolve(res.header["set-cookie"][0]);
        });
    });
};

const postReview = async (model: string, review: any) => {
    const res = await request(app)
        .post(routePath + `/reviews/${model}`)
        .send(review)
        .set('Cookie', customerCookie)
    return res.status;
}

const getReviews = async (model: string) => {
    const res = await request(app)
        .get(routePath + `/reviews/${model}`)
        .set('Cookie', adminCookie)
        .expect(200)
    return res.body;
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


describe("Review Integration Tests", () => {

    const mockProduct = {
        model: 'Iphone 13',
        category: 'Smartphone',
        quantity: 2,
        details: '',
        sellingPrice: 1000.0,
    }

    const today = dayjs().format('YYYY-MM-DD');

    const mockReview = {
        model: 'Iphone 13',
        user: customer.username,
        score: 5,
        date: today,
        comment: 'Amazing product'
    };

    describe('POST /reviews/:model', () => {

        test('Adding a review: Expecting a 200 success code and the review to be added', async () => {
            expect(await postProduct(mockProduct)).toBe(200);

            expect(await postReview(mockProduct.model, {score: 5, comment: 'Amazing product'})).toBe(200);
            const reviews = await getReviews(mockProduct.model);
            expect(reviews).toHaveLength(1);
            console.log(reviews);
            expect(reviews[0]).toMatchObject(mockReview);
        });

        test('Admin trying to add a review : expecting a 401 status code', async () => {
            const res = await request(app)
                .post(routePath + `/reviews/${mockProduct.model}`)
                .set('Cookie', adminCookie)
                .send(mockProduct.model);
            expect(res.status).toBe(401);
        });

        test('Manager trying to add a review): expecting a 401 status code', async () => {
            const res = await request(app)
                .post(routePath + `/reviews/${mockProduct.model}`)
                .set('Cookie', managerCookie)
                .send(mockProduct.model);
            expect(res.status).toBe(401);
        });

        test('Trying to add a review to a product already reviewed: expecting a 409 status code', async () => {
            expect(await postReview(mockProduct.model, {score: 5, comment: 'Amazing product'})).toBe(409);
        });

        test('Trying to add a review to a non-existing product: Expecting a 404 error code', async () => {
            const res = await request(app)
                .post(routePath + `/reviews/NonExistingModel`)
                .send(mockReview)
                .set('Cookie', customerCookie)
                .expect(404);
        }); 

        test('Trying to add a review with invalid rating: Expecting a 422 error code', async () => {
            const invalidReview = { model: mockProduct.model, score: 6, comment: 'Amazing product'};
            const res = await request(app)
                .post(routePath + `/reviews/${mockProduct.model}`)
                .send(invalidReview)
                .set('Cookie', customerCookie)
                .expect(422);
        });
        

        test('Trying to add a review with empty comment: Expecting a 422 error code', async () => {
            const invalidReview = { model: mockProduct.model, score: 6, comment: ''};
            const res = await request(app)
                .post(routePath + `/reviews/${mockProduct.model}`)
                .send(invalidReview)
                .set('Cookie', customerCookie)
                .expect(422);
        });
    });

    /**
     * GET /
     */


    describe('GET /reviews/:model', () => { 
      
        test('Getting reviews of a product: expecting a 200 status code', async () => {
            const res = await request(app)
                .get(routePath + `/reviews/${mockProduct.model}`)
                .set('Cookie', customerCookie);
            expect(res.status).toBe(200);
            expect(res.body.length).toBeGreaterThan(0);
        });

        test('Getting reviews of a product (unlogged user) : expecting a 401 status code', async () => {
            const res = await request(app)
                .get(routePath + `/reviews/${mockProduct.model}`);
            expect(res.status).toBe(401);
        });
        

        test('Getting reviews of a non-existing product: expecting a 404 status code', async () => {
            const res = await request(app)
                .get(routePath + `/reviews/non-existing-model`)
                .set('Cookie', customerCookie);
            expect(res.status).toBe(404);
        });


        test('Database error when getting reviews: expecting a 503 status code', async () => {
            jest.spyOn(db, 'all').mockImplementation((sql, params, callback) => {
                callback(new Error('Database error'), null);
                return db;
            });
        
            const res = await request(app)
                .get(`${routePath}/reviews/${mockProduct.model}`)
                .set('Cookie', customerCookie);
        
            expect(res.status).toBe(503);   //is ok 503 or 500?
        });

    });

    describe('DELETE /reviews/:model', () => {

        beforeAll(async () => {
           await cleanupNoUsers();
           expect(await postProduct(mockProduct)).toBe(200);
           expect(await postReview(mockProduct.model, {score: 5, comment: 'Amazing product'})).toBe(200);
        });
    
        test('Deleting a review: expecting a 200 status code', async () => {
            const res = await request(app)
                .delete(routePath + `/reviews/${mockProduct.model}`)
                .set('Cookie', customerCookie)
                .send(mockProduct.model);
            expect(res.status).toBe(200);
        });

        test('Deleting a review(admin): expecting a 401 status code', async () => {
            const res = await request(app)
                .delete(routePath + `/reviews/${mockProduct.model}`)
                .set('Cookie', adminCookie)
                .send(mockProduct.model);
            expect(res.status).toBe(401);
        });

        test('Deleting a review(manager): expecting a 401 status code', async () => {
            const res = await request(app)
                .delete(routePath + `/reviews/${mockProduct.model}`)
                .set('Cookie', managerCookie)
                .send(mockProduct.model);
            expect(res.status).toBe(401);
        });
    
      test('Deleting a non-existing review: expecting a 404 status code', async () => {
            const res = await request(app)
                .delete(routePath + `/reviews/${mockProduct.model}`)          
                .set('Cookie', customerCookie)
                .send({ model: 'non-existing-model' });
            expect(res.status).toBe(404);
        });

    
        /*test('Database error when deleting a review: expecting a 500 status code', async () => {
            jest.spyOn(db, 'all').mockImplementation((sql, params, callback) => {
                callback(new Error('Database error'), null);
                return db;
            });
            const res = await request(app)
                .delete(routePath + `/reviews/${mockProduct.model}`)
                .set('Cookie', customerCookie)
                .send( mockProduct.model);
            expect(res.status).toBe(500);
        });*/
    })




    describe('DELETE /reviews/:model/all', () => {

    test('Deleting all reviews for a product(admin): expecting a 200 status code', async () => {
        const res = await request(app)
            .delete(routePath + `/reviews/${mockProduct.model}/all`)
            .set('Cookie', adminCookie);
        expect(res.status).toBe(200);
    });

    test('Deleting all reviews for a product(manager): expecting a 200 status code', async () => {
        const res = await request(app)
            .delete(routePath + `/reviews/${mockProduct.model}/all`)
            .set('Cookie', managerCookie);
        expect(res.status).toBe(200);
    });

    test('Deleting all reviews for a product(customer): expecting a 401 status code', async () => {
        const res = await request(app)
            .delete(routePath + `/reviews/${mockProduct.model}/all`)
            .set('Cookie', customerCookie);
        expect(res.status).toBe(401);
    });
    
    test('Deleting all reviews for a non-existing product: expecting a 404 status code', async () => {
        const res = await request(app)
            .delete(routePath + `/reviews/non-existing-model/all`)
            .set('Cookie', adminCookie);
        expect(res.status).toBe(404);
    });
});


describe('DELETE /reviews/', () => {

    test('Deleting all reviews: expecting a 200 status code', async () => {
        const res = await request(app)
            .delete(routePath + `/reviews`)
            .set('Cookie', adminCookie);
        expect(res.status).toBe(200);
    });

    test('Deleting all reviews for a product(manager): expecting a 200 status code', async () => {
        const res = await request(app)
            .delete(routePath + `/reviews/${mockProduct.model}/all`)
            .set('Cookie', managerCookie);
        expect(res.status).toBe(200);
    });

    test('Deleting all reviews for a product(customer): expecting a 401 status code', async () => {
        const res = await request(app)
            .delete(routePath + `/reviews/${mockProduct.model}/all`)
            .set('Cookie', customerCookie);
        expect(res.status).toBe(401);
    });

    /*test('Database error when deleting all reviews: expecting a 500 status code', async () => {
        jest.spyOn(db, 'run').mockImplementation((sql, params, callback) => {
            callback(new Error('Database error'), null);
        });
        const res = await request(app)
            .delete(`${routePath}/reviews`)
            .set('Cookie', adminCookie);
        expect(res.status).toBe(500);
    });*/
});


});
