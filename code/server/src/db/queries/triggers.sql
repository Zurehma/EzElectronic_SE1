CREATE TRIGGER IF NOT EXISTS cart_products_zero_quantity
AFTER UPDATE OF cart_quantity
ON cart_products
FOR EACH ROW WHEN NEW.cart_quantity=0
BEGIN
    DELETE FROM cart_products WHERE cart=NEW.cart AND product=NEW.product
END;