require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const app = express();

const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI;

app.use(cors());
app.use(express.json());

/* =========================
   Swagger config
========================= */

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "User Management API",
      version: "1.0.0",
      description: "API for managing users (Week 11 exercises)",
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
      },
    ],
    components: {
      schemas: {
        User: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            age: { type: "integer" },
            email: { type: "string" },
            address: { type: "string" },
          },
        },
        UserInput: {
          type: "object",
          required: ["name", "age", "email"],
          properties: {
            name: { type: "string" },
            age: { type: "integer" },
            email: { type: "string" },
            address: { type: "string" },
          },
        },
      },
    },
  },
  apis: [__filename],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/* =========================
   MongoDB connection state
========================= */

let dbConnected = false;

async function connectDB() {
  try {
    if (!MONGO_URI) {
      console.error("Missing MONGO_URI in .env");
      dbConnected = false;
      return;
    }

    await mongoose.connect(MONGO_URI);

    dbConnected = true;
    console.log("Connected to MongoDB");

    // await User.init();
    // console.log("MongoDB indexes synced");
  } catch (err) {
    dbConnected = false;
    console.error("Connection Error:", err.message);
  }
}

mongoose.connection.on("connected", () => {
  dbConnected = true;
});

mongoose.connection.on("disconnected", () => {
  dbConnected = false;
  console.error("MongoDB disconnected");
});

mongoose.connection.on("error", (err) => {
  dbConnected = false;
  console.error("MongoDB Error:", err.message);
});

/* =========================
   User Schema + Model
========================= */

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tên không được để trống"],
      minlength: [2, "Tên phải có ít nhất 2 ký tự"],
      trim: true,
    },
    age: {
      type: Number,
      required: [true, "Tuổi không được để trống"],
      min: [0, "Tuổi phải >= 0"],
    },
    email: {
      type: String,
      required: [true, "Email không được để trống"],
      match: [/^\S+@\S+\.\S+$/, "Email không hợp lệ"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", UserSchema);

/* =========================
   Helper functions
========================= */

function normalizeUserInput(body) {
  return {
    name: body.name?.trim(),
    age: Number(body.age),
    email: body.email?.trim().toLowerCase(),
    address: body.address?.trim() || "",
  };
}

function isInvalidObjectId(id) {
  return !mongoose.Types.ObjectId.isValid(id);
}

function handleError(res, err, defaultStatus = 400) {
  console.error(err);

  if (err.code === 11000) {
    return res.status(400).json({
      error: "Email đã tồn tại, vui lòng dùng email khác",
    });
  }

  if (
    err.name === "MongooseServerSelectionError" ||
    err.name === "MongoNetworkError" ||
    err.name === "MongoTimeoutError"
  ) {
    return res.status(503).json({
      error: "Không kết nối được CSDL",
    });
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: err.message,
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      error: "ID không hợp lệ",
    });
  }

  return res.status(defaultStatus).json({
    error: err.message || "Có lỗi xảy ra",
  });
}

function requireDatabase(req, res, next) {
  if (!dbConnected || mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: "Không kết nối được CSDL",
    });
  }

  next();
}

/* =========================
   Health check
========================= */

app.get("/", (req, res) => {
  res.json({
    message: "User Management API is running",
    dbConnected,
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    api: "ok",
    dbConnected,
    mongoReadyState: mongoose.connection.readyState,
  });
});

/* =========================
   API routes
========================= */

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: Lấy danh sách người dùng
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Số mục trên trang
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm
 *     responses:
 *       200:
 *         description: Danh sách người dùng
 */
app.get("/api/users", requireDatabase, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 5, 1), 50);
    const search = req.query.search?.trim() || "";

    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { address: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      page,
      limit,
      total,
      totalPages,
      data: users,
    });
  } catch (err) {
    handleError(res, err, 500);
  }
});

/**
 * @openapi
 * /api/users:
 *   post:
 *     summary: Tạo người dùng mới
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       201:
 *         description: Người dùng được tạo
 */
app.post("/api/users", requireDatabase, async (req, res) => {
  try {
    const payload = normalizeUserInput(req.body);

    const existedUser = await User.findOne({
      email: payload.email,
    });

    if (existedUser) {
      return res.status(400).json({
        error: "Email đã tồn tại, vui lòng dùng email khác",
      });
    }

    const newUser = await User.create(payload);

    res.status(201).json({
      message: "Tạo người dùng thành công",
      data: newUser,
    });
  } catch (err) {
    handleError(res, err, 400);
  }
});

/**
 * @openapi
 * /api/users/{id}:
 *   put:
 *     summary: Cập nhật người dùng
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       200:
 *         description: Người dùng được cập nhật
 */
app.put("/api/users/:id", requireDatabase, async (req, res) => {
  try {
    const { id } = req.params;

    if (isInvalidObjectId(id)) {
      return res.status(400).json({
        error: "ID không hợp lệ",
      });
    }

    const payload = normalizeUserInput(req.body);

    const existedUser = await User.findOne({
      email: payload.email,
      _id: { $ne: id },
    });

    if (existedUser) {
      return res.status(400).json({
        error: "Email đã tồn tại, vui lòng dùng email khác",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res.status(404).json({
        error: "Không tìm thấy người dùng",
      });
    }

    res.json({
      message: "Cập nhật người dùng thành công",
      data: updatedUser,
    });
  } catch (err) {
    handleError(res, err, 400);
  }
});

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     summary: Xóa người dùng
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Người dùng đã bị xóa
 */
app.delete("/api/users/:id", requireDatabase, async (req, res) => {
  try {
    const { id } = req.params;

    if (isInvalidObjectId(id)) {
      return res.status(400).json({
        error: "ID không hợp lệ",
      });
    }

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({
        error: "Không tìm thấy người dùng",
      });
    }

    res.json({
      message: "Xóa người dùng thành công",
    });
  } catch (err) {
    handleError(res, err, 400);
  }
});

/* =========================
   Start server
========================= */

app.listen(PORT, async () => {
  console.log(`API running on port ${PORT}`);
  console.log(`Swagger docs: http://localhost:${PORT}/api-docs`);
  await connectDB();
});