import { test, expect, jest, beforeAll, afterAll, describe, beforeEach } from "@jest/globals"
import request from 'supertest'
import { app } from "../../index"
import { Cart } from "../../src/components/cart"
import { User, Role } from "../../src/components/user"
import CartController from "../../src/controllers/cartController"
import { cleanup } from "../../src/db/cleanup"
import { ProductNotFoundError, EmptyProductStockError, LowProductStockError } from "../../src/errors/productError"
import { CartNotFoundError, EmptyCartError, ProductNotInCartError } from "../../src/errors/cartError"

const routePath = '/ezelectronics';
const customer = { username: "customer", name: "customer", 
                   surname: "customer", password: "customer", role: "Customer" };
const admin = { username: "admin", name: "admin",  surname: "admin", password: "admin", role: "Admin"}
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

beforeEach(async () => {
    jest.clearAllMocks();
})

const cart = new Cart(0, 'Customer', false, null, 0, []);
const user = new User(customer.username, customer.name, customer.surname, Role.CUSTOMER, null, null);

describe('Cart route unit-tests', () => {
    describe('GET /carts', () => {
        test('Should return a 200 status code and a cart', async () => {
            jest.spyOn(CartController.prototype, 'getCart').mockResolvedValueOnce(cart);
            const response = await request(app).get(routePath + '/carts').set("Cookie", customerCookie);
            expect(response.status).toBe(200);
            expect(response.body).toEqual(cart);
            expect(CartController.prototype.getCart).toHaveBeenCalledTimes(1);
            expect(CartController.prototype.getCart).toHaveBeenCalledWith(user);
        });

    });

    describe('POST /carts', () => {
        const mockedAddToCart = jest.spyOn(CartController.prototype, 'addToCart');

        test('Expecting a 200 status code', async () => {
            mockedAddToCart.mockResolvedValueOnce(true);
            const reqBody = { model: 'Iphone 13' };
            const user = new User(customer.username, customer.name, customer.surname, Role.CUSTOMER, null, null);
            const response = await request(app).post(routePath + '/carts').send(reqBody).set("Cookie", customerCookie);
            expect(response.status).toBe(200);
            expect(CartController.prototype.addToCart).toHaveBeenCalledTimes(1);
            expect(CartController.prototype.addToCart).toHaveBeenCalledWith(user, reqBody.model);
            mockedAddToCart.mockClear() //clear information about mocking calls
        });

        test('Expecting a 404 status code', async () => {
            mockedAddToCart.mockRejectedValueOnce(new ProductNotFoundError());
            const reqBody = { model: 'Iphone 13' };
            const user = new User(customer.username, customer.name, customer.surname, Role.CUSTOMER, null, null);
            const response = await request(app).post(routePath + '/carts').send(reqBody).set("Cookie", customerCookie);
            expect(response.status).toBe(404);
            expect(CartController.prototype.addToCart).toHaveBeenCalledTimes(1);
            expect(CartController.prototype.addToCart).toHaveBeenCalledWith(user, reqBody.model);
            mockedAddToCart.mockClear()
        });

        test('Expecting a 409 status code', async () => {
            jest.spyOn(CartController.prototype, 'addToCart').mockRejectedValueOnce(new EmptyProductStockError());
            const reqBody = { model: 'Iphone 13' };
            const user = new User(customer.username, customer.name, customer.surname, Role.CUSTOMER, null, null);
            const response = await request(app).post(routePath + '/carts').send(reqBody).set("Cookie", customerCookie);
            expect(response.status).toBe(409);
            expect(CartController.prototype.addToCart).toHaveBeenCalledTimes(1);
            expect(CartController.prototype.addToCart).toHaveBeenCalledWith(user, reqBody.model);
            mockedAddToCart.mockClear()
        });

        test('Expecting a 422 status code', async () => {
            /* validation error case */
            const reqBody = { model: '' };
            const user = new User(customer.username, customer.name, customer.surname, Role.CUSTOMER, null, null);
            const response = await request(app).post(routePath + '/carts').send(reqBody).set("Cookie", customerCookie);
            expect(response.status).toBe(422);
            expect(CartController.prototype.addToCart).toHaveBeenCalledTimes(0);
            mockedAddToCart.mockClear()
        })
    });

    describe('PATCH /carts', () => {
        const mockedCheckoutCart = jest.spyOn(CartController.prototype, 'checkoutCart');

        test('Expecting a 200 status code', async () => {
            mockedCheckoutCart.mockResolvedValueOnce(true);
            await request(app)
                .patch(routePath + '/carts')
                .set('Cookie', customerCookie)
                .expect(200);
        });

        test('Expecting a 404 error code', async () => {
            mockedCheckoutCart.mockRejectedValueOnce(new CartNotFoundError());
            await request(app)
                .patch(routePath + '/carts')
                .set('Cookie', customerCookie)
                .expect(404);
        });

        test('Expecting a 400 error code', async () => {
            mockedCheckoutCart.mockRejectedValueOnce(new EmptyCartError());
            await request(app)
                .patch(routePath + '/carts')
                .set('Cookie', customerCookie)
                .expect(400);
        });

        test('Expecting a 409 error code', async () => {
            mockedCheckoutCart.mockRejectedValueOnce(new EmptyProductStockError());
            await request(app)
                .patch(routePath + '/carts')
                .set('Cookie', customerCookie)
                .expect(409);
        });

        test('Expecting a 409 error code', async () => {
            mockedCheckoutCart.mockRejectedValueOnce(new LowProductStockError());
            await request(app)
                .patch(routePath + '/carts')
                .set('Cookie', customerCookie)
                .expect(409);
        });
    });

    describe('GET /carts/history', () => {
        const mockedGetCustomerCarts = jest.spyOn(CartController.prototype, 'getCustomerCarts');

        test('Expecting a 200 status code and an array of carts', async () => {
            const cartHistory = [cart, {...cart, id: 1}, {...cart, id: 2}];
            mockedGetCustomerCarts.mockResolvedValueOnce(cartHistory);
            const response = await request(app)
                .get(routePath + '/carts/history')
                .set('Cookie', customerCookie)
                .expect(200)
            expect(response.body).toEqual(cartHistory);
        });
    });

    describe('DELETE /carts/products/:model', () => {
        const mockedRemoveProductFromCart = jest.spyOn(CartController.prototype, 'removeProductFromCart');

        test('Expecting a 200 status code', async () => {
            mockedRemoveProductFromCart.mockResolvedValueOnce(true);
            await request(app)
                .delete(routePath + '/carts/products/' + 'Product model')
                .set('Cookie', customerCookie)
                .expect(200)
            expect(mockedRemoveProductFromCart).toHaveBeenCalledTimes(1);
        });

        test('Expecting a 404 error code', async () => {
            mockedRemoveProductFromCart.mockRejectedValueOnce(new ProductNotFoundError());
            await request(app)
                .delete(routePath + '/carts/products/' + 'Product model')
                .set('Cookie', customerCookie)
                .expect(404)
        });

        test('Expecting a 404 error code', async () => {
            mockedRemoveProductFromCart.mockRejectedValueOnce(new ProductNotInCartError());
            await request(app)
                .delete(routePath + '/carts/products/' + 'Product model')
                .set('Cookie', customerCookie)
                .expect(404)
        });

        test('Expecting a 404 error code', async () => {
            mockedRemoveProductFromCart.mockRejectedValueOnce(new CartNotFoundError());
            await request(app)
                .delete(routePath + '/carts/products/' + 'Product model')
                .set('Cookie', customerCookie)
                .expect(404)
        });
    });

    describe('DELETE /carts/current', () => {
        const mockedClearCart = jest.spyOn(CartController.prototype, 'clearCart');

        test('Expecting a 200 status code', async () => {
            mockedClearCart.mockResolvedValueOnce(true);
            await request(app)
                .delete(routePath + '/carts/current')
                .set('Cookie', customerCookie)
                .expect(200)
            expect(mockedClearCart).toHaveBeenCalledTimes(1);
        });

        test('Expecting a 404 status code', async () => {
            mockedClearCart.mockRejectedValueOnce(new CartNotFoundError());
            await request(app)
                .delete(routePath + '/carts/current')
                .set('Cookie', customerCookie)
                .expect(404)
        });

    });

    describe('DELETE /carts', () => {
        const mockedDeleteAllCarts = jest.spyOn(CartController.prototype, 'deleteAllCarts');

        test('Expecting a 200 status code', async () => {
            mockedDeleteAllCarts.mockResolvedValueOnce(true);
            await request(app)
                .delete(routePath + '/carts')
                .set('Cookie', adminCookie)
                .expect(200)
            expect(mockedDeleteAllCarts).toHaveBeenCalledTimes(1);
        });
    });

    describe('GET carts/all', () => {
        const mockedGetAllCarts = jest.spyOn(CartController.prototype, 'getAllCarts');
        const carts = [cart, {...cart, id: 1, customer: 'Customer 1'}, {...cart, id: 2, customer: 'Customer 2'}];

        test('Expecting a 200 status code and an array of carts', async () => {
            mockedGetAllCarts.mockResolvedValueOnce(carts);
            const result = await request(app)
                .get(routePath + '/carts/all')
                .set('Cookie', adminCookie)
                .expect(200)
            expect(result.body).toEqual(carts);
            expect(mockedGetAllCarts).toHaveBeenCalledTimes(1);
        });
    });
});


