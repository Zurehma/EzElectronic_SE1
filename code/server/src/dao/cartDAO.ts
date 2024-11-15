import db from "../db/db"
import { User } from "../components/user"
import { Product } from "../components/product";
import { Cart, ProductInCart } from "../components/cart"


/**
 * A class that implements the interaction with the database for all cart-related operations.
 * You are free to implement any method you need here, as long as the requirements are satisfied.
 */
class CartDAO {

    getCurrentCart(user: User): Promise<Cart> {
        return new Promise<Cart>((resolve, reject) => {
            try {
                const sql = "SELECT * FROM carts WHERE customer=? AND payment_date IS NULL";
                db.get(sql, [user.username], (err: Error | null, row: any) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    if (row) {
                        /* there is already a cart case */
                        this.getCartProducts(row.id)
                            .then((products: ProductInCart[]) => {
                                if (products.length === 0) {
                                    /* no products in the cart */
                                    /* return an empty cart */
                                    const cart = new Cart(row.id, user.username, false, null, 0, []);
                                    resolve(cart);
                                } else {
                                    const cartProducts: ProductInCart[] = products;
                                    const cart = new Cart(row.id, row.customer, Boolean(row.paid), row.payment_date, row.total, cartProducts);
                                    resolve(cart);
                                }
                            })
                            .catch((err) => {
                                reject(err);
                            }) 
                    } else {
                        /* there is no unpaid cart for the user */
                        /* return an empty cart */
                        const cart = new Cart(null, user.username, false, null, 0, []);
                        resolve(cart);
                    }
                });
            } catch (error) {
                reject(error);
            } 
        });
    }

    /* change so that it accepts user, cart to get the foreign key from */
    getCartProducts(cartId: number): Promise<ProductInCart[]> {
        return new Promise<ProductInCart[]>((resolve, reject) => {
            try {
                const sql = "SELECT * FROM cart_products cp JOIN products p ON cp.product=p.model \
                        WHERE cart=?";
                db.all(sql, [cartId], (err: Error | null, rows: any) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    const cartProducts: ProductInCart[] = [];
                    for (let row of rows) {
                        const cartProduct = new ProductInCart(row.model, row.cart_quantity, row.category, row.selling_price);
                        cartProducts.push(cartProduct);
                    }
                    resolve(cartProducts);
                });
            } catch (error) {
                reject(error);
            } 
        });
    }


    addCart(cart: Cart): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            try {
                const sql = "INSERT INTO carts (customer, paid, payment_date, total) \
                            VALUES (?, ?, ?, ?)";
                db.run(sql, [cart.customer, Number(cart.paid), cart.paymentDate, cart.total], 
                    function(error) {
                        if (error) {
                            reject(error);
                        }
                        if (this.lastID) {
                            resolve(this.lastID);
                        }
                });
            } catch (error) {
                reject(error);
            } 
        })
    }

    addCartProduct(cartID: number, product: Product): Promise<Boolean> {
        return new Promise<Boolean>((resolve, reject) => {
            try {
                const sql = "INSERT INTO cart_products VALUES (?, ?, ?)";
                db.run(sql, [cartID, product.model, 1], function(error) {
                    if (error) {
                        return reject(error);
                    }
                    resolve(true);
                });
            } catch (error) {
                reject(error);
            } 
        })
    }

    updateCart(cart: Cart): Promise<Boolean> {
        return new Promise<Boolean>((resolve, reject) => {
            try {
                const sql = "UPDATE carts SET customer=?, paid=?, payment_date=?, total=? WHERE id=?";
                db.run(sql, [cart.customer, Number(cart.paid), cart.paymentDate, cart.total, cart.id], function(err) {
                    if (err) {
                        reject(err);
                    } else if (this.changes === 1) {
                        resolve(true);
                    }
                });
            } catch (error) {
                reject(error);
            } 
        });
    }

    getAllCarts(): Promise<Cart[]> {
        return new Promise<Cart[]>((resolve, reject) => {
            try {
                const sql = "SELECT * FROM carts";
                db.all(sql, [], (err: Error | null, rows: any) => {
                    if (err) {
                        reject(err);
                    }
                    const cartPromises = rows.map(async (row: any) => {
                        try {
                            const cartProducts = await this.getCartProducts(row.id);
                            return new Cart(row.id, row.customer, Boolean(row.paid),
                                row.payment_date, row.total, cartProducts);
                        } catch (error) {
                            return reject(error);
                        }
                    });
                    Promise.all(cartPromises)
                        .then((carts: Cart[]) => {
                            resolve(carts);
                        })
                        .catch((error) => reject(error))
                })
            } catch (error) {
                reject(error);
            } 
        });
    }

    deleteAllCarts(): Promise<Boolean> {
        return new Promise<Boolean>((resolve, reject) => {
            try {
                const sql = "DELETE FROM carts";
                db.run(sql, [], function(err) {
                    if (err) {
                        console.log(err);
                        reject(err);
                    }
                    resolve(true);
                });
            } catch (error) {
                reject(error);
            } 
        })
    }

    deleteCartProducts(cart: Cart): Promise<Boolean> {
        return new Promise<Boolean>((resolve, reject) => {
            try {
                const sql = "DELETE FROM cart_products WHERE cart=?";
                db.run(sql, [cart.id], function(err) {
                    if (err) {
                        reject(err);
                    }
                    resolve(true);
                });
            } catch (error) {
                reject(error);
            } 
        });
    }

    deleteCartProduct(cart: Cart, product: ProductInCart) {
        return new Promise<Boolean>((resolve, reject) => {
            try {
                const sql = "DELETE FROM cart_products WHERE cart=? AND product=?";
                db.run(sql, [cart.id, product.model], function(err) {
                    if (err) {
                        reject(err);
                    }
                    if (this.changes === 1) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                });
            } catch (error) {
                reject(error);
            } 
        })
    }

    updateCartProduct(cart: Cart, cartProduct: ProductInCart): Promise<Boolean> {
        return new Promise<Boolean>((resolve, reject) => {
            try {
                const sql = "UPDATE cart_products SET cart_quantity=? WHERE cart=? AND product=?";
                db.run(sql, [cartProduct.quantity, cart.id, cartProduct.model], function(err) {
                    if (err) {
                        reject(err);
                    }
                    resolve(true);
                });
            } catch (error) {
                reject(error);
            } 
        })
    }

    getOldCarts(user: User): Promise<Cart[]> {
        return new Promise<Cart[]>((resolve, reject) => {
            try {
                const sql = "SELECT * FROM carts WHERE customer=? AND paid=1 AND payment_date IS NOT NULL";
                db.all(sql, [user.username], (err: Error | null, rows: any) => {
                    if (err) {
                        reject(err);
                    }
                    const cartPromises = rows.map(async (row: any) => {
                        try {
                            const cartProducts = await this.getCartProducts(row.id);
                            return new Cart(row.id, row.customer, Boolean(row.paid),
                                row.payment_date, row.total, cartProducts);
                        } catch (error) {
                            return reject(error);
                        }
                    });
                    Promise.all(cartPromises)
                        .then((carts: Cart[]) => {
                            resolve(carts);
                        })
                        .catch((error) => reject(error))
                });
            } catch (error) {
                reject(error);
            } 
        });
    }
}

export default CartDAO