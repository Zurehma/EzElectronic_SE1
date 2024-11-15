import express, { Router } from "express"
import ErrorHandler from "../helper"
import { body, param, query } from "express-validator"
import ProductController from "../controllers/productController"
import Authenticator from "./auth"
import { Product } from "../components/product"
import { ProductSoldError, LowProductStockError, ProductNotFoundError } from "../errors/productError"

/**
 * Represents a class that defines the routes for handling proposals.
 */
class ProductRoutes{
    private controller: ProductController
    private router: Router
    private errorHandler: ErrorHandler
    private authenticator: Authenticator

    /**
     * Constructs a new instance of the ProductRoutes class.
     * @param {Authenticator} authenticator - The authenticator object used for authentication.
     */
    constructor(authenticator: Authenticator) {
        this.authenticator = authenticator
        this.controller = new ProductController()
        this.router = express.Router()
        this.errorHandler = new ErrorHandler()
        this.initRoutes()
    }

    /**
     * Returns the router instance.
     * @returns The router instance.
     */
    getRouter(): Router {
        return this.router
    }

    /**
     * Initializes the routes for the product router.
     * 
     * @remarks
     * This method sets up the HTTP routes for handling product-related operations such as registering products, registering arrivals, selling products, retrieving products, and deleting products.
     * It can (and should!) apply authentication, authorization, and validation middlewares to protect the routes.
     * 
     */
    initRoutes() {
        

        /**
         * Route for registering the arrival of a set of products.
         * It requires the user to be logged in and to be either an admin or a manager.
         * It requires the following parameters:
         * - model: string. It cannot be empty and it cannot be repeated in the database.
         * - category: string (one of "Smartphone", "Laptop", "Appliance")
         * - quantity: number. It must be greater than 0.
         * - details: string. It can be empty.
         * - sellingPrice: number. It must be greater than 0.
         * - arrivalDate: string. It can be omitted. If present, it must be a valid date in the format YYYY-MM-DD that is not after the current date
         * It returns a 200 status code if the arrival was registered successfully.
         */
        this.router.post(
            "/",
            [
                this.authenticator.isLoggedIn,
                this.authenticator.isAdminOrManager,
                body('model').isString().notEmpty(),
                body('category').isIn(["Smartphone", "Laptop", "Appliance"]),
                body('quantity').isInt({ min: 1 }),
                body('details').isString().optional(),
                body('sellingPrice').isFloat({ gt: 0 }),
                body('arrivalDate').optional().isDate({ format: 'YYYY-MM-DD' }),
            ],
            this.errorHandler.validateRequest,
            (req: any, res: any, next: any) => {
                this.controller.registerProducts(req.body.model, req.body.category, req.body.quantity, req.body.details, req.body.sellingPrice, req.body.arrivalDate)
                    .then(() => res.status(200).end())
                    .catch((err) => {
                        if (err.customCode) {
                            res.status(err.customCode).json({ message: err.customMessage });
                        } else {
                            next(err);
                        }
                    });
            }
        );

        /**
         * Route for registering the increase in quantity of a product.
         * It requires the user to be logged in and to be either an admin or a manager.
         * It requires the product model as a request parameter. The model must be a string and cannot be empty, and it must represent an existing product.
         * It requires the following body parameters:
         * - quantity: number. It must be greater than 0. This number represents the increase in quantity, to be added to the existing quantity.
         * - changeDate: string. It can be omitted. If present, it must be a valid date in the format YYYY-MM-DD that is not after the current date and is after the arrival date of the product.
         * It returns the new quantity of the product.
         */
        this.router.patch(
            "/:model",
            [
                this.authenticator.isLoggedIn,
                this.authenticator.isAdminOrManager,
                param('model').isString().notEmpty().withMessage('Model is required and should be a non-empty string'),
                body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
                body('changeDate').optional().isDate({ format: 'YYYY-MM-DD' }).withMessage('Change date must be a valid date in the format YYYY-MM-DD'),
            ],
            this.errorHandler.validateRequest,
            (req: any, res: any, next: any) => {
                //console.log(`PATCH /products/${req.params.model} - Request received`);
                //console.log('Request body:', req.body);

                this.controller.changeProductQuantity(req.params.model, req.body.quantity, req.body.changeDate)
                    .then((quantity) => {
                        //console.log('Product quantity updated successfully:', quantity);
                        res.status(200).json({ quantity });
                    })
                    .catch((err) => {
                        if (err.customCode) {
                            //console.error('Custom error occurred:', err.customMessage);
                            res.status(err.customCode).json({ message: err.customMessage });
                        } else {
                            //console.error('Unexpected error occurred:', err.message);
                            next(err);
                        }
                    });
            }
        );
        

        /**
         * Route for selling a product.
         * It requires the user to be logged in and to be either an admin or a manager.
         * It requires the product model as a request parameter. The model must be a string and cannot be empty, and it must represent an existing product.
         * It requires the following body parameters:
         * - quantity: number. It must be greater than 0. This number represents the quantity of units sold. It must be less than or equal to the available quantity of the product.
         * - sellingDate: string. It can be omitted. If present, it must be a valid date in the format YYYY-MM-DD that is not after the current date and is after the arrival date of the product.
         * It returns the new quantity of the product.
         */
        this.router.patch(
            "/:model/sell",
            [
                this.authenticator.isLoggedIn,
                this.authenticator.isAdminOrManager,
                param('model').isString().notEmpty().withMessage('Model is required and should be a non-empty string'),
                body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
                body('sellingDate').optional().isDate({ format: 'YYYY-MM-DD' }).withMessage('Selling date must be a valid date in the format YYYY-MM-DD'),
            ],
            this.errorHandler.validateRequest,
            (req: any, res: any, next: any) => {
                this.controller.sellProduct(req.params.model, req.body.quantity, req.body.sellingDate)
                    .then((quantity) => res.status(200).json({ quantity }))
                    .catch((err) => {
                        if (err.customCode) {
                            res.status(err.customCode).json({ message: err.customMessage });
                        } else {
                            next(err);
                        }
                    });
            }
        );
        
        
        
        
        
        

        /**
         * Route for retrieving all products.
         * It requires the user to be logged in and to be either an admin or a manager
         * It can have the following optional query parameters:
         * - grouping: string. It can be either "category" or "model". If absent, then all products are returned and the other query parameters must also be absent.
         * - category: string. It can only be present if grouping is equal to "category" (in which case it must be present) and, when present, it must be one of "Smartphone", "Laptop", "Appliance".
         * - model: string. It can only be present if grouping is equal to "model" (in which case it must be present and not empty).
         * It returns an array of Product objects.
         */
        this.router.get(
            "/",
            [
                this.authenticator.isLoggedIn,
                this.authenticator.isAdminOrManager,
                query('grouping').isIn(['category', 'model']).optional(),
                query('category').isIn(["Smartphone", "Laptop", "Appliance"]).optional(),
                query('model').isString().notEmpty().optional()
            ],
            this.errorHandler.validateRequest,
            (req: any, res: any, next: any) => {
                const { grouping, category, model } = req.query;

                // Validate query parameters
                if (grouping === 'category' && (!category || model)) {
                    return res.status(422).json({ message: 'Invalid parameters: grouping is category but category is null or model is not null' });
                }
                if (grouping === 'model' && (!model || category)) {
                    return res.status(422).json({ message: 'Invalid parameters: grouping is model but model is null or category is not null' });
                }
                if (!grouping && (category || model)) {
                    return res.status(422).json({ message: 'Invalid parameters: grouping is null but category or model is not null' });
                }

                this.controller.getProducts(grouping, category, model)
                    .then((products) => res.status(200).json(products))
                    .catch((err) => {
                        if (err.customCode) {
                            res.status(err.customCode).json({ message: err.customMessage });
                        } else {
                            next(err);
                        }
                    });
            }
        );
        
        


        /**
         * Route for retrieving all available products.
         * It requires the user to be logged in.
         * It can have the following optional query parameters:
         * - grouping: string. It can be either "category" or "model". If absent, then all products are returned and the other query parameters must also be absent.
         * - category: string. It can only be present if grouping is equal to "category" (in which case it must be present) and, when present, it must be one of "Smartphone", "Laptop", "Appliance".
         * - model: string. It can only be present if grouping is equal to "model" (in which case it must be present and not empty).
         * It returns an array of Product objects.
         */
        this.router.get(
            "/available",
            [
                this.authenticator.isLoggedIn,
                query('grouping').optional().isIn(['category', 'model']),
                query('category').optional().isIn(["Smartphone", "Laptop", "Appliance"]),
                query('model').optional().isString().notEmpty()
            ],
            this.errorHandler.validateRequest,
            async (req, res, next) => {
                try {
                    const { grouping, category, model } = req.query;
        
                    //console.log("Query parameters:", { grouping, category, model });
        
                    if (!grouping && (category || model)) {
                        return res.status(422).json({ message: 'Invalid parameters: grouping is null but category or model is not null' });
                    }
                    if (grouping === 'category' && (!category || model)) {
                        return res.status(422).json({ message: 'Invalid parameters: grouping is category but category is null or model is not null' });
                    }
                    if (grouping === 'model' && (!model || category)) {
                        return res.status(422).json({ message: 'Invalid parameters: grouping is model but model is null or category is not null' });
                    }
        
                    const products = await this.controller.getAvailableProducts(
                        grouping ? grouping.toString() : null,
                        category ? category.toString() : null,
                        model ? model.toString() : null
                    );
        
                    res.status(200).json(products);
                } catch (err) {
                    if (err.customCode) {
                        res.status(err.customCode).json({ message: err.customMessage });
                    } else {
                        //console.error('Unexpected error occurred:', err.message);
                        next(err);
                    }
                }
            }
        );
        
        
        
        
        
        
        
        
        

        

        /**
         * Route for deleting all products.
         * It requires the user to be logged in and to be either an admin or a manager.
         * It returns a 200 status code.
         */
        this.router.delete(
            "/",
            [
                this.authenticator.isLoggedIn,
                this.authenticator.isAdminOrManager
            ],
            (req: any, res: any, next: any) => {
                this.controller.deleteAllProducts()
                    .then(() => res.status(200).end())
                    .catch((err) => next(err));
            }
        )

        /**
         * Route for deleting a product.
         * It requires the user to be logged in and to be either an admin or a manager.
         * It requires the product model as a request parameter. The model must be a string and cannot be empty, and it must represent an existing product.
         * It returns a 200 status code.
         */
        this.router.delete(
            "/:model",
            [
                this.authenticator.isLoggedIn,
                this.authenticator.isAdminOrManager,
                param('model').isString().notEmpty().withMessage('Model is required and should be a non-empty string'),
            ],
            this.errorHandler.validateRequest,
            async (req, res, next) => {
                try {
                    
                    await this.controller.deleteProduct(req.params.model);
                    res.status(200).end();
                } catch (err) {
                    if (err.customCode) {
                        
                        res.status(err.customCode).json({ message: err.customMessage });
                    } else {
                        
                        res.status(500).json({ message: err.message });
                    }
                }
            }
        );




    }
}

export default ProductRoutes