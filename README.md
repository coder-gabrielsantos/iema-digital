# IEMA Digital — Sistema de Gestão Escolar

MVP da plataforma de gestão escolar do IEMA, com controle de presença via QR Code, módulo de cantina e dashboard em tempo real.

## Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **MongoDB + Mongoose**
- **Recharts** (gráficos)
- **html5-qrcode** (leitura de QR Code via câmera)
- **qrcode.react** (geração de QR Codes)
- **date-fns** (manipulação de datas)
- **Lucide React** (ícones)

## Funcionalidades

| Módulo | Chave de Acesso | Descrição |
|--------|----------------|-----------|
| **Admin** | `ADMIN-IEMA` | Dashboard com métricas, gráfico de fluxo, lista de alunos |
| **Portaria** | `PORTARIA-IEMA` | Leitura de QR Code para registro de entrada/saída |
| **Cantina** | `CANTINA-IEMA` | Validação de refeição e contador de alunos presentes |

## Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
MONGODB_URI=mongodb://localhost:27017/iema-digital
```

Para produção, use uma URI do MongoDB Atlas:

```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/iema-digital
```

### 3. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

### 4. Popular dados de exemplo

Após iniciar o servidor, acesse a página **Alunos** (com chave `ADMIN-IEMA`) e clique em **"Popular Mock"** para criar 50 alunos de exemplo.

Ou via API:

```bash
curl -X POST http://localhost:3000/api/seed
```

## Estrutura do Projeto

```
app/
  login/          # Página de login com chave de acesso
  dashboard/      # Dashboard admin (métricas + gráfico)
  portaria/       # Módulo de escaneamento QR (entrada/saída)
  cantina/        # Módulo de refeição + validação QR
  alunos/         # Lista de alunos com filtros e gerador de QR
  api/
    auth/         # Validação de chave de acesso
    students/     # CRUD de alunos
    attendance/   # Registro de entrada/saída
    meals/        # Registro de refeições
    dashboard/    # Métricas para o dashboard
    seed/         # Popular banco com dados mock

components/
  ui/             # Componentes base (Button, Card, Input, Badge...)
  layout/         # Navbar + ProtectedLayout

lib/
  mongodb.ts      # Conexão com MongoDB
  models/         # Mongoose models (Student, Attendance, Meal)
  utils.ts        # Utilitários e chaves de acesso
```

## Geração de QR Codes

Acesse a página **Alunos**, encontre o aluno desejado e clique em **"Ver QR"** para visualizar o QR Code correspondente ao ID do aluno (ex: `IEMA0001`). Você pode imprimir esse QR Code para o cartão de identificação.
