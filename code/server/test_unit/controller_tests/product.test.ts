import { test, expect, jest, afterEach, beforeEach, describe } from "@jest/globals";
import ProductController from "../../src/controllers/productController";
import ProductDAO from "../../src/dao/productDAO";
import { Category, Product } from "../../src/components/product";
import {
    ProductNotFoundError,
    ProductSoldError,
    LowProductStockError,
    ProductAlreadyExistsError
} from "../../src/errors/productError";

jest.mock("../../src/dao/productDAO");

describe("ProductController", () => {
    let productController: ProductController;
    let productDAO: jest.Mocked<ProductDAO>;

    beforeEach(() => {
        productDAO = new ProductDAO() as jest.Mocked<ProductDAO>;
        productController = new ProductController();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test("registerProducts should register a new product", async () => {
        const productData = {
            model: "ModelX",
            category: "Smartphone",
            quantity: 100,
            details: "Details",
            sellingPrice: 999.99,
            arrivalDate: "2024-01-01"
        };

        jest.spyOn(ProductDAO.prototype, "registerProducts").mockResolvedValueOnce();

        await expect(productController.registerProducts(
            productData.model,
            productData.category,
            productData.quantity,
            productData.details,
            productData.sellingPrice,
            productData.arrivalDate
        )).resolves.toBeUndefined();

        expect(ProductDAO.prototype.registerProducts).toHaveBeenCalledTimes(1);
        expect(ProductDAO.prototype.registerProducts).toHaveBeenCalledWith(
            productData.model,
            productData.category,
            productData.quantity,
            productData.details,
            productData.sellingPrice,
            productData.arrivalDate
        );
    });

    test("registerProducts should handle ProductAlreadyExistsError", async () => {
        const productData = {
            model: "ModelX",
            category: "Smartphone",
            quantity: 100,
            details: "Details",
            sellingPrice: 999.99,
            arrivalDate: "2024-01-01"
        };

        const error = new ProductAlreadyExistsError();
        jest.spyOn(ProductDAO.prototype, "registerProducts").mockRejectedValueOnce(error);

        await expect(productController.registerProducts(
            productData.model,
            productData.category,
            productData.quantity,
            productData.details,
            productData.sellingPrice,
            productData.arrivalDate
        )).rejects.toEqual({ customMessage: error.customMessage, customCode: error.customCode });

        expect(ProductDAO.prototype.registerProducts).toHaveBeenCalledWith(
            productData.model,
            productData.category,
            productData.quantity,
            productData.details,
            productData.sellingPrice,
            productData.arrivalDate
        );
    });

    test("registerProducts should handle arrival date in the future", async () => {
        const productData = {
            model: "ModelX",
            category: "Smartphone",
            quantity: 100,
            details: "Details",
            sellingPrice: 999.99,
            arrivalDate: "2030-01-01"
        };

        const error = new Error('Arrival date cannot be in the future');
        jest.spyOn(ProductDAO.prototype, "registerProducts").mockRejectedValueOnce(error);

        await expect(productController.registerProducts(
            productData.model,
            productData.category,
            productData.quantity,
            productData.details,
            productData.sellingPrice,
            productData.arrivalDate
        )).rejects.toEqual({ customMessage: error.message, customCode: 400 });

        expect(ProductDAO.prototype.registerProducts).toHaveBeenCalledWith(
            productData.model,
            productData.category,
            productData.quantity,
            productData.details,
            productData.sellingPrice,
            productData.arrivalDate
        );
    });

    test("changeProductQuantity should increase product quantity", async () => {
        const productData = {
            model: "ModelX",
            quantity: 100,
            changeDate: "2024-01-01"
        };

        jest.spyOn(ProductDAO.prototype, "changeProductQuantity").mockResolvedValueOnce(200);

        const updatedQuantity = await productController.changeProductQuantity(
            productData.model,
            productData.quantity,
            productData.changeDate
        );

        expect(ProductDAO.prototype.changeProductQuantity).toHaveBeenCalledWith(
            productData.model,
            productData.quantity,
            productData.changeDate
        );

        expect(updatedQuantity).toBe(200);
    });

    test("changeProductQuantity should handle ProductNotFoundError", async () => {
        const productData = {
            model: "NonExistentModel",
            quantity: 100,
            changeDate: "2024-01-01"
        };

        const error = new ProductNotFoundError();
        jest.spyOn(ProductDAO.prototype, "changeProductQuantity").mockRejectedValueOnce(error);

        await expect(productController.changeProductQuantity(
            productData.model,
            productData.quantity,
            productData.changeDate
        )).rejects.toEqual({ customMessage: error.customMessage, customCode: error.customCode });

        expect(ProductDAO.prototype.changeProductQuantity).toHaveBeenCalledWith(
            productData.model,
            productData.quantity,
            productData.changeDate
        );
    });

    test("changeProductQuantity should handle future changeDate", async () => {
        const productData = {
            model: "ModelX",
            quantity: 100,
            changeDate: "2030-01-01"
        };

        const error = new Error('Change date cannot be after the current date');
        jest.spyOn(ProductDAO.prototype, "changeProductQuantity").mockRejectedValueOnce(error);

        await expect(productController.changeProductQuantity(
            productData.model,
            productData.quantity,
            productData.changeDate
        )).rejects.toEqual({ customMessage: error.message, customCode: 400 });

        expect(ProductDAO.prototype.changeProductQuantity).toHaveBeenCalledWith(
            productData.model,
            productData.quantity,
            productData.changeDate
        );
    });

    test("sellProduct should decrease product quantity", async () => {
        const productData = {
            model: "ModelX",
            quantity: 50,
            sellingDate: "2024-01-01"
        };

        jest.spyOn(ProductDAO.prototype, "sellProduct").mockResolvedValueOnce(50);

        const updatedQuantity = await productController.sellProduct(
            productData.model,
            productData.quantity,
            productData.sellingDate
        );

        expect(ProductDAO.prototype.sellProduct).toHaveBeenCalledWith(
            productData.model,
            productData.quantity,
            productData.sellingDate
        );

        expect(updatedQuantity).toBe(50);
    });

    test("sellProduct should handle ProductNotFoundError", async () => {
        const productData = {
            model: "NonExistentModel",
            quantity: 50,
            sellingDate: "2024-01-01"
        };

        const error = new ProductNotFoundError();
        jest.spyOn(ProductDAO.prototype, "sellProduct").mockRejectedValueOnce(error);

        await expect(productController.sellProduct(
            productData.model,
            productData.quantity,
            productData.sellingDate
        )).rejects.toEqual({ customMessage: error.customMessage, customCode: error.customCode });

        expect(ProductDAO.prototype.sellProduct).toHaveBeenCalledWith(
            productData.model,
            productData.quantity,
            productData.sellingDate
        );
    });

    test("sellProduct should handle future sellingDate", async () => {
        const productData = {
            model: "ModelX",
            quantity: 50,
            sellingDate: "2030-01-01"
        };

        const error = new Error('Selling date cannot be later than the current date');
        jest.spyOn(ProductDAO.prototype, "sellProduct").mockRejectedValueOnce(error);

        await expect(productController.sellProduct(
            productData.model,
            productData.quantity,
            productData.sellingDate
        )).rejects.toEqual({ customMessage: error.message, customCode: 400 });

        expect(ProductDAO.prototype.sellProduct).toHaveBeenCalledWith(
            productData.model,
            productData.quantity,
            productData.sellingDate
        );
    });

    test("sellProduct should handle LowProductStockError", async () => {
        const productData = {
            model: "ModelX",
            quantity: 150,
            sellingDate: "2024-01-01"
        };

        const error = new LowProductStockError();
        jest.spyOn(ProductDAO.prototype, "sellProduct").mockRejectedValueOnce(error);

        await expect(productController.sellProduct(
            productData.model,
            productData.quantity,
            productData.sellingDate
        )).rejects.toEqual({ customMessage: error.customMessage, customCode: error.customCode });

        expect(ProductDAO.prototype.sellProduct).toHaveBeenCalledWith(
            productData.model,
            productData.quantity,
            productData.sellingDate
        );
    });

    test("sellProduct should handle ProductSoldError", async () => {
        const productData = {
            model: "ModelX",
            quantity: 1,
            sellingDate: "2024-01-01"
        };

        const error = new ProductSoldError();
        jest.spyOn(ProductDAO.prototype, "sellProduct").mockRejectedValueOnce(error);

        await expect(productController.sellProduct(
            productData.model,
            productData.quantity,
            productData.sellingDate
        )).rejects.toEqual({ customMessage: error.customMessage, customCode: error.customCode });

        expect(ProductDAO.prototype.sellProduct).toHaveBeenCalledWith(
            productData.model,
            productData.quantity,
            productData.sellingDate
        );
    });

    test("getAvailableProducts should return available products", async () => {
        const expectedProducts: Product[] = [
            new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100)
        ];

        jest.spyOn(ProductDAO.prototype, "getAvailableProducts").mockResolvedValueOnce(expectedProducts);

        const result = await productController.getAvailableProducts("category", "Smartphone", "");

        expect(ProductDAO.prototype.getAvailableProducts).toHaveBeenCalledWith("category", "Smartphone", "");

        expect(result).toEqual(expectedProducts);
    });

    test("getAvailableProducts should handle invalid parameters", async () => {
        jest.spyOn(ProductDAO.prototype, "getAvailableProducts").mockRejectedValueOnce(new Error('Invalid parameters'));

        await expect(productController.getAvailableProducts(null, "Smartphone", null)).rejects.toEqual({ customMessage: 'Invalid parameters', customCode: 422 });

        expect(ProductDAO.prototype.getAvailableProducts).toHaveBeenCalledWith(null, "Smartphone", null);
    });

    test("getProducts should return all products", async () => {
        const expectedProducts: Product[] = [
            new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100)
        ];

        jest.spyOn(ProductDAO.prototype, "getProducts").mockResolvedValueOnce(expectedProducts);

        const result = await productController.getProducts("category", "Smartphone", null);

        expect(ProductDAO.prototype.getProducts).toHaveBeenCalledWith("category", "Smartphone", null);

        expect(result).toEqual(expectedProducts);
    });


    test("deleteAllProducts should delete all products", async () => {
        jest.spyOn(ProductDAO.prototype, "deleteAllProducts").mockResolvedValueOnce(true);

        const result = await productController.deleteAllProducts();

        expect(ProductDAO.prototype.deleteAllProducts).toHaveBeenCalled();

        expect(result).toBe(true);
    });

    test("deleteProduct should delete a specific product", async () => {
        const productModel = "ModelX";

        jest.spyOn(ProductDAO.prototype, "deleteProduct").mockResolvedValueOnce(true);

        const result = await productController.deleteProduct(productModel);

        expect(ProductDAO.prototype.deleteProduct).toHaveBeenCalledWith(productModel);

        expect(result).toBe(true);
    });

    test("deleteProduct should handle ProductNotFoundError", async () => {
        const productModel = "NonExistentModel";

        jest.spyOn(ProductDAO.prototype, "deleteProduct").mockRejectedValueOnce(new ProductNotFoundError());

        await expect(productController.deleteProduct(productModel)).rejects.toEqual({ customMessage: "Product not found", customCode: 404 });

        expect(ProductDAO.prototype.deleteProduct).toHaveBeenCalledWith(productModel);
    });

    test("registerProducts should handle unexpected errors", async () => {
        const productData = {
            model: "ModelX",
            category: "Smartphone",
            quantity: 100,
            details: "Details",
            sellingPrice: 999.99,
            arrivalDate: "2024-01-01"
        };

        const errorMessage = "Unexpected error";

        jest.spyOn(ProductDAO.prototype, "registerProducts").mockRejectedValueOnce(new Error(errorMessage));

        await expect(productController.registerProducts(
            productData.model,
            productData.category,
            productData.quantity,
            productData.details,
            productData.sellingPrice,
            productData.arrivalDate
        )).rejects.toThrow(`Error registering product: ${errorMessage}`);

        expect(ProductDAO.prototype.registerProducts).toHaveBeenCalledWith(
            productData.model,
            productData.category,
            productData.quantity,
            productData.details,
            productData.sellingPrice,
            productData.arrivalDate
        );
    });
});
