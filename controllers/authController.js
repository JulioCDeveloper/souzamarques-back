// controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Boleto = require('../models/Boleto'); // Importar o modelo de Boleto

// Validações
const validateUser = (cpf, email) => {
    const cpfRegex = /^\d{11}$/; // Regex para CPF (11 dígitos)

    if (!cpfRegex.test(cpf)) {
        return { error: 'CPF inválido!' }; // Retorna erro em formato JSON
    }

    // Você pode adicionar mais validações para o email aqui, se necessário
    // Exemplo de validação de email (opcional)
    // const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Regex simples para email
    // if (!emailRegex.test(email)) {
    //     return { error: 'Email inválido!' }; // Retorna erro em formato JSON
    // }

    return null; // Retorna null se não houver erro
};

// Registro de usuário
const register = async (req, res) => {
    const { cpf, nome, curso, email, senha, boletos } = req.body; // Recebe boletos como um array

    try {
        const validationError = validateUser(cpf, email);
        if (validationError) {
            return res.status(400).json(validationError); // Retorna erro em formato JSON
        }

        // Verifica se o CPF já existe no banco de dados
        const existingUser = await User.findOne({ cpf });
        if (existingUser) {
            return res.status(400).json({
                error: `O CPF ${cpf} já está registrado.`,
            });
        }

        const hashedPassword = await bcrypt.hash(senha, 10);
        const user = new User({ cpf, nome, email, curso, senha: hashedPassword, cargo: "student" });
        await user.save();

        // Salvar boletos em base64
        if (boletos && Array.isArray(boletos)) {
            const boletoPromises = boletos.map(async (boletoData) => {
                const { base64, status, descricao, vencimento, valor } = boletoData;

                // Criação do objeto Boleto com os dados recebidos
                const boleto = new Boleto({
                    userId: user._id,
                    arquivo: base64,
                    status: status || 'pendente', // Usar 'pendente' como padrão
                    descricao: descricao || '',
                    vencimento: vencimento || '',
                    valor: valor || 0,
                });

                // const boleto = new Boleto({ userId: user._id, arquivo: arquivoBase64 });
                await boleto.save();
                return boleto._id; // Retorna o ID do boleto salvo
            });

            // Aguardar a conclusão de todos os saves
            const boletoIds = await Promise.all(boletoPromises);
            // Atualiza o usuário para adicionar os IDs dos boletos
            user.boletos = boletoIds;
            await user.save();
        }

        res.status(201).json({ message: 'Usuário registrado com sucesso!' });
    } catch (error) {
        console.log()
        res.status(400).json({ error: 'Erro ao registrar usuário', message: error.message });
    }
};

// Login de usuário
const login = async (req, res) => {
    const { cpf, senha } = req.body;

    try {
        // Encontrar o usuário e popular os boletos
        const user = await User.findOne({ cpf }).populate('boletos'); // Supondo que 'boletos' seja o nome do campo de referência

        if (!user) {
            return res.status(400).json({ error: 'Usuário não encontrado!' });
        }

        const isMatch = await bcrypt.compare(senha, user.senha);
        if (!isMatch) {
            return res.status(400).json({ error: 'Senha incorreta!' });
        }

        // Criar o token JWT
        const token = jwt.sign({ cpf: user.cpf }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Retornar o usuário e os boletos (sem o campo _id dos boletos)
        const boletosComArquivos = user.boletos.map(boleto => ({
            ...boleto.toObject(), // Transformar o boleto em objeto simples
        }));

        res.json({ user: { ...user.toObject(), boletos: boletosComArquivos }, token });
    } catch (error) {
        res.status(500).send('Erro ao fazer login: ' + error.message);
    }
};


// Função para obter dados do perfil
const getProfile = async (req, res) => {
    const { cpf } = req.body; // Supondo que o CPF é passado no corpo da requisição

    try {
        const user = await User.findOne({ cpf }).populate('boletos');
        if (!user) {
            return res.status(404).send('Usuário não encontrado!');
        }

        // Estrutura da resposta
        const responseData = {
            cliente: {
                cpf: user.cpf,
                nome: user.nome,
                email: user.email,
                curso: user.curso,
                cargo: user.cargo,
            },
            boletos: user.boletos.map(boleto => ({
                id: boleto._id,
                arquivo: boleto.arquivo // Retorna o arquivo em base64
            }))
        };

        res.json(responseData);
    } catch (error) {
        res.status(500).send('Erro ao obter perfil: ' + error.message);
    }
};

const getAllUsers = async (req, res) => {
    try {
        // Busca todos os usuários no banco de dados
        const users = await User.find().populate('boletos'); // Inclui boletos, se necessário

        // Estrutura da resposta
        const responseData = users.map(user => ({
            cpf: user.cpf,
            nome: user.nome,
            email: user.email,
            curso: user.curso,
            cargo: user.cargo,
            boletos: user.boletos.map(boleto => ({
                id: boleto._id,
                arquivo: boleto.arquivo, // Retorna o arquivo em base64, se necessário
                status: boleto.status,
                descricao: boleto.descricao,
                vencimento: boleto.vencimento,
                valor: boleto.valor
            }))
        }));

        // Retorna a lista de usuários em formato JSON
        return res.json(responseData);
    } catch (error) {
        // Retorna um erro em formato JSON
        return res.status(500).json({ message: 'Erro ao obter usuários', error: error.message });
    }
};


// Função para fazer upload de boletos
const uploadBoleto = async (req, res) => {
    const { userId, arquivoBase64 } = req.body; // arquivoBase64 deve ser uma string em base64

    try {
        const boleto = new Boleto({ userId, arquivo: arquivoBase64 });
        await boleto.save();

        // Atualiza o usuário para adicionar o boleto
        await User.findByIdAndUpdate(userId, { $push: { boletos: boleto._id } });

        res.status(201).send('Boleto enviado com sucesso!');
    } catch (error) {
        res.status(400).send('Erro ao enviar boleto: ' + error.message);
    }
};

// Função para editar dados do usuário e seus boletos
const editUser = async (req, res) => {
    const { cpf, nome, email, curso, cargo, boletos } = req.body; // Recebe os novos dados do usuário e boletos

    try {
        // Encontrar o usuário
        const user = await User.findOne({ cpf });
        if (!user) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        // Atualizar dados do usuário
        user.nome = nome || user.nome;
        user.email = email || user.email;
        user.curso = curso || user.curso;
        user.cargo = cargo || user.cargo;
        await user.save();

        // Atualizar boletos se fornecidos
        if (boletos && Array.isArray(boletos)) {
            const boletoPromises = boletos.map(async (boleto) => {
                const boletoData = {
                    arquivo: boleto.arquivo,
                    status: boleto.status || 'pendente', // Atualiza ou define status
                    descricao: boleto.descricao || '', // Atualiza ou define descrição
                    vencimento: boleto.vencimento, // Data de vencimento é obrigatória
                    valor: boleto.valor // Valor é obrigatório
                };

                if (boleto.id) {
                    // Se o ID do boleto for fornecido, atualiza o boleto existente
                    return await Boleto.findByIdAndUpdate(boleto.id, boletoData, { new: true });
                } else {
                    // Se não houver ID, cria um novo boleto
                    const newBoleto = new Boleto({ userId: user._id, ...boletoData });
                    return await newBoleto.save();
                }
            });

            // Aguardar a conclusão de todas as atualizações/criações de boletos
            await Promise.all(boletoPromises);
        }

        res.status(200).json({ message: "Dados do usuário e boletos atualizados com sucesso!" });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar dados: ' + error.message });
    }
};

// Função para deletar usuário e seus boletos
const deleteUser = async (req, res) => {
    const { cpf } = req.body; // Supondo que o CPF é passado no corpo da requisição

    try {
        // Encontrar o usuário
        const user = await User.findOne({ cpf });
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado!' });
        }

        // Deletar os boletos associados ao usuário
        await Boleto.deleteMany({ userId: user._id });

        // Deletar o usuário
        await User.deleteOne({ _id: user._id });

        res.status(200).json({ message: 'Usuário e seus boletos foram deletados com sucesso!' });
    } catch (error) {
        res.status(500).send('Erro ao deletar usuário: ' + error.message);
    }
};


module.exports = {
    register,
    login,
    getProfile,
    uploadBoleto,
    deleteUser,
    editUser,
    getAllUsers
};
