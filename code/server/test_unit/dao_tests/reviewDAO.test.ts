import { describe, test, expect, jest, beforeEach } from "@jest/globals"
import ReviewDAO from "../../src/dao/reviewDAO"
import db from "../../src/db/db"
import { User, Role } from "../../src/components/user"
import { ProductReview } from "../../src/components/review"
import { ProductNotFoundError } from "../../src/errors/productError"
import { ExistingReviewError, NoReviewProductError } from "../../src/errors/reviewError"

jest.mock('../../src/db/db');

beforeEach(() => {
    jest.clearAllMocks();
})


describe('reviewDAO unit-tests', () => {
    const reviewDAO = new ReviewDAO();
    const mockDBGet = jest.spyOn(db, 'get');
    const mockDBRun = jest.spyOn(db, 'run');
    const mockDBAll = jest.spyOn(db, 'all');
    const mockUser = new User('username', 'Name', 'Surname', 'Customer' as Role, '', '');
    const productModel = "iPhone13";
    const review = new ProductReview('iPhone13', mockUser.username, 5, "Great product!", "2024-06-06");
    const productRow = { sellingPrice: 99.90, model: 'model1', category: 'category1', arrivalDate: '2023-05-15', details: 'details1', quantity: 1 };

    describe('addReview tests', () => {

        test('addReview: should add a new review', async () => {
            let callCount = 0;
            mockDBGet.mockImplementation((sql, params, callback) => {
                callCount++;
                if (callCount === 1) {
                    return callback(null, productRow); // Simulate product exists
                } else {
                    return callback(null, null); // Simulate no existing review
                }
            });

            mockDBRun.mockImplementation((sql, params, callback) => {
                return callback(null); // Simulate successful insert
            });

            const result = await reviewDAO.addReview(productModel, mockUser, review.score, review.comment);
            expect(result).toBe(undefined);
            expect(mockDBGet).toHaveBeenCalledTimes(2);
            expect(mockDBRun).toHaveBeenCalledTimes(1);
        });

        test('addReview: should throw ProductNotFoundError if product does not exist', async () => {
            mockDBGet.mockImplementationOnce((sql, params, callback) => {
                return callback(null, null); // Mock product existence check
            });

            await expect(reviewDAO.addReview(productModel, mockUser, review.score, review.comment)).rejects.toThrow(ProductNotFoundError);
            expect(mockDBGet).toHaveBeenCalledTimes(1);
        });

        test('addReview: should throw ExistingReviewError if user has already reviewed the product', async () => {
            mockDBGet.mockImplementationOnce((sql, params, callback) => {
                return callback(null, productRow); // Mock product existence check
            });
            mockDBGet.mockImplementationOnce((sql, params, callback) => {
                return callback(null, review); // Mock user review existence check
            });

            await expect(reviewDAO.addReview(productModel, mockUser, review.score, review.comment)).rejects.toThrow(ExistingReviewError);
            expect(mockDBGet).toHaveBeenCalledTimes(2);
        });

        test('addReview: should throw Error when the product query is not working', async () => {
            mockDBGet.mockImplementation((sql, params, callback) => {
                return callback(new Error('Product Database error'), null);
            });

            await expect(reviewDAO.addReview(productModel, mockUser, review.score, review.comment)).rejects.toThrow(Error);
            expect(mockDBGet).toHaveBeenCalledTimes(1);

        });

        test('addReview: should throw Error when the review query is not working', async () => {

            //mocking product quaery to work correctly
            mockDBGet.mockImplementationOnce((sql, params, callback) => {
                return callback(null, productRow); // Mock product existence check
            });

            //mocking review quaery to encounter an error
            mockDBGet.mockImplementation((sql, params, callback) => {
                return callback(new Error('Review Database error'), null);
            });

            await expect(reviewDAO.addReview(productModel, mockUser, review.score, review.comment)).rejects.toThrow(Error);
            expect(mockDBGet).toHaveBeenCalledTimes(2);

        });

        test('addReview: should throw Error when trying to execute the query', async () => {

            mockDBGet.mockImplementationOnce((sql, params, callback) => {
                return callback(null, productRow); // Mock product existence check
            });
            mockDBGet.mockImplementationOnce((sql, params, callback) => {
                return callback(null, null); // simulate no existing review
            });

            mockDBRun.mockImplementationOnce((sql, params, callback) => {
                return callback(new Error());  //simulate a  query execution error
            });

            await expect(reviewDAO.addReview(productModel, mockUser, review.score, review.comment)).rejects.toThrow(Error);
            expect(mockDBRun).toHaveBeenCalledTimes(1);
        });


    });


    describe('getProductReviews tests', () => {

        test('getProductReviews: should return reviews of a product', async () => {
            const reviews = [review];
            const products = [productRow];

            mockDBGet.mockImplementationOnce((sql, params, callback) => {
                callback(null, products);
                return db;
            });
            
            
            mockDBAll.mockImplementationOnce((sql, params, callback) => {
                callback(null, reviews);
                return db;
            });


            const result = await reviewDAO.getProductReviews(productModel);
            expect(result).toEqual(reviews);
            expect(mockDBGet).toHaveBeenCalledTimes(1);
            expect(mockDBAll).toHaveBeenCalledTimes(1);
            
        });

        test('getProductReviews: should throw Error when trying to execute the product query', async () => {
            
            mockDBAll.mockImplementationOnce((sql, params, callback) => {
                return callback(new Error());  //simulate a query execution error
            });

            await expect(reviewDAO.getProductReviews(productModel)).rejects.toThrow(Error);
            expect(mockDBAll).toHaveBeenCalledTimes(1);
        })

        test('getProductReviews: should throw Error when trying to execute the review query', async () => {
            const products = [productRow];

            mockDBGet.mockImplementationOnce((sql, params, callback) => {
                callback(null, products);
                return db;
            });
            
            mockDBAll.mockImplementationOnce((sql, params, callback) => {
                return callback(new Error());  //simulate a query execution error
            });

            await expect(reviewDAO.getProductReviews(productModel)).rejects.toThrow(Error);
            expect(mockDBGet).toHaveBeenCalledTimes(1);
            expect(mockDBAll).toHaveBeenCalledTimes(1);
        })

        /*test('getProductReviews: should throw ProductNotFoundError if no reviews are found', async () => {
            mockDBAll.mockImplementationOnce((sql, params, callback) => {
                return callback(null, null);
            });

            await expect(reviewDAO.getProductReviews('prodnoreviewd')).rejects.toThrow(NoReviewProductError);
            expect(mockDBAll).toHaveBeenCalledTimes(1);
        });*/

    });

    describe('deleteReview tests', () => {

        test('deleteReview: should delete a review', async () => {
            mockDBGet.mockImplementationOnce((sql, params, callback) => {
                return callback(null, productRow); // Mock product existence check
            })
            mockDBGet.mockImplementationOnce((sql, params, callback) => {
                return callback(null, review); // Mock user review existence check

            });

            mockDBRun.mockImplementationOnce((sql, params, callback) => {
                callback(null);
                return db;
            });

            await expect(reviewDAO.deleteReview(productModel, mockUser)).resolves.toBeUndefined();
            expect(mockDBGet).toHaveBeenCalledTimes(2);
            expect(mockDBRun).toHaveBeenCalledTimes(1);
        });

        test('deleteReview: should throw ProductNotFoundError if product does not exist', async () => {
            mockDBGet.mockImplementationOnce((sql, params, callback) => {
                return callback(null, null); // Mock product (not) existence check
            });

            await expect(reviewDAO.deleteReview(productModel, mockUser)).rejects.toThrow(ProductNotFoundError);
            expect(mockDBGet).toHaveBeenCalledTimes(1);
        });

        test('deleteReview: should throw NoReviewProductError if user has not reviewed the product', async () => {
            mockDBGet.mockImplementationOnce((sql, params, callback) => {
                return callback(null, productRow); // Mock product existence check
            })
            mockDBGet.mockImplementationOnce((sql, params, callback) => {
                return callback(null, null); // Mock review not existing
            });

            await expect(reviewDAO.deleteReview(productModel, mockUser)).rejects.toThrow(NoReviewProductError);
            expect(mockDBGet).toHaveBeenCalledTimes(2);
        });

        test('deleteReview: should throw Error when the product query is not working', async () => {
            mockDBGet.mockImplementation((sql, params, callback) => {
                return callback(new Error('Product Database error'), null);
            });

            await expect(reviewDAO.deleteReview(productModel, mockUser)).rejects.toThrow(Error);
            expect(mockDBGet).toHaveBeenCalledTimes(1);

        });

        test('deleteReview: should throw Error when the review query is not working', async () => {

            //mocking product quaery to work correctly
            mockDBGet.mockImplementationOnce((sql, params, callback) => {
                return callback(null, productRow); // Mock product existence check
            });

            //mocking review quaery to encounter an error
            mockDBGet.mockImplementation((sql, params, callback) => {
                return callback(new Error('Review Database error'), null);
            });

            await expect(reviewDAO.deleteReview(productModel, mockUser)).rejects.toThrow(Error);
            expect(mockDBGet).toHaveBeenCalledTimes(2);

        });

        test('deleteReview: should throw Error when trying to execute the query', async () => {

            mockDBGet.mockImplementationOnce((sql, params, callback) => {
                return callback(null, productRow); // Mock product existence check
            });
            mockDBGet.mockImplementationOnce((sql, params, callback) => {
                return callback(null, review); // Mock review existence check
            });

            mockDBRun.mockImplementationOnce((sql, params, callback) => {
                return callback(new Error());  //simulate a  query execution error
            });

            await expect(reviewDAO.deleteReview(productModel, mockUser)).rejects.toThrow(Error);
            expect(mockDBRun).toHaveBeenCalledTimes(1);
        })



    });

    describe('deleteProductReview tests', () => {

        test('deleteProductReview: should delete all reviews of a product', async () => {
            mockDBGet.mockImplementationOnce((sql, params, callback) => {
                callback(null, productRow); // Mock product existence check
                return db;
            });

            mockDBRun.mockImplementationOnce((sql, params, callback) => {
                callback(null);
                return db;
            });

            await expect(reviewDAO.deleteProductReview(productModel)).resolves.toBeUndefined();
            expect(mockDBGet).toHaveBeenCalledTimes(1);
            expect(mockDBRun).toHaveBeenCalledTimes(1);
        });

        test('deleteProductReview: should throw ProductNotFoundError if product does not exist', async () => {
            mockDBGet.mockImplementationOnce((sql, params, callback) => {
                return callback(null, null); // Mock product (not) existence check
            });

            await expect(reviewDAO.deleteProductReview(productModel)).rejects.toThrow(ProductNotFoundError);
            expect(mockDBGet).toHaveBeenCalledTimes(1);
        });


        test('deleteProductReview: should throw Error when the product query is not working', async () => {
            mockDBGet.mockImplementation((sql, params, callback) => {
                return callback(new Error('Product Database error'), null);
            });

            await expect(reviewDAO.deleteProductReview(productModel)).rejects.toThrow(Error);
            expect(mockDBGet).toHaveBeenCalledTimes(1);

        });

        test('deleteProductReview: should throw Error when trying to execute the query', async () => {

            mockDBGet.mockImplementationOnce((sql, params, callback) => {
                return callback(null, productRow); // Mock product existence check
            });

            mockDBRun.mockImplementationOnce((sql, params, callback) => {
                return callback(new Error());  //simulate a  query execution error
            });

            await expect(reviewDAO.deleteProductReview(productModel)).rejects.toThrow(Error);
            expect(mockDBRun).toHaveBeenCalledTimes(1);
        });

    });

    describe('deleteAllReviews tests', () => {

        test('deleteAllReviews: should delete all reviews', async () => {
            mockDBRun.mockImplementationOnce((sql, params, callback) => {
                callback(null);
                return db;
            });

            await expect(reviewDAO.deleteAllReviews()).resolves.toBeUndefined();
            expect(mockDBRun).toHaveBeenCalledTimes(1);
        });

        test('deleteAllReviews: should throw Error when trying to execute the query', async () => {
            mockDBRun.mockImplementationOnce((sql, params, callback) => {
                return callback(new Error());  //simulate a  query execution error
            });

            await expect(reviewDAO.deleteAllReviews()).rejects.toThrow(Error);
            expect(mockDBRun).toHaveBeenCalledTimes(1);
        });

    });

});