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

| Papel | Chave de Acesso | Descrição |
|--------|----------------|-----------|
| **Gestão** | `LOGIN_KEY_GESTAO` | Dashboard completo, justificativas, cartões QR, portaria e cantina |
| **Servidores** | `LOGIN_KEY_SERVIDORES` | Dashboard, portaria e cantina |

## Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
MONGODB_URI=mongodb://localhost:27017/iema-digital
LOGIN_KEY_GESTAO=ADMIN-IEMA
LOGIN_KEY_SERVIDORES=PORTARIA-IEMA
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

Após iniciar o servidor, acesse o **Dashboard** com `LOGIN_KEY_GESTAO` e clique em **"Popular Mock"** para criar 50 alunos de exemplo.

Ou via API:

```bash
curl -X POST http://localhost:3000/api/seed
```

## Estrutura do Projeto

```
app/
  login/          # Página de login com chave de acesso
  dashboard/      # Redireciona para /alunos
  portaria/       # QR na portaria (entrada; saída antecipada só gestão)
  cantina/        # Refeição + validação QR
  alunos/         # Dashboard: presença, filtros (gestão: justificativas e cartões)
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
