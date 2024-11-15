import { describe, test, expect, jest, beforeEach } from "@jest/globals"
import CartDAO from "../../src/dao/cartDAO"
import db from "../../src/db/db"
import { User, Role } from "../../src/components/user"
import { Cart, ProductInCart } from "../../src/components/cart"
import { Category, Product } from "../../src/components/product"
import ProductDAO from "../../src/dao/productDAO"

jest.mock('../../src/db/db');

beforeEach(() => {
    jest.clearAllMocks();
})

describe('cartDAO unit-tests', () => {

    const cartDAO = new CartDAO();
    const mockDBGet = jest.spyOn(db, 'get');
    const mockDBRun = jest.spyOn(db, 'run');
    const mockDBAll = jest.spyOn(db, 'all');
    const product = new Product(1000, 'Iphone 13', 'Smartphone' as Category, '', '', 1);
    const productInCart = new ProductInCart(product.model, product.quantity, product.category, product.sellingPrice);
    const mockCart = new Cart(null, 'customer', false, null, 0, []);
    const mockUser = new User('username', 'Name', 'Surname', 'Customer' as Role, '', '');

    test('getCurrentCart: expecting to resolve to a cart', async () => {
        const cartRow = { id: 1, customer: 'customer1', paid: 0, payment_date: null, total: 1200.5 };
        const cartProductRows = [
            { cart: 1, model: 'product1', cart_quantity: 1, category: 'Smartphone', selling_price: 500 },
            { cart: 1, model: 'product2', cart_quantity: 2, category: 'Appliance', selling_price: 700.5 },
        ]
        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, cartRow);
            return db;
        });
        mockDBAll.mockImplementationOnce((sql, params, callback) => {
            callback(null, cartProductRows);
            return db;
        });
        const result = await cartDAO.getCurrentCart(mockUser);
        expect(mockDBGet).toHaveBeenCalledTimes(1);
        expect(mockDBAll).toHaveBeenCalledTimes(1);
        const cartProducts = cartProductRows.map(cp => new ProductInCart(cp.model, cp.cart_quantity, 
                                                    cp.category as Category, cp.selling_price));
        expect(result).toEqual(new Cart(cartRow.id, cartRow.customer, Boolean(cartRow.paid), 
                                            cartRow.payment_date, cartRow.total, cartProducts));
    });

    test('getCartProducts: expecting to resolve to an array of cart products', async () => {
        const rows = [
            { model: 'Model1', category: 'Smartphone', cart_quantity: 1, selling_price: 1000},
            { model: 'Model2', category: 'Laptop', cart_quantity: 4, selling_price: 535.8}
        ]
        mockDBAll.mockImplementationOnce((sql, params, callback) => {
            callback(null, rows);
            return db;
        });
        const result = await cartDAO.getCartProducts(mockCart.id);
        expect(mockDBAll).toHaveBeenCalledTimes(1);
        for (let i = 0; i < rows.length; i++) {
            expect(result).toContainEqual(new ProductInCart(rows[i].model, rows[i].cart_quantity, 
                rows[i].category as Category, rows[i].selling_price));
        }
    });

    describe('addCart', () => {
        test('Expecting to resolve to the cart id', async () => {
            mockDBRun.mockImplementationOnce((sql, params, callback) => {
                callback.call({ lastID: 1 }, null);
                return db;
            });
            const result = await cartDAO.addCart(mockCart);
            expect(result).toBe(1);
        });
        test('DB error: Expecting to resolve with an error', async () => {
            mockDBRun.mockImplementationOnce((sql, params, callback) => {
                callback.call({}, new Error());
                return db;
            });
            await expect(cartDAO.addCart(mockCart)).rejects.toThrowError();
        });
    })
    

    describe('addCartProduct', () => {
        test('Expecting to resolve with true', async () => {
            mockDBRun.mockImplementationOnce((sql, params, callback) => {
                callback(null);
                return db;
            });
            const result = await cartDAO.addCartProduct(mockCart.id, product);
            expect(mockDBRun).toHaveBeenCalledTimes(1);
            expect(result).toBe(true);
        });
        test('DB error: Expecting to resolve with an error', async () => {
            mockDBRun.mockImplementationOnce((sql, params, callback) => {
                callback(new Error());
                return db;
            });
            await expect(cartDAO.addCartProduct(mockCart.id, product)).rejects.toThrowError();
            expect(mockDBRun).toHaveBeenCalledTimes(1);
        });
    })
    

    describe('updateCart', () => {
        test('Expecting to resolve with true', async () => {
            mockDBRun.mockImplementationOnce((sql, params, callback) => {
                callback.call({ changes: 1 }, null);
                return db;
            });
            const result = await cartDAO.updateCart(mockCart);
            expect(mockDBRun).toHaveBeenCalledTimes(1);
            expect(result).toBe(true); 
        });
        test('DB error: Expecting to resolve with an error', async () => {
            mockDBRun.mockImplementationOnce((sql, params, callback) => {
                callback.call({ changes: 1 }, new Error());
                return db;
            });
            await expect(cartDAO.updateCart(mockCart)).rejects.toThrowError();
            expect(mockDBRun).toHaveBeenCalledTimes(1); 
        });
    })
    

    describe('updateCartProduct', () => {
        test('Expecting to resolve with true', async () => {
            mockDBRun.mockImplementationOnce((sql, params, callback) => {
                callback(null);
                return db;
            });
            const result = await cartDAO.updateCartProduct(mockCart, productInCart);
            expect(mockDBRun).toHaveBeenCalledTimes(1);
            expect(result).toBe(true); 
        });
        test('DB error: Expecting to resolve with an error', async () => {
            mockDBRun.mockImplementationOnce((sql, params, callback) => {
                callback(new Error());
                return db;
            });
            await expect(cartDAO.updateCartProduct(mockCart, productInCart)).rejects.toThrowError();
            expect(mockDBRun).toHaveBeenCalledTimes(1);
        });
    })
    

    test('getAllCarts: expecting to resolve to an array of carts', async () => {
        const cartRows = [
            { id: 1, customer: 'customer1', paid: 0, payment_date: null, total: 1200.5 },
            { id: 2, customer: 'customer2', paid: 1, payment_date: '2024-06-08', total: 1700.8 },
        ]
        const cartProductRows = [
            { cart: 1, model: 'product1', cart_quantity: 1, category: 'Smartphone', selling_price: 500 },
            { cart: 1, model: 'product2', cart_quantity: 2, category: 'Appliance', selling_price: 700.5 },
            { cart: 2, model: 'product3', cart_quantity: 10, category: 'Laptop', selling_price: 1000.3 },
            { cart: 2, model: 'product2', cart_quantity: 6, category: 'Appliance', selling_price: 700.5 }
        ]
        mockDBAll.mockImplementationOnce((sql, params, callback) => {
            callback(null, cartRows);
            return db;
        });
        mockDBAll.mockImplementationOnce((sql, params, callback) => {
            callback(null, cartProductRows.filter((cp) => cp.cart === cartRows[0].id));
            return db;
        });
        mockDBAll.mockImplementationOnce((sql, params, callback) => {
            callback(null, cartProductRows.filter((cp) => cp.cart === cartRows[1].id));
            return db;
        });
        const result = await cartDAO.getAllCarts();
        expect(mockDBAll).toHaveBeenCalledTimes(3);
        for (let i = 0; i < cartRows.length; i++) {
            const cartProducts = cartProductRows
                .filter(cp => cp.cart === cartRows[i].id)
                .map(cp => new ProductInCart(cp.model, cp.cart_quantity, cp.category as Category, 
                                                cp.selling_price))
            expect(result).toContainEqual(new Cart(cartRows[i].id, cartRows[i].customer, 
                Boolean(cartRows[i].paid), cartRows[i].payment_date, cartRows[i].total, cartProducts))
        }
    });

    describe('deleteAllCarts', () => {
        test('Expecting to resolve with true', async () => {
            mockDBRun.mockImplementationOnce((sql, params, callback) => {
                callback(null);
                return db;
            });
            const result = await cartDAO.deleteAllCarts();
            expect(mockDBRun).toHaveBeenCalledTimes(1);
            expect(result).toBe(true);
        });
        test('DB error: Expecting to resolve with an error', async () => {
            mockDBRun.mockImplementationOnce((sql, params, callback) => {
                callback(new Error());
                return db;
            });
            await expect(cartDAO.deleteAllCarts()).rejects.toThrow(new Error());
            expect(mockDBRun).toHaveBeenCalledTimes(1);
        });
    });


    describe('deleteCartProducts', () => {
        test('Expecting to resolve with true', async () => {
            mockDBRun.mockImplementationOnce((sql, params, callback) => {
                callback(null);
                return db;
            });
            const result = await cartDAO.deleteCartProducts(mockCart);
            expect(mockDBRun).toHaveBeenCalledTimes(1);
            expect(result).toBe(true);
        });
        test('DB error: Expecting to resolve with an error', async () => {
            mockDBRun.mockImplementationOnce((sql, params, callback) => {
                callback(new Error());
                return db;
            });
            await expect(cartDAO.deleteCartProducts(mockCart)).rejects.toThrow(new Error());
            expect(mockDBRun).toHaveBeenCalledTimes(1);
        });
    });
    
    describe('deleteCartProduct', () => {
        test('Expecting to resolve with true', async () => {
            mockDBRun.mockImplementationOnce((sql, params, callback) => {
                callback.call({ changes: 1 }, null);
                return db;
            });
            const result = await cartDAO.deleteCartProduct(mockCart, productInCart);
            expect(mockDBRun).toHaveBeenCalledTimes(1);
            expect(result).toBe(true);
        });
        test('DB error: Expecting to resolve with an error', async () => {
            mockDBRun.mockImplementationOnce((sql, params, callback) => {
                callback.call({ changes: 1 }, new Error());
                return db;
            });
            await expect(cartDAO.deleteCartProduct(mockCart, productInCart)).rejects.toThrow(new Error());
            expect(mockDBRun).toHaveBeenCalledTimes(1);
        });
    })
    

    test('getOldCarts: expecting to resolve to an array of carts', async () => {
        const cartRows = [
            { id: 1, customer: 'customer1', paid: 0, payment_date: null, total: 1200.5 },
            { id: 2, customer: 'customer1', paid: 1, payment_date: '2024-06-08', total: 1700.8 },
        ]
        const cartProductRows = [
            { cart: 1, model: 'product1', cart_quantity: 1, category: 'Smartphone', selling_price: 500 },
            { cart: 1, model: 'product2', cart_quantity: 2, category: 'Appliance', selling_price: 700.5 },
            { cart: 2, model: 'product3', cart_quantity: 10, category: 'Laptop', selling_price: 1000.3 },
            { cart: 2, model: 'product2', cart_quantity: 6, category: 'Appliance', selling_price: 700.5 }
        ]
        mockDBAll.mockImplementationOnce((sql, params, callback) => {
            callback(null, cartRows);
            return db;
        });
        mockDBAll.mockImplementationOnce((sql, params, callback) => {
            callback(null, cartProductRows.filter((cp) => cp.cart === cartRows[0].id));
            return db;
        });
        mockDBAll.mockImplementationOnce((sql, params, callback) => {
            callback(null, cartProductRows.filter((cp) => cp.cart === cartRows[1].id));
            return db;
        });
        const result = await cartDAO.getAllCarts();
        expect(mockDBAll).toHaveBeenCalledTimes(3);
        for (let i = 0; i < cartRows.length; i++) {
            const cartProducts = cartProductRows
                .filter(cp => cp.cart === cartRows[i].id)
                .map(cp => new ProductInCart(cp.model, cp.cart_quantity, cp.category as Category, 
                                                cp.selling_price))
            expect(result).toContainEqual(new Cart(cartRows[i].id, cartRows[i].customer, 
                Boolean(cartRows[i].paid), cartRows[i].payment_date, cartRows[i].total, cartProducts))
        }
    });

});

