import { describe, test, expect, jest, beforeEach, afterEach } from "@jest/globals";
import ProductDAO from "../../src/dao/productDAO";
import db from "../../src/db/db";
import { Product, Category } from "../../src/components/product";
import { ProductNotFoundError, ProductAlreadyExistsError, LowProductStockError, ProductSoldError } from "../../src/errors/productError";

jest.mock('../../src/db/db');

describe('ProductDAO unit-tests', () => {
    let productDAO: ProductDAO;
    const mockDBGet = jest.spyOn(db, 'get');
    const mockDBRun = jest.spyOn(db, 'run');
    const mockDBAll = jest.spyOn(db, 'all');

    beforeEach(() => {
        productDAO = new ProductDAO();
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('registerProducts: should throw error if database query fails', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100);
    
        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(new Error('Database error'), null); // Simulate a database error
            return db;
        });
    
        await expect(productDAO.registerProducts(product.model, product.category, product.quantity, product.details, product.sellingPrice, product.arrivalDate))
            .rejects.toThrow('Database error');
    
        expect(mockDBGet).toHaveBeenCalledTimes(1);
        expect(mockDBRun).not.toHaveBeenCalled();
    });


    test('registerProducts: should register a new product', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100);

        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, null); // Product not found
            return db;
        });

        mockDBRun.mockImplementationOnce((sql, params, callback) => {
            callback(null); // Product inserted successfully
            return db;
        });

        await expect(productDAO.registerProducts(product.model, product.category, product.quantity, product.details, product.sellingPrice, product.arrivalDate))
            .resolves.toBeUndefined();

        expect(mockDBGet).toHaveBeenCalledTimes(1);
        expect(mockDBRun).toHaveBeenCalledTimes(1);
    });

    test('registerProducts: should throw error if product already exists', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100);

        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, { model: product.model }); // Product found
            return db;
        });

        await expect(productDAO.registerProducts(product.model, product.category, product.quantity, product.details, product.sellingPrice, product.arrivalDate))
            .rejects.toThrow(ProductAlreadyExistsError);

        expect(mockDBGet).toHaveBeenCalledTimes(1);
        expect(mockDBRun).not.toHaveBeenCalled();
    });

    test('registerProducts: should format arrival date correctly when provided', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2023-06-01", "Details", 100);
    
        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, null); // Product not found
            return db;
        });
    
        mockDBRun.mockImplementationOnce((sql, params, callback) => {
            callback(null); // Product inserted successfully
            return db;
        });
    
        await expect(productDAO.registerProducts(product.model, product.category, product.quantity, product.details, product.sellingPrice, product.arrivalDate))
            .resolves.toBeUndefined();
    
        expect(mockDBGet).toHaveBeenCalledTimes(1);
        expect(mockDBRun).toHaveBeenCalledTimes(1);
    });
    

    test('changeProductQuantity: should throw error if database query fails', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100);
    
        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, { quantity: 100, arrival_date: "2024-01-01" }); // Product found
            return db;
        });
    
        mockDBRun.mockImplementationOnce((sql, params, callback) => {
            callback(new Error('Database error'), null); // Simulate a database error
            return db;
        });
    
        await expect(productDAO.changeProductQuantity(product.model, 50, "2024-01-01"))
            .rejects.toThrow('Database error');
    
        expect(mockDBGet).toHaveBeenCalledTimes(1);
        expect(mockDBRun).toHaveBeenCalledTimes(1);
    });
    

    test('changeProductQuantity: should increase product quantity', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100);

        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, { quantity: 100, arrival_date: "2024-01-01" }); // Product found with quantity 100
            return db;
        });

        mockDBRun.mockImplementationOnce((sql, params, callback) => {
            callback(null); // Product quantity updated
            return db;
        });

        const updatedQuantity = await productDAO.changeProductQuantity(product.model, 50, "2024-01-01");
        expect(updatedQuantity).toBe(150);

        expect(mockDBGet).toHaveBeenCalledTimes(1);
        expect(mockDBRun).toHaveBeenCalledTimes(1);
    });

    test('changeProductQuantity: should throw error if product not found', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100);

        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, null); // Product not found
            return db;
        });

        await expect(productDAO.changeProductQuantity(product.model, 50, "2024-01-01"))
            .rejects.toThrow(ProductNotFoundError);

        expect(mockDBGet).toHaveBeenCalledTimes(1);
        expect(mockDBRun).not.toHaveBeenCalled();
    });

    test('changeProductQuantity: should throw error if change date is in the future', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100);

        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, { quantity: 100, arrival_date: "2024-01-01" }); // Product found with quantity 100
            return db;
        });

        await expect(productDAO.changeProductQuantity(product.model, 50, "2030-01-01")) // Future date
            .rejects.toThrow('Change date cannot be after the current date');

        expect(mockDBGet).toHaveBeenCalledTimes(1);
        expect(mockDBRun).not.toHaveBeenCalled();
    });

    test('changeProductQuantity: should throw error if change date is before the arrival date', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100);

        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, { quantity: 100, arrival_date: "2024-01-01" }); // Product found with quantity 100
            return db;
        });

        await expect(productDAO.changeProductQuantity(product.model, 50, "2022-01-01")) // Date before arrival date
            .rejects.toThrow('Change date cannot be before the arrival date of the product');

        expect(mockDBGet).toHaveBeenCalledTimes(1);
        expect(mockDBRun).not.toHaveBeenCalled();
    });

    test('changeProductQuantity: should throw error if change date is after the current date', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100);
    
        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, { quantity: 100, arrival_date: "2024-01-01" }); // Product found
            return db;
        });
    
        await expect(productDAO.changeProductQuantity(product.model, 50, "2030-01-01")) // Future change date
            .rejects.toThrow('Change date cannot be after the current date');
    
        expect(mockDBGet).toHaveBeenCalledTimes(1);
        expect(mockDBRun).not.toHaveBeenCalled();
    });
    
    test('changeProductQuantity: should throw error if change date is before the arrival date', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100);
    
        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, { quantity: 100, arrival_date: "2024-01-01" }); // Product found
            return db;
        });
    
        await expect(productDAO.changeProductQuantity(product.model, 50, "2023-01-01")) // Date before arrival date
            .rejects.toThrow('Change date cannot be before the arrival date of the product');
    
        expect(mockDBGet).toHaveBeenCalledTimes(1);
        expect(mockDBRun).not.toHaveBeenCalled();
    });
    test('changeProductQuantity: should correctly update quantity when changeDate is not provided', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2023-06-01", "Details", 100);
    
        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, { quantity: 100, arrival_date: "2023-06-01" }); // Product found
            return db;
        });
    
        mockDBRun.mockImplementationOnce((sql, params, callback) => {
            callback(null); // Product quantity updated
            return db;
        });
    
        const updatedQuantity = await productDAO.changeProductQuantity(product.model, 50);
        expect(updatedQuantity).toBe(150);
    
        expect(mockDBGet).toHaveBeenCalledTimes(1);
        expect(mockDBRun).toHaveBeenCalledTimes(1);
    });
    
    test('sellProduct: should throw error if database query fails', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100);
    
        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, { quantity: 100, arrival_date: "2024-01-01" }); // Product found
            return db;
        });
    
        mockDBRun.mockImplementationOnce((sql, params, callback) => {
            callback(new Error('Database error'), null); // Simulate a database error
            return db;
        });
    
        await expect(productDAO.sellProduct(product.model, 50, "2024-06-01"))
            .rejects.toThrow('Database error');
    
        expect(mockDBGet).toHaveBeenCalledTimes(1);
        expect(mockDBRun).toHaveBeenCalledTimes(1);
    });
    

    test('sellProduct: should decrease product quantity', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100);

        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, { quantity: 100, arrival_date: "2024-01-01" }); // Product found
            return db;
        });

        mockDBRun.mockImplementationOnce((sql, params, callback) => {
            callback(null); // Product quantity updated
            return db;
        });

        const updatedQuantity = await productDAO.sellProduct(product.model, 50, "2024-06-01");
        expect(updatedQuantity).toBe(50);

        expect(mockDBGet).toHaveBeenCalledTimes(1);
        expect(mockDBRun).toHaveBeenCalledTimes(1);
    });

    test('sellProduct: should throw error if product not found', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100);

        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, null); // Product not found
            return db;
        });

        await expect(productDAO.sellProduct(product.model, 50, "2024-06-01"))
            .rejects.toThrow(ProductNotFoundError);

        expect(mockDBGet).toHaveBeenCalledTimes(1);
        expect(mockDBRun).not.toHaveBeenCalled();
    });

    test('sellProduct: should throw error if selling date is in the future', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100);

        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, { quantity: 100, arrival_date: "2024-01-01" }); // Product found
            return db;
        });

        await expect(productDAO.sellProduct(product.model, 50, "2030-01-01")) // Future date
            .rejects.toThrow('Selling date cannot be later than the current date');

        expect(mockDBGet).toHaveBeenCalledTimes(1);
        expect(mockDBRun).not.toHaveBeenCalled();
    });

    test('sellProduct: should throw error if selling date is before the arrival date', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100);

        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, { quantity: 100, arrival_date: "2024-01-01" }); // Product found
            return db;
        });

        await expect(productDAO.sellProduct(product.model, 50, "2023-01-01")) // Date before arrival date
            .rejects.toThrow('Selling date must be after the arrival date of the product');

        expect(mockDBGet).toHaveBeenCalledTimes(1);
        expect(mockDBRun).not.toHaveBeenCalled();
    });

    test('sellProduct: should throw error if selling date is after the current date', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100);
    
        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, { quantity: 100, arrival_date: "2024-01-01" }); // Product found
            return db;
        });
    
        await expect(productDAO.sellProduct(product.model, 50, "2030-01-01")) // Future selling date
            .rejects.toThrow('Selling date cannot be later than the current date');
    
        expect(mockDBGet).toHaveBeenCalledTimes(1);
        expect(mockDBRun).not.toHaveBeenCalled();
    });
    
    test('sellProduct: should throw error if selling date is before the arrival date', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100);
    
        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, { quantity: 100, arrival_date: "2024-01-01" }); // Product found
            return db;
        });
    
        await expect(productDAO.sellProduct(product.model, 50, "2023-01-01")) // Date before arrival date
            .rejects.toThrow('Selling date must be after the arrival date of the product');
    
        expect(mockDBGet).toHaveBeenCalledTimes(1);
        expect(mockDBRun).not.toHaveBeenCalled();
    });
    test('sellProduct: should correctly update quantity when sellingDate is not provided', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2023-06-01", "Details", 100);
    
        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, { quantity: 100, arrival_date: "2023-06-01" }); // Product found
            return db;
        });
    
        mockDBRun.mockImplementationOnce((sql, params, callback) => {
            callback(null); // Product quantity updated
            return db;
        });
    
        const updatedQuantity = await productDAO.sellProduct(product.model, 50, null);
        expect(updatedQuantity).toBe(50);
    
        expect(mockDBGet).toHaveBeenCalledTimes(1);
        expect(mockDBRun).toHaveBeenCalledTimes(1);
    });
    
    test('getAvailableProducts: should throw error if database query fails', async () => {
        mockDBAll.mockImplementationOnce((sql, params, callback) => {
            callback(new Error('Database error'), null); // Simulate a database error
            return db;
        });
    
        await expect(productDAO.getAvailableProducts("category", "Smartphone", null))
            .rejects.toThrow('Database error');
    
        expect(mockDBAll).toHaveBeenCalledTimes(1);
    });
    

    test('getAvailableProducts: should return available products', async () => {
        const products = [
            { selling_price: 999.99, model: "ModelX", category: "Smartphone", arrival_date: "2024-01-01", details: "Details", quantity: 100 }
        ];

        mockDBAll.mockImplementationOnce((sql, params, callback) => {
            callback(null, products); // Return list of available products
            return db;
        });

        const result = await productDAO.getAvailableProducts("category", "Smartphone", null);
        expect(result).toEqual([new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100)]);

        expect(mockDBAll).toHaveBeenCalledTimes(1);
    });

    test('getAvailableProducts: should throw error if invalid parameters are provided', async () => {
        await expect(productDAO.getAvailableProducts(null, "Smartphone", "ModelX"))
            .rejects.toThrow('Invalid parameters: grouping is null but category or model is not null');

        await expect(productDAO.getAvailableProducts("category", null, "ModelX"))
            .rejects.toThrow('Invalid parameters: grouping is category but category is null or model is not null');

        await expect(productDAO.getAvailableProducts("model", "Smartphone", null))
            .rejects.toThrow('Invalid parameters: grouping is model but model is null or category is not null');
    });

    test('getAvailableProducts: should throw error if invalid parameters are provided', async () => {
        await expect(productDAO.getAvailableProducts(null, "Smartphone", "ModelX"))
            .rejects.toThrow('Invalid parameters: grouping is null but category or model is not null');
    
        await expect(productDAO.getAvailableProducts("category", null, "ModelX"))
            .rejects.toThrow('Invalid parameters: grouping is category but category is null or model is not null');
    
        await expect(productDAO.getAvailableProducts("model", "Smartphone", null))
            .rejects.toThrow('Invalid parameters: grouping is model but model is null or category is not null');
    });
    
    test('getProducts: should throw error if database query fails', async () => {
        mockDBAll.mockImplementationOnce((sql, params, callback) => {
            callback(new Error('Database error'), null); // Simulate a database error
            return db;
        });
    
        await expect(productDAO.getProducts("category", "Smartphone", null))
            .rejects.toThrow('Database error');
    
        expect(mockDBAll).toHaveBeenCalledTimes(1);
    });
    

    test('getProducts: should return all products', async () => {
        const products = [
            { selling_price: 999.99, model: "ModelX", category: "Smartphone", arrival_date: "2024-01-01", details: "Details", quantity: 100 }
        ];

        mockDBAll.mockImplementationOnce((sql, params, callback) => {
            callback(null, products); // Return list of all products
            return db;
        });

        const result = await productDAO.getProducts("category", "Smartphone", null);
        expect(result).toEqual([new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100)]);

        expect(mockDBAll).toHaveBeenCalledTimes(1);
    });
    test('getProducts: should correctly query products with grouping and category', async () => {
        const products = [
            { selling_price: 999.99, model: "ModelX", category: "Smartphone", arrival_date: "2024-01-01", details: "Details", quantity: 100 }
        ];
    
        mockDBAll.mockImplementationOnce((sql, params, callback) => {
            callback(null, products); // Return list of products
            return db;
        });
    
        const result = await productDAO.getProducts("category", "Smartphone", null);
        expect(result).toEqual([new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100)]);
    
        expect(mockDBAll).toHaveBeenCalledTimes(1);
    });
    
    test('getAvailableProducts: should throw error if invalid parameters are provided', async () => {
        await expect(productDAO.getAvailableProducts(null, "Smartphone", "ModelX")) // grouping is null but category or model is not null
            .rejects.toThrow('Invalid parameters: grouping is null but category or model is not null');
    
        await expect(productDAO.getAvailableProducts("category", null, "ModelX")) // grouping is category but category is null or model is not null
            .rejects.toThrow('Invalid parameters: grouping is category but category is null or model is not null');
    
        await expect(productDAO.getAvailableProducts("model", "Smartphone", null)) // grouping is model but model is null or category is not null
            .rejects.toThrow('Invalid parameters: grouping is model but model is null or category is not null');
    });
    
    
    test('deleteAllProducts: should throw error if database query fails', async () => {
        mockDBRun.mockImplementationOnce((sql, params, callback) => {
            callback(new Error('Database error'), null); // Simulate a database error
            return db;
        });
    
        await expect(productDAO.deleteAllProducts())
            .rejects.toThrow('Database error');
    
        expect(mockDBRun).toHaveBeenCalledTimes(1);
    });
    

    test('deleteAllProducts: should delete all products', async () => {
        mockDBRun.mockImplementationOnce((sql, params, callback) => {
            callback(null); // All products deleted
            return db;
        });

        const result = await productDAO.deleteAllProducts();
        expect(result).toBe(true);

        expect(mockDBRun).toHaveBeenCalledTimes(1);
    });

    test('deleteProduct: should throw error if database delete query fails', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100);
    
        // Step 1: Ensure the product exists
        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, { model: product.model }); // Product found
            return db;
        });
    
        // Step 2: Simulate a database error during deletion
        mockDBRun.mockImplementationOnce((sql, params, callback) => {
            callback(new Error('Database error'), null); // Simulate a database error
            return db;
        });
    
        await expect(productDAO.deleteProduct(product.model))
            .rejects.toThrow('Database error');
    
        expect(mockDBGet).toHaveBeenCalledTimes(1);
        expect(mockDBRun).toHaveBeenCalledTimes(1);
    });
    

    test('deleteProduct: should delete a specific product', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100);

        // Step 1: Ensure the product exists
        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, { model: product.model }); // Product found
            return db;
        });

        // Step 2: Delete the product
        mockDBRun.mockImplementationOnce((sql, params, callback) => {
            callback(null); // Product deleted
            return db;
        });

        // Call the deleteProduct method
        const result = await productDAO.deleteProduct(product.model);

        // Assertions
        expect(mockDBGet).toHaveBeenCalledTimes(1);
        expect(mockDBRun).toHaveBeenCalledTimes(1);
        expect(result).toBe(true);
    });

    test('deleteProduct: should throw error if product not found', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100);

        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, null); // Product not found
            return db;
        });

        await expect(productDAO.deleteProduct(product.model))
            .rejects.toThrow(ProductNotFoundError);

        expect(mockDBGet).toHaveBeenCalledTimes(1);
        expect(mockDBRun).not.toHaveBeenCalled();
    });

    test('deleteProduct: should throw error if database query fails', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100);
    
        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(new Error('Database error'), null); // Simulate a database error
            return db;
        });
    
        await expect(productDAO.deleteProduct(product.model))
            .rejects.toThrow('Database error');
    
        expect(mockDBGet).toHaveBeenCalledTimes(1);
        expect(mockDBRun).not.toHaveBeenCalled();
    });
    
    test('deleteAllProducts: should throw error if database query fails', async () => {
        mockDBRun.mockImplementationOnce((sql, params, callback) => {
            callback(new Error('Database error'), null); // Simulate a database error
            return db;
        });
    
        await expect(productDAO.deleteAllProducts())
            .rejects.toThrow('Database error');
    
        expect(mockDBRun).toHaveBeenCalledTimes(1);
    });
    test('deleteProduct: should throw error if database delete query fails', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100);
    
        // Step 1: Ensure the product exists
        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, { model: product.model }); // Product found
            return db;
        });
    
        // Step 2: Simulate a database error during deletion
        mockDBRun.mockImplementationOnce((sql, params, callback) => {
            callback(new Error('Database error'), null); // Simulate a database error
            return db;
        });
    
        await expect(productDAO.deleteProduct(product.model))
            .rejects.toThrow('Database error');
    
        expect(mockDBGet).toHaveBeenCalledTimes(1);
        expect(mockDBRun).toHaveBeenCalledTimes(1);
    });
    test('getProductByModel: should throw error if database query fails', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100);
    
        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(new Error('Database error'), null); // Simulate a database error
            return db;
        });
    
        await expect(productDAO.getProductByModel(product.model))
            .rejects.toThrow('Database error');
    
        expect(mockDBGet).toHaveBeenCalledTimes(1);
    });
    
    test('getProductByModel: should throw error if database query fails', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100);
    
        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(new Error('Database error'), null); // Simulate a database error
            return db;
        });
    
        await expect(productDAO.getProductByModel(product.model))
            .rejects.toThrow('Database error');
    
        expect(mockDBGet).toHaveBeenCalledTimes(1);
    });
    
    test('getProductByModel: should return a specific product', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100);

        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, {
                selling_price: product.sellingPrice,
                model: product.model,
                category: product.category,
                arrival_date: product.arrivalDate,
                details: product.details,
                quantity: product.quantity
            });
            return db;
        });

        const result = await productDAO.getProductByModel(product.model);
        expect(result).toEqual(product);

        expect(mockDBGet).toHaveBeenCalledTimes(1);
    });

    test('getProductByModel: should throw error if product not found', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Details", 100);

        mockDBGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, null); // Product not found
            return db;
        });

        await expect(productDAO.getProductByModel(product.model))
            .rejects.toThrow(ProductNotFoundError);

        expect(mockDBGet).toHaveBeenCalledTimes(1);
    });

    test('updateProduct: should update a specific product', async () => {
        const product = new Product(999.99, "ModelX", Category.SMARTPHONE, "2024-01-01", "Updated Details", 150);

        mockDBRun.mockImplementationOnce((sql, params, callback) => {
            callback(null); // Product updated
            return db;
        });

        const result = await productDAO.updateProduct(product);
        expect(result).toBe(true);

        expect(mockDBRun).toHaveBeenCalledTimes(1);
    });
});
