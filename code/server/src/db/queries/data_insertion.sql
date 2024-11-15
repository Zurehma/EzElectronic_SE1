-- Products table data
INSERT INTO products
VALUES ('Iphone 13', 'Smartphone', 5, '', 759.50, '2024-01-01', null, null),
       ('Dell XPS 15', 'Laptop', 10, '', 1545.50, '2024-02-03', null, null),
       ('Dyson RVC', 'Appliance', 20,'450 W', 1999.99, '2024-03-25', null, null);

-- Reviews table data
INSERT INTO reviews
VALUES ('mariorossi', 'Iphone 13', 4, '2024-05-27', 'Incredible performance but price is too high'),
       ('mariorossi', 'Dyson RVC', 5, '2024-05-27', 'Cleans my house very easily!');

-- INSERT INTO carts (customer, paid, payment_date, total)
-- VALUES ('mariorossi', 1, '2024-05-22', 2759.49);

-- INSERT INTO cart_products
-- VALUES (1, 'Iphone 13', 2),
--        (1, 'Dyson RVC', 1);