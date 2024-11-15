"use strict"

import db from "../db/db";

/**
 * Deletes all data from the database.
 * This function must be called before any integration test, to ensure a clean database state for each test run.
 */

export function cleanup() {
    return new Promise<void>((resolve, reject) => {
        db.serialize(() => {
            // Delete all data from the database.
            db.run("DELETE FROM reviews")
              .run("DELETE FROM carts")
              .run("DELETE FROM products")
              .run("DELETE FROM cart_products")
              .run("DELETE FROM users", (err) => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
    });
}

export function cleanupNoUsers() {
    return new Promise<void>((resolve, reject) => {
        db.serialize(() => {
            // Delete all data from the database.
            db.run("DELETE FROM reviews")
              .run("DELETE FROM products")
              .run("DELETE FROM cart_products")
              .run("DELETE FROM carts", (err) => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
    });
}