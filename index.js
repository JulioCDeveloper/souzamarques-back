const express = require('express');
const mongoose = require("mongoose");
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// URL de conexão com o MongoDB
const mongoURI =
    "mongodb+srv://auth_db:root@cluster0.eors23p.mongodb.net/souzamarques?retryWrites=true&w=majority";

// Conectar ao MongoDB
mongoose
    .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("Conectado ao MongoDB!");
    })
    .catch((err) => {
        console.error("Erro ao conectar ao MongoDB:", err);
    });

app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
