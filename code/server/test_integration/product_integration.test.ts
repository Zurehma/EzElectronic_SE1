import { test, expect, describe, beforeAll, afterEach, beforeEach } from "@jest/globals";
import request from 'supertest';
import { app } from "../index";
import { cleanup, cleanupNoUsers } from "../src/db/cleanup";
import { Product } from "../src/components/product";

const routePath = '/ezelectronics';
const customer = { username: "customer", name: "customer", surname: "customer", password: "customer", role: "Customer" };
const admin = { username: "admin", name: "admin", surname: "admin", password: "admin", role: "Admin" };
let adminCookie: string;

const postUser = async (userInfo: any) => {
    await request(app)
        .post(`${routePath}/users`)
        .send(userInfo)
        .expect(200);
};

const login = async (userInfo: any) => {
    return new Promise<string>((resolve, reject) => {
        request(app)
            .post(`${routePath}/sessions`)
            .send(userInfo)
            .expect(200)
            .end((err, res) => {
                if (err) {
                    reject(err);
                }
                resolve(res.header["set-cookie"][0]);
            });
    });
};

const postProduct = async (product: any) => {
    const res = await request(app)
        .post(routePath + '/products')
        .send(product)
        .set('Cookie', adminCookie);
    return res.status;
};

const getProducts = async () => {
    const res = await request(app)
        .get(routePath + '/products')
        .set('Cookie', adminCookie)
        .expect(200);
    return res.body;
};

const sellProducts = async (model: string, quantity: number) => {
    const res = await request(app)
        .patch(routePath + `/products/${model}`)
        .send({ quantity: -quantity }) 
        .set('Cookie', adminCookie);
    return res.status;
};

beforeAll(async () => {
    await cleanup();
    await postUser(admin);
    await postUser(customer);
    adminCookie = await login(admin);
});

beforeEach(async () => {
    await cleanupNoUsers();
});

describe('Product APIs integration-tests', () => {
    const mockProduct = {
        model: 'Iphone 13',
        category: 'Smartphone',
        quantity: 2,
        details: '',
        sellingPrice: 1000.0,
        arrivalDate: '2024-04-07'
    };

    describe('POST /products', () => {
        test('Register a new product: Expecting a 200 status code', async () => {
            const res = await request(app)
                .post(routePath + '/products')
                .send(mockProduct)
                .set('Cookie', adminCookie);
            expect(res.status).toBe(200);
        });

        test('Register a product that already exists: Expecting a 409 status code', async () => {
            await postProduct(mockProduct);
            const res = await request(app)
                .post(routePath + '/products')
                .send(mockProduct)
                .set('Cookie', adminCookie);
            expect(res.status).toBe(409);
        });

        test('Register a product with an arrival date after the current date: Expecting a 400 status code', async () => {
            const invalidProduct = { ...mockProduct, arrivalDate: '2025-01-01' };
            const res = await request(app)
                .post(routePath + '/products')
                .send(invalidProduct)
                .set('Cookie', adminCookie);
            expect(res.status).toBe(400);
        });
    });

    describe('PATCH /products/:model', () => {
        test('Increase product quantity: Expecting a 200 status code and updated quantity', async () => {
            await postProduct(mockProduct);
            const res = await request(app)
                .patch(routePath + '/products/' + mockProduct.model)
                .send({ quantity: 5, changeDate: "2024-06-01" })
                .set('Cookie', adminCookie);
            expect(res.status).toBe(200);
            const product = (await getProducts()).find((p: Product) => p.model === mockProduct.model);
            expect(product.quantity).toBe(mockProduct.quantity + 5);
        });

        test('Increase product quantity with an invalid change date: Expecting a 400 status code', async () => {
            await postProduct(mockProduct);
            const res = await request(app)
                .patch(routePath + '/products/' + mockProduct.model)
                .send({ quantity: 5, changeDate: "2025-01-01" }) // Future date
                .set('Cookie', adminCookie);
            expect(res.status).toBe(400);
        });

        test('Increase product quantity with a change date before the arrival date: Expecting a 400 status code', async () => {
            await postProduct(mockProduct);
            const res = await request(app)
                .patch(routePath + '/products/' + mockProduct.model)
                .send({ quantity: 5, changeDate: "2020-01-01" }) // Date before arrival date
                .set('Cookie', adminCookie);
            expect(res.status).toBe(400);
        });
    });

    describe('PATCH /products/:model/sell', () => {
        test('Sell a product: Expecting a 200 status code and updated quantity', async () => {
            await postProduct(mockProduct);
            await sellProducts(mockProduct.model,2)
            const res = await request(app)
                .patch(routePath + '/products/' + mockProduct.model + '/sell')
                .send({ quantity: 1 })
                .set('Cookie', adminCookie);
            expect(res.status).toBe(200);
            const product = (await getProducts()).find((p: Product) => p.model === mockProduct.model);
            expect(product.quantity).toBe(mockProduct.quantity - 1);
        });

        test('Sell a product with insufficient stock: Expecting a 409 status code', async () => {
            await postProduct(mockProduct);
            const res = await request(app)
                .patch(routePath + '/products/' + mockProduct.model + '/sell')
                .send({ quantity: 3 })
                .set('Cookie', adminCookie);
            expect(res.status).toBe(409);
        });

        test('Sell a sold-out product: Expecting a 409 status code', async () => {
            await postProduct(mockProduct);
            await sellProducts(mockProduct.model, 2); 
            const res = await request(app)
                .patch(routePath + '/products/' + mockProduct.model + '/sell')
                .send({ quantity: 10 })
                .set('Cookie', adminCookie);
            expect(res.status).toBe(409);
        });

        test('Sell a product with a selling date after the current date: Expecting a 400 status code', async () => {
            await postProduct(mockProduct);
            const res = await request(app)
                .patch(routePath + '/products/' + mockProduct.model + '/sell')
                .send({ quantity: 1, sellingDate: '2025-01-01' }) // Future date
                .set('Cookie', adminCookie);
            expect(res.status).toBe(400);
        });

        test('Sell a product with a selling date before the arrival date: Expecting a 400 status code', async () => {
            await postProduct(mockProduct);
            const res = await request(app)
                .patch(routePath + '/products/' + mockProduct.model + '/sell')
                .send({ quantity: 1, sellingDate: '2020-01-01' }) // Date before arrival date
                .set('Cookie', adminCookie);
            expect(res.status).toBe(400);
        });
    });

    describe('GET /products', () => {
        test('Retrieve all products: Expecting a 200 status code and an array of products', async () => {
            await postProduct(mockProduct);
            const res = await request(app)
                .get(routePath + '/products')
                .set('Cookie', adminCookie)
                .expect(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].model).toBe(mockProduct.model);
        });

        test('Retrieve products with invalid parameters: Expecting a 422 status code', async () => {
            
            const res = await request(app)
                .get(routePath + '/products')
                .query({ grouping: 'category', model: '' }) // Invalid parameters
                .set('Cookie', adminCookie);
            expect(res.status).toBe(422);
        });
    });

    describe('DELETE /products/:model', () => {
        test('Delete a product: Expecting a 200 status code', async () => {
            await postProduct(mockProduct);
            const res = await request(app)
                .delete(routePath + '/products/' + mockProduct.model)
                .set('Cookie', adminCookie)
                .expect(200);
            const products = await getProducts();
            expect(products).toHaveLength(0);
        });

        test('Delete a non-existent product: Expecting a 404 status code', async () => {
            const res = await request(app)
                .delete(routePath + '/products/nonexistent-model')
                .set('Cookie', adminCookie);
            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /products', () => {
        test('Delete all products: Expecting a 200 status code', async () => {
            await postProduct(mockProduct);
            const res = await request(app)
                .delete(routePath + '/products')
                .set('Cookie', adminCookie)
                .expect(200);
            const products = await getProducts();
            expect(products).toHaveLength(0);
        });
    });
});
