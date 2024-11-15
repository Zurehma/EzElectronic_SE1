import { test, expect, jest, describe, beforeEach } from "@jest/globals"
import CartController from "../../src/controllers/cartController"
import CartDAO from "../../src/dao/cartDAO"
import { Cart, ProductInCart } from "../../src/components/cart";
import { Category, Product } from "../../src/components/product";
import { User, Role } from "../../src/components/user";
import ProductDAO from "../../src/dao/productDAO";
import { ProductNotFoundError, EmptyProductStockError, LowProductStockError } from "../../src/errors/productError";
import { Utility } from "../../src/utilities";
import { CartNotFoundError, EmptyCartError, ProductNotInCartError } from "../../src/errors/cartError";

beforeEach(() => {
    jest.clearAllMocks();
});

describe('Cart Controller unit-tests', () => {
    const cartController = new CartController();
    const user = new User('username', 'Name', 'Surname', Role.CUSTOMER, 'address', 'birthdate');
    const mockedEmptyCart = new Cart(1, 'customer', false, null, 0, []);
    const productInCart1 = new ProductInCart('Iphone 13', 1, 'Smartphone' as Category, 1000);
    const productInCart2 = new ProductInCart('Dyson RVC', 1, 'Appliance' as Category, 650.50);
    const products: Product[] = [
        new Product(1000, 'Iphone 13', 'Smartphone' as Category, '', '', 3),
        new Product(650.50, 'Dyson RVC', 'Appliance' as Category, '', '', 2),
        new Product(1200.30, 'Dell XPS 15', 'Laptop' as Category, '', '', 6)
    ]
    const cartProducts: ProductInCart[] = [
        new ProductInCart(products[0].model, products[0].quantity, products[0].category, 
                            products[0].sellingPrice),
        new ProductInCart(products[1].model, products[1].quantity, products[1].category, 
            products[1].sellingPrice)                    
    ]
    const mockedCart = new Cart(1, 'customer', false, null, 0, [cartProducts[0]]);
    const mockedGetCurrentCart = jest.spyOn(CartDAO.prototype, 'getCurrentCart');
    const mockedGetProductByModel = jest.spyOn(ProductDAO.prototype, 'getProductByModel');
    const mockedUpdateCart = jest.spyOn(CartDAO.prototype, 'updateCart');
    const mockedUpdateProduct = jest.spyOn(ProductDAO.prototype, 'updateProduct');
    const mockedUpdateCartProduct = jest.spyOn(CartDAO.prototype, 'updateCartProduct');
    const mockedDeleteCartProducts = jest.spyOn(CartDAO.prototype, 'deleteCartProducts');

    describe('getCart', () => {
        test('Current cart of the user, expecting to resolve with true', async () => {
            const cart = new Cart(1, 'testCustomer', false, '', 0, []);
            
            jest.spyOn(CartDAO.prototype, 'getCurrentCart').mockResolvedValueOnce(cart);
            const response = await cartController.getCart(user);
            expect(CartDAO.prototype.getCurrentCart).toHaveBeenCalledTimes(1);
            expect(CartDAO.prototype.getCurrentCart).toHaveBeenCalledWith(user);
            expect(response).toEqual(cart);
        });
    });

    describe('addToCart', () => {
        const mockedAddCartProduct = jest.spyOn(CartDAO.prototype, 'addCartProduct');
        const mockedUpdateCartProduct = jest.spyOn(CartDAO.prototype, 'updateCartProduct');

        test('Empty cart, product added: expecting to resolve with true', async () => {
            mockedGetProductByModel.mockResolvedValueOnce(products[0]);
            mockedGetCurrentCart.mockResolvedValueOnce(mockedEmptyCart);
            mockedAddCartProduct.mockResolvedValueOnce(true);
            const response = await cartController.addToCart(user, products[0].model);
            expect(mockedGetProductByModel).toHaveBeenCalledTimes(1);
            expect(mockedGetProductByModel).toHaveBeenCalledWith(products[0].model)
            expect(mockedGetCurrentCart).toHaveBeenCalledTimes(1);
            expect(mockedGetCurrentCart).toHaveBeenCalledWith(user);
            expect(mockedAddCartProduct).toHaveBeenCalledTimes(1);
            expect(mockedAddCartProduct).toHaveBeenCalledWith(mockedEmptyCart.id, products[0]);
            expect(response).toEqual(true);
        });

        test('Product not in cart, product added: expecting to resolve with true', async () => {
            mockedGetProductByModel.mockResolvedValueOnce(products[1]);
            mockedGetCurrentCart.mockResolvedValueOnce(mockedCart);
            mockedAddCartProduct.mockResolvedValueOnce(true);
            mockedUpdateCart.mockResolvedValueOnce(true);
            const response = await cartController.addToCart(user, products[1].model);
            expect(mockedGetProductByModel).toHaveBeenCalledTimes(1);
            expect(mockedGetProductByModel).toHaveBeenCalledWith(products[1].model)
            expect(mockedGetCurrentCart).toHaveBeenCalledTimes(1);
            expect(mockedGetCurrentCart).toHaveBeenCalledWith(user);
            expect(mockedAddCartProduct).toHaveBeenCalledTimes(1);
            expect(mockedAddCartProduct).toHaveBeenCalledWith(mockedCart.id, products[1]);
            expect(mockedUpdateCart).toHaveBeenCalledTimes(1);
            expect(mockedUpdateCart).toHaveBeenCalledWith({...mockedCart, total: mockedCart.total + products[1].sellingPrice});
            expect(response).toEqual(true);
        });

        test('Product in cart, product quantity incremented: expecting to resolve with true', async () => {
            mockedGetProductByModel.mockResolvedValueOnce(products[0]);
            mockedGetCurrentCart.mockResolvedValueOnce(mockedCart);
            mockedUpdateCartProduct.mockResolvedValueOnce(true);
            mockedUpdateCart.mockResolvedValueOnce(true);
            const response = await cartController.addToCart(user, cartProducts[0].model);
            expect(mockedGetProductByModel).toHaveBeenCalledTimes(1);
            expect(mockedGetProductByModel).toHaveBeenCalledWith(cartProducts[0].model);
            expect(mockedGetCurrentCart).toHaveBeenCalledTimes(1);
            expect(mockedGetCurrentCart).toHaveBeenCalledWith(user);
            expect(mockedUpdateCartProduct).toHaveBeenCalledTimes(1);
            expect(mockedUpdateCartProduct).toHaveBeenCalledWith(mockedCart, {...cartProducts[0], 
                                                quantity: cartProducts[0].quantity + 1})
            expect(mockedUpdateCart).toHaveBeenCalledTimes(1);
            expect(mockedUpdateCart).toHaveBeenCalledWith(
                {...mockedCart, total: mockedCart.total + cartProducts[0].price}
            );
            expect(response).toEqual(true);
        });

        test('Product not found, expecting to reject', async () => {
            mockedGetProductByModel.mockRejectedValueOnce(new ProductNotFoundError());
            await expect(cartController.addToCart(user, 'Not existing product'))
                .rejects.toThrow(new ProductNotFoundError());
            expect(mockedGetProductByModel).toHaveBeenCalledTimes(1);
            expect(mockedGetProductByModel).toHaveBeenCalledWith('Not existing product');
            expect(mockedGetCurrentCart).toHaveBeenCalledTimes(0);
            expect(mockedAddCartProduct).toHaveBeenCalledTimes(0);
            expect(mockedUpdateCartProduct).toHaveBeenCalledTimes(0);
            expect(mockedUpdateCart).toHaveBeenCalledTimes(0);
        });

        test('Product with available quantity 0, expecting to reject', async () => {
            mockedGetProductByModel.mockResolvedValueOnce({...products[0], quantity: 0});
            await expect(cartController.addToCart(user, products[0].model))
                .rejects.toThrow(new EmptyProductStockError());
            expect(mockedGetProductByModel).toHaveBeenCalledTimes(1);
            expect(mockedGetProductByModel).toHaveBeenCalledWith(products[0].model);
            expect(mockedGetCurrentCart).toHaveBeenCalledTimes(0);
            expect(mockedAddCartProduct).toHaveBeenCalledTimes(0);
            expect(mockedUpdateCartProduct).toHaveBeenCalledTimes(0);
            expect(mockedUpdateCart).toHaveBeenCalledTimes(0);
        })
    })

    describe('checkoutCart', () => {
        test('Success, expecting to resolve with true', async () => {
            mockedGetCurrentCart.mockResolvedValueOnce(mockedCart);
            mockedCart.products.forEach((item: ProductInCart, index) => {
                mockedGetProductByModel.mockResolvedValueOnce(products[index]);
                // since the mocked cartProducts are in the same position as products
            });
            mockedUpdateCart.mockResolvedValueOnce(true);
            mockedUpdateProduct.mockResolvedValueOnce(true);
            const response = await cartController.checkoutCart(user);
            expect(response).toBe(true);
            expect(mockedGetCurrentCart).toHaveBeenCalledTimes(1);
            expect(mockedGetCurrentCart).toHaveBeenCalledWith(user);
            expect(mockedGetProductByModel).toHaveBeenCalledTimes(mockedCart.products.length);
            mockedCart.products.forEach((item: ProductInCart, index) => {
                expect(mockedGetProductByModel).toHaveBeenNthCalledWith(index+1, item.model);
            });
            expect(mockedUpdateCart).toHaveBeenCalledTimes(1);
            expect(mockedUpdateCart).toHaveBeenCalledWith(
                {...mockedCart, paid: true, paymentDate: Utility.formatDate(new Date())}
            );
            mockedCart.products.forEach((item, index) => {
                expect(mockedUpdateProduct).toHaveBeenNthCalledWith(index+1, products[index]);
            });
        });

        test('Unpaid cart not found, expecting to reject', async () => {
            mockedGetCurrentCart.mockResolvedValueOnce({...mockedEmptyCart});
            await expect(cartController.checkoutCart(user)).rejects.toThrow(new CartNotFoundError());
            expect(mockedGetCurrentCart).toHaveBeenCalledTimes(1);
            expect(mockedGetCurrentCart).toHaveBeenCalledWith(user);
            expect(mockedGetProductByModel).toHaveBeenCalledTimes(0);
            expect(mockedUpdateCart).toHaveBeenCalledTimes(0);
            expect(mockedUpdateProduct).toHaveBeenCalledTimes(0);
        });

        test('Unpaid cart with no products, expecting to reject', async () => {
            mockedGetCurrentCart.mockResolvedValueOnce(mockedEmptyCart);
            await expect(cartController.checkoutCart(user)).rejects.toThrow(new EmptyCartError());
            expect(mockedGetCurrentCart).toHaveBeenCalledTimes(1);
            expect(mockedGetCurrentCart).toHaveBeenCalledWith(user);
            expect(mockedGetProductByModel).toHaveBeenCalledTimes(0);
            expect(mockedUpdateCart).toHaveBeenCalledTimes(0);
            expect(mockedUpdateProduct).toHaveBeenCalledTimes(0);
        });

        test('Product in the cart with stock quantity 0, expecting to reject', async () => {
            mockedGetCurrentCart.mockResolvedValueOnce(mockedCart);
            /* make one product quantity 0 to trigger the error */
            products[0].quantity = 0;
            mockedCart.products.forEach((item: ProductInCart, index) => {
                mockedGetProductByModel.mockResolvedValueOnce(products[index]);  
            });
            await expect(cartController.checkoutCart(user)).rejects.toThrow(new EmptyProductStockError());
            expect(mockedGetCurrentCart).toHaveBeenCalledTimes(1);
            expect(mockedGetCurrentCart).toHaveBeenCalledWith(user);
            expect(mockedGetProductByModel).toHaveBeenCalledTimes(mockedCart.products.length);
            mockedCart.products.forEach((item: ProductInCart, index) => {
                expect(mockedGetProductByModel).toHaveBeenNthCalledWith(index+1, item.model);
            });
            expect(mockedUpdateCart).toHaveBeenCalledTimes(0);
            expect(mockedUpdateProduct).toHaveBeenCalledTimes(0);
        });

        test('Product stock quantity less than cart quantity, expecting to reject', async () => {
            mockedGetCurrentCart.mockResolvedValueOnce(mockedCart);
            /* make one product quantity less than the cart quantity */
            products[0].quantity = mockedCart.products[0].quantity - 1;
            mockedCart.products.forEach((item: ProductInCart, index) => {
                mockedGetProductByModel.mockResolvedValueOnce(products[index]);  
            });
            await expect(cartController.checkoutCart(user)).rejects.toThrow(new LowProductStockError());
            expect(mockedGetCurrentCart).toHaveBeenCalledTimes(1);
            expect(mockedGetCurrentCart).toHaveBeenCalledWith(user);
            expect(mockedGetProductByModel).toHaveBeenCalledTimes(mockedCart.products.length);
            mockedCart.products.forEach((item: ProductInCart, index) => {
                expect(mockedGetProductByModel).toHaveBeenNthCalledWith(index+1, item.model);
            });
            expect(mockedUpdateCart).toHaveBeenCalledTimes(0);
            expect(mockedUpdateProduct).toHaveBeenCalledTimes(0);
        });
    });

    describe('getCustomerCarts', () => {
        const mockedGetOldCarts = jest.spyOn(CartDAO.prototype, 'getOldCarts');
        test('Success, expecting to resolve with true', async () => {
            mockedGetOldCarts.mockResolvedValueOnce([mockedCart]);
            const response = await cartController.getCustomerCarts(user);
            expect(response).toEqual([mockedCart]);
            expect(mockedGetOldCarts).toHaveBeenCalledTimes(1);
            expect(mockedGetOldCarts).toHaveBeenCalledWith(user);
        });

    });

    describe('removeProductFromCart', () => {

        test('Success, expecting to resolve with true', async () => {
            mockedGetProductByModel.mockResolvedValueOnce(products[0]);
            mockedGetCurrentCart.mockResolvedValueOnce(mockedCart);
            mockedUpdateCart.mockResolvedValueOnce(true);
            mockedUpdateCartProduct.mockResolvedValueOnce(true);
            const response = await cartController.removeProductFromCart(user, cartProducts[0].model);
            expect(response).toBe(true);  
            expect(mockedGetProductByModel).toHaveBeenCalledTimes(1);
            expect(mockedGetProductByModel).toHaveBeenCalledWith(cartProducts[0].model);
            expect(mockedGetCurrentCart).toHaveBeenCalledTimes(1);
            expect(mockedGetCurrentCart).toHaveBeenCalledWith(user);
            expect(mockedUpdateCart).toHaveBeenCalledTimes(1);
            expect(mockedUpdateCart).toHaveBeenCalledWith(
                {...mockedCart, total: mockedCart.total - products[0].sellingPrice}
            );
            expect(mockedUpdateCartProduct).toHaveBeenCalledTimes(1);
            expect(mockedUpdateCartProduct).toHaveBeenCalledWith(
                mockedCart,
                {...cartProducts[0], quantity: cartProducts[0].quantity - 1}
            );
        });

        test('Product not in cart, expecting to reject', async () => {
            mockedGetProductByModel.mockResolvedValueOnce(products[1]);
            mockedGetCurrentCart.mockResolvedValueOnce(mockedCart);
            await expect(cartController.removeProductFromCart(user, products[1].model))
                    .rejects.toThrow(new ProductNotInCartError());
            expect(mockedGetProductByModel).toHaveBeenCalledTimes(1);
            expect(mockedGetProductByModel).toHaveBeenCalledWith(products[1].model);
            expect(mockedGetCurrentCart).toHaveBeenCalledTimes(1);
            expect(mockedGetCurrentCart).toHaveBeenCalledWith(user);
            expect(mockedUpdateCart).toHaveBeenCalledTimes(0);
            expect(mockedUpdateCartProduct).toHaveBeenCalledTimes(0);
        });

        test('Product not found, expecting to reject', async () => {
            mockedGetProductByModel.mockRejectedValueOnce(new ProductNotFoundError());
            mockedGetCurrentCart.mockResolvedValueOnce(mockedCart);
            await expect(cartController.removeProductFromCart(user, cartProducts[0].model))
                    .rejects.toThrow(new ProductNotFoundError());
            expect(mockedGetProductByModel).toHaveBeenCalledTimes(1);
            expect(mockedGetProductByModel).toHaveBeenCalledWith(cartProducts[0].model);
            expect(mockedGetCurrentCart).toHaveBeenCalledTimes(1);
            expect(mockedGetCurrentCart).toHaveBeenCalledWith(user);
            expect(mockedUpdateCart).toHaveBeenCalledTimes(0);
            expect(mockedUpdateCartProduct).toHaveBeenCalledTimes(0);
        });

        test('No unpaid cart, expecting to reject', async () => {
            mockedGetProductByModel.mockResolvedValueOnce(products[0]);
            mockedGetCurrentCart.mockResolvedValueOnce(mockedEmptyCart);
            await expect(cartController.removeProductFromCart(user, cartProducts[0].model))
                    .rejects.toThrow(new CartNotFoundError());
            expect(mockedGetProductByModel).toHaveBeenCalledTimes(1);
            expect(mockedGetProductByModel).toHaveBeenCalledWith(cartProducts[0].model);
            expect(mockedGetCurrentCart).toHaveBeenCalledTimes(1);
            expect(mockedGetCurrentCart).toHaveBeenCalledWith(user);
            expect(mockedUpdateCart).toHaveBeenCalledTimes(0);
            expect(mockedUpdateCartProduct).toHaveBeenCalledTimes(0);
        });

    });

    describe('clearCart', () => {

        test('Success, expecting to resolve with true', async () => {
            mockedGetCurrentCart.mockResolvedValueOnce(mockedCart);
            mockedUpdateCart.mockResolvedValueOnce(true);
            mockedDeleteCartProducts.mockResolvedValueOnce(true);
            const response = await cartController.clearCart(user);
            expect(response).toBe(true);
            expect(mockedGetCurrentCart).toHaveBeenCalledTimes(1);
            expect(mockedGetCurrentCart).toHaveBeenCalledWith(user);
            expect(mockedUpdateCart).toHaveBeenCalledTimes(1);
            expect(mockedUpdateCart).toHaveBeenCalledWith({...mockedCart, total: 0});
            expect(mockedDeleteCartProducts).toHaveBeenCalledTimes(1);
            expect(mockedDeleteCartProducts).toHaveBeenCalledWith(mockedCart);
        });

        test('No unpaid cart, expecting to reject', async () => {
            mockedGetCurrentCart.mockRejectedValueOnce(new CartNotFoundError());
            await expect(cartController.clearCart(user)).rejects.toThrow(new CartNotFoundError());
            expect(mockedGetCurrentCart).toHaveBeenCalledTimes(1);
            expect(mockedGetCurrentCart).toHaveBeenCalledWith(user);
            expect(mockedUpdateCart).toHaveBeenCalledTimes(0);
            expect(mockedDeleteCartProducts).toHaveBeenCalledTimes(0);
        });

    });

    describe('deleteAllCarts', () => {
        test('Success, expecting to resolve with true', async () => {
            const mockedDeleteAllCarts = jest.spyOn(CartController.prototype, 'deleteAllCarts');
            mockedDeleteAllCarts.mockResolvedValueOnce(true);
            const response = await cartController.deleteAllCarts();
            expect(response).toBe(true);
            expect(mockedDeleteAllCarts).toHaveBeenCalledTimes(1);
        });
    });

    describe('getAllCarts', () => {
        test('Success, expecting to resolve with true', async () => {
            const mockedGetAllCarts = jest.spyOn(CartController.prototype, 'getAllCarts');
            mockedGetAllCarts.mockResolvedValueOnce([mockedCart]);
            const response = await cartController.getAllCarts();
            expect(response).toEqual([mockedCart]);
            expect(mockedGetAllCarts).toHaveBeenCalledTimes(1);
        });
    })

});


