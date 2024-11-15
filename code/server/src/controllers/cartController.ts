import { User } from "../components/user";
import CartDAO from "../dao/cartDAO";
import { Cart, ProductInCart } from "../components/cart";
import { Utility } from "../utilities";
import { CartNotFoundError, EmptyCartError, ProductNotInCartError } from "../errors/cartError";
import { LowProductStockError, EmptyProductStockError } from "../errors/productError";
import ProductDAO from "../dao/productDAO";

/**
 * Represents a controller for managing shopping carts.
 * All methods of this class must interact with the corresponding DAO class to retrieve or store data.
 */
class CartController {
    private dao: CartDAO
    private productDao: ProductDAO

    constructor() {
        this.dao = new CartDAO
        this.productDao = new ProductDAO
    }

    /**
     * Adds a product to the user's cart. If the product is already in the cart, the quantity should be increased by 1.
     * If the product is not in the cart, it should be added with a quantity of 1.
     * If there is no current unpaid cart in the database, then a new cart should be created.
     * @param user - The user to whom the product should be added.
     * @param productId - The model of the product to add.
     * @returns A Promise that resolves to `true` if the product was successfully added.
     */
    async addToCart(user: User, product: string): Promise<Boolean> /*: Promise<Boolean>*/ {
        return new Promise<Boolean>(async (resolve, reject) => {
            try {
                const productInfo = await this.productDao.getProductByModel(product);
                if (productInfo.quantity === 0) {
                    reject(new EmptyProductStockError());
                    return;
                }
                const cart = await this.dao.getCurrentCart(user);
                if (Utility.isCartEmpty(cart)) {
                    if (cart.id == null) {
                        const cartID = await this.dao.addCart({...cart, customer: user.username, 
                                                            total: productInfo.sellingPrice});
                        resolve(this.dao.addCartProduct(cartID, productInfo));
                        return;
                    } else {
                        Promise.all([
                            this.dao.addCartProduct(cart.id, productInfo),
                            this.dao.updateCart({...cart, total: productInfo.sellingPrice})
                        ]);
                        resolve(true);
                    }
                    
                } else {
                    const cartProduct = cart.products.find((p) => p.model === product);
                    if (cartProduct) {
                        Promise.all([
                            this.dao.updateCartProduct(cart, {...cartProduct, quantity: cartProduct.quantity + 1}),
                            this.dao.updateCart({...cart, total: cart.total + cartProduct.price})
                        ]);
                        resolve(true);
                    } else {
                        Promise.all([
                            this.dao.addCartProduct(cart.id, productInfo),
                            this.dao.updateCart({...cart, total: cart.total + productInfo.sellingPrice})
                        ]);
                        resolve(true);
                    }
                }
            } catch (error) {
                // is catching a possible 404 ProductNotFoundError from the getProductByModel method
                reject(error);
            }
        })
    }


    /**
     * Retrieves the current cart for a specific user.
     * @param user - The user for whom to retrieve the cart.
     * @returns A Promise that resolves to the user's cart or an empty one if there is no current cart.
     */
    async getCart(user: User): Promise<Cart> /*: Cart*/ {
        return this.dao.getCurrentCart(user);
    }

    /**
     * Checks out the user's cart. We assume that payment is always successful, there is no need to implement anything related to payment.
     * @param user - The user whose cart should be checked out.
     * @returns A Promise that resolves to `true` if the cart was successfully checked out.
     * 
     */
    async checkoutCart(user: User): Promise<Boolean> /**Promise<Boolean> */ { 
        return new Promise<Boolean>(async (resolve, reject) => {
            try {
                const cart = await this.dao.getCurrentCart(user);
                if (Utility.isCartEmpty(cart) && cart.id === null) {
                    reject(new CartNotFoundError());
                    return;
                } else if (cart.products.length === 0) {
                    reject(new EmptyCartError());
                    return;
                }
                const productInfo = await Promise.all(
                    cart.products.map((p) => this.productDao.getProductByModel(p.model))
                );
                for (let i = 0; i < cart.products.length; i++) {
                    if (productInfo[i].quantity === 0) {
                        reject(new EmptyProductStockError());
                        return;
                    } else if (cart.products[i].quantity > productInfo[i].quantity) {
                        reject(new LowProductStockError());
                        return;
                    } else {
                        productInfo[i].quantity -= cart.products[i].quantity;
                    }
                }
                const date = Utility.formatDate(new Date());
                await Promise.all([
                    this.dao.updateCart({...cart, paid: true, paymentDate: date}),
                                        productInfo.map((p) => this.productDao.updateProduct(p))
                ]);
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Retrieves all paid carts for a specific customer.
     * @param user - The customer for whom to retrieve the carts.
     * @returns A Promise that resolves to an array of carts belonging to the customer.
     * Only the carts that have been checked out should be returned, the current cart should not be included in the result.
     */
    async getCustomerCarts(user: User): Promise<Cart[]> { 
        return this.dao.getOldCarts(user);
    } /**Promise<Cart[]> */

    /**
     * Removes one product unit from the current cart. In case there is more than one unit in the cart, only one should be removed.
     * @param user The user who owns the cart.
     * @param product The model of the product to remove.
     * @returns A Promise that resolves to `true` if the product was successfully removed.
     */
    async removeProductFromCart(user: User, product: string): Promise<Boolean> /**Promise<Boolean> */ { 
        return new Promise<Boolean>(async (resolve, reject) => {
            try {
                const [prod, cart] = await Promise.all([
                    this.productDao.getProductByModel(product),
                    this.dao.getCurrentCart(user)
                ]);
                if (Utility.isCartEmpty(cart)) {
                    reject(new CartNotFoundError());
                    return;
                }
                const cartProduct = cart.products.find((p) => p.model === product);
                if (!cartProduct) {
                    reject(new ProductNotInCartError());
                    return;
                }
                const cartTotal = cart.total - prod.sellingPrice;
                const quantity = cartProduct.quantity - 1;
                const cartProductAction = quantity > 0 ? 
                    this.dao.updateCartProduct(cart, {...cartProduct, quantity: quantity})
                    :
                    this.dao.deleteCartProduct(cart, cartProduct);
                await Promise.all([
                    this.dao.updateCart({...cart, total: cartTotal}),
                    cartProductAction
                ]);
                resolve(true);
            } catch (error) {
                // is catching a possible 404 ProductNotFoundError from the getProductByModel method
                reject(error);
            }
        });
    }


    /**
     * Removes all products from the current cart.
     * @param user - The user who owns the cart.
     * @returns A Promise that resolves to `true` if the cart was successfully cleared.
     */
    async clearCart(user: User): Promise<Boolean> /*:Promise<Boolean> */ { 
        return new Promise<Boolean>(async (resolve, reject) => {
            try {
                const cart = await this.dao.getCurrentCart(user);
                if (Utility.isCartEmpty(cart)) {
                    reject(new CartNotFoundError());
                    return;
                }
                await Promise.all([
                    this.dao.updateCart({...cart, total: 0}),
                    this.dao.deleteCartProducts(cart)
                ]);
                resolve(true);
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Deletes all carts of all users.
     * @returns A Promise that resolves to `true` if all carts were successfully deleted.
     */
    async deleteAllCarts(): Promise<Boolean> /**Promise<Boolean> */ { 
        return this.dao.deleteAllCarts();
    }

    /**
     * Retrieves all carts in the database.
     * @returns A Promise that resolves to an array of carts.
     */
    async getAllCarts(): Promise<Cart[]> /*:Promise<Cart[]> */ { 
        return this.dao.getAllCarts();
    }
}

export default CartController