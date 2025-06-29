const mongoose = require('mongoose');

const boletoSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    arquivo: { type: String, required: true }, // Armazenar o PDF em base64
    status: { type: String, enum: ['pendente', 'pago'], default: 'pendente', required: true }, // Status do boleto
    descricao: { type: String, default: '' }, // Descrição do boleto
    vencimento: { type: Date, required: true }, // Data de vencimento
    valor: { type: Number, required: true } // Valor do boleto
});

// Criar o modelo Boleto
const Boleto = mongoose.model('Boleto', boletoSchema);

module.exports = Boleto;
