const express = require("express");
const mysql = require("mysql2");
const session = require("express-session");
const flash = require("connect-flash");
const app = express();

const connection = mysql.createConnection({
  host: "sql.freedb.tech",
  user: "freedb_simon",
  password: "rg9StT%z**zn7q&",
  database: "freedb_supermarket777",
});

connection.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
    return;
  }
  console.log("Connected to MySQL database");
});

// Set up view engine
app.set("view engine", "ejs");
//  enable static files
app.use(express.static("public"));
// enable form processing
app.use(
  express.urlencoded({
    extended: false,
  })
);

//TODO: Insert code for Session Middleware below
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.use(flash());

// TODO: Middleware to check if user is logged in
const checkAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  } else {
    req.flash("error", "You are not logged in");
    res.redirect("/login");
  }
};

// TODO: Middleware to check if user is admin
const checkAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === "admin") {
    return next();
  } else {
    req.flash("error", "You are not authorized to access this page");
    res.redirect("/login");
  }
};

const validateRegistration = (req, res, next) => {
  const { username, email, password, address, contact, role } = req.body;

  if (!username || !email || !password || !address || !contact || !role) {
    return res.status(400).send("All fields are required.");
  }

  if (password.length < 6) {
    req.flash("error", "Password should be at least 6 or more characters long");
    req.flash("formData", req.body);
    return res.redirect("/register");
  }
  next();
};

app.get("/", (req, res) => {
  res.render("index", { user: req.session.user });
});

app.get("/inventory", checkAuthenticated, checkAdmin, (req, res) => {
  // Fetch data from MySQL
  connection.query("SELECT * FROM products", (error, results) => {
    if (error) throw error;
    res.render("inventory", { products: results, user: req.session.user });
  });
});

//TODO: Define route to render register form
app.get("/register", (req, res) => {
  res.render("register", {
    messages: req.flash("error"),
    formData: req.flash("formData")[0],
  });
});

//TODO: Define route for register form submisson
app.post("/register", validateRegistration, (req, res) => {
  const { username, email, password, address, contact, role } = req.body;
  connection.query(
    "INSERT INTO users (username, email, password, address, contact, role) VALUES (?, ?, SHA1(?), ?, ?, ?)",
    [username, email, password, address, contact, role],
    (error, results) => {
      if (error) throw error;
      req.flash("success", "Registration successful");
      res.redirect("/login");
    }
  );
});

//TODO: Define route to render login form
app.get("/login", (req, res) => {
  res.render("login", {
    messages: req.flash("success"),
    errors: req.flash("error"),
  });
});

//TODO: Define route for login form submisson
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email && !password) {
    req.flash("error", "Please enter email and password");
    return res.redirect("/login");
  }
  const sql = "SELECT * FROM users WHERE email = ? AND password = SHA1(?)";
  connection.query(sql, [email, password], (error, results) => {
    if (error) throw error;
    if (results.length > 0) {
      req.session.user = results[0];
      if (results[0].role === "admin") {
        res.redirect("/inventory");
      } else {
        res.redirect("/shopping");
      }
    } else {
      req.flash("error", "Invalid username or password");
      res.redirect("/login");
    }
  });
});

app.get("/shopping", checkAuthenticated, (req, res) => {
  // Fetch data from MySQL
  connection.query("SELECT * FROM products", (error, results) => {
    if (error) throw error;
    res.render("shopping", { user: req.session.user, products: results });
  });
});

app.get("/product/:id", checkAuthenticated, (req, res) => {
  // Extract the product ID from the request parameters
  const productId = req.params.id;

  // Fetch data from MySQL based on the product ID
  connection.query(
    "SELECT * FROM products WHERE productId = ?",
    [productId],
    (error, results) => {
      if (error) throw error;

      // Check if any product with the given ID was found
      if (results.length > 0) {
        // Render HTML page with the product data
        res.render("product", { product: results[0], user: req.session.user });
      } else {
        // If no product with the given ID was found, render a 404 page or handle it accordingly
        res.status(404).send("Product not found");
      }
    }
  );
});

app.get("/product", checkAuthenticated, checkAdmin, (req, res) => {
  res.render("addProduct", { user: req.session.user });
});

app.post("/product", (req, res) => {
  // Extract product data from the request body
  const { name, quantity, price, image } = req.body;

  // Insert the new product into the database
  connection.query(
    "INSERT INTO products (productName, quantity, price, image) VALUES (?, ?, ?, ?)",
    [name, quantity, price, image],
    (error, results) => {
      if (error) {
        // Handle any error that occurs during the database operation
        console.error("Error adding product:", error);
        res.status(500).send("Error adding product");
      } else {
        // Send a success response
        res.redirect("/inventory");
      }
    }
  );
});

app.get("/product/:id/update", checkAuthenticated, checkAdmin, (req, res) => {
  const productId = req.params.id;

  // Fetch data from MySQL based on the product ID
  connection.query(
    "SELECT * FROM products WHERE productId = ?",
    [productId],
    (error, results) => {
      if (error) throw error;

      // Check if any product with the given ID was found
      if (results.length > 0) {
        // Render HTML page with the product data
        res.render("updateProduct", { product: results[0] });
      } else {
        // If no product with the given ID was found, render a 404 page or handle it accordingly
        res.status(404).send("Product not found");
      }
    }
  );
});

app.post("/product/:id/update", (req, res) => {
  const productId = req.params.id;
  // Extract product data from the request body
  const { name, quantity, price } = req.body;
  console.log(productId);

  // Insert the new product into the database
  connection.query(
    "UPDATE products SET productName = ? , quantity = ?, price = ?  WHERE productId = ?",
    [name, quantity, price, productId],
    (error, results) => {
      if (error) {
        // Handle any error that occurs during the database operation
        console.error("Error updating product:", error);
        res.status(500).send("Error updating product");
      } else {
        // Send a success response
        res.redirect("/inventory");
      }
    }
  );
});

app.get("/product/:id/delete", checkAuthenticated, checkAdmin, (req, res) => {
  const productId = req.params.id;

  connection.query(
    "DELETE FROM products WHERE productId = ?",
    [productId],
    (error, results) => {
      if (error) {
        // Handle any error that occurs during the database operation
        console.error("Error deleting product:", error);
        res.status(500).send("Error deleting product");
      } else {
        // Send a success response
        res.redirect("/inventory");
      }
    }
  );
});

//TODO: Define route for logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
