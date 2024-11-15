

import { Request, Response } from 'express';
import ProductDAO from '../dao/productDAO';
import {
    ProductNotFoundError,
    ProductSoldError,
    LowProductStockError,
    ProductAlreadyExistsError
} from '../errors/productError';

import { Product } from '../components/product';
import productDAO from '../dao/productDAO';
import db from '../db/db';

class ProductController {
    private productDAO: ProductDAO;
    

    constructor() {
        this.productDAO = new ProductDAO();
    }
    async registerProducts(model: string, category: string, quantity: number, details: string | null, sellingPrice: number, arrivalDate: string | null): Promise<void> {
        try {
            return await this.productDAO.registerProducts(model, category, quantity, details, sellingPrice, arrivalDate);
        } catch (error) {
            if (error.message === 'Arrival date cannot be in the future') {
                throw { customMessage: error.message, customCode: 400 };
            } else if (error instanceof ProductAlreadyExistsError) {
                throw { customMessage: error.customMessage, customCode: error.customCode };
            }
            throw new Error(`Error registering product: ${error.message}`);
        }
    }
/*
    async registerProducts(model: string, category: string, quantity: number, details: string | null, sellingPrice: number, arrivalDate: string | null): Promise<void> {
        try {
            return await this.productDAO.registerProducts(model, category, quantity, details, sellingPrice, arrivalDate);
        } catch (error) {
            if (error.message === 'Arrival date cannot be after the current date') {
                throw { customMessage: error.message, customCode: 400 };
            }else if (error instanceof ProductAlreadyExistsError) {
                throw { customMessage: error.customMessage, customCode: error.customCode };
            }
            throw new Error(`Error registering product: ${error.message}`);
        }
    }
*/
    async changeProductQuantity(model: string, quantity: number, changeDate: string | null = null): Promise<number> {
        //console.log(`changeProductQuantity called with model=${model}, quantity=${quantity}, changeDate=${changeDate}`);
        
        try {
            const updatedQuantity = await this.productDAO.changeProductQuantity(model, quantity, changeDate);
            //console.log(`Product quantity updated: model=${model}, updatedQuantity=${updatedQuantity}`);
            return updatedQuantity;
        } catch (error) {
            if (error instanceof ProductNotFoundError) {
                //console.error('Product not found error:', error.customMessage);
                throw { customMessage: error.customMessage, customCode: error.customCode };
            }
            if (error.message === 'Change date cannot be after the current date' || error.message === 'Change date cannot be before the arrival date of the product') {
                //console.error('Invalid change date error:', error.message);
                throw { customMessage: error.message, customCode: 400 };
            }
            //console.error('Error changing product quantity:', error.message);
            throw new Error(`Error changing product quantity: ${error.message}`);
        }
    }

    async sellProduct(model: string, quantity: number, sellingDate: string | null): Promise<number> {
        try {
            const updatedQuantity = await this.productDAO.sellProduct(model, quantity, sellingDate);
            return updatedQuantity;
        } catch (error) {
            if (error instanceof ProductNotFoundError || error instanceof ProductSoldError || error instanceof LowProductStockError) {
                throw { customMessage: error.customMessage, customCode: error.customCode };
            }
            if (error.message === 'Selling date cannot be later than the current date' || error.message === 'Selling date must be after the arrival date of the product') {
                throw { customMessage: error.message, customCode: 400 };
            }
            throw new Error(`Error selling product: ${error.message}`);
        }
    }
    
    
    

    async getAvailableProducts(grouping: string | null, category: string | null, model: string | null): Promise<Product[]> {
        try {
            //console.log(`Controller parameters: { grouping: ${grouping}, category: ${category}, model: ${model} }`);
            const products = await this.productDAO.getAvailableProducts(grouping, category, model);
            return products;
        } catch (error) {
            if (error.message.includes('Invalid parameters')) {
                throw { customMessage: error.message, customCode: 422 };
            } else if (error instanceof ProductNotFoundError) {
                throw { customMessage: error.customMessage, customCode: 404 };
            }
            //console.error('Error getting available products:', error.message);
            throw new Error(`Error getting available products: ${error.message}`);
        }
    }
    
    
    
    
    
    
    

    async getProducts(grouping: string | null, category: string | null, model: string | null): Promise<Product[]> {
        try {
            const products = await this.productDAO.getProducts(grouping, category, model);
            if (grouping === 'model' && products.length === 0) {
                throw new ProductNotFoundError();
            }
            return products;
        } catch (error) {
            if (error instanceof ProductNotFoundError) {
                throw { customMessage: error.customMessage, customCode: error.customCode };
            }
            throw new Error(`Error getting all products: ${error.message}`);
        }
    }
    


    async deleteAllProducts(): Promise<Boolean> {
        try {
            const deleted = await this.productDAO.deleteAllProducts();
            return deleted;
        } catch (error) {
            throw new Error(`Error deleting all products: ${error.message}`);
        }
    }

    async deleteProduct(model: string): Promise<Boolean> {
        try {
            //console.log(`Controller: Deleting product with model ${model}`);
            return await this.productDAO.deleteProduct(model);
        } catch (error) {
            if (error instanceof ProductNotFoundError) {
                //console.warn('Caught ProductNotFoundError:', error.customMessage);
                throw { customMessage: error.customMessage, customCode: error.customCode };
            }
            //console.error('Error deleting product:', error);
            throw new Error(`Error deleting product: ${error.message}`);
        }
    }

}

export default ProductController;
