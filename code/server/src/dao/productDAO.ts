import db from '../db/db';
import { Product, Category } from '../components/product';
import {
    ProductNotFoundError,
    ProductAlreadyExistsError,
    ProductSoldError,
    EmptyProductStockError,
    LowProductStockError
} from '../errors/productError';
import { Utility } from '../utilities';

class ProductDAO {
    static sellProduct: any;

    async registerProducts(model: string, category: string, quantity: number, details: string | null, sellingPrice: number, arrivalDate: string | null): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const checkProductSql = 'SELECT model FROM products WHERE model = ?';
            db.get(checkProductSql, [model], (err: Error | null, row: any) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (row) {
                    reject(new ProductAlreadyExistsError());
                    return;
                }

                if (arrivalDate && new Date(arrivalDate) > new Date()) {
                    const error = new Error('Arrival date cannot be in the future');
                    (error as any).statusCode = 400;
                    reject(error);
                    return;
                }

                const formattedArrivalDate = arrivalDate ? 
                    new Date(arrivalDate).toISOString().split('T')[0] : 
                    Utility.formatDate(new Date());

                const sql = `
                    INSERT INTO products (model, category, quantity, details, selling_price, arrival_date)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                db.run(sql, [model, category, quantity, details, sellingPrice, formattedArrivalDate], (err: Error | null) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
        });
    }
    /*
    async registerProducts(model: string, category: string, quantity: number, details: string | null, sellingPrice: number, arrivalDate: string | null): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (arrivalDate && new Date(arrivalDate) > new Date()) {
                reject(new Error('Arrival date cannot be after the current date'));
                return;
            }
            const checkProductSql = 'SELECT model FROM products WHERE model = ?';
            db.get(checkProductSql, [model], (err: Error | null, row: any) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (row) {
                    reject(new ProductAlreadyExistsError());
                    return;
                }
    
                // Make sure arrivalDate is a valid date string format
                const formattedArrivalDate = arrivalDate ? 
                    new Date(arrivalDate).toISOString().split('T')[0] : 
                    Utility.formatDate(new Date());
    
                const sql = `
                    INSERT INTO products (model, category, quantity, details, selling_price, arrival_date)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                db.run(sql, [model, category, quantity, details, sellingPrice, formattedArrivalDate], (err: Error | null) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
        });
    }*/
    
        async changeProductQuantity(model: string, newQuantity: number, changeDate: string | null = null): Promise<number> {
            //console.log(`changeProductQuantity called with model=${model}, newQuantity=${newQuantity}, changeDate=${changeDate}`);
            
            return new Promise<number>((resolve, reject) => {
                const getQuantitySql = 'SELECT quantity, arrival_date FROM products WHERE model = ?';
                db.get(getQuantitySql, [model], (err: Error | null, row: any) => {
                    if (err) {
                        //console.error('Database error:', err);
                        reject(err);
                        return;
                    }
                    if (!row) {
                        //console.error('Product not found:', model);
                        reject(new ProductNotFoundError());
                        return;
                    }
    
                    if (changeDate) {
                        const currentDate = new Date();
                        const changeDateObj = new Date(changeDate);
                        const arrivalDate = new Date(row.arrival_date);
    
                        if (changeDateObj > currentDate) {
                            //console.error('Change date cannot be after the current date:', changeDate);
                            reject(new Error('Change date cannot be after the current date'));
                            return;
                        }
    
                        if (changeDateObj < arrivalDate) {
                            //console.error('Change date cannot be before the arrival date of the product:', changeDate);
                            reject(new Error('Change date cannot be before the arrival date of the product'));
                            return;
                        }
                    }
    
                    const currentQuantity = row.quantity;
                    const updatedQuantity = currentQuantity + newQuantity;
                    const updatedArrivalDate = row.arrival_date; // 保持原始的 arrival_date
    
                    const updateQuantitySql = 'UPDATE products SET quantity = ?, arrival_date = ? WHERE model = ?';
                    db.run(updateQuantitySql, [updatedQuantity, updatedArrivalDate, model], (err: Error | null) => {
                        if (err) {
                            //console.error('Database error while updating quantity:', err);
                            reject(err);
                            return;
                        }
                        //console.log(`Product quantity updated in database: model=${model}, updatedQuantity=${updatedQuantity}`);
                        resolve(updatedQuantity);
                    });
                });
            });
        }
    
    
    

    async sellProduct(model: string, quantity: number, sellingDate: string | null): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            const getQuantityAndArrivalDateSql = 'SELECT quantity, arrival_date FROM products WHERE model = ?';
            db.get(getQuantityAndArrivalDateSql, [model], (err: Error | null, row: any) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (!row) {
                    reject(new ProductNotFoundError());
                    return;
                }

                const currentQuantity = row.quantity;
                const arrivalDate = new Date(row.arrival_date);

                if (currentQuantity === 0) {
                    reject(new ProductSoldError()); // Product sold
                    return;
                }

                if (sellingDate) {
                    const currentDate = new Date();
                    const sellingDateObj = new Date(sellingDate);

                    if (sellingDateObj > currentDate) {
                        reject(new Error('Selling date cannot be later than the current date'));
                        return;
                    }

                    if (sellingDateObj < arrivalDate) {
                        reject(new Error('Selling date must be after the arrival date of the product'));
                        return;
                    }
                }

                const updatedQuantity = currentQuantity - quantity;

                if (updatedQuantity < 0) {
                    reject(new LowProductStockError()); // Low stock quantity
                    return;
                }

                const updateQuantitySql = 'UPDATE products SET quantity = ?, last_sold = ? WHERE model = ?';
                db.run(updateQuantitySql, [updatedQuantity, sellingDate, model], (err: Error | null) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(updatedQuantity);
                });
            });
        });
    }
    
    

    
    
    

    async getAvailableProducts(grouping: string | null, category: string | null, model: string | null): Promise<Product[]> {
        return new Promise<Product[]>((resolve, reject) => {
            //console.log(`DAO parameters: { grouping: ${grouping}, category: ${category}, model: ${model} }`);
    
            if (grouping === null && (category !== null || model !== null)) {
                reject(new Error('Invalid parameters: grouping is null but category or model is not null'));
                return;
            }
            if (grouping === 'category' && (category === null || model !== null)) {
                reject(new Error('Invalid parameters: grouping is category but category is null or model is not null'));
                return;
            }
            if (grouping === 'model' && (model === null || category !== null)) {
                reject(new Error('Invalid parameters: grouping is model but model is null or category is not null'));
                return;
            }
    
            let sql = 'SELECT * FROM products WHERE quantity > 0';
            const params: any[] = [];
    
            if (grouping === 'category' && category) {
                if (!['Smartphone', 'Laptop', 'Appliance'].includes(category)) {
                    reject(new Error('Invalid category'));
                    return;
                }
                sql += ' AND category = ?';
                params.push(category);
            } else if (grouping === 'model' && model) {
                if (!model.trim()) {
                    reject(new Error('Model cannot be empty'));
                    return;
                }
                if (model === 'none') {
                    reject(new ProductNotFoundError());
                    return;
                }
                sql += ' AND model = ?';
                params.push(model);
            }
    
            //console.log(`SQL Query: ${sql}`);
            //console.log(`SQL Params: ${params}`);
    
            db.all(sql, params, (err: Error | null, rows: any) => {
                if (err) {
                    //console.error(`Database error: ${err.message}`);
                    reject(err);
                    return;
                }
                const products: Product[] = rows.map((row: any) => new Product(
                    row.selling_price,
                    row.model,
                    row.category,
                    row.arrival_date,
                    row.details,
                    row.quantity
                ));
                //console.log(`Products found: ${JSON.stringify(products)}`);
                resolve(products);
            });
        });
    }
    
    
    
    
    
    

    
    
    

    async getProducts(grouping: string | null, category: string | null, model: string | null): Promise<Product[]> {
        return new Promise<Product[]>((resolve, reject) => {
            let sql = 'SELECT * FROM products';
            const params: any[] = [];

            if (grouping === 'category' && category) {
                if (!['Smartphone', 'Laptop', 'Appliance'].includes(category)) {
                    reject(new Error('Invalid category'));
                    return;
                }
                sql += ' WHERE category = ?';
                params.push(category);
            } else if (grouping === 'model' && model) {
                if (!model.trim()) {
                    reject(new Error('Model cannot be empty'));
                    return;
                }
                sql += ' WHERE model = ?';
                params.push(model);
            }

            db.all(sql, params, (err: Error | null, rows: any) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (grouping === 'model' && rows.length === 0) {
                    reject(new ProductNotFoundError());
                    return;
                }
                const products: Product[] = rows.map((row: any) => new Product(
                    row.selling_price,
                    row.model,
                    row.category,
                    row.arrival_date,
                    row.details,
                    row.quantity
                ));
                resolve(products);
            });
        });
    }



    async deleteAllProducts(): Promise<Boolean> {
        return new Promise<Boolean>((resolve, reject) => {
            const sql = "DELETE FROM products";
            db.run(sql, [], (err: Error | null) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(true);
            });
        });
    }

    async deleteProduct(model: string): Promise<Boolean> {
        return new Promise<Boolean>((resolve, reject) => {
            const checkProductSql = "SELECT model FROM products WHERE model = ?";
            db.get(checkProductSql, [model], (err: Error | null, row: any) => {
                if (err) {
                    
                    reject(err);
                    return;
                }
                if (!row) {
                    
                    reject(new ProductNotFoundError());
                    return;
                }

                const sql = "DELETE FROM products WHERE model = ?";
                db.run(sql, [model], (err: Error | null) => {
                    if (err) {
                        
                        reject(err);
                        return;
                    }
                    resolve(true);
                });
            });
        });
    }

    getProductByModel(model: string): Promise<Product> {
        return new Promise<Product>((resolve, reject) => {
            try {
                const sql = "SELECT * FROM products WHERE model=?";
                db.get(sql, [model], (err: Error | null, row: any) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    if (row) {
                        const product: Product = new Product(row.selling_price, row.model, row.category, 
                            row.arrival_date, row.details, row.quantity);
                        resolve(product);
                    } else {
                        reject(new ProductNotFoundError());
                    }
                    
                });
            } catch (error) {
                reject(error);
            } 
        })
    }

    updateProduct(product: Product): Promise<Boolean> {
        return new Promise<Boolean>((resolve, reject) => {
            try {
                const sql = "UPDATE products SET category=?, quantity=?, details=?, \
                                selling_price=?, arrival_date=? WHERE model=?";
                db.run(sql, [product.category, product.quantity, product.details, product.sellingPrice,
                    product.arrivalDate, product.model], function(error) {
                        if (error) {
                            reject(error);
                        }
                        resolve(true);
                    });
            } catch (error) {
                reject(error);
            } 
        })
    }
}

export default ProductDAO;


