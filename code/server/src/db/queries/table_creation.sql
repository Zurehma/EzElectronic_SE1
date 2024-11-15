-- Product table creation
CREATE TABLE products (
    model TEXT PRIMARY KEY NOT NULL,
    category TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    details TEXT,
    selling_price REAL NOT NULL,
    arrival_date TEXT NOT NULL,
    last_updated TEXT,
    last_sold TEXT
);

-- Cart table creation
CREATE TABLE carts (
    id INTEGER PRIMARY KEY NOT NULL,
    customer TEXT NOT NULL,
    paid BOOLEAN NOT NULL CHECK (paid IN (0, 1)),
    payment_date TEXT,
    total REAL,
    FOREIGN KEY (customer) REFERENCES users(username)
);

-- Table to record product-cart associations
CREATE TABLE cart_products (
    /*cart INTEGER NOT NULL, */
    cart TEXT NOT NULL,
    product TEXT,
    cart_quantity INTEGER NOT NULL,
    PRIMARY KEY (cart, product),
    FOREIGN KEY (cart) REFERENCES carts(id) ON DELETE CASCADE,
    FOREIGN KEY (product) REFERENCES products(model) ON DELETE SET NULL
);

-- Review table creation
CREATE TABLE reviews (
    customer TEXT NOT NULL,
    product TEXT NOT NULL,
    score INTEGER NOT NULL CHECK (score IN (1,2,3,4,5)),
    date TEXT NOT NULL,
    comment TEXT,
    PRIMARY KEY (customer, product),
    FOREIGN KEY (customer) REFERENCES users(username) ON DELETE CASCADE,
    FOREIGN KEY (product) REFERENCES products(model) ON DELETE SET NULL
);