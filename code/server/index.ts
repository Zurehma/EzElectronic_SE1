const cors = require('cors');
//import cors from 'cors';
//const express = require('express');
import express from "express";
//import express from 'express';
import initRoutes from "./src/routes"
import dotenv from 'dotenv';

// comment

dotenv.config();
const app: express.Application = express();

const port: number = 3001;

const corsOptions = {
    origin: 'http://localhost:3000',
    credentials: true,
};
app.use(cors(corsOptions));
initRoutes(app)
if (!module.parent) {
    app.listen(port, () => {
        console.log(`Server listening at http://localhost:${port}`);
    });
}

export { app }



