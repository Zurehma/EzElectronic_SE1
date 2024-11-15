import { test, expect, jest, describe, beforeEach } from "@jest/globals";
import ReviewController from "../../src/controllers/reviewController";
import ReviewDAO from "../../src/dao/reviewDAO";
import {ProductReview} from "../../src/components/review";
import { NoReviewProductError } from "../../src/errors/reviewError";
import { User, Role } from "../../src/components/user";
import { Category, Product } from "../../src/components/product";
import { ProductNotFoundError } from "../../src/errors/productError";

beforeEach(() => {
    jest.clearAllMocks();
});

describe('Review Controller unit-tests', () => {
    const reviewController = new ReviewController();
    const mockedReview = new ProductReview('Dyson RVC', 'username',5,'2024-06-09','Amazing product');
    const Reviews: ProductReview[] = [
        new ProductReview('Dyson RVC', 'username',5,'2024-06-09','Amazing product'),
        new ProductReview('Iphone 13', 'username2',4,'2024-05-09','Very satisfied!')                    
    ]
    const mockedUser = new User('username', 'Name', 'Surname', Role.CUSTOMER, 'address', 'birthdate');
    const mockedProduct =  new Product(1000, 'Iphone 13', 'Smartphone' as Category, '', '', 3);
    

    describe('Add review', ()=> {


        test('Add review', async () => {
        jest.spyOn(ReviewDAO.prototype, "addReview").mockResolvedValueOnce();
        const response = await reviewController.addReview(mockedReview.model, mockedUser, mockedReview.score, mockedReview.comment);


        expect(ReviewDAO.prototype.addReview).toHaveBeenCalledTimes(1);
        expect(ReviewDAO.prototype.addReview).toHaveBeenCalledWith(mockedReview.model, mockedUser, mockedReview.score, mockedReview.comment);
        expect(response).toEqual(undefined);
    });
    })

    describe("Get product reviews", () => {
        test('Success, return the reviews of a product ', async () => {
            jest.spyOn(ReviewDAO.prototype, "getProdByModel").mockResolvedValueOnce([mockedProduct]);
            jest.spyOn(ReviewDAO.prototype, "getProductReviews").mockResolvedValueOnce([mockedReview]);
            const response = await reviewController.getProductReviews(mockedReview.model);
    
            expect(ReviewDAO.prototype.getProductReviews).toHaveBeenCalledTimes(1);
            expect(ReviewDAO.prototype.getProductReviews).toHaveBeenCalledWith(mockedReview.model);
            expect(response).toEqual([mockedReview]); 
        });

        test('Not existing product', async() => {
            jest.spyOn(ReviewDAO.prototype, "getProductReviews").mockRejectedValueOnce(new ProductNotFoundError());
            await expect(reviewController.getProductReviews('Not existing product')).rejects.toThrow(new ProductNotFoundError());
            expect(ReviewDAO.prototype.getProductReviews).toHaveBeenCalledTimes(1);
            expect(ReviewDAO.prototype.getProductReviews).toHaveBeenCalledWith('Not existing product'); 
        })
    });

    describe("Delete product review for a user", () => {
        test("Success : the product review was successfully removed by the user", async () => {
            jest.spyOn(ReviewDAO.prototype, "deleteReview").mockResolvedValueOnce();
            const response = await reviewController.deleteReview(mockedReview.model, mockedUser);

            expect(ReviewDAO.prototype.deleteReview).toHaveBeenCalledTimes(1);
            expect(ReviewDAO.prototype.deleteReview).toHaveBeenCalledWith(mockedReview.model, mockedUser);
            expect(response).toEqual(undefined);
        });
    });

    describe("Delete product review ", () => {
        test("Success : the product review was successfully removed", async () => {
            jest.spyOn(ReviewDAO.prototype, "deleteProductReview").mockResolvedValueOnce();
            const response = await reviewController.deleteReviewsForProduct(mockedReview.model);

            expect(ReviewDAO.prototype.deleteProductReview).toHaveBeenCalledTimes(1);
            expect(ReviewDAO.prototype.deleteProductReview).toHaveBeenCalledWith(mockedReview.model);
            expect(response).toEqual(undefined);
        });
    });

    describe("Delete all reviews ", () => {
        test("Success : all the reviews was successfully removed", async () => {
            jest.spyOn(ReviewDAO.prototype, "deleteAllReviews").mockResolvedValueOnce();
            const response = await reviewController.deleteAllReviews();

            expect(ReviewDAO.prototype.deleteAllReviews).toHaveBeenCalledTimes(1);
            expect(ReviewDAO.prototype.deleteAllReviews).toHaveBeenCalledWith();
            expect(response).toEqual(undefined);
        });
    });
   
    
});


