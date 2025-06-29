const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    cpf: { type: String, required: true, unique: true },
    nome: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    curso: { type: String, required: true },
    senha: { type: String, required: true },
    cargo: { type: String, required: true },
    boletos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Boleto' }] // Referência aos boletos
});

const User = mongoose.model('User', userSchema);

module.exports = User;
