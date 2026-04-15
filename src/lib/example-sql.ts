export const EXAMPLE_SQL = `CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE
);

CREATE TABLE orders (
  id INT PRIMARY KEY,
  user_id INT,
  total DECIMAL(10,2),
  status VARCHAR(20),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE order_items (
  id INT PRIMARY KEY,
  order_id INT,
  product_id INT,
  quantity INT,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE products (
  id INT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  price DECIMAL(10,2),
  category_id INT,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE categories (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);`
