// routes/auth.js
const express = require('express');
const { register, login, getProfile, uploadBoleto, deleteUser, editUser, getAllUsers } = require('../controllers/authController');

const router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fieldSize: 25 * 1024 * 1024, // 25MB
    }
});

router.post('/register', upload.none(), register);
// Registro de usuário
// router.post('/register', register);

// Login de usuário
router.post('/login', login);

// Obter dados do perfil
router.get('/profile', getProfile); // Usar GET para obter o perfil do usuário

// Upload de boleto
router.post('/upload-boleto', uploadBoleto); // Endpoint para upload de boletos

// Deletar usuário
router.delete('/delete-user', deleteUser); // Endpoint para deletar usuário e boletos

// Editar usuário e boletos
router.put('/edit-user', editUser); // Endpoint para editar usuário e boletos

// Exemplo de como usar a função em uma rota
router.get('/users', getAllUsers);
module.exports = router;
