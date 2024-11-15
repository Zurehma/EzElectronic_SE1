import { test, expect, jest, describe, beforeAll, afterAll, afterEach, beforeEach } from "@jest/globals"
import request from 'supertest'
import { app } from "../index"
import { cleanup, cleanupNoUsers } from "../src/db/cleanup"
import { Utility } from "../src/utilities";
import { Cart, ProductInCart } from "../src/components/cart";
import ProductDAO from "../src/dao/productDAO";
import { Category, Product } from "../src/components/product";

const routePath = '/ezelectronics';
const customer = { username: "customer", name: "customer", surname: "customer", password: "customer", role: "Customer" };
const admin = { username: "admin", name: "admin", surname: "admin", password: "admin", role: "Admin" };
let customerCookie: string;
let adminCookie: string;

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

const postProduct = async (product: any) => {
    const res = await request(app)
        .post(routePath + '/products')
        .send(product)
        .set('Cookie', adminCookie)
    return res.status;
}

const postCartProduct = async (model: string) => {
    const res = await request(app)
        .post(routePath + '/carts')                     
        .send({ model: model })
        .set('Cookie', customerCookie)
    return res.status;
}

/* returns an array of cart objects */
const getCarts = async () => {
    const res = await request(app)
        .get(routePath + '/carts/all')
        .set('Cookie', adminCookie)
        .expect(200)
    return res.body;
}

const getProducts = async () => {
    const res = await request(app)
        .get(routePath + '/products')
        .set('Cookie', adminCookie)
        .expect(200)
    return res.body;
}

beforeAll(async () => {
    await cleanup();
    await postUser(admin);
    await postUser(customer);
    adminCookie = await login(admin);
    customerCookie = await login(customer);
});

beforeEach(async () => {
    await cleanupNoUsers();
});



// afterAll(async () => {
//     await cleanup();
// });

describe('Cart APIs integration-tests', () => {
    const mockProduct = {
        model: 'Iphone 13',
        category: 'Smartphone',
        quantity: 2,
        details: '',
        sellingPrice: 1000.0,
        //arrivalDate: '2024-04-07'
    }
    const mockedProductInCart = new ProductInCart(
        mockProduct.model, 
        1, 
        mockProduct.category as Category, 
        mockProduct.sellingPrice
    );
    describe('GET /carts', () => {
        test('No unpaid cart: Expecting a 200 success code and an empty cart', async () => {
            const res = await request(app).get(routePath + '/carts').set('Cookie', customerCookie);
            const cart = res.body as Cart;
            expect(res.status).toBe(200);
            expect(Utility.isCartEmpty(cart)).toBe(true);
            expect(cart.customer).toBe(customer.username); 
        });
        test('Unpaid cart: Expecting a 200 success code and the unpaid cart', async () => {
            /* insert a product into the database */
            expect(await postProduct(mockProduct)).toBe(200);
            /* add the inserted product into the cart */
            /* this will also insert the current cart of the user with the product */
            expect(await postCartProduct(mockProduct.model)).toBe(200);
            /* check that the cart is retrieved correctly */
            const cart: Cart = (await getCarts())[0];
            expect(Utility.isCartEmpty(cart)).toBe(false);
            expect(cart.customer).toBe(customer.username);
            expect(cart.paid).toBe(false);
            expect(cart.paymentDate).toBe(null);
            expect(cart.products).toContainEqual(mockedProductInCart);
        });
    });

    describe('POST /carts', () => {
        test('No unpaid cart: expecting a 200 status code and cart with product to be added', async () => {
            let res = await request(app).post(routePath + '/products')
                             .send(mockProduct).set('Cookie', adminCookie);
            expect(res.status).toBe(200);
            const body = { model: mockProduct.model };
            res = await request(app).post(routePath + '/carts')                     
                             .send(body).set('Cookie', customerCookie);
            expect(res.status).toBe(200);
            // check for the cart in the database
            res = await request(app).get(routePath + '/carts/all').set('Cookie', adminCookie);
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            const cart: Cart = res.body[0]
            const insertedProduct = cart.products.find(p => p.model === body.model);
            expect(insertedProduct).toBeDefined();
            expect(insertedProduct?.quantity).toBe(1);
            expect(cart.total).toEqual(mockedProductInCart.price);
            expect(cart.paid).toBe(false);
            expect(cart.paymentDate).toBe(null);
        });

        test('Unpaid cart without the product: expecting a 200 status code and product to be added', async () => {
            /* insert one product */
            await request(app)
                .post(routePath + '/products')
                .send(mockProduct)
                .set('Cookie', adminCookie)
                .expect(200);
            /* insert another product */
            const product2 = {...mockProduct, model: 'Dyson RVC', category: 'Appliance', sellingPrice: 500.50};
            await request(app)
                .post(routePath + '/products')
                .send(product2)
                .set('Cookie', adminCookie)
                .expect(200);
            /* insert the first product in the cart */
            await request(app)
                .post(routePath + '/carts')                     
                .send({ model: mockProduct.model })
                .set('Cookie', customerCookie)
                .expect(200);
            /* now the information about an unpaid cart is present, insert the second product */
            await request(app)
                .post(routePath + '/carts')                     
                .send({ model: product2.model })
                .set('Cookie', customerCookie)
                .expect(200);
            /* check for correctness of the cart */
            const response = await request(app)
                .get(routePath + '/carts/all')
                .set('Cookie', adminCookie)
                .expect(200);
            expect(response.body).toHaveLength(1);
            const cart: Cart = response.body[0];
            const insertedProduct = cart.products.find(p => p.model === product2.model);
            expect(insertedProduct).toBeDefined();
            expect(insertedProduct?.quantity).toBe(1);
            expect(cart.total).toEqual(mockProduct.sellingPrice + product2.sellingPrice);
            expect(cart.paid).toBe(false);
            expect(cart.paymentDate).toBe(null);
        });

        test('Unpaid cart with the product: expecting a 200 status code and ' +
                    'product quantity to be incremented', async () => {
            // insert a product into the db
            let res = await request(app).post(routePath + '/products')
                            .send(mockProduct).set('Cookie', adminCookie);
            expect(res.status).toBe(200);
            // insert that product into the cart
            const body = { model: mockProduct.model };
            res = await request(app).post(routePath + '/carts')                     
                        .send(body).set('Cookie', customerCookie);
            expect(res.status).toBe(200);
            // increment the product quantity of the same product
            res = await request(app).post(routePath + '/carts')                     
                        .send(body).set('Cookie', customerCookie);
            expect(res.status).toBe(200);
            // check for the cart in the database
            res = await request(app).get(routePath + '/carts/all').set('Cookie', adminCookie);
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            const cart: Cart = res.body[0]
            const insertedProduct = cart.products.find(p => p.model === body.model);
            expect(insertedProduct).toBeDefined();
            expect(insertedProduct?.quantity).toBe(2);
            expect(cart.total).toEqual(mockedProductInCart.price * 2);
            expect(cart.paid).toBe(false);
            expect(cart.paymentDate).toBe(null);
        })

        test('Product not existing: expecting a 404 status code and no operation performed', async () => {
            /* trying to insert a non existing product in the cart */
            await request(app)
                .post(routePath + '/carts')                     
                .send({ model: 'Not existing model' })
                .set('Cookie', customerCookie)
                .expect(404);
            /* check that no cart has been inserted */
            const response = await request(app)
                .get(routePath + '/carts/all')
                .set('Cookie', adminCookie)
                .expect(200);
            expect(response.body).toHaveLength(0);
        });

        test('Product with 0 quantity: expecting a 409 status code and no operation performed', async () => {
            /* insert one product */
            await request(app)
                .post(routePath + '/products')
                .send(mockProduct)
                .set('Cookie', adminCookie)
                .expect(200);
            /* lower its quantity to 0 */
            await request(app)
                .patch(routePath + '/products/' + mockProduct.model + '/sell')
                .send({ quantity: mockProduct.quantity })
                .set('Cookie', adminCookie)
                .expect(200);
            /* trying to insert the product in the cart */
            await request(app)
                .post(routePath + '/carts')                     
                .send({ model: mockProduct.model })
                .set('Cookie', customerCookie)
                .expect(409);
            /* check that no cart has been inserted */
            const response = await request(app)
                .get(routePath + '/carts/all')
                .set('Cookie', adminCookie)
                .expect(200);
            expect(response.body).toHaveLength(0);
        });

        test('Empty product model: expecting a 422 status code', async () => {
            /* trying to insert a product with empty model to get an error */
            expect(await postProduct('')).toBe(422);
        });
    });

    describe('PATCH /carts', () => {

        test('Cart payment: expecting a 200 status code and cart information update', async () => {
            /* insert a product into the database */
            expect(await postProduct(mockProduct)).toBe(200);
            /* add the inserted product into the cart */
            /* this will also insert the current cart of the user with the product */
            expect(await postCartProduct(mockProduct.model)).toBe(200);
            /* pay for the cart */
            await request(app)
                .patch(routePath + '/carts')
                .set('Cookie', customerCookie)
                .expect(200);
            /* check that the cart has been updated correctly */
            const cart: Cart = (await getCarts())[0];
            expect(cart.paymentDate).toBe(Utility.formatDate(new Date()));
            /* check that the product quantity has been lowered */
            const product = (await getProducts())[0];
            expect(product.quantity).toBe(mockProduct.quantity - 1);
        });

        test('No unpaid cart: expecting a 404 status code', async () => {
            /* pay for the cart to get an error */
            await request(app)
                .patch(routePath + '/carts')
                .set('Cookie', customerCookie)
                .expect(404);
        });

        test('Unpaid cart with no products: expecting a 400 status code', async () => {
            /* insert a product into the database */
            expect(await postProduct(mockProduct)).toBe(200);
            /* add the inserted product into the cart */
            /* this will also insert the current cart of the user with the product */
            expect(await postCartProduct(mockProduct.model)).toBe(200);
            /* remove the product from the cart so that the cart has zero products inside */
            await request(app)
                .delete(routePath + '/carts/products/' + mockProduct.model)
                .set('Cookie', customerCookie)
                .expect(200);
            /* pay for the cart to get an error */
            await request(app)
                .patch(routePath + '/carts')
                .set('Cookie', customerCookie)
                .expect(400);
        });

        test('Cart payment but a product is not available anymore: expecting a 409 status code', async () => {
            /* insert a product into the database */
            expect(await postProduct(mockProduct)).toBe(200);
            /* add the inserted product into the cart */
            /* this will also insert the current cart of the user with the product */
            expect(await postCartProduct(mockProduct.model)).toBe(200);
            /* lower its quantity to 0 */
            await request(app)
                .patch(routePath + '/products/' + mockProduct.model + '/sell')
                .send({ quantity: mockProduct.quantity })
                .set('Cookie', adminCookie)
                .expect(200);
            /* pay for the cart to get an error */
            await request(app)
                .patch(routePath + '/carts')
                .set('Cookie', customerCookie)
                .expect(409);
        });

        test('Cart payment but quantity of a product is higher than stock: expecting a 409 status code', async () => {
            /* insert a product into the database */
            expect(await postProduct(mockProduct)).toBe(200);
            /* add the inserted product into the cart one times more than the available quantity */
            for (let i = 0; i < mockProduct.quantity + 1; i++) {
                expect(await postCartProduct(mockProduct.model)).toBe(200);
            }
            /* pay for the cart to get an error */
            await request(app)
                .patch(routePath + '/carts')
                .set('Cookie', customerCookie)
                .expect(409);
        });

    });

    describe('GET /carts/history', () => {

        test('History of the carts without a current unpaid cart: expecting a 200 status code ' + 
            'and a list of paid carts', async () => {
            /* insert a product into the database */
            expect(await postProduct(mockProduct)).toBe(200);
            /* add the inserted product into the cart */
            /* this will also insert the current cart of the user with the product */
            expect(await postCartProduct(mockProduct.model)).toBe(200);
            /* pay for the cart */
            await request(app)
                .patch(routePath + '/carts')
                .set('Cookie', customerCookie)
                .expect(200);
            /* check that the history of carts contains the paid cart */
            const response = await request(app)
                .get(routePath + '/carts/history')
                .set('Cookie', customerCookie)
                .expect(200)
            const carts: Cart[] = response.body;
            expect(carts.length).toBe(1);
        });

        test('History of the carts while a current unpaid cart present: expecting a 200 status code ' +
                'and a list of paid carts', async () => {
            /* insert a product into the database */
            expect(await postProduct(mockProduct)).toBe(200);
            /* add the inserted product into the cart */
            /* this will also insert the current cart of the user with the product */
            expect(await postCartProduct(mockProduct.model)).toBe(200);
            /* pay for the cart */
            await request(app)
                .patch(routePath + '/carts')
                .set('Cookie', customerCookie)
                .expect(200);
            /* add the inserted product into the cart */
            /* this will create a new unpaid cart  */
            expect(await postCartProduct(mockProduct.model)).toBe(200);
            /* check that the history of carts contains the paid cart but not the current unpaid one */
            const response = await request(app)
                .get(routePath + '/carts/history')
                .set('Cookie', customerCookie)
                .expect(200)
            const carts: Cart[] = response.body;
            expect(carts.length).toBe(1);
        })

    });

    describe('DELETE /carts/products/:model', () => {

        test('Product removal from cart (quantity 1), expecting a 200 status code', async () => {
            /* insert a product into the database */
            expect(await postProduct(mockProduct)).toBe(200);
            /* add the inserted product into the cart */
            /* this will also insert the current cart of the user with the product */
            expect(await postCartProduct(mockProduct.model)).toBe(200);
            /* remove one instance of the product in the cart */
            await request(app)
                .delete(routePath + '/carts/products/' + mockProduct.model)
                .set('Cookie', customerCookie)
                .expect(200)
            /* check that the cart has been updated correctly */
            /* the cart should now have zero products */
            const cart: Cart = (await getCarts())[0];
            expect(cart.products.length).toBe(0);
            expect(cart.total).toBe(0);
        });

        test('Product removal from cart (quantity > 1), expecting a 200 status code', async () => {
            /* insert a product into the database */
            expect(await postProduct(mockProduct)).toBe(200);
            /* add the inserted product into the cart */
            /* this will also insert the current cart of the user with the product */
            expect(await postCartProduct(mockProduct.model)).toBe(200);
            /* insert another product instance of the same product */
            expect(await postCartProduct(mockProduct.model)).toBe(200);
            /* remove one instance of the product in the cart */
            await request(app)
                .delete(routePath + '/carts/products/' + mockProduct.model)
                .set('Cookie', customerCookie)
                .expect(200)
            /* check that the cart has been updated correctly */
            const cart: Cart = (await getCarts())[0];
            expect(cart.products).toHaveLength(1);
            const cartProduct = cart.products[0];
            expect(cartProduct.quantity).toBe(1);
            expect(cart.total).toBe(mockProduct.sellingPrice);
        });

        test('Product not in cart, expecting a 404 status code', async () => {
            /* insert a product into the database */
            expect(await postProduct(mockProduct)).toBe(200);
            /* add the inserted product into the cart */
            /* this will also insert the current cart of the user with the product */
            expect(await postCartProduct(mockProduct.model)).toBe(200);
            /* remove one instance of the product in the cart */
            await request(app)
                .delete(routePath + '/carts/products/' + mockProduct.model)
                .set('Cookie', customerCookie)
                .expect(200)
            /* remove another instance of the product in the cart */
            /* but now the product is not in the cart anymore, triggering an error */
            await request(app)
                .delete(routePath + '/carts/products/' + mockProduct.model)
                .set('Cookie', customerCookie)
                .expect(404)
        });

        test('No unpaid cart, expecting a 404 status code', async () => {
            /* insert a product into the database */
            expect(await postProduct(mockProduct)).toBe(200);
            /* remove one instance of the product in the cart */
            /* with no cart inserted to trigger an error */
            await request(app)
                .delete(routePath + '/carts/products/' + mockProduct.model)
                .set('Cookie', customerCookie)
                .expect(404)
        })

        test('Product not found, expecting a 404 status code', async () => {
            /* insert a product into the database */
            expect(await postProduct(mockProduct)).toBe(200);
             /* add the inserted product into the cart */
            /* this will also insert the current cart of the user with the product */
            expect(await postCartProduct(mockProduct.model)).toBe(200);
            /* trying to remove a product not inserted into the database to trigger an error */
            await request(app)
                .delete(routePath + '/carts/products/' + 'Product not inserted')
                .set('Cookie', customerCookie)
                .expect(404)
        });

        /* a parameter in a request can be empty? 
        // test('Product model empty, expecting a 422 status code', async () => {
        //     /* trying to remove a product with an empty product model parameter to trigger an error */
        //     await request(app)
        //         .delete(routePath + '/carts/products/' + '')
        //         .set('Cookie', customerCookie)
        //         .expect(422)
        // })
    });

    describe('DELETE /carts/current', () => {

        test('Emptying of the current cart, expecting a 200 status code', async () => {
            /* insert a product into the database */
            expect(await postProduct(mockProduct)).toBe(200);
            /* add the inserted product into the cart */
            /* this will also insert the current cart of the user with the product */
            expect(await postCartProduct(mockProduct.model)).toBe(200);
            /* empty the current cart */
            await request(app)
                .delete(routePath + '/carts/current')
                .set('Cookie', customerCookie)
                .expect(200)
            /* check that the cart has been emptied correctly */
            const cart: Cart = (await getCarts())[0];
            expect(cart.products).toHaveLength(0);
            expect(cart.total).toBe(0);
        });

        test('No unpaid cart, expecting a 404 status code', async () => {
            /* empty the current cart to trigger an error */
            await request(app)
                .delete(routePath + '/carts/current')
                .set('Cookie', customerCookie)
                .expect(404)
        });

    });

    describe('DELETE /carts', () => {

        test('Deleting of all carts, expeting a 200 status code', async () => {
            /* insert a product into the database */
            expect(await postProduct(mockProduct)).toBe(200);
            /* add the inserted product into the cart */
            /* this will also insert the current cart of the user with the product */
            expect(await postCartProduct(mockProduct.model)).toBe(200);
            /* pay for the cart */
            await request(app)
                .patch(routePath + '/carts')
                .set('Cookie', customerCookie)
                .expect(200);
            /* add the inserted product into the cart */
            /* this will also create a new current cart */
            expect(await postCartProduct(mockProduct.model)).toBe(200);
            /* deleting all carts */
            await request(app)
                .delete(routePath + '/carts')
                .set('Cookie', adminCookie)
                .expect(200)
            /* check that all carts have been deleted */
            const carts: Cart[] = await getCarts();
            expect(carts).toHaveLength(0);
        });
    });

    describe('GET /carts/all', () => {

        test('Getting all carts, expecting a 200 status code and an array of carts', async () => {
            /* insert a product into the database */
            expect(await postProduct(mockProduct)).toBe(200);
            /* add the inserted product into the cart */
            /* this will also insert the current cart of the user with the product */
            expect(await postCartProduct(mockProduct.model)).toBe(200);
            /* pay for the cart */
            await request(app)
                .patch(routePath + '/carts')
                .set('Cookie', customerCookie)
                .expect(200);
            /* add the inserted product into the cart */
            /* this will also create a new current cart */
            expect(await postCartProduct(mockProduct.model)).toBe(200);
            /* getting all carts */
            const response = await request(app)
                .get(routePath + '/carts/all')
                .set('Cookie', adminCookie)
                .expect(200)
            expect(response.body).toHaveLength(2);
        });
    })
});