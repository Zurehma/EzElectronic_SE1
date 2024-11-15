
/**
 * A class that implements the interaction with the database for all review-related operations.
 * You are free to implement any method you need here, as long as the requirements are satisfied.
 */
import { User } from "../components/user"
import db from "../db/db"
import dayjs from "dayjs";
import { Product } from "../components/product";
import { ProductReview } from "../components/review";
import { ProductNotFoundError } from "../errors/productError";
import { ExistingReviewError, NoReviewProductError } from "../errors/reviewError";
import { Utility } from '../utilities';

class ReviewDAO {

    reviews: ProductReview[];

    getProductReviews(model: string): Promise<ProductReview[]> {
        return new Promise((resolve, reject) => {
            const sqlcheckProd = 'SELECT * FROM products WHERE model LIKE ?';
            db.get(sqlcheckProd, [model], (err, row) => {
                if (err) {
                    //console.log("stampo erroe" + err);
                    reject(err);
                }
                const sql = 'SELECT * FROM reviews WHERE model=?';
                db.all(sql, [model], (err: Error, rows: ProductReview[]) => {
                    if (err)
                        reject(err);
                    resolve(rows);
                })

            })
        })
    }  //return all reviews of that product

    getProdByModel(model: string): Promise<Product[]> {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM products WHERE model LIKE ? ';
            db.all(sql, [model], (err: Error, rows: Product[]) => {
                if (err)
                    reject(err);
                resolve(rows);
            })

        })
    }

    addReview(model: string, user: User, score: number, comment: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const date = Utility.formatDate(new Date());
            let review = new ProductReview(model, user.username, score, date, comment);

            //check if the product exists
            const sqlcheckProd = 'SELECT * FROM products WHERE model LIKE ?';
            db.get(sqlcheckProd, [model], (err, row) => {
                if (err) {
                    return reject(err);
                }
                else if (!row) {
                    return reject(new ProductNotFoundError());
                }
                else {
                    //check if the user has reviewd this product
                    const sqlcheckreviewed = 'SELECT * FROM reviews WHERE model = ? AND user = ?';
                    db.get(sqlcheckreviewed, [model, user.username], (err, row) => {
                        if (err) {
                            return reject(err);
                        }
                        else if (row) {
                            return reject(new ExistingReviewError());
                        }
                        else {
                            const sql = 'INSERT INTO reviews (user,	model, score, date, comment) VALUES (?,?,?,?,?)';
                            db.run(sql, [user.username, model, score, date, comment], (err: any) => {
                                if (err)
                                    return reject(err);
                                resolve();
                            });
                        }
                    });
                }
            });

        });
    };



    deleteReview(model: string, user: User): Promise<void> {
        return new Promise((resolve, reject) => {

            //check if the product exists
            const sqlcheckProd = 'SELECT * FROM products WHERE model = ?';
            db.get(sqlcheckProd, [model], (err, product) => {
                if (err) {
                    return reject(err);
                }
                else if (!product) {
                    return reject(new ProductNotFoundError());
                }
                else {
                    //check if the user has reviewd this product, if not error
                    const sqlcheckreviewed = 'SELECT * FROM reviews WHERE model = ? AND user = ?';
                    db.get(sqlcheckreviewed, [model, user.username], (err, row) => {
                        if (err) {
                            return reject(err);
                        }
                        else if (!row) {
                            return reject(new NoReviewProductError());
                        }
                        else {
                            const sql = 'DELETE FROM reviews WHERE model LIKE ? AND user LIKE ?';
                            db.run(sql, [model, user.username], function (err) {
                                if (err)
                                    return reject(err);
                                resolve();
                            })

                        }
                    });
                }
            });


        })
    };

    deleteProductReview(model: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {

            //check if the product exists
            const sqlcheckProd = 'SELECT * FROM products WHERE model = ?';
            db.get(sqlcheckProd, [model], (err, product) => {
                if (err) {
                    return reject(err);
                }
                else if (!product) {
                    return reject(new ProductNotFoundError());
                }
                else {
                    const sql = "DELETE FROM reviews WHERE model LIKE ?";
                    db.run(sql, [model], function (err) {
                        if (err)
                            return reject(err);
                        resolve();
                    });
                }
            });
        });
    }


    deleteAllReviews(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const sql = "DELETE FROM reviews";
            db.run(sql, [], function (err) {
                if (err)
                    return reject(err);
                resolve();
            })
        })

    }


}




export default ReviewDAO;