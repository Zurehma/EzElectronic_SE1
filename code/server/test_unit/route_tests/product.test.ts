import { test, expect, jest, beforeAll, afterAll, describe, beforeEach } from "@jest/globals";
import request from 'supertest';
import { app } from "../../index";
import ProductController from "../../src/controllers/productController";
import { cleanup } from "../../src/db/cleanup";
import { Product, Category } from "../../src/components/product";

const routePath = '/ezelectronics';
const admin = { username: "admin", name: "admin", surname: "admin", password: "admin", role: "Admin" };
const manager = { username: "manager", name: "manager", surname: "manager", password: "manager", role: "Manager" };
const customer = { username: "customer", name: "customer", surname: "customer", password: "customer", role: "Customer" };

let adminCookie: string;
let managerCookie: string;
let customerCookie: string;

const postUser = async (userInfo: any) => {
    await request(app)
        .post(`${routePath}/users`)
        .send(userInfo)
        .expect(200);
}

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

beforeEach(async () => {
    jest.clearAllMocks();
});

describe('Product route unit tests', () => {
    describe('POST /products', () => {
        test('Should register a product and return a 200 status code', async () => {
            const newProduct = {
                model: "testPhone",
                category: "Smartphone",
                quantity: 10,
                details: "A test phone",
                sellingPrice: 500,
                arrivalDate: "2023-06-01"
            };
            jest.spyOn(ProductController.prototype, 'registerProducts').mockResolvedValueOnce();
            const response = await request(app).post(routePath + '/products').set("Cookie", managerCookie).send(newProduct);
            expect(response.status).toBe(200);
            expect(ProductController.prototype.registerProducts).toHaveBeenCalledTimes(1);
            expect(ProductController.prototype.registerProducts).toHaveBeenCalledWith(
                newProduct.model,
                newProduct.category,
                newProduct.quantity,
                newProduct.details,
                newProduct.sellingPrice,
                newProduct.arrivalDate
            );
        });

        test('Should return a 400 status code if arrivalDate is after the current date', async () => {
            const newProduct = {
                model: "testPhone",
                category: "Smartphone",
                quantity: 10,
                details: "A test phone",
                sellingPrice: 500,
                arrivalDate: "2030-01-01" // Future date
            };
            const response = await request(app).post(routePath + '/products').set("Cookie", managerCookie).send(newProduct);
            expect(response.status).toBe(400);
            expect(response.body.message).toBe("Arrival date cannot be in the future");
        });

        test('Should return a 409 status code if product already exists', async () => {
            const newProduct = {
                model: "testPhone",
                category: "Smartphone",
                quantity: 10,
                details: "A test phone",
                sellingPrice: 500,
                arrivalDate: "2023-06-01"
            };
            jest.spyOn(ProductController.prototype, 'registerProducts').mockRejectedValueOnce({ customMessage: 'Product already exists', customCode: 409 });
            const response = await request(app).post(routePath + '/products').set("Cookie", managerCookie).send(newProduct);
            expect(response.status).toBe(409);
            expect(response.body.message).toBe("Product already exists");
        });

        test('Should return a 503 status code for server errors', async () => {
            const newProduct = {
                model: "testPhone",
                category: "Smartphone",
                quantity: 10,
                details: "A test phone",
                sellingPrice: 500,
                arrivalDate: "2023-06-01"
            };
            jest.spyOn(ProductController.prototype, 'registerProducts').mockRejectedValueOnce(new Error('Server error'));
            const response = await request(app).post(routePath + '/products').set("Cookie", managerCookie).send(newProduct);
            expect(response.status).toBe(503);
            expect(response.body.message).toBe(undefined);
        });
    });

    describe('PATCH /products/:model', () => {
        test('Should update the product quantity and return the new quantity', async () => {
            const model = "testPhone";
            const updateData = { quantity: 5, changeDate: "2023-06-02" };
            const updatedQuantity = 15;
            jest.spyOn(ProductController.prototype, 'changeProductQuantity').mockResolvedValueOnce(updatedQuantity);
            const response = await request(app).patch(routePath + `/products/${model}`).set("Cookie", managerCookie).send(updateData);
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ quantity: updatedQuantity });
            expect(ProductController.prototype.changeProductQuantity).toHaveBeenCalledTimes(1);
            expect(ProductController.prototype.changeProductQuantity).toHaveBeenCalledWith(model, updateData.quantity, updateData.changeDate);
        });

        test('Should return a 400 status code if changeDate is after the current date', async () => {
            const model = "testPhone";
            const updateData = { quantity: 5, changeDate: "2030-01-01" }; // Future date
            jest.spyOn(ProductController.prototype, 'changeProductQuantity').mockRejectedValueOnce({ customMessage: 'Change date cannot be after the current date', customCode: 400 });
            const response = await request(app).patch(routePath + `/products/${model}`).set("Cookie", managerCookie).send(updateData);
            expect(response.status).toBe(400);
            expect(response.body.message).toBe("Change date cannot be after the current date");
        });

        test('Should return a 400 status code if changeDate is before the arrival date', async () => {
            const model = "testPhone";
            const updateData = { quantity: 5, changeDate: "2022-01-01" }; // Before arrival date
            jest.spyOn(ProductController.prototype, 'changeProductQuantity').mockRejectedValueOnce({ customMessage: 'Change date cannot be before the arrival date of the product', customCode: 400 });
            const response = await request(app).patch(routePath + `/products/${model}`).set("Cookie", managerCookie).send(updateData);
            expect(response.status).toBe(400);
            expect(response.body.message).toBe("Change date cannot be before the arrival date of the product");
        });

        test('Should return a 404 status code if product does not exist', async () => {
            const model = "nonexistent";
            const updateData = { quantity: 5, changeDate: "2023-06-02" };
            jest.spyOn(ProductController.prototype, 'changeProductQuantity').mockRejectedValueOnce({ customMessage: 'Product not found', customCode: 404 });
            const response = await request(app).patch(routePath + `/products/${model}`).set("Cookie", managerCookie).send(updateData);
            expect(response.status).toBe(404);
            expect(response.body.message).toBe("Product not found");
        });

        test('Should return a 503 status code for server errors', async () => {
            const model = "testPhone";
            const updateData = { quantity: 5, changeDate: "2023-06-02" };
            jest.spyOn(ProductController.prototype, 'changeProductQuantity').mockRejectedValueOnce(new Error('Server error'));
            const response = await request(app).patch(routePath + `/products/${model}`).set("Cookie", managerCookie).send(updateData);
            expect(response.status).toBe(503);
            expect(response.body.message).toBe(undefined);
        });
    });

    describe('PATCH /products/:model/sell', () => {
        test('Should sell the product and return the remaining quantity', async () => {
            const model = "testPhone";
            const sellData = { quantity: 2, sellingDate: "2023-06-03" };
            const remainingQuantity = 8;
            jest.spyOn(ProductController.prototype, 'sellProduct').mockResolvedValueOnce(remainingQuantity);
            const response = await request(app).patch(routePath + `/products/${model}/sell`).set("Cookie", managerCookie).send(sellData);
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ quantity: remainingQuantity });
            expect(ProductController.prototype.sellProduct).toHaveBeenCalledTimes(1);
            expect(ProductController.prototype.sellProduct).toHaveBeenCalledWith(model, sellData.quantity, sellData.sellingDate);
        });

        test('Should return a 400 status code if sellingDate is after the current date', async () => {
            const model = "testPhone";
            const sellData = { quantity: 2, sellingDate: "2030-01-01" }; // Future date
            jest.spyOn(ProductController.prototype, 'sellProduct').mockRejectedValueOnce({ customMessage: 'Selling date cannot be later than the current date', customCode: 400 });
            const response = await request(app).patch(routePath + `/products/${model}/sell`).set("Cookie", managerCookie).send(sellData);
            expect(response.status).toBe(400);
            expect(response.body.message).toBe("Selling date cannot be later than the current date");
        });

        test('Should return a 400 status code if sellingDate is before the arrival date', async () => {
            const model = "testPhone";
            const sellData = { quantity: 2, sellingDate: "2020-01-01" }; // Date before arrival date
            jest.spyOn(ProductController.prototype, 'sellProduct').mockRejectedValueOnce({ customMessage: 'Selling date must be after the arrival date of the product', customCode: 400 });
            const response = await request(app).patch(routePath + `/products/${model}/sell`).set("Cookie", managerCookie).send(sellData);
            expect(response.status).toBe(400);
            expect(response.body.message).toBe("Selling date must be after the arrival date of the product");
        });

        test('Should return a 404 status code if product does not exist', async () => {
            const model = "nonexistent";
            const sellData = { quantity: 2, sellingDate: "2023-06-03" };
            jest.spyOn(ProductController.prototype, 'sellProduct').mockRejectedValueOnce({ customMessage: 'Product not found', customCode: 404 });
            const response = await request(app).patch(routePath + `/products/${model}/sell`).set("Cookie", managerCookie).send(sellData);
            expect(response.status).toBe(404);
            expect(response.body.message).toBe("Product not found");
        });

        test('Should return a 503 status code for server errors', async () => {
            const model = "testPhone";
            const sellData = { quantity: 2, sellingDate: "2023-06-03" };
            jest.spyOn(ProductController.prototype, 'sellProduct').mockRejectedValueOnce(new Error('Server error'));
            const response = await request(app).patch(routePath + `/products/${model}/sell`).set("Cookie", managerCookie).send(sellData);
            expect(response.status).toBe(503);
            expect(response.body.message).toBe(undefined);
        });
    });

    describe('GET /products', () => {
        test('Should retrieve all products', async () => {
            const products = [new Product(200, "testPhone", Category.SMARTPHONE, "2023-06-01", "A test phone", 10)];
            jest.spyOn(ProductController.prototype, 'getProducts').mockResolvedValueOnce(products);
            const response = await request(app).get(routePath + '/products').set("Cookie", adminCookie);
            expect(response.status).toBe(200);
            expect(response.body).toEqual(products);
            expect(ProductController.prototype.getProducts).toHaveBeenCalledTimes(1);
        });

        test('Should return a 422 status code if invalid parameters are provided', async () => {
            jest.spyOn(ProductController.prototype, 'getProducts').mockRejectedValueOnce({ customMessage: 'Invalid parameters: grouping is category but category is null or model is not null', customCode: 422 });
            const response = await request(app)
                .get(routePath + '/products')
                .query({ grouping: 'category', model: 'Iphone 13' }) // Invalid parameters
                .set("Cookie", adminCookie);
            expect(response.status).toBe(422);
            expect(response.body.message).toBe('Invalid parameters: grouping is category but category is null or model is not null');
        });

        test('Should return a 503 status code for server errors', async () => {
            jest.spyOn(ProductController.prototype, 'getProducts').mockRejectedValueOnce(new Error('Server error'));
            const response = await request(app).get(routePath + '/products').set("Cookie", adminCookie);
            expect(response.status).toBe(422);
            expect(response.body.message).toBe('Invalid parameters: grouping is category but category is null or model is not null');
        });
    });

    describe('GET /products/available', () => {
        test('Should retrieve all available products', async () => {
            const products = [new Product(200, "testPhone", Category.SMARTPHONE, "2023-06-01", "A test phone", 10)];
            jest.spyOn(ProductController.prototype, 'getAvailableProducts').mockResolvedValueOnce(products);
            const response = await request(app).get(routePath + '/products/available').set("Cookie", customerCookie);
            expect(response.status).toBe(200);
            expect(response.body).toEqual(products);
            expect(ProductController.prototype.getAvailableProducts).toHaveBeenCalledTimes(1);
        });

        test('Should return a 422 status code if invalid parameters are provided', async () => {
            jest.spyOn(ProductController.prototype, 'getAvailableProducts').mockRejectedValueOnce({ customMessage: 'Invalid parameters: grouping is category but category is null or model is not null', customCode: 422 });
            const response = await request(app)
                .get(routePath + '/products/available')
                .query({ grouping: 'category', model: 'Iphone 13' }) // Invalid parameters
                .set("Cookie", customerCookie);
            expect(response.status).toBe(422);
            expect(response.body.message).toBe('Invalid parameters: grouping is category but category is null or model is not null');
        });

        test('Should return a 422 status code for server errors', async () => {
            jest.spyOn(ProductController.prototype, 'getAvailableProducts').mockRejectedValueOnce(new Error('Server error'));
            const response = await request(app).get(routePath + '/products/available').set("Cookie", customerCookie);
            expect(response.status).toBe(422);
            expect(response.body.message).toBe("Invalid parameters: grouping is category but category is null or model is not null");
        });
    });

    describe('DELETE /products', () => {
        test('Should delete all products and return a 200 status code', async () => {
            jest.spyOn(ProductController.prototype, 'deleteAllProducts').mockResolvedValueOnce(true);
            const response = await request(app).delete(routePath + '/products').set("Cookie", adminCookie);
            expect(response.status).toBe(200);
            expect(ProductController.prototype.deleteAllProducts).toHaveBeenCalledTimes(1);
        });

        test('Should return a 503 status code for server errors', async () => {
            jest.spyOn(ProductController.prototype, 'deleteAllProducts').mockRejectedValueOnce(new Error('Server error'));
            const response = await request(app).delete(routePath + '/products').set("Cookie", adminCookie);
            expect(response.status).toBe(503);
            expect(response.body.message).toBe(undefined);
        });
    });

    describe('DELETE /products/:model', () => {
        test('Should delete a product and return a 200 status code', async () => {
            const model = "testPhone";
            jest.spyOn(ProductController.prototype, 'deleteProduct').mockResolvedValueOnce(true);
            const response = await request(app).delete(routePath + `/products/${model}`).set("Cookie", adminCookie);
            expect(response.status).toBe(200);
            expect(ProductController.prototype.deleteProduct).toHaveBeenCalledTimes(1);
            expect(ProductController.prototype.deleteProduct).toHaveBeenCalledWith(model);
        });

        test('Should return a 404 status code if product does not exist', async () => {
            const model = "nonexistent";
            jest.spyOn(ProductController.prototype, 'deleteProduct').mockRejectedValueOnce({ customMessage: 'Product not found', customCode: 404 });
            const response = await request(app).delete(routePath + `/products/${model}`).set("Cookie", adminCookie);
            expect(response.status).toBe(404);
            expect(response.body.message).toBe("Product not found");
        });

        test('Should return a 500 status code for server errors', async () => {
            const model = "testPhone";
            jest.spyOn(ProductController.prototype, 'deleteProduct').mockRejectedValueOnce(new Error('Server error'));
            const response = await request(app).delete(routePath + `/products/${model}`).set("Cookie", adminCookie);
            expect(response.status).toBe(500);
            expect(response.body.message).toBe("Server error");
        });
    });
});
