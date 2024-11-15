import { User } from "../components/user";
import UserDAO from "../dao/userDAO";
import { Product } from "../components/product";
import ReviewDAO from "../dao/reviewDAO";
import { Utility } from "../utilities"
import { UserNotCustomerError,UserNotFoundError } from "../errors/userError";
import { ProductReview } from "../components/review";
import {ExistingReviewError , NoReviewProductError} from "../errors/reviewError";
import { ProductNotFoundError } from "../errors/productError";
//import { error } from "console";

class ReviewController {
    private dao: ReviewDAO
    private userDAO: UserDAO

    constructor() {
        this.dao = new ReviewDAO
        this.userDAO = new UserDAO
    }

    /**
     * Adds a new review for a product
     * @param model The model of the product to review
     * @param user The username of the user who made the review
     * @param score The score assigned to the product, in the range [1, 5]
     * @param comment The comment made by the user
     * @returns A Promise that resolves to nothing
     */
    async addReview(model: string, user: User, score: number, comment: string) /**:Promise<void> */ {
        return this.dao.addReview(model,user,score,comment);
    }

    /**
     * Returns all reviews for a product
     * @param model The model of the product to get reviews from
     * @returns A Promise that resolves to an array of ProductReview objects
     */
    async getProductReviews(model: string) :Promise<ProductReview[]>  {
        return new Promise<ProductReview[]>(async(resolve,reject) => {
            try{
                const products = await this.dao.getProdByModel(model);
                if(products.length == 0){
                    reject(new ProductNotFoundError());
                }
                const reviews = await this.dao.getProductReviews(model);
                resolve(reviews);
                
            }
            catch(err){
                reject(err);
            }
        })
     }


    /**
     * Deletes the review made by a user for a product
     * @param model The model of the product to delete the review from
     * @param user The user who made the review to delete
     * @returns A Promise that resolves to nothing
     */
    async deleteReview(model: string, user: User) /**:Promise<void> */ {
        return this.dao.deleteReview(model,user);     
    }

     /**
     * Deletes all reviews for a product
     * @param model The model of the product to delete the reviews from
     * @returns A Promise that resolves to nothing
     */
     async deleteReviewsForProduct(model: string) /**:Promise<void> */ {
        return this.dao.deleteProductReview(model);
      }




    /**
     * Deletes all reviews of all products
     * @returns A Promise that resolves to nothing
     */
    async deleteAllReviews() /**:Promise<void> */ {         
        await this.dao.deleteAllReviews();  
    }
}

export default ReviewController;




