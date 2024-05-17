var express = require("express");
var cookieParser = require("cookie-parser");
const cors = require("cors");
var http = require("http");
var path = require("path");

const app = express();
const mongoose = require("mongoose");
mongoose.connect("mongodb://localhost:27017/llm_api");
// user table or document
const user = mongoose.model("user", {
  email: {
    type: String,
    required: [true, "Please enter your Email address"],
    trim: true,
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "Please enter a valid Email address",
    ],
  },
  password: {
    type: String,
    required: true,
  },

  name: {
    type: String,
    required: true,
  },
});

// Message table or document
const message = mongoose.model("message", {
  user: {
    type: mongoose.SchemaTypes.ObjectId,
    required: true,
    ref: "user",
  },
  body: {
    type: String,
    required: [true, "Body is Required "],
  },
  fromChat: {
    type: Boolean,
    default: false,
    required: [true, ""],
  },
  type: {
    type: String,
    required: [true, "please a type of message is required"],
    enum: {
      values: ["text", "csv"],
      message: 'Please use a valide Data Type ["text", "csv"]',
    },
  },
});

// enabling CORS
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.static(path.join(__dirname, "client")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const options = {
  expires: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
  httpOnly: false,
};

const protected = (req, res, next) => {
  let token;
  if (req.cookies.token) {
    token = req.cookies.token;
  }
  if (!token) {
    return res.status(401).json({
      success: false,
      status: "Not Authorized",
      error: "401 Invalid Authorization",
    });
  }
  req.user = {
    _id: token,
  };
  next();
};

/**
 * @description Post For Users To Login Using `JWT`
 * @route `/login`
 * @access Public
 * @type Post
 */
app.post("/login", async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json("Please provide an email and password", 400);
  }

  const data = await user
    .findOne({ email: email.toLowerCase() })
    .select("+password");

  if (!data) {
    return res.status(400).json("Invalid credentials", 401);
  }

  const isMatch = data.password == password;

  if (!isMatch) {
    return res.status(400).json("Invalid credentials", 401);
  } else {
    res.status(201).cookie("token", data._id.toString(), options).redirect("/");
  }
});

/**
 * @description Post For Users To Login Using `JWT`
 * @route `/login`
 * @access Public
 * @type Post
 */
app.post("/register", async (req, res, next) => {
  const { name, email, password } = req.body;
  const isUser = await user.findOne({ email: email.toLowerCase() });
  if (isUser) {
    return res.send(`${email} is Assigned to a user sign in instead`);
  }
  const newUser = await user.create({
    name,
    email,
    password,
  });

  res
    .status(201)
    .cookie("token", newUser._id.toString(), options)
    .redirect("/");
});

app.get("/messages", protected, async (req, res, next) => {
  const myMessage = await message.find({ user: req.user._id }).sort({
    _id: -1,
  });
  res.status(200).json({
    success: true,
    status: " success",
    prompt: myMessage,
  });
});

//importing Open AI Lib And Core Functions
const OpenAI = require("openai");

const configuration = {
  apiKey: "REPLACE WITH SECRET KEY",
};

const openai = new OpenAI(configuration);

const resFromChat = async (messages, user) => {
  const allMessages = await message.find({ user: user }).sort({ _id: 1 });

  let data = [];
  let chat;
  for (let i = 0; i < allMessages.length; i++) {
    const e = allMessages[i];

    if (!e.fromChat) {
      chat = {
        role: "user",
        content: e.body,
      };
    }
    if (e.fromChat) {
      chat = {
        role: "assistant",
        content: e.body,
      };
    }
    data.push(chat);
  }

  let upload = [
    {
      role: "system",
      content: "You Are A Banker, Be A very Rude One",
    },
  ];
  upload = upload.concat(data);
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-16k-0613",
      messages: upload,
      temperature: 1,
      max_tokens: 256,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    const data = {
      user,
      body: response.choices[0].message.content.toString(),
      type: "text",
      fromChat: true,
    };

    await message.create(data);
    return data;
  } catch (error) {
    const data = {
      user,
      body: "Error From Server Please Try Again",
      type: "text",
      fromChat: true,
    };

    await message.create(data);
    return data;
  }
};

/**
 * @description Send new Prompt
 * @route `/messages`
 * @access Public
 * @type POST
 */
app.post("/messages", protected, async (req, res, next) => {
  const { body, type } = req.body;
  const newMgs = await message.create({
    body,
    type,
    user: req.user._id,
    fromChat: false,
  });

  const data = await resFromChat(body, req.user._id);
  res.status(200).json({
    success: true,
    status: " success",
    prompt: data,
  });
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  res.status(404).json({
    success: false,
    status: "Resource Not Found",
    error: "404 Content Do Not Exist Or Has Been Deleted",
  });
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});
var server = http.createServer(app);
/**
 * Listen on provided port, on all network interfaces.
 */
const port = 3000;
server.listen(port);
server.on("listening", onListening);
function onListening() {
  var addr = server.address();
  var bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
  console.log("Listening on " + bind);
}

module.exports = app;
